const $ = (id) => document.getElementById(id);
const FACETS = [
  ['statut', 'Statut'],
  ['dept', 'Département'],
  ['office', 'Office'],
  ['gerance', 'Secteur de gérance'],
  ['typeOccupant', "Type d'occupant"],
  ['commune', 'Commune'],
];

const state = {
  snapshotId: null,
  sites: [],
  filtered: [],
  filters: emptyFilters(),
  sort: { key: 'stratus', dir: -1 },
  mapReady: false,
};

const COLUMNS = [
  { key: 'id', label: 'N° site', get: (s) => s.id },
  { key: 'nom', label: 'Site', get: (s) => s.nom },
  { key: 'adresse', label: 'Adresse', get: (s) => s.adresse },
  { key: 'commune', label: 'Commune', get: (s) => s.commune },
  { key: 'dept', label: 'Département', get: (s) => s.dept },
  { key: 'gerance', label: 'Gérance', get: (s) => s.gerance },
  { key: 'statut', label: 'Statut', get: (s) => statutLabel(s.statut) },
  { key: 'score', label: 'Score', get: (s) => s.score, num: true },
  { key: 'surfReelle', label: 'Surface réelle m²', get: (s) => Math.round(s.surfReelle), num: true },
  { key: 'vnc', label: 'VNC CHF', get: (s) => s.vnc, num: true },
  { key: 'stratus', label: 'Valeur Stratus CHF', get: (s) => s.stratus, num: true },
  { key: 'plusValue', label: 'Plus-value latente CHF', get: (s) => s.plusValue, num: true },
];

function toast(msg, ms = 3500) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.hidden = true), ms);
}

// ---------- Import / versions ----------
async function importFile(file) {
  try {
    toast('Lecture du fichier…');
    const buf = await file.arrayBuffer();
    const hash = await sha256(buf);
    let payload;
    let label;
    if (file.name.toLowerCase().endsWith('.json')) {
      const j = JSON.parse(new TextDecoder().decode(buf));
      if (!Array.isArray(j.rows)) throw new Error('JSON invalide : pas de lignes');
      payload = { rows: j.rows, communes: j.communes || {}, meta: { sourceDate: j.sourceDate } };
      label = j.label;
    } else {
      payload = parseWorkbook(XLSX, XLSX.read(buf, { type: 'array', cellDates: true }));
    }
    const { snapshot, duplicate } = await saveSnapshot(payload, { fileName: file.name, hash, label });
    await refreshSnapshotList(snapshot.id);
    toast(duplicate ? 'Ce fichier est déjà importé : version existante rechargée.' : `Version importée : ${snapshot.label} (${payload.rows.length} lignes)`);
  } catch (e) {
    console.error(e);
    toast(`Échec de l'import : ${e.message}`, 8000);
  }
}

async function refreshSnapshotList(selectId) {
  const list = await listSnapshots();
  const sel = $('snapshot-select');
  sel.innerHTML = list.map((s) => `<option value="${s.id}">${esc(s.label)} — importé ${fmtDate(s.createdAt)}</option>`).join('');
  for (const id of ['cmp-old', 'cmp-new']) {
    $(id).innerHTML = list.map((s) => `<option value="${s.id}">${esc(s.label)} (${fmtDate(s.createdAt)})</option>`).join('');
  }
  if (list.length > 1) $('cmp-old').value = list[1].id;
  $('snap-table').innerHTML =
    '<tr><th>Version</th><th>Fichier</th><th>Importé</th><th>Lignes</th><th></th></tr>' +
    list
      .map(
        (s) => `<tr><td>${esc(s.label)}</td><td>${esc(s.fileName)}</td><td>${fmtDate(s.createdAt)}</td><td>${s.nbLignes}</td>
        <td><button class="btn small" data-export="${s.id}">Exporter JSON</button> <button class="btn small" data-del="${s.id}">Supprimer</button></td></tr>`
      )
      .join('');
  const id = selectId || state.snapshotId || list[0]?.id;
  if (id && list.some((s) => s.id === id)) {
    sel.value = id;
    await loadSnapshot(id);
  } else {
    state.snapshotId = null;
    $('welcome').hidden = false;
    $('app').hidden = true;
  }
}

async function loadSnapshot(id) {
  const snap = await getSnapshot(id);
  state.snapshotId = id;
  state.sites = buildSites(snap.rows, snap.communes);
  state.filters = emptyFilters();
  $('welcome').hidden = true;
  $('app').hidden = false;
  buildFacets();
  syncInputs();
  refresh();
  if (state.mapReady) await loadCoords();
}

// ---------- Filtres ----------
function buildFacets() {
  $('facets').innerHTML = FACETS.map(([key, label]) => {
    const vals = facetValues(state.sites, key);
    return `<details class="facet" ${key === 'statut' ? 'open' : ''}><summary>${label} <span class="n" data-count="${key}"></span></summary>
      <div class="opts">${vals
        .map(([v, n]) => {
          const val = key === 'statut' ? v : v;
          const text = key === 'statut' ? statutLabel(v) : v;
          return `<label><input type="checkbox" data-facet="${key}" value="${esc(val)}"> ${esc(text)} <span class="n">${n}</span></label>`;
        })
        .join('')}</div></details>`;
  }).join('');
}

function syncInputs() {
  const f = state.filters;
  $('f-texte').value = f.texte;
  $('f-exc').checked = f.exclureException;
  $('f-pat').checked = f.exclurePatrimoniale;
  $('f-valeur').value = f.valeurMin ?? '';
  $('f-surface').value = f.surfaceMin ?? '';
  document.querySelectorAll('[data-facet]').forEach((c) => (c.checked = f[c.dataset.facet].has(c.value)));
}

function bindFilters() {
  $('facets').addEventListener('change', (e) => {
    const c = e.target.closest('[data-facet]');
    if (!c) return;
    const set = state.filters[c.dataset.facet];
    c.checked ? set.add(c.value) : set.delete(c.value);
    refresh();
  });
  $('f-texte').addEventListener('input', (e) => ((state.filters.texte = e.target.value), refresh()));
  $('f-exc').addEventListener('change', (e) => ((state.filters.exclureException = e.target.checked), refresh()));
  $('f-pat').addEventListener('change', (e) => ((state.filters.exclurePatrimoniale = e.target.checked), refresh()));
  const numInput = (id, key) =>
    $(id).addEventListener('input', (e) => ((state.filters[key] = e.target.value === '' ? null : Number(e.target.value)), refresh()));
  numInput('f-valeur', 'valeurMin');
  numInput('f-surface', 'surfaceMin');
  $('reset-filters').addEventListener('click', () => {
    state.filters = emptyFilters();
    syncInputs();
    refresh();
  });
}

// ---------- Rendu ----------
function refresh() {
  state.filtered = applyFilters(state.sites, state.filters);
  renderKPIs();
  renderCharts(state.filtered);
  renderTable();
  renderLegend();
  if (state.mapReady) renderMap();
  document.querySelectorAll('[data-count]').forEach((n) => {
    const k = state.filters[n.dataset.count]?.size;
    n.textContent = k ? `(${k})` : '';
  });
}

function renderKPIs() {
  const f = state.filtered;
  const sum = (a, fn) => a.reduce((s, x) => s + (fn(x) || 0), 0);
  const cess = f.filter((s) => s.statut === 'cessible');
  const decide = f.filter((s) => s.statut === 'decide');
  const exam = f.filter((s) => s.statut === 'examiner');
  const vCess = sum(cess, (s) => s.valeur);
  const vDec = sum(decide, (s) => s.valeur);
  const pct = Math.min(100, ((vCess + vDec) / TARGET_CESSION_CHF) * 100);
  const kpi = (l, v, s = '') => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div><div class="s">${s}</div></div>`;
  $('kpis').innerHTML =
    kpi('Sites', fmtNum(f.length), `${fmtNum(sum(f, (s) => s.nbOccupants))} lignes occupants`) +
    kpi('Surface réelle', fmtM2(sum(f, (s) => s.surfReelle)), `budgétaire ${fmtM2(sum(f, (s) => s.surfBudg))}`) +
    kpi('Valeur actuelle (Stratus)', fmtCHF(sum(f, (s) => s.stratus)), `VNC bilan ${fmtCHF(sum(f, (s) => s.vnc))}`) +
    kpi('Potentiellement cessibles', fmtNum(cess.length), `${fmtCHF(vCess)} · ${fmtNum(exam.length)} à examiner`) +
    `<div class="kpi"><div class="v">${fmtCHF(vCess + vDec)}</div><div class="l">Cessibles + cession envisagée vs cible ${fmtCHF(TARGET_CESSION_CHF)}</div>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <div class="s">${pct.toFixed(0)} % · gain récurrent visé ${fmtCHF(TARGET_ANNUAL_GAIN_CHF)}/an</div></div>`;
}

function renderLegend() {
  $('legend').innerHTML = Object.values(STATUTS)
    .map((s) => `<span><i style="background:${s.color}"></i>${s.label}</span>`)
    .join('');
}

function renderTable() {
  const { key, dir } = state.sort;
  const col = COLUMNS.find((c) => c.key === key);
  const rows = [...state.filtered].sort((a, b) => {
    const x = col.get(a), y = col.get(b);
    if (x === y) return 0;
    if (x === null || x === undefined) return 1;
    if (y === null || y === undefined) return -1;
    return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'fr')) * dir;
  });
  $('table-count').textContent = `${rows.length} sites`;
  $('table').innerHTML =
    `<thead><tr>${COLUMNS.map((c) => `<th data-sort="${c.key}" class="${c.num ? 'r' : ''}">${c.label}${c.key === key ? (dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead><tbody>` +
    rows
      .slice(0, 1500)
      .map(
        (s) =>
          `<tr data-site="${s.id}">${COLUMNS.map((c) => {
            if (c.key === 'statut') return `<td><span class="badge" style="background:${STATUTS[s.statut].color}">${STATUTS[s.statut].label}</span></td>`;
            const v = c.get(s);
            return `<td class="${c.num ? 'r' : ''}">${c.num ? fmtNum(v) : esc(v ?? '')}</td>`;
          }).join('')}</tr>`
      )
      .join('') +
    '</tbody>';
}

function showDetail(s) {
  const d = $('detail');
  d.hidden = false;
  d.innerHTML = `<button class="btn small close" id="close-detail">Fermer</button>
    <h4>${esc(s.nom)} <small>(${s.id})</small></h4>
    <div>${esc(s.adresse ?? '')}${s.commune ? ', ' + esc(s.commune) : ''}</div>
    <p><span class="badge" style="background:${STATUTS[s.statut].color}">${STATUTS[s.statut].label}</span> score ${s.score}</p>
    <ul>${s.reasons.map((r) => `<li>${r.pts > 0 ? '+' : ''}${r.pts} · ${esc(r.label)}</li>`).join('') || '<li>Aucun critère de cessibilité</li>'}</ul>
    <p>Surface réelle ${fmtM2(s.surfReelle)} · budgétaire ${fmtM2(s.surfBudg)}<br>VNC ${fmtCHF(s.vnc)} · Stratus ${fmtCHF(s.stratus)}</p>
    <strong>Occupants (${s.nbOccupants})</strong><ul>${s.services.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    ${s.commentaires.length ? `<strong>Commentaires</strong><ul>${s.commentaires.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
  $('close-detail').onclick = () => (d.hidden = true);
}

// ---------- Carte ----------
async function loadCoords() {
  setCoords(await cachedCoords(state.sites));
  renderMap();
}

function renderMap() {
  const n = renderMarkers(state.filtered, showDetail);
  $('geocode-status').textContent = `${n} / ${state.filtered.length} sites localisés`;
}

async function startGeocode() {
  const btn = $('geocode-btn');
  btn.disabled = true;
  const coords = await geocodeSites(state.sites, {
    onProgress: (d, t) => ($('geocode-status').textContent = `Localisation… ${d} / ${t}`),
  });
  setCoords(coords);
  renderMap();
  fitToMarkers();
  btn.disabled = false;
}

async function openMap() {
  if (!state.mapReady) {
    initMap($('map'));
    state.mapReady = true;
    await loadCoords();
    fitToMarkers();
  }
  invalidate();
}

// ---------- Historique ----------
async function compare() {
  const [a, b] = await Promise.all([getSnapshot($('cmp-old').value), getSnapshot($('cmp-new').value)]);
  const d = diffSnapshots(buildSites(a.rows, a.communes), buildSites(b.rows, b.communes));
  const fmt = (f, v) => (['vnc', 'stratus', 'surfReelle'].includes(f) ? fmtNum(v) : f === 'statut' ? statutLabel(v) : String(v ?? '–'));
  $('cmp-result').innerHTML = `<p><strong>${d.added.length}</strong> ajoutés · <strong>${d.removed.length}</strong> supprimés · <strong>${d.changed.length}</strong> modifiés</p>
    <table><tr><th>Site</th><th>Évolution</th></tr>
    ${d.added.map((s) => `<tr><td>${esc(s.nom)} (${s.id})</td><td class="add">Ajouté</td></tr>`).join('')}
    ${d.removed.map((s) => `<tr><td>${esc(s.nom)} (${s.id})</td><td class="del">Supprimé</td></tr>`).join('')}
    ${d.changed.map((c) => `<tr><td>${esc(c.site.nom)} (${c.site.id})</td><td>${c.changes.map((x) => `${x.label} : ${esc(fmt(x.field, x.from))} → ${esc(fmt(x.field, x.to))}`).join('<br>')}</td></tr>`).join('')}</table>`;
}

function renderRules() {
  const p = SCORING.points;
  $('rules').innerHTML = `<h3>Règles de classement (v1, à valider)</h3>
    <p>Le statut est calculé par site à partir des colonnes du fichier. Cession envisagée = colonne « Décision cession provisoire » à « oui ». Sinon score ≥ ${SCORING.seuilCessible} : potentiellement cessible ; ≥ ${SCORING.seuilExaminer} : à examiner ; sinon à conserver.</p>
    <table><tr><th>Critère</th><th>Points</th></tr>
    <tr><td>Site libre / non affecté</td><td>${p.vacant}</td></tr>
    <tr><td>Lieu non conforme (DTS)</td><td>${p.nonConformeDTS}</td></tr>
    <tr><td>Lieu non conforme (DGV)</td><td>${p.nonConformeDGV}</td></tr>
    <tr><td>Candidat à reloger / regrouper</td><td>${p.candidatReloger}</td></tr>
    <tr><td>Piste de rocade</td><td>${p.pisteRocade}</td></tr>
    <tr><td>Piste de relogement</td><td>${p.pisteRelogement}</td></tr>
    <tr><td>Associations (CR non monétaire)</td><td>${p.crNonMonetaire}</td></tr>
    <tr><td>Bien d'exception</td><td>${p.bienException}</td></tr>
    <tr><td>Valeur patrimoniale</td><td>${p.valeurPatrimoniale}</td></tr></table>
    <p class="hint">Valeur d'un site = valeur actuelle estimée Stratus, à défaut la VNC. Modifiable dans <code>src/js/config.js</code>.</p>`;
}

// ---------- Init ----------
function bindUI() {
  $('app-version').textContent = `v${APP_VERSION}`;
  $('file-input').addEventListener('change', (e) => e.target.files[0] && importFile(e.target.files[0]));
  $('snapshot-select').addEventListener('change', (e) => loadSnapshot(e.target.value));
  const drop = $('drop');
  for (const ev of ['dragover', 'dragenter']) document.addEventListener(ev, (e) => (e.preventDefault(), drop.classList.add('over')));
  for (const ev of ['dragleave', 'drop']) document.addEventListener(ev, (e) => (e.preventDefault(), drop.classList.remove('over')));
  document.addEventListener('drop', (e) => e.dataTransfer.files[0] && importFile(e.dataTransfer.files[0]));

  document.querySelector('.tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x === b));
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === `tab-${b.dataset.tab}`));
    if (b.dataset.tab === 'carte') openMap();
  });

  $('table').addEventListener('click', (e) => {
    const th = e.target.closest('th[data-sort]');
    if (th) {
      state.sort = { key: th.dataset.sort, dir: state.sort.key === th.dataset.sort ? -state.sort.dir : 1 };
      return renderTable();
    }
    const tr = e.target.closest('tr[data-site]');
    if (tr) showDetail(state.sites.find((s) => s.id === tr.dataset.site));
  });
  $('export-csv').addEventListener('click', () =>
    download(`sites_${new Date().toISOString().slice(0, 10)}.csv`, toCSV(state.filtered, COLUMNS))
  );
  $('geocode-btn').addEventListener('click', startGeocode);
  $('cmp-btn').addEventListener('click', compare);
  $('snap-table').addEventListener('click', async (e) => {
    const exp = e.target.dataset.export;
    const del = e.target.dataset.del;
    if (exp) {
      const s = await getSnapshot(exp);
      download(`snapshot_${s.label.replace(/\W+/g, '_')}.json`, JSON.stringify(s), 'application/json');
    }
    if (del && confirm('Supprimer cette version ?')) {
      await deleteSnapshot(del);
      if (del === state.snapshotId) state.snapshotId = null;
      await refreshSnapshotList();
    }
  });
  bindFilters();
  renderRules();
}

bindUI();
refreshSnapshotList().catch((e) => toast(`Stockage local indisponible : ${e.message}`, 8000));
