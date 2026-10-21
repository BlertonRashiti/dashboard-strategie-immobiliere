const TRACKED = [
  ['statut', 'Statut'],
  ['dept', 'Département'],
  ['surfReelle', 'Surface réelle'],
  ['vnc', 'VNC'],
  ['stratus', 'Valeur Stratus'],
  ['cession', 'Décision de cession'],
  ['nbOccupants', "Nb d'occupants"],
];

const same = (a, b) =>
  typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 0.5 : a === b;

/** Compare deux listes de sites (ancien → nouveau). */
function diffSnapshots(oldSites, newSites) {
  const o = new Map(oldSites.map((s) => [s.id, s]));
  const n = new Map(newSites.map((s) => [s.id, s]));
  const added = [];
  const removed = [];
  const changed = [];
  for (const [id, s] of n) {
    const prev = o.get(id);
    if (!prev) {
      added.push(s);
      continue;
    }
    const changes = TRACKED.filter(([k]) => !same(prev[k], s[k])).map(([k, label]) => ({
      field: k,
      label,
      from: prev[k],
      to: s[k],
    }));
    if (changes.length) changed.push({ site: s, changes });
  }
  for (const [id, s] of o) if (!n.has(id)) removed.push(s);
  return { added, removed, changed };
}
