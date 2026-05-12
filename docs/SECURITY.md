# Sécurité

## Identifiants

- Les app passwords Nextcloud sont stockés via Expo SecureStore.
- Ils ne sont jamais persistés dans SQLite.
- Les logs applicatifs ne doivent pas afficher l'en-tête `Authorization`.

## Transport

L'app impose HTTPS pour les serveurs distants. HTTP est uniquement accepté pour `localhost`, `127.0.0.1` et `::1` en développement.

## API Cookbook

L'API externe Cookbook utilise Basic Auth avec identifiant + app password à chaque requête. L'app n'ouvre pas de session web et ne manipule pas de cookies Nextcloud.

## Import depuis le web

L'import local ne contourne pas les paywalls, ne tente pas de se faire passer pour un navigateur complet et se limite aux métadonnées schema.org Recipe disponibles publiquement dans la page.

## Données hors ligne

SQLite contient les recettes de l'utilisateur en clair dans le stockage applicatif. Pour une version très sensible, ajouter un chiffrement de base de données natif ou limiter le cache local dans les réglages.
