# Préparer une publication

## Préparer la version

Gardez app.json, package.json, package-lock.json et store/release.json cohérents. Vérifiez le numéro de build iOS et le code de version Android. Actualisez les nouveautés dans les six langues ; les descriptions permanentes présentent l’application sans annonce de version.

## Contrôles automatiques

```sh
npm ci
npm ci --prefix notification-relay
npm run typecheck
npm run lint -- --max-warnings=0
npm test
npm test --prefix notification-relay
npm run store:check
node tools/scripts/build-site.mjs
npx expo export --platform ios --platform android --output-dir dist/app
```

## Vérifications sur appareil

Testez les recettes locales hors ligne, les imports web, la synchronisation et les images Nextcloud Cookbook, les trois modes de courses, Rappels Apple, les notifications partagées avec un destinataire verrouillé, les codes-barres, les rappels de péremption, les autorisations vocales, la restauration des minuteurs, les photos des PDF et les sauvegardes. Vérifiez petits écrans, tablettes, grands textes et les deux thèmes.

## Compiler et envoyer

Recompilez après un changement de dépendance native ou d’autorisation. Les textes des boutiques sont préparés séparément des binaires. Suivez le guide des boutiques pour leur envoi et vérifiez la destination et la version.

```sh
npm run store:prepare
npx eas build --platform all --profile production
```

[Store / Fastlane](../../store/README.md) · [Privacy](PRIVACY.md) · [Notifications](../../docs/NOTIFICATIONS.md)
