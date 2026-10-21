const charts = {};

function draw(id, config) {
  charts[id]?.destroy();
  charts[id] = new Chart(document.getElementById(id), config);
}

const group = (sites, keyFn, valFn) => {
  const m = new Map();
  for (const s of sites) m.set(keyFn(s), (m.get(keyFn(s)) || 0) + valFn(s));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

const short = (t, n = 38) => (t.length > n ? t.slice(0, n - 1) + '…' : t);

function renderCharts(sites) {
  const keys = Object.keys(STATUTS);
  const colors = keys.map((k) => STATUTS[k].color);
  const labels = keys.map((k) => STATUTS[k].label);

  draw('chart-statut', {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: keys.map((k) => sites.filter((s) => s.statut === k).length), backgroundColor: colors }],
    },
    options: { plugins: { legend: { position: 'right' } } },
  });

  draw('chart-valeur-statut', {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: keys.map((k) => sites.filter((s) => s.statut === k).reduce((a, s) => a + s.valeur, 0)), backgroundColor: colors }],
    },
    options: {
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmtCHF(c.raw) } } },
      scales: { y: { ticks: { callback: (v) => fmtCHF(v) } } },
    },
  });

  const depts = group(sites, (s) => s.dept ?? '(vide)', (s) => s.surfReelle).slice(0, 12);
  draw('chart-dept', {
    type: 'bar',
    data: {
      labels: depts.map((d) => short(d[0], 30)),
      datasets: keys.map((k) => ({
        label: STATUTS[k].label,
        backgroundColor: STATUTS[k].color,
        data: depts.map(([d]) => sites.filter((s) => (s.dept ?? '(vide)') === d && s.statut === k).reduce((a, s) => a + s.surfReelle, 0)),
      })),
    },
    options: {
      indexAxis: 'y',
      scales: { x: { stacked: true, title: { display: true, text: 'Surface réelle (m²)' } }, y: { stacked: true } },
      plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmtNum(c.raw)} m²` } } },
    },
  });

  const top = [...sites].filter((s) => s.statut === 'cessible' || s.statut === 'decide').sort((a, b) => b.valeur - a.valeur).slice(0, 15);
  draw('chart-top', {
    type: 'bar',
    data: {
      labels: top.map((s) => short(s.nom)),
      datasets: [{ data: top.map((s) => s.valeur), backgroundColor: top.map((s) => STATUTS[s.statut].color) }],
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmtCHF(c.raw) } } },
      scales: { x: { ticks: { callback: (v) => fmtCHF(v) } } },
    },
  });

  const types = group(sites, (s) => s.typeOccupant, (s) => 1);
  draw('chart-type', {
    type: 'pie',
    data: { labels: types.map((t) => t[0]), datasets: [{ data: types.map((t) => t[1]), backgroundColor: ['#2563eb', '#f59e0b', '#9ca3af'] }] },
    options: { plugins: { legend: { position: 'right' } } },
  });

  const ger = group(sites, (s) => s.gerance ?? '(vide)', (s) => s.valeur);
  draw('chart-gerance', {
    type: 'bar',
    data: { labels: ger.map((g) => g[0]), datasets: [{ data: ger.map((g) => g[1]), backgroundColor: '#2563eb' }] },
    options: {
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmtCHF(c.raw) } } },
      scales: { y: { ticks: { callback: (v) => fmtCHF(v) } } },
    },
  });
}
