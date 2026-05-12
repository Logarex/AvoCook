# Nextcloud Cookbook Mobile

Application mobile iOS, iPadOS et Android pour consulter, importer, créer et modifier des recettes synchronisées avec l'application Nextcloud Cookbook.

## Fonctionnalités

- Connexion directe à un serveur Nextcloud via app password.
- Synchronisation avec l'API publique Nextcloud Cookbook `0.1.3`.
- Recettes disponibles hors ligne avec cache SQLite local.
- File de synchronisation pour créations, modifications et suppressions hors connexion.
- Import depuis une URL via l'endpoint Cookbook, puis fallback JSON-LD schema.org côté mobile.
- Import pensé pour les grands sites de recettes français et internationaux exposant schema.org Recipe, dont Marmiton, CuisineAZ, 750g, Chefkoch, BBC Good Food, Allrecipes, GialloZafferano et Cookpad.
- Ajout et modification manuels avec champs clairs.
- Thèmes clair/sombre/système et langues français/anglais.
- Interface adaptative avec surfaces glass sur iOS et rendu sobre sur Android.
- Option pour garder l'écran allumé pendant la consultation d'une recette.

## Stack

- Expo React Native + TypeScript
- React Navigation
- Expo SecureStore pour les identifiants
- Expo SQLite pour le mode hors ligne
- Expo Blur/Image/KeepAwake pour l'expérience mobile
- i18next pour l'internationalisation
- Vitest pour les tests unitaires purs

## Installation

```bash
npm install
npm run start
```

Puis lancer l'app dans Expo Go, un simulateur iOS, un émulateur Android ou un development build.

## Connexion Nextcloud

1. Installer et activer l'application Cookbook sur le serveur Nextcloud.
2. Créer un mot de passe d'application dans Nextcloud.
3. Se connecter dans l'app avec l'URL du serveur, l'identifiant et l'app password.

L'app refuse les URL HTTP sauf `localhost` pendant le développement.

## Publication

La configuration `eas.json` prépare trois profils :

- `development` pour les builds internes avec dev client.
- `preview` pour TestFlight ou distribution Android interne.
- `production` pour App Store Connect et Google Play.

Avant publication, remplacer les assets dans `assets/`, créer le projet EAS, puis mettre à jour `extra.eas.projectId` dans `app.json`.

```bash
npx eas init
npx eas build --platform ios --profile production
npx eas build --platform android --profile production
```

## Tests

```bash
npm run typecheck
npm test
```

## Notes sur l'import de recettes

Nextcloud Cookbook importe déjà les pages contenant des métadonnées schema.org Recipe. L'app utilise ce mécanisme en priorité pour que la recette arrive directement dans le serveur de l'utilisateur. Si le serveur ne peut pas importer la page, l'app tente une extraction JSON-LD locale puis crée la recette dans Cookbook.

Les sites qui changent souvent leur HTML doivent être ajoutés sous forme d'adapters dédiés dans `src/features/import/` plutôt que via du scraping fragile.
