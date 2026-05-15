# Publication App Store et Google Play / Publishing

[Français](#français) | [English](#english)

---

## Français

### Pré-requis

- Compte Apple Developer.
- Compte Google Play Console.
- Projet EAS lié à `app.json`.
- Icônes et splash définitifs dans `assets/`.
- Politique de confidentialité publiée.
- Nom public, sous-titre, icône et identifiant de bundle validés avant la création de l'app dans les stores.

### Checklist produit

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

### Nom, marque et assets

- Ne pas publier avec `Nextcloud` dans le nom public si l'app n'est pas officielle ou autorisée par Nextcloud GmbH. Utiliser plutôt un nom propre, puis une mention descriptive du type `compatible avec Nextcloud Cookbook` dans la description.
- Mettre à jour `expo.name`, `expo.slug`, `ios.bundleIdentifier`, `android.package`, `scheme` et les textes d'accueil dans `src/i18n/index.ts`.
- Remplacer `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png` et `assets/favicon.png`, puis relancer `npm run assets` si les sources SVG changent.

### iOS, iPad et Mac

- `ios.supportsTablet` est déjà activé et `UIRequiresFullScreen` est désactivé, donc l'app est prête pour iPadOS côté configuration.
- Pour Mac rapidement, distribuer l'app iPhone/iPad sur les Mac Apple Silicon depuis App Store Connect. Un vrai port macOS natif demanderait un chantier séparé.
- Capabilities Apple minimales pour la version actuelle : aucune Background Mode, aucune Push Notification, aucune Location, aucune Bluetooth. Ne demander iCloud/CloudKit que si une vraie synchronisation iCloud est implémentée.
- La permission réseau local iOS sert uniquement aux utilisateurs qui connectent l'app à un serveur Nextcloud hébergé sur le LAN, ou au dev client Expo pendant le développement.

### Test iPhone avec Xcode

- Lancer Metro avant ou pendant le test : `npx expo start --dev-client --host lan`.
- Dans Xcode, ouvrir `ios/NextcloudCookbook.xcworkspace`, choisir l'iPhone branché comme destination, puis lancer le schéma en `Debug`.
- L'iPhone et le Mac doivent être sur le même réseau Wi-Fi. Si l'app tente `http://<ip-du-mac>:8081/status` puis affiche `No script URL provided`, elle ne voit pas Metro.
- Autoriser le réseau local sur l'iPhone pour l'app de développement et autoriser les connexions entrantes pour Node/Expo dans le pare-feu macOS.
- Pour une app qui n'a pas besoin de Metro, utiliser un build preview/production EAS ou un schéma Release avec le bundle JS embarqué.

### iCloud

- Aujourd'hui, la source de synchronisation fonctionnelle est Nextcloud, pas iCloud.
- Les mots de passe sont stockés dans Expo SecureStore. Expo ne fournit pas directement le mode iCloud Keychain synchronizable ; ne pas promettre une synchronisation iCloud des mots de passe sans module natif dédié.
- Une synchronisation iCloud des recettes en mode local nécessiterait CloudKit ou iCloud key-value storage, les entitlements iCloud et une couche de résolution de conflits.

### Builds

```bash
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview
npx eas build --platform all --profile production
```

### Android

La configuration Android est déjà dans `app.json` with the package `app.avocook.mobile`. Avant publication Google Play, vérifier l'icône adaptative, la fiche confidentialité Google Play et tester au moins un build `preview` sur un appareil Android réel.

### Soumission

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

### Mentions importantes

L'application est un client indépendant de Nextcloud Cookbook. Elle doit éviter toute confusion de marque avec Nextcloud GmbH si elle est publiée publiquement.

---

## English

### Prerequisites

- Apple Developer account.
- Google Play Console account.
- EAS project linked to `app.json`.
- Final icons and splash in `assets/`.
- Published privacy policy.
- Public name, subtitle, icon, and bundle ID validated before app creation in stores.

### Product Checklist

- Test connection on at least one stable Nextcloud instance and one self-hosted instance.
- Test an invalid app password: the app must refuse connection.
- Test an instance with an invalid certificate and verify that the app refuses remote HTTP.
- Test creations, edits, deletions, and URL imports in airplane mode.
- Test local mode without Nextcloud.
- Test manual addition of a photo and photo import from Marmiton, CuisineAZ, and 750g.
- Test French/English, light/dark, and system text sizes.
- Check compact iPhone, large iPhone, iPad, and Android screens.
- Verify on a real device that the `Keep screen on` option is disabled by default and only activates on the recipe detail screen.
- Verify that disabling `Keep a local copy` deletes synchronized recipes and unused recipe images.

### Name, Brand, and Assets

- Do not publish with `Nextcloud` in the public name if the app is not official or authorized by Nextcloud GmbH. Instead, use a proprietary name, then a descriptive mention like `compatible with Nextcloud Cookbook` in the description.
- Update `expo.name`, `expo.slug`, `ios.bundleIdentifier`, `android.package`, `scheme`, and welcome texts in `src/i18n/index.ts`.
- Replace `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png`, and `assets/favicon.png`, then rerun `npm run assets` if SVG sources change.

### iOS, iPad, and Mac

- `ios.supportsTablet` is already enabled and `UIRequiresFullScreen` is disabled, so the app is ready for iPadOS configuration-wise.
- For Mac quickly, distribute the iPhone/iPad app on Apple Silicon Macs from App Store Connect. A real native macOS port would require a separate project.
- Minimum Apple capabilities for the current version: no Background Mode, no Push Notification, no Location, no Bluetooth. Only request iCloud/CloudKit if real iCloud synchronization is implemented.
- The iOS local network permission is only for users connecting the app to a Nextcloud server hosted on the LAN, or for the Expo dev client during development.

### iPhone Test with Xcode

- Start Metro before or during the test: `npx expo start --dev-client --host lan`.
- In Xcode, open `ios/NextcloudCookbook.xcworkspace`, choose the connected iPhone as the destination, then run the scheme in `Debug`.
- The iPhone and Mac must be on the same Wi-Fi network. If the app tries `http://<mac-ip>:8081/status` then displays `No script URL provided`, it does not see Metro.
- Allow the local network on the iPhone for the development app and allow incoming connections for Node/Expo in the macOS firewall.
- For an app that doesn't need Metro, use an EAS preview/production build or a Release scheme with the embedded JS bundle.

### iCloud

- Today, the functional synchronization source is Nextcloud, not iCloud.
- Passwords are stored in Expo SecureStore. Expo does not directly provide a synchronizable iCloud Keychain mode; do not promise iCloud password synchronization without a dedicated native module.
- iCloud synchronization of recipes in local mode would require CloudKit or iCloud key-value storage, iCloud entitlements, and a conflict resolution layer.

### Builds

```bash
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview
npx eas build --platform all --profile production
```

### Android

Android configuration is already in `app.json` with the package `app.avocook.mobile`. Before Google Play publication, check the adaptive icon, Google Play privacy sheet, and test at least one `preview` build on a real Android device.

### Submission

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

### Important Mentions

The application is an independent client of Nextcloud Cookbook. It must avoid any brand confusion with Nextcloud GmbH if published publicly.
