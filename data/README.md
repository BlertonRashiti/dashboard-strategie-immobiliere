# Données

- `raw/` (ignoré par git) : fichiers Excel sources (`AAAA.MM_Analyse portefeuille.xlsx`).
- `snapshots/` : versions exportées depuis l'app (bouton « Exporter JSON » de l'onglet Historique),
  nommées `snapshot_<date>.json`. À versionner **uniquement si la publication est autorisée**.

Une version = lignes « occupants » normalisées + communes par site + empreinte du fichier source.
L'import d'un JSON se fait avec le même bouton que l'Excel.

## Colonnes attendues (feuille « Liste des occupants »)

Détectées par leur intitulé, dans n'importe quel ordre : Secteur gérance, No de site, Nom du site, Adresse,
Département, Office, Direction, Service, Surface réelle, Surface budgétaire, Biens d'exception,
Valeur patrimoniale, Décision cession provisoire, lieu conforme à l'activité (DTS puis DGV),
Candidat à reloger, Piste de relogement, Piste de rocade, commentaires DTS/DGV, Raison de la non-conformité,
Valeur nette au bilan, Valeur actuelle estimée Stratus. La feuille « Parcelle » (optionnelle) fournit la commune.
