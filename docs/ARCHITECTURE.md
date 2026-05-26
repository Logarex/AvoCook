# Architecture

Ces notes servent surtout à retrouver rapidement où se trouve quoi dans le
projet.

## Dossiers principaux

- `src/screens` : écrans React Navigation.
- `src/components` : composants visuels réutilisés dans l'app.
- `src/features/auth` : connexion Nextcloud et stockage des identifiants.
- `src/features/nextcloud` : appels HTTP vers l'API Cookbook.
- `src/features/recipes` : modèle recette, SQLite, sauvegarde, partage et sync.
- `src/features/import` : lecture des recettes depuis les pages web.
- `src/features/shopping` : liste de courses.
- `src/features/timers` : minuteurs et notifications.
- `modules/avocook-timer-notifications` : module natif Expo pour les alarmes.

## Données locales

SQLite est la source locale. Le mode local utilise uniquement cette base.

En mode Nextcloud, les recettes sont aussi gardées localement pour pouvoir les
lire hors ligne. Les créations et modifications sont écrites localement avant
d'être envoyées au serveur.

## Synchronisation

Au démarrage, l'app charge SQLite. Si un client Nextcloud est connecté, elle
essaie ensuite de pousser les changements en attente puis de récupérer l'état du
serveur Cookbook.

Quand une opération serveur échoue, elle reste dans `sync_queue` pour être
retentée plus tard.

## Import web

L'import commence par chercher un bloc JSON-LD `schema.org/Recipe` dans la page.
S'il est trouvé, l'app en extrait le nom, les ingrédients, les étapes, les temps,
les portions, l'image et quelques infos nutritionnelles.

Quand le parser local n'arrive pas à lire la page et qu'un compte Nextcloud est
connecté, l'app tente l'import serveur de Cookbook.
