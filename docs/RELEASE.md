# Publication App Store et Google Play

## Pré-requis

- Compte Apple Developer.
- Compte Google Play Console.
- Projet EAS lié à `app.json`.
- Icônes et splash définitifs dans `assets/`.
- Politique de confidentialité publiée.
- Nom public, sous-titre, icône et identifiant de bundle validés avant la création de l'app dans les stores.

## Checklist produit

- Tester la connexion sur au moins une instance Nextcloud stable et une instance auto-hébergée.
- Tester un app password invalide : l'app doit refuser la connexion.
- Tester une instance avec certificat invalide et vérifier que l'app refuse HTTP distant.
- Tester créations, éditions, suppressions et import URL en mode avion.
- Tester le mode local sans Nextcloud.
- Tester l'ajout manuel d'une photo et l'import d'une photo depuis Marmiton, CuisineAZ et 750g.
- Tester français/anglais, clair/sombre et tailles de texte système.
- Vérifier les écrans iPhone compact, iPhone grand, iPad et Android.
- Vérifier sur appareil réel que l'option `Garder l'écran allumé` est désactivée par défaut et ne s'active que sur l'écran détail recette.
- Vérifier que la désactivation de `Conserver une copie locale` supprime les recettes synchronisées et les images de recettes devenues inutiles.

## Nom, marque et assets

- Ne pas publier avec `Nextcloud` dans le nom public si l'app n'est pas officielle ou autorisée par Nextcloud GmbH. Utiliser plutôt un nom propre, puis une mention descriptive du type `compatible avec Nextcloud Cookbook` dans la description.
- Mettre à jour `expo.name`, `expo.slug`, `ios.bundleIdentifier`, `android.package`, `scheme` et les textes d'accueil dans `src/i18n/index.ts`.
- Remplacer `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png` et `assets/favicon.png`, puis relancer `npm run assets` si les sources SVG changent.

## iOS, iPad et Mac

- `ios.supportsTablet` est déjà activé et `UIRequiresFullScreen` est désactivé, donc l'app est prête pour iPadOS côté configuration.
- Pour Mac rapidement, distribuer l'app iPhone/iPad sur les Mac Apple Silicon depuis App Store Connect. Un vrai port macOS natif demanderait un chantier séparé.
- Capabilities Apple minimales pour la version actuelle : aucune Background Mode, aucune Push Notification, aucune Location, aucune Bluetooth. Ne demander iCloud/CloudKit que si une vraie synchronisation iCloud est implémentée.
- La permission réseau local iOS sert uniquement aux utilisateurs qui connectent l'app à un serveur Nextcloud hébergé sur le LAN, ou au dev client Expo pendant le développement.

## Test iPhone avec Xcode

- Lancer Metro avant ou pendant le test : `npx expo start --dev-client --host lan`.
- Dans Xcode, ouvrir `ios/NextcloudCookbook.xcworkspace`, choisir l'iPhone branché comme destination, puis lancer le schéma en `Debug`.
- L'iPhone et le Mac doivent être sur le même réseau Wi-Fi. Si l'app tente `http://<ip-du-mac>:8081/status` puis affiche `No script URL provided`, elle ne voit pas Metro.
- Autoriser le réseau local sur l'iPhone pour l'app de développement et autoriser les connexions entrantes pour Node/Expo dans le pare-feu macOS.
- Pour une app qui n'a pas besoin de Metro, utiliser un build preview/production EAS ou un schéma Release avec le bundle JS embarqué.

## iCloud

- Aujourd'hui, la source de synchronisation fonctionnelle est Nextcloud, pas iCloud.
- Les mots de passe sont stockés dans Expo SecureStore. Expo ne fournit pas directement le mode iCloud Keychain synchronizable ; ne pas promettre une synchronisation iCloud des mots de passe sans module natif dédié.
- Une synchronisation iCloud des recettes en mode local nécessiterait CloudKit ou iCloud key-value storage, les entitlements iCloud et une couche de résolution de conflits.

## Builds

```bash
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview
npx eas build --platform all --profile production
```

## Android

La configuration Android est déjà dans `app.json` avec le package `app.avocook.mobile`. Avant publication Google Play, vérifier l'icône adaptative, la fiche confidentialité Google Play et tester au moins un build `preview` sur un appareil Android réel.

## Soumission

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

## Mentions importantes

L'application est un client indépendant de Nextcloud Cookbook. Elle doit éviter toute confusion de marque avec Nextcloud GmbH si elle est publiée publiquement.
