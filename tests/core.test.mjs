import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Les sources sont des scripts classiques : on les charge comme le navigateur, dans un même contexte.
const ctx = vm.createContext({ console });
const src = ['config', 'format', 'parser', 'model', 'filters', 'diff'].map((f) => read(`../src/js/${f}.js`)).join('\n');
vm.runInContext(src + '\n;globalThis.api = { parseWorkbook, buildSites, applyFilters, emptyFilters, diffSnapshots };', ctx);
const { parseWorkbook, buildSites, applyFilters, emptyFilters, diffSnapshots } = ctx.api;

// vendor/ est chargé comme CommonJS (le package est en ESM).
const mod = { exports: {} };
new Function('module', 'exports', 'require', read('../vendor/xlsx.full.min.js'))(mod, mod.exports, require);
const XLSX = mod.exports;

const sample = (rows) => {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Titre'],
    [],
    ['Secteur gérance', 'No de site', 'Nom du site', 'Adresse', 'Département', 'Surface réelle m²', 'Surface budgétaire m²', 'Décision cession provisoire', "lieu conforme à l'activité", "lieu conforme à l'activité", 'VALEUR NETTE AU BILAN (30.09.2026)'],
    ...rows,
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Occupants');
  return wb;
};

test('parse + agrégation par site + scoring', () => {
  const wb = sample([
    ['G1', '1', 'Site A', 'Rue 1', 'LIBRE', 100, 120, null, 'non', 'non', 500],
    ['G1', '1', 'Site A', 'Rue 1', 'LIBRE', 50, 60, null, null, null, null],
    ['G2', '2', 'Site B', 'Rue 2', 'Territoire', 10, 12, 'oui', 'oui', 'oui', 100],
  ]);
  const { rows } = parseWorkbook(XLSX, wb);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].siteId, '00001');
  const sites = buildSites(rows);
  assert.equal(sites.length, 2);
  assert.equal(sites[0].surfReelle, 150);
  assert.equal(sites[0].vnc, 500);
  assert.equal(sites[0].statut, 'cessible');
  assert.equal(sites[1].statut, 'decide');
});

test('filtres et diff', () => {
  const wb = sample([
    ['G1', '1', 'Site A', 'Rue 1', 'LIBRE', 100, 120, null, 'non', 'non', 500],
    ['G2', '2', 'Site B', 'Rue 2', 'Territoire', 10, 12, null, 'oui', 'oui', 100],
  ]);
  const sites = buildSites(parseWorkbook(XLSX, wb).rows);
  const f = emptyFilters();
  f.dept.add('LIBRE');
  assert.equal(applyFilters(sites, f).length, 1);
  const next = buildSites(parseWorkbook(XLSX, sample([['G1', '1', 'Site A', 'Rue 1', 'LIBRE', 200, 120, null, 'non', 'non', 500]])).rows);
  const d = diffSnapshots(sites, next);
  assert.equal(d.removed.length, 1);
  assert.equal(d.changed.length, 1);
});

const real = process.env.XLSX_PATH;
test('fichier réel (si XLSX_PATH défini)', { skip: !real || !existsSync(real) }, () => {
  const { rows, meta } = parseWorkbook(XLSX, XLSX.read(readFileSync(real)));
  assert.equal(meta.columnsFound, meta.columnsExpected);
  const sites = buildSites(rows);
  console.log(meta, rows.length, sites.length);
  const by = {};
  for (const s of sites) by[s.statut] = (by[s.statut] || 0) + 1;
  console.log(by, sites.reduce((a, s) => a + (s.vnc || 0), 0));
});
