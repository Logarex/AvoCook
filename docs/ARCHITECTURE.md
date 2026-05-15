# Architecture

[Français](#français) | [English](#english)

---

## Français

### Couches principales

- `src/screens`: écrans de navigation, sans logique serveur lourde.
- `src/components`: design system mobile réutilisable.
- `src/features/auth`: connexion Nextcloud et stockage sécurisé.
- `src/features/nextcloud`: client HTTP Cookbook.
- `src/features/recipes`: modèle recette, repository offline-first, SQLite et provider React.
- `src/features/import`: import schema.org Recipe depuis URL.
- `src/features/preferences`: langue, thème et option anti-verrouillage.

### Flux de synchronisation

1. L'utilisateur se connecte avec une URL Nextcloud, un identifiant et un app password, ou choisit le mode local.
2. L'app valide l'app password avec `/ocs/v2.php/cloud/user?format=json`.
3. L'app teste ensuite `/ocs/v2.php/cloud/capabilities?format=json`.
4. Au démarrage, les recettes locales sont lues depuis SQLite.
5. Si le serveur est disponible, la file `sync_queue` est poussée.
6. L'app récupère la liste Cookbook puis les détails de chaque recette.
7. Les recettes sont sauvegardées localement selon l'option de copie locale.

### Offline-first

Les créations et modifications sont sauvegardées immédiatement en local. Si l'appel serveur échoue, une opération est ajoutée à `sync_queue`. La prochaine synchronisation rejoue la file dans l'ordre.

### Import

L'import utilise d'abord `POST /apps/cookbook/api/v1/import` côté Nextcloud. Ce choix garde le serveur comme source de vérité et respecte le comportement officiel Cookbook. Le fallback mobile parse les blocs JSON-LD `application/ld+json`, cherche un objet `@type: Recipe`, puis normalise les ingrédients, étapes, temps, portions, image et nutrition.

Les images importées depuis des sites peuvent être copiées dans le stockage de l'app pour rester disponibles hors ligne.

---

## English

### Main Layers

- `src/screens`: navigation screens, without heavy server logic.
- `src/components`: reusable mobile design system.
- `src/features/auth`: Nextcloud connection and secure storage.
- `src/features/nextcloud`: Cookbook HTTP client.
- `src/features/recipes`: recipe model, offline-first repository, SQLite, and React provider.
- `src/features/import`: schema.org Recipe import from URL.
- `src/features/preferences`: language, theme, and anti-lock option.

### Sync Flow

1. User logs in with a Nextcloud URL, username, and app password, or chooses local mode.
2. The app validates the app password with `/ocs/v2.php/cloud/user?format=json`.
3. The app then tests `/ocs/v2.php/cloud/capabilities?format=json`.
4. On startup, local recipes are read from SQLite.
5. If the server is available, the `sync_queue` is pushed.
6. The app fetches the Cookbook list and then the details for each recipe.
7. Recipes are saved locally according to the local copy option.

### Offline-first

Creations and modifications are saved immediately locally. If the server call fails, an operation is added to `sync_queue`. The next synchronization replays the queue in order.

### Import

Import first uses `POST /apps/cookbook/api/v1/import` on the Nextcloud side. This choice keeps the server as the source of truth and respects the official Cookbook behavior. The mobile fallback parses `application/ld+json` JSON-LD blocks, looks for a `@type: Recipe` object, then normalizes ingredients, steps, times, servings, image, and nutrition.

Images imported from sites can be copied to the app's storage to remain available offline.
