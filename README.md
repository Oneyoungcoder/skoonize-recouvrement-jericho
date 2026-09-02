# Suivi des scolarités — outil de recouvrement

Petite app statique (HTML/CSS/JS, aucune dépendance) pour que la directrice
puisse chercher un élève, voir combien il doit, enregistrer un versement ou
le marquer comme soldé.

Les données de départ viennent des fichiers "repectoir_primaire_2025.xlsx"
et "Répertoire.xlsx" (année scolaire écoulée). Les paiements enregistrés
dans l'app sont sauvegardés **dans le navigateur de la directrice**
(localStorage) — pas de base de données, pas de compte à créer.

## Déployer sur Vercel (2 minutes)

**Option A — le plus simple, sans compte GitHub :**
1. Installer la CLI Vercel une fois : `npm install -g vercel`
2. Dans ce dossier : `vercel --prod`
3. Suivre les instructions (connexion avec un compte Vercel gratuit),
   répondre "N" à "link to existing project" si demandé.
4. Le lien de production s'affiche à la fin (ex: `impayes-ecole.vercel.app`).

**Option B — via GitHub :**
1. Pousser ce dossier dans un repo GitHub.
2. Sur vercel.com → "Add New Project" → importer le repo.
3. Aucune config nécessaire (site statique), cliquer "Deploy".

## Mettre à jour les données l'an prochain

Les données sont dans `data.js`. Pour les régénérer à partir d'un nouveau
fichier Excel, redemande à Claude de régénérer ce fichier avec les nouvelles
données — la structure attendue par ligne est :
`{ nom, niveau, classe, paye, reste, total, statut }`.
