const nf = new Intl.NumberFormat('fr-CH', { maximumFractionDigits: 0 });

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const fmtNum = (n) => (n === null || n === undefined ? '–' : nf.format(n));
const fmtM2 = (n) => (n === null || n === undefined ? '–' : `${nf.format(n)} m²`);

function fmtCHF(n) {
  if (n === null || n === undefined) return '–';
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)} Mrd CHF`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)} MCHF`;
  return `${nf.format(n)} CHF`;
}

const fmtDate = (iso) => new Date(iso).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' });

function toCSV(rows, columns) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = columns.map((c) => q(c.label)).join(';');
  const body = rows.map((r) => columns.map((c) => q(c.get(r))).join(';'));
  return '\ufeff' + [head, ...body].join('\r\n');
}

function download(name, content, type = 'text/csv;charset=utf-8') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
