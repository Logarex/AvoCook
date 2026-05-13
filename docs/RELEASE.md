# Publication App Store et Google Play

## Pré-requis

- Compte Apple Developer.
- Compte Google Play Console.
- Projet EAS lié à `app.json`.
- Icônes et splash définitifs dans `assets/`.
- Politique de confidentialité publiée.

## Checklist produit

- Tester la connexion sur au moins une instance Nextcloud stable et une instance auto-hébergée.
- Tester un app password invalide : l'app doit refuser la connexion.
- Tester une instance avec certificat invalide et vérifier que l'app refuse HTTP distant.
- Tester créations, éditions, suppressions et import URL en mode avion.
- Tester le mode local sans Nextcloud.
- Tester l'ajout manuel d'une photo et l'import d'une photo depuis Marmiton, CuisineAZ et 750g.
- Tester français/anglais, clair/sombre et tailles de texte système.
- Vérifier les écrans iPhone compact, iPhone grand, iPad et Android.

## Builds

```bash
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview
npx eas build --platform all --profile production
```

## Android

La configuration Android est déjà dans `app.json` avec le package `app.nextcloudcookbook.mobile`. Avant publication Google Play, vérifier l'icône adaptative, la fiche confidentialité Google Play et tester au moins un build `preview` sur un appareil Android réel.

## Soumission

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

## Mentions importantes

L'application est un client indépendant de Nextcloud Cookbook. Elle doit éviter toute confusion de marque avec Nextcloud GmbH si elle est publiée publiquement.
