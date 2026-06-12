# Version (Release)

Petite liste de vérification pour éviter les oublis avant de publier une version.

## Avant la compilation

- Mettre à jour la version dans `app.json`.
- Vérifier que les icônes et l'écran de démarrage sont corrects.
- Relire `PRIVACY.md` si une fonctionnalité réseau ou de stockage a changé.
- Tester le mode local sans compte.
- Tester une connexion Nextcloud avec un mot de passe d'application.
- Tester l'importation de recettes depuis au moins Marmiton, 750g ou BBC Good Food.
- Tester la création, l'édition et la suppression d'une recette en mode avion.
- Tester les minuteurs sur un véritable appareil.
- Vérifier le mode clair/sombre et au moins le français/anglais.

## Vérifications locales

```bash
npm run typecheck
npm test
npm run lint
```

Pour une vérification d'importation précise :

```bash
npm run import:check -- <url>
```

## Builds EAS

```bash
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview
npx eas build --platform all --profile production
```

## iOS

L'application est configurée pour iPhone et iPad. Elle n'utilise pas de notifications push distantes, de services de localisation ou de Bluetooth.

L'autorisation de réseau local est utilisée uniquement pour les serveurs Nextcloud sur le même réseau, ou pour le client Expo pendant le développement.

## Android

La configuration Android principale se trouve dans `app.json`.

## Soumission

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

AvoCook est un client indépendant compatible avec Nextcloud Cookbook. Il ne doit pas être présenté comme une application Nextcloud officielle.
