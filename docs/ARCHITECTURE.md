# Architecture

## Couches principales

- `src/screens`: écrans de navigation, sans logique serveur lourde.
- `src/components`: design system mobile réutilisable.
- `src/features/auth`: connexion Nextcloud et stockage sécurisé.
- `src/features/nextcloud`: client HTTP Cookbook.
- `src/features/recipes`: modèle recette, repository offline-first, SQLite et provider React.
- `src/features/import`: import schema.org Recipe depuis URL.
- `src/features/preferences`: langue, thème et option anti-verrouillage.

## Flux de synchronisation

1. L'utilisateur se connecte avec une URL Nextcloud, un identifiant et un app password.
2. L'app teste `/ocs/v2.php/cloud/capabilities?format=json`.
3. Au démarrage, les recettes locales sont lues depuis SQLite.
4. Si le serveur est disponible, la file `sync_queue` est poussée.
5. L'app récupère la liste Cookbook puis les détails de chaque recette.
6. Les recettes sont sauvegardées localement pour usage hors ligne.

## Offline-first

Les créations et modifications sont sauvegardées immédiatement en local. Si l'appel serveur échoue, une opération est ajoutée à `sync_queue`. La prochaine synchronisation rejoue la file dans l'ordre.

## Import

L'import utilise d'abord `POST /apps/cookbook/api/v1/import` côté Nextcloud. Ce choix garde le serveur comme source de vérité et respecte le comportement officiel Cookbook. Le fallback mobile parse les blocs JSON-LD `application/ld+json`, cherche un objet `@type: Recipe`, puis normalise les ingrédients, étapes, temps, portions, image et nutrition.
