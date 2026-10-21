# Architecture et déploiement

## Flux
`Excel` → `parser.js` (lignes occupants) → `store.js` (snapshot IndexedDB) → `model.js` (agrégation par site + score)
→ `filters.js` → vues (`charts.js`, `map.js`, tableau dans `main.js`). `diff.js` compare deux snapshots.
Les fichiers de `src/js/` sont des scripts classiques chargés dans l'ordre de `index.html` (pas de modules ES, pour que
l'ouverture directe du fichier fonctionne) ; ils partagent la portée globale.

## Choix
- Pas de build ni de backend : déploiement = copie des fichiers (GitHub Pages, ou intranet de l'État).
- Librairies dans `vendor/` : pas de dépendance CDN à l'exécution.
- Un site = un `No de site` ; surfaces sommées sur les occupants, valeurs (VNC, Stratus) prises une fois par site
  (elles ne sont renseignées qu'une fois par site dans le fichier).
- Géolocalisation : l'Excel n'a pas de coordonnées ; les adresses sont géocodées via geo.admin.ch (cache local).

## Déploiement GitHub Pages
1. Créer le dépôt, pousser sur `main`.
2. Settings → Pages → Source : « GitHub Actions ». Le workflow `.github/workflows/pages.yml` publie le site.
3. Attention : un site Pages est public. Les données restent chez l'utilisateur (import local), rien n'est publié
   tant que `data/snapshots/` est vide.

## Évolutions prévues
Couches SITG (parcelles, zones), règles de cessibilité validées avec l'OCBA, annotations par site, preload des snapshots.
