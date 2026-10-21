# Guide de déploiement sur GitHub Pages

Résultat : l'application en ligne à l'adresse `https://<votre-compte>.github.io/<nom-du-depot>/`,
comme https://blertonrashiti.github.io/dashboard-projets-ocba/.

## Avant de commencer

1. **Compte GitHub** : celui de `blertonrashiti` ou un compte d'organisation.
2. **Logo** : déposez le logo de l'État de Genève dans `assets/logo.png` (fond transparent ou blanc, hauteur ~100 px minimum).
   Tant que le fichier est absent, l'en-tête s'affiche sans logo.
3. **Confidentialité** : un site GitHub Pages est **public** (un dépôt privé ne peut publier Pages qu'avec une offre payante,
   et le site reste alors accessible à quiconque connaît l'adresse sauf offre Enterprise).
   Les données du parc ne sont **pas** dans le code : chaque utilisateur importe son fichier Excel, qui reste dans son navigateur.
   Ne mettez jamais le fichier Excel ni de JSON de données dans le dépôt sans accord de l'OCBA/DTS.
   Le `.gitignore` bloque déjà les `.xlsx`.

## Méthode A : avec Git (recommandée, garde l'historique)

1. Installer [Git pour Windows](https://git-scm.com/download/win) (et éventuellement [GitHub Desktop](https://desktop.github.com)).
2. Sur github.com : **New repository** → nom (ex. `dashboard-strategie-immobiliere`), **Public**, sans README ni .gitignore.
3. Dans un terminal, depuis le dossier `dashboard-strategie-immobiliere` :
   ```
   git init -b main
   git add .
   git commit -m "v0.2.0 : première version du tableau de bord"
   git remote add origin https://github.com/<compte>/<depot>.git
   git push -u origin main
   ```
4. Sur GitHub : **Settings → Pages → Build and deployment → Source : « GitHub Actions »**.
5. Onglet **Actions** : le workflow « Déploiement GitHub Pages » démarre (tests puis publication, ~1 min).
   L'adresse du site apparaît à la fin du job et dans Settings → Pages.

## Méthode B : sans Git (envoi par navigateur)

1. Créer le dépôt comme ci-dessus.
2. **Add file → Upload files** : glisser le contenu du dossier (y compris `.github/` : si le dossier caché n'est pas accepté, le créer
   via **Add file → Create new file** en tapant `.github/workflows/pages.yml` et en collant le contenu du fichier).
3. Même réglage Pages (étape 4 ci-dessus).

## Publier une nouvelle version

1. Modifier le code, incrémenter `APP_VERSION` dans `src/js/config.js`, ajouter une entrée dans `CHANGELOG.md`.
2. `git add . && git commit -m "..." && git push` : le site se met à jour tout seul.
3. Pour marquer une version : `git tag v0.2.0 && git push --tags` (ou « Releases » sur GitHub).
4. Les données (versions importées) sont dans le navigateur de chaque utilisateur et ne sont pas touchées par un déploiement.

## Utiliser l'application

- En ligne : ouvrir l'adresse Pages, puis « Importer un fichier Excel ».
- Hors ligne / sans internet : ouvrir `index.html` directement (double-clic). La carte et la localisation des adresses demandent internet.

## Dépannage

- **Page 404** : attendre la fin du workflow, vérifier Settings → Pages → Source = GitHub Actions.
- **Workflow en échec** : lire l'onglet Actions ; l'étape de tests doit passer.
- **Carte vide** : cliquer sur « Localiser les sites » (une fois par navigateur ; le résultat est mis en cache).
- **Données perdues** : elles sont par navigateur et par adresse ; exportez les versions en JSON pour les sauvegarder.
