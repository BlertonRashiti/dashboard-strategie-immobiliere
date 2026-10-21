const isYes = (v) => !!v && /^oui\b/i.test(v.trim());
const isNo = (v) => !!v && /^non\b/i.test(v.trim());
const uniq = (a) => [...new Set(a.filter(Boolean))];
const maxOrNull = (a) => {
  const v = a.filter((x) => x !== null && x !== undefined);
  return v.length ? Math.max(...v) : null;
};
const sum = (a) => a.reduce((s, x) => s + (x || 0), 0);

function typeOccupant(dept) {
  if (dept === DEPT_LIBRE) return 'Libre / vacant';
  if (dept && dept.startsWith(DEPT_CR_NON_MONETAIRE)) return 'Associations (CR non monétaire)';
  return 'Services de l\'État';
}

function scoreSite(s) {
  const p = SCORING.points;
  const reasons = [];
  let score = 0;
  const add = (pts, label) => {
    score += pts;
    reasons.push({ pts, label });
  };
  if (s.depts.includes(DEPT_LIBRE) && s.depts.length === 1) add(p.vacant, 'Site libre / non affecté');
  if (s.conformeDTS.some(isNo)) add(p.nonConformeDTS, "Lieu non conforme à l'activité (DTS)");
  if (s.conformeDGV.some(isNo)) add(p.nonConformeDGV, "Lieu non conforme à l'activité (DGV)");
  if (s.reloger.some(isYes)) add(p.candidatReloger, 'Occupant candidat au relogement / regroupement');
  if (s.pistesRocade.length) add(p.pisteRocade, `Piste de rocade : ${s.pistesRocade.join(', ')}`);
  if (s.pistesRelogement.length) add(p.pisteRelogement, `Piste de relogement : ${s.pistesRelogement.join(', ')}`);
  if (s.typeOccupant.startsWith('Associations')) add(p.crNonMonetaire, 'Mis à disposition d’associations (CR non monétaire)');
  if (s.exception) add(p.bienException, "Bien d'exception");
  if (s.patrimoniale) add(p.valeurPatrimoniale, 'Valeur patrimoniale');

  let statut = 'conserver';
  if (s.cession) statut = 'decide';
  else if (score >= SCORING.seuilCessible) statut = 'cessible';
  else if (score >= SCORING.seuilExaminer) statut = 'examiner';
  return { score, reasons, statut };
}

/** Agrège les lignes « occupant » en une ligne par site. */
function buildSites(rows, communes = {}) {
  const bySite = new Map();
  for (const r of rows) {
    if (!bySite.has(r.siteId)) bySite.set(r.siteId, []);
    bySite.get(r.siteId).push(r);
  }
  const sites = [];
  for (const [id, lines] of bySite) {
    // Département principal = celui qui occupe le plus de surface.
    const deptSurf = {};
    for (const l of lines) deptSurf[l.dept] = (deptSurf[l.dept] || 0) + (l.surfReelle || 0);
    const depts = Object.keys(deptSurf).sort((a, b) => deptSurf[b] - deptSurf[a]);
    const vnc = maxOrNull(lines.map((l) => l.vnc));
    const stratus = maxOrNull(lines.map((l) => l.stratus));
    const site = {
      id,
      nom: lines[0].siteNom,
      adresse: lines[0].adresse,
      commune: communes[id] || null,
      gerance: lines[0].gerance,
      dept: depts[0] || null,
      depts,
      offices: uniq(lines.map((l) => l.office)),
      services: uniq(lines.map((l) => l.service)),
      nbOccupants: lines.length,
      surfReelle: sum(lines.map((l) => l.surfReelle)),
      surfBudg: sum(lines.map((l) => l.surfBudg)),
      vnc,
      stratus,
      plusValue: vnc !== null && stratus !== null ? stratus - vnc : null,
      exception: lines.some((l) => isYes(l.exception)),
      patrimoniale: lines.some((l) => isYes(l.patrimoniale)),
      cession: lines.some((l) => isYes(l.cession)),
      conformeDTS: uniq(lines.map((l) => l.conformeDTS)),
      conformeDGV: uniq(lines.map((l) => l.conformeDGV)),
      reloger: uniq(lines.map((l) => l.reloger)),
      pistesRelogement: uniq(lines.map((l) => l.pisteRelogement)),
      pistesRocade: uniq(lines.map((l) => l.pisteRocade)),
      commentaires: uniq(lines.flatMap((l) => [l.commentaireDTS, l.commentaireDGV, l.raisonNonConformite])),
    };
    site.typeOccupant = typeOccupant(site.dept);
    Object.assign(site, scoreSite(site));
    // Valeur de référence pour la cible : valeur actuelle estimée, à défaut la VNC.
    site.valeur = site.stratus ?? site.vnc ?? 0;
    sites.push(site);
  }
  return sites.sort((a, b) => a.id.localeCompare(b.id));
}
