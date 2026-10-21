# Changelog

Format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage [SemVer](https://semver.org/lang/fr/).

## [0.2.0] – 2026-10-21
### Modifié
- L'application s'ouvre et l'import fonctionne en double-cliquant sur `index.html` (scripts classiques à la place des modules ES).
- Thème noir/anthracite à la place du rouge.
- Statut « Cession décidée » renommé « Cession envisagée ».
### Ajouté
- Emplacement du logo de l'État (`assets/logo.png`).
- Guide de déploiement `docs/DEPLOIEMENT.md`.

## [0.1.0] – 2026-10-20
### Ajouté
- Import Excel « Analyse portefeuille » (1020 lignes occupants → 493 sites) avec détection automatique des colonnes.
- Statut de cessibilité par site (règles v1 configurables) et KPI face à la cible de 52 MCHF.
- Vues chiffres/graphiques, carte (géolocalisation geo.admin.ch mise en cache, couches swisstopo et cadastre), tableau + export CSV.
- Filtres multi-axes partagés entre les vues.
- Historisation locale (IndexedDB), comparaison de versions, export/import JSON.
- Workflow de déploiement GitHub Pages.
