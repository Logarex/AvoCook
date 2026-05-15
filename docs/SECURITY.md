# Sécurité / Security

[Français](#français) | [English](#english)

---

## Français

### Identifiants

- Les app passwords Nextcloud sont stockés via Expo SecureStore.
- Ils ne sont jamais persistés dans SQLite.
- Les logs applicatifs ne doivent pas afficher l'en-tête `Authorization`.

### Transport

L'app impose HTTPS pour les serveurs distants. HTTP est uniquement accepté pour `localhost`, `127.0.0.1` et `::1` en développement.

### API Cookbook

L'API externe Cookbook utilise Basic Auth avec identifiant + app password à chaque requête. L'app n'ouvre pas de session web et ne manipule pas de cookies Nextcloud.

La connexion n'est considérée valide qu'après une réponse OCS utilisateur avec `statuscode: 100`. Le endpoint capabilities seul ne suffit pas, car certaines instances peuvent le retourner même sans authentification valide.

### Import depuis le web

L'import local ne contourne pas les paywalls, ne tente pas de se faire passer pour un navigateur complet et se limite aux métadonnées schema.org Recipe disponibles publiquement dans la page.

### Données hors ligne

SQLite contient les recettes de l'utilisateur en clair dans le stockage applicatif. Pour une version très sensible, ajouter un chiffrement de base de données natif ou limiter le cache local dans les réglages.

L'option de copie locale peut être désactivée pour limiter la persistance hors ligne des recettes synchronisées avec Nextcloud. Le mode local, lui, repose nécessairement sur ce stockage local.

---

## English

### Credentials

- Nextcloud app passwords are stored via Expo SecureStore.
- They are never persisted in SQLite.
- Application logs must not display the `Authorization` header.

### Transport

The app enforces HTTPS for remote servers. HTTP is only accepted for `localhost`, `127.0.0.1`, and `::1` in development.

### Cookbook API

The external Cookbook API uses Basic Auth with username + app password for each request. The app does not open a web session and does not handle Nextcloud cookies.

The connection is only considered valid after a user OCS response with `statuscode: 100`. The capabilities endpoint alone is not enough, as some instances may return it even without valid authentication.

### Import from the Web

Local import does not bypass paywalls, does not attempt to pass itself off as a full browser, and is limited to publicly available schema.org Recipe metadata in the page.

### Offline Data

SQLite contains the user's recipes in plain text in the application storage. For a very sensitive version, add native database encryption or limit the local cache in settings.

The local copy option can be disabled to limit offline persistence of recipes synchronized with Nextcloud. Local mode, however, necessarily relies on this local storage.
