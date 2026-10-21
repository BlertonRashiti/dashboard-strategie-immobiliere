const SIMPLE = ['dept', 'gerance', 'statut', 'typeOccupant', 'commune'];

function emptyFilters() {
  return {
    dept: new Set(),
    gerance: new Set(),
    statut: new Set(),
    typeOccupant: new Set(),
    commune: new Set(),
    office: new Set(),
    texte: '',
    exclureException: false,
    exclurePatrimoniale: false,
    valeurMin: null,
    surfaceMin: null,
  };
}

function applyFilters(sites, f) {
  const t = f.texte.trim().toLowerCase();
  return sites.filter((s) => {
    for (const k of SIMPLE) if (f[k].size && !f[k].has(s[k] ?? '(vide)')) return false;
    if (f.office.size && !s.offices.some((o) => f.office.has(o))) return false;
    if (f.exclureException && s.exception) return false;
    if (f.exclurePatrimoniale && s.patrimoniale) return false;
    if (f.valeurMin !== null && s.valeur < f.valeurMin) return false;
    if (f.surfaceMin !== null && s.surfReelle < f.surfaceMin) return false;
    if (t) {
      const hay = `${s.id} ${s.nom} ${s.adresse} ${s.commune ?? ''} ${s.services.join(' ')}`.toLowerCase();
      if (!hay.includes(t)) return false;
    }
    return true;
  });
}

function facetValues(sites, key) {
  const counts = new Map();
  for (const s of sites) {
    const vals = key === 'office' ? s.offices : [s[key] ?? '(vide)'];
    for (const v of vals) counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

const statutLabel = (k) => STATUTS[k]?.label ?? k;
