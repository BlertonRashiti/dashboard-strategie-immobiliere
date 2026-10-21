const APP_VERSION = '0.2.0';
const SCHEMA_VERSION = 1;

const TARGET_CESSION_CHF = 52_000_000;
const TARGET_ANNUAL_GAIN_CHF = 1_200_000;

const STATUTS = {
  decide: { label: 'Cession envisagée', color: '#7c3aed', order: 0 },
  cessible: { label: 'Potentiellement cessible', color: '#dc2626', order: 1 },
  examiner: { label: 'À examiner', color: '#f59e0b', order: 2 },
  conserver: { label: 'À conserver', color: '#16a34a', order: 3 },
};

// Règles de scoring v1 : volontairement simples et lisibles, à valider avec les métiers.
const SCORING = {
  seuilCessible: 3,
  seuilExaminer: 1,
  points: {
    vacant: 3,
    nonConformeDTS: 2,
    nonConformeDGV: 2,
    candidatReloger: 2,
    pisteRocade: 1,
    pisteRelogement: 1,
    crNonMonetaire: 1,
    bienException: -2,
    valeurPatrimoniale: -2,
  },
};

const DEPT_LIBRE = 'LIBRE';
const DEPT_CR_NON_MONETAIRE = 'CR non monétaires';

const GEO = {
  searchUrl: 'https://api3.geo.admin.ch/rest/services/api/SearchServer',
  defaultLocality: 'Genève',
  center: [46.2044, 6.1432],
  delayMs: 120,
};
