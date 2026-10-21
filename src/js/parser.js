const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const clean = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = clean(v);
  if (s === null) return null;
  const n = Number(s.replace(/[’'\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// Chaque champ : liste de préfixes normalisés ; `nth` sert aux en-têtes dupliqués (DTS puis DGV).
const FIELDS = [
  ['gerance', 'secteur gerance'],
  ['siteId', 'no de site'],
  ['siteNom', 'nom du site'],
  ['adresse', 'adresse'],
  ['deptCode', 'code departement'],
  ['dept', 'departement'],
  ['office', 'office'],
  ['direction', 'direction'],
  ['service', 'service'],
  ['surfReelle', 'surface reelle'],
  ['surfBudg', 'surface budgetaire'],
  ['exception', "biens d'exception"],
  ['patrimoniale', 'valeur patrimoniale'],
  ['cession', 'decision cession'],
  ['conformeDTS', "lieu conforme a l'activite", 0],
  ['reloger', 'candidat a reloger'],
  ['pisteRelogement', 'piste de relogement'],
  ['pisteRocade', 'piste de rocade'],
  ['commentaireDTS', 'commentaire dts'],
  ['conformeDGV', "lieu conforme a l'activite", 1],
  ['raisonNonConformite', 'raison de la non'],
  ['commentaireDGV', 'commentaire dgv'],
  ['vnc', 'valeur nette au bilan'],
  ['stratus', 'valeur actuelle estimee'],
];

const REQUIRED = ['siteId', 'siteNom', 'dept', 'surfReelle'];
const NUMERIC = new Set(['surfReelle', 'surfBudg', 'vnc', 'stratus']);

function findHeader(grid) {
  for (let i = 0; i < Math.min(grid.length, 60); i++) {
    const cells = (grid[i] || []).map(norm);
    if (cells.includes('no de site') && cells.some((c) => c.startsWith('surface reelle'))) return i;
  }
  return -1;
}

function mapColumns(headerRow) {
  const cells = headerRow.map(norm);
  const seen = {};
  const map = {};
  for (const [key, prefix, nth = 0] of FIELDS) {
    const exact = cells.findIndex((c, idx) => c === prefix && !Object.values(map).includes(idx));
    let idx = -1;
    if (nth > 0 || FIELDS.filter((f) => f[1] === prefix).length > 1) {
      const all = cells.reduce((a, c, i) => (c.startsWith(prefix) ? [...a, i] : a), []);
      idx = all[nth] ?? -1;
    } else if (exact >= 0) {
      idx = exact;
    } else {
      idx = cells.findIndex((c, i) => c.startsWith(prefix) && !Object.values(map).includes(i));
    }
    if (idx >= 0) map[key] = idx;
    seen[key] = idx;
  }
  return map;
}

/** Retourne { rows, meta } depuis un classeur SheetJS. */
function parseWorkbook(XLSX, wb) {
  let sheetName = null;
  let grid = null;
  let headerIdx = -1;
  for (const name of wb.SheetNames) {
    const g = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });
    const h = findHeader(g);
    if (h >= 0) {
      sheetName = name;
      grid = g;
      headerIdx = h;
      break;
    }
  }
  if (!grid) throw new Error("Feuille des occupants introuvable (colonnes « No de site » / « Surface réelle »).");

  const cols = mapColumns(grid[headerIdx]);
  const missing = REQUIRED.filter((k) => !(k in cols));
  if (missing.length) throw new Error(`Colonnes obligatoires manquantes : ${missing.join(', ')}`);

  const rows = [];
  for (let r = headerIdx + 1; r < grid.length; r++) {
    const line = grid[r] || [];
    const row = {};
    for (const [key, idx] of Object.entries(cols)) {
      row[key] = NUMERIC.has(key) ? num(line[idx]) : clean(line[idx]);
    }
    if (!row.siteId) continue;
    row.siteId = String(row.siteId).padStart(5, '0');
    rows.push(row);
  }

  const communes = parseCommunes(XLSX, wb);
  const title = clean(grid[0]?.[0]);
  const dateLine = grid.slice(0, 5).flat().map(clean).find((v) => v && /\d{2}\.\d{2}\.\d{4}/.test(v));

  return {
    rows,
    communes,
    meta: {
      sheetName,
      title,
      sourceDate: dateLine ? dateLine.match(/\d{2}\.\d{2}\.\d{4}/)[0] : null,
      columnsFound: Object.keys(cols).length,
      columnsExpected: FIELDS.length,
    },
  };
}

// Feuille « Parcelle » (optionnelle) : donne la commune par numéro de site.
function parseCommunes(XLSX, wb) {
  const out = {};
  for (const name of wb.SheetNames) {
    if (norm(name) !== 'parcelle') continue;
    const g = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });
    const h = g.findIndex((r) => (r || []).map(norm).includes('no de site'));
    if (h < 0) continue;
    const head = g[h].map(norm);
    const iSite = head.indexOf('no de site');
    const iCom = head.indexOf('commune');
    if (iCom < 0) continue;
    for (let r = h + 1; r < g.length; r++) {
      const site = clean(g[r]?.[iSite]);
      const com = clean(g[r]?.[iCom]);
      if (site && com) out[String(site).padStart(5, '0')] = com;
    }
  }
  return out;
}
