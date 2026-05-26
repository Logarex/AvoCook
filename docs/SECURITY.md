# Sécurité

Notes rapides sur les choix actuels.

## Identifiants

Les mots de passe d'application Nextcloud sont stockés avec Expo SecureStore.
Ils ne sont pas écrits dans SQLite.

Les logs ne doivent jamais afficher l'en-tête `Authorization`.

## Réseau

Les serveurs distants doivent utiliser HTTPS. HTTP est accepté uniquement pour
`localhost`, `127.0.0.1` et `::1` pendant le développement.

L'app utilise Basic Auth avec l'identifiant Nextcloud et le mot de passe
d'application. Elle ne gère pas de session web Nextcloud.

## Import web

L'import lit seulement les métadonnées de recette disponibles dans la page. Il
ne contourne pas les paywalls et ne cherche pas à imiter un navigateur complet.

## Stockage local

SQLite contient les recettes en clair dans le stockage de l'application. C'est
acceptable pour l'objectif actuel du projet, mais ce n'est pas un coffre chiffré.

Pour un besoin plus sensible, il faudrait ajouter un chiffrement natif de la
base ou limiter davantage la copie locale des recettes synchronisées.
