# Stratégie immobilière – Tableau de bord du parc

Application web statique (HTML/JS, sans build) pour identifier les bâtiments de l'État potentiellement
séparables du parc (mesure 20 « Vente d'actifs non absolument nécessaires à l'État »).

- **Import** du fichier Excel « Analyse portefeuille » (source Archibus) directement dans le navigateur.
- **Chiffres & graphiques**, **carte** (couches swisstopo, cadastre), **tableau** exportable en CSV.
- **Filtres partagés** : statut, département, office, gérance, type d'occupant, commune, valeur, surface…
- **Historisation** : chaque import = une version, comparaison entre versions, export/import JSON.
- Aucune donnée n'est envoyée à un serveur (seule la géolocalisation des adresses interroge `api3.geo.admin.ch`).

## Lancer en local

Double-cliquez sur `index.html` : l'application fonctionne sans serveur (scripts classiques, librairies dans `vendor/`).
Un serveur local reste possible : `python -m http.server 8080`, puis http://localhost:8080.

## Déployer

Voir [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md).

## Structure

| Dossier | Rôle |
|---|---|
| `index.html`, `src/` | Application (`js/` : parser, modèle, filtres, graphiques, carte, stockage, diff) |
| `vendor/` | Librairies figées : Leaflet 1.9.4, Chart.js 4.4.4, SheetJS 0.18.5 (pas de CDN, déploiement autonome) |
| `data/snapshots/` | Versions de données **anonymisées/autorisées** à versionner (voir `data/README.md`) |
| `docs/` | Architecture, règles métier, déploiement |
| `tests/` | Tests unitaires (`node --test tests/`) ; `XLSX_PATH=<fichier>` ajoute un test sur le vrai fichier |
| `.github/workflows/` | Déploiement GitHub Pages |

## Versioning

- Application : [SemVer](https://semver.org), voir [CHANGELOG.md](CHANGELOG.md) et `src/js/config.js` (`APP_VERSION`).
- Données : une version par import (empreinte SHA-256, date, nom du fichier).

## Données sensibles

Les fichiers `.xlsx` sont exclus par `.gitignore`. Ne versionnez dans `data/snapshots/` que des données
dont la publication est autorisée : GitHub Pages est public par défaut.
