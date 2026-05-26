# Release

Checklist courte pour éviter les oublis avant de publier une version.

## Avant de builder

- Mettre à jour la version dans `app.json`.
- Vérifier que les icônes et le splash sont les bons.
- Relire `PRIVACY.md` si une fonctionnalité réseau ou stockage a changé.
- Tester le mode local sans compte.
- Tester une connexion Nextcloud avec un mot de passe d'application.
- Tester l'import d'une recette depuis au moins Marmiton, 750g ou BBC Good Food.
- Tester une création, une édition et une suppression en mode avion.
- Tester les minuteurs sur un vrai téléphone.
- Vérifier clair/sombre et au moins français/anglais.

## Vérifications locales

```bash
npm run typecheck
npm test
npm run lint
```

Pour un import précis :

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

L'app est configurée pour iPhone et iPad. Elle n'utilise pas de push distant,
pas de localisation et pas de Bluetooth.

La permission réseau local sert uniquement aux serveurs Nextcloud sur le même
réseau, ou au client Expo pendant le développement.

## Android

La config Android principale est dans `app.json`.

Pour le détail des APK GitHub, IzzyOnDroid et F-Droid, voir
[`ANDROID_DISTRIBUTION.md`](ANDROID_DISTRIBUTION.md).

## Soumission

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

AvoCook est un client indépendant compatible avec Nextcloud Cookbook. Il ne doit
pas être présenté comme une application officielle Nextcloud.
