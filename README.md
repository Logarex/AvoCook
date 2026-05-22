# AvoCook

<p align="center">
  <img src="https://img.shields.io/github/license/Logarex/AvoCook?color=blue&style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/Expo-SDK%2054-00020d?logo=expo&logoColor=white&style=flat-square" alt="Expo" />
  <img src="https://img.shields.io/badge/React%20Native-0.81-61dafb?logo=react&logoColor=black&style=flat-square" alt="React Native" />
  <img src="https://img.shields.io/badge/platforms-iOS%20%7C%20iPadOS%20%7C%20Android-green?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/i18n-FR%20%7C%20EN%20%7C%20DE%20%7C%20ES%20%7C%20IT-orange?style=flat-square" alt="Languages" />
  <img src="https://img.shields.io/github/downloads/Logarex/AvoCook/total?color=blueviolet&logo=android&logoColor=white&style=flat-square&label=t%C3%A9l%C3%A9chargements%20(android)" alt="Téléchargements Android" />
</p>

---

<p align="center">
  <b><a href="#français">Français</a></b> | 
  <b><a href="#english">English</a></b> | 
  <b><a href="#deutsch">Deutsch</a></b>
</p>

---

## Français

**Application de cuisine moderne (iOS & Android) utilisable en local ou synchronisée avec Nextcloud Cookbook.**

[Télécharger sur l'App Store](https://apps.apple.com/app/avocook/id6769012665) | [Télécharger l'APK Android](https://github.com/Logarex/AvoCook/releases/latest)

<p align="center">
  <img src="assets/screenshots/login.png" width="300" alt="Écran de connexion" />
  <img src="assets/screenshots/recipe.png" width="300" alt="Détail d'une recette" />
</p>

### Installation (Utilisateurs)

*   **iOS (iPhone & iPad)** : Téléchargez directement l'application sur l'[App Store](https://apps.apple.com/app/avocook/id6769012665).
*   **Android (Direct)** :
    1. Téléchargez le dernier fichier `avocook.apk` depuis les [Releases GitHub](https://github.com/Logarex/AvoCook/releases/latest).
    2. Ouvrez le fichier téléchargé et autorisez l'installation d'applications issues de sources inconnues si votre navigateur ou gestionnaire de fichiers vous le demande.
    3. *Mises à jour* : L'application intègre un détecteur de mise à jour. Vous serez averti directement dans l'application lorsqu'un nouvel APK sera publié sur GitHub, avec un bouton pour le télécharger.
*   **Android (F-Droid)** :
    *   *(Bientôt disponible)* : L'application sera disponible sur F-Droid via le dépôt IzzyOnDroid pour des mises à jour automatiques en arrière-plan.

### Fonctionnalités

*   **Mode Local & Hors-ligne (100% Autonome)** : Utilisez l'application de manière entièrement autonome, sans compte ni serveur. Les recettes et photos restent stockées localement et en toute sécurité dans la base de données de votre appareil.
*   **Synchronisation Nextcloud Cookbook** : Connectez-vous à votre serveur Nextcloud via un mot de passe d'application. Synchronisation bidirectionnelle fluide avec l'API Cookbook. Gestion d'une file d'attente hors-ligne (`sync_queue`) pour pousser vos ajouts et modifications dès le retour de la connexion.
*   **Importation Web Intelligente** : Importez des recettes depuis une simple URL. L'application extrait les métadonnées `schema.org/Recipe` (JSON-LD) directement sur le mobile (compatible avec Marmiton, CuisineAZ, 750g, Chefkoch, BBC Good Food, Allrecipes, GialloZafferano, etc.), avec un repli (fallback) sur l'import serveur Cookbook.
*   **Outils Interactifs en Cuisine** :
    *   Ajustez dynamiquement le nombre de portions et recalculez automatiquement les proportions d'ingrédients.
    *   Minuteurs intégrés (préparation, cuisson, total) qui sonnent via des notifications locales, même si l'écran est verrouillé.
    *   Option pour garder l'écran allumé (anti-verrouillage) pendant la préparation d'une recette.
    *   Calculateur local de score santé estimé en fonction des apports nutritionnels.
*   **Partage & Sauvegarde de Données** :
    *   Imprimez vos recettes directement depuis l'appareil sur vos imprimantes physiques ou réseau.
    *   Exportez et partagez des recettes au format PDF stylisé.
    *   Sauvegardez l'ensemble de votre carnet de recettes locale (recettes, catégories et photos encodées) dans un fichier `.json` compatible AvoCook pour transfert ou restauration.

### Stack Technique

*   **Core** : Expo React Native, TypeScript, React Navigation
*   **Données locales** : SQLite (`expo-sqlite`) pour le cache et le stockage hors ligne, SecureStore (`expo-secure-store`) pour le chiffrement des identifiants
*   **UI & Expérience** : Blur (iOS glassmorphism), Fast Image, System Image Picker
*   **Qualité & Internationalisation** : i18next (Français, Anglais, Allemand, Espagnol, Italien), Vitest pour les tests unitaires

### Installation et Lancement

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer le serveur Metro
npm run start
```
Scanner ensuite le code QR avec l'application **Expo Go** sur iOS ou Android, ou lancez un simulateur via la console Metro.

### Connexion Nextcloud

1.  Activez l'application **Cookbook** sur votre instance Nextcloud.
2.  Dans Nextcloud, allez dans *Paramètres personnels > Sécurité > Appareils & sessions* et créez un mot de passe d'application (ex: `AvoCook`).
3.  Connectez-vous dans l'application mobile en renseignant l'adresse de votre serveur (HTTPS obligatoire, sauf pour `localhost`), votre identifiant et le mot de passe d'application généré.

### Publication

Les builds sont configurés via **EAS** (`eas.json`) :
```bash
# Build de développement ou aperçu
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview

# Build de production
npx eas build --platform all --profile production
```

### Tests et Qualité

Pour vérifier la robustesse et la compatibilité des imports de sites :
```bash
npm run typecheck                     # Vérification TypeScript
npm test                              # Exécuter les tests unitaires (Vitest)
npm run import:check -- <URL-recette> # Tester le parser de recette sur une URL
```

### Soutenir le projet ☕

Si vous appréciez AvoCook et souhaitez m'aider à financer les frais (notamment la licence développeur Google Play Store pour publier l'application officiellement sur Android), vous pouvez faire un don :
*   [Faire un don via Revolut](https://revolut.me/logarex)
*   [Faire un don via PayPal](https://paypal.me/logarex31)

---

## English

**Modern cooking application (iOS & Android) usable locally or synchronized with Nextcloud Cookbook.**

[Download on the App Store](https://apps.apple.com/app/avocook/id6769012665) | [Download Android APK](https://github.com/Logarex/AvoCook/releases/latest)

<p align="center">
  <img src="assets/screenshots/login.png" width="300" alt="Login Screen" />
  <img src="assets/screenshots/recipe.png" width="300" alt="Recipe Details" />
</p>

### Installation (Users)

*   **iOS (iPhone & iPad)**: Download the application directly from the [App Store](https://apps.apple.com/app/avocook/id6769012665).
*   **Android (Direct APK)**:
    1. Download the latest `avocook.apk` file from the [GitHub Releases](https://github.com/Logarex/AvoCook/releases/latest).
    2. Open the downloaded file and authorize installation from unknown sources if prompted by your browser or file manager.
    3. *Updates*: The application features a built-in release checker. You will be notified directly inside the app when a new APK version is available on GitHub, with a direct download link.
*   **Android (F-Droid)**:
    *   *(Coming soon)*: The app will be available on F-Droid via the IzzyOnDroid repository for automatic background updates.

### Features

*   **Local & Offline Mode (100% Standalone)**: Use the app completely server-free. All recipes, photos, and categories are saved locally and securely in your device's persistent database.
*   **Nextcloud Cookbook Sync**: Pair directly with a Nextcloud server using an app password. Smooth two-way synchronization via the Cookbook API. Features an offline queue (`sync_queue`) to automatically upload local changes when connection is restored.
*   **Intelligent Web Import**: Extract recipes from any compatible web page. The mobile-side parser reads `schema.org/Recipe` (JSON-LD) metadata instantly (optimized for major French and international culinary platforms including Marmiton, CuisineAZ, 750g, Chefkoch, BBC Good Food, Allrecipes, GialloZafferano, etc.), with automatic Cookbook server fallback.
*   **Interactive Kitchen Tools**:
    *   Scale recipe servings dynamically and recalculate ingredients automatically.
    *   Built-in timers (prep, cook, total) with local notifications that ring even when the device is locked.
    *   Anti-lock screen option to keep the display active while cooking.
    *   Local nutritional health score calculator.
*   **Sharing & Data Backups**:
    *   Print recipes directly from your phone to physical or network printers.
    *   Export and share beautifully rendered recipes in PDF format.
    *   Backup your entire local cookbook (recipes, folders, and embedded photos) into a universal `.json` file for quick transfer or recovery.

### Technical Stack

*   **Core**: Expo React Native, TypeScript, React Navigation
*   **Data & Security**: SQLite (`expo-sqlite`) for offline-first caching, SecureStore (`expo-secure-store`) for encrypted keychain credentials
*   **UI & Native**: Expo Blur (glassmorphism layouts on iOS), Fast Image, System Image Picker
*   **Testing & i18n**: i18next (French, English, German, Spanish, Italian), Vitest for unit testing

### Setup & Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run the Metro bundler
npm run start
```
Scan the QR code with **Expo Go** on iOS or Android, or boot a native simulator/emulator.

### Nextcloud Integration

1.  Enable the **Cookbook** app on your Nextcloud instance.
2.  Go to Nextcloud *Personal Settings > Security > Devices & sessions* and generate a new app-specific password (e.g., `AvoCook`).
3.  Log in using your secure server URL (HTTPS required), username, and the generated app password.

### Publishing

App Store & Google Play distribution profiles are handled via **EAS**:
```bash
# Development or testing preview builds
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview

# Store production builds
npx eas build --platform all --profile production
```

### Quality Assurance & Testing

```bash
npm run typecheck                     # TypeScript check
npm test                              # Run unit tests (Vitest)
npm run import:check -- <Recipe-URL>  # Validate site parser compatibility
```

### Support the project ☕

If you enjoy AvoCook and want to help me cover publishing costs (especially the Google Play Store developer license to publish the app officially on Android), feel free to support:
*   [Donate via Revolut](https://revolut.me/logarex)
*   [Donate via PayPal](https://paypal.me/logarex31)

---

## Deutsch

**Moderne Koch-App (iOS & Android) zur lokalen Nutzung oder synchronisiert mit Nextcloud Cookbook.**

[Im App Store herunterladen](https://apps.apple.com/app/avocook/id6769012665) | [Android APK herunterladen](https://github.com/Logarex/AvoCook/releases/latest)

<p align="center">
  <img src="assets/screenshots/login.png" width="300" alt="Anmeldebildschirm" />
  <img src="assets/screenshots/recipe.png" width="300" alt="Rezeptdetails" />
</p>

### Installation (Endbenutzer)

*   **iOS (iPhone & iPad)**: Laden Sie die App direkt aus dem [App Store](https://apps.apple.com/app/avocook/id6769012665) herunter.
*   **Android (Direkt-APK)**:
    1. Laden Sie die neueste `avocook.apk`-Datei aus den [GitHub-Releases](https://github.com/Logarex/AvoCook/releases/latest) herunter.
    2. Öffnen Sie die heruntergeladene Datei und erlauben Sie die Installation aus unbekannten Quellen, falls Ihr Browser oder Dateimanager danach fragt.
    3. *Updates*: Die App verfügt über einen integrierten Versionsprüfer. Sie werden direkt in der App benachrichtigt, wenn eine neue APK-Version auf GitHub verfügbar ist, mit einem Link zum direkten Download.
*   **Android (F-Droid)**:
    *   *(Demnächst verfügbar)*: Die App wird auf F-Droid über das IzzyOnDroid-Repository für automatische Updates im Hintergrund verfügbar sein.

### Funktionen

*   **Lokaler- & Offline-Modus (100% Autonom)**: Nutzen Sie die App komplett ohne Account oder Server. Alle Rezepte und Fotos verbleiben sicher verschlüsselt in der lokalen SQLite-Datenbank Ihres Geräts.
*   **Nextcloud Cookbook Synchronisation**: Verbinden Sie die App über ein sicheres App-Passwort mit Ihrem Nextcloud-Server. Bidirektionale Synchronisierung mit der Cookbook API. Beinhaltet eine Offline-Warteschlange (`sync_queue`), um lokale Änderungen bei bestehender Internetverbindung hochzuladen.
*   **Intelligenter Web-Import**: Rezept-Import per Knopfdruck über eine einfache URL. Der lokale Parser analysiert `schema.org/Recipe` (JSON-LD) Metadaten direkt auf dem Mobiltelefon (unterstützt Marmiton, CuisineAZ, 750g, Chefkoch, BBC Good Food, Allrecipes, GialloZafferano und viele andere), mit automatischem Fallback auf den Nextcloud-Import.
*   **Interaktive Küchenhelfer**:
    *   Portionsgrößen dynamisch anpassen und Zutatenmengen automatisch umrechnen lassen.
    *   Integrierte Timer (Vorbereitung, Kochen, Gesamtzeit), die per lokaler Benachrichtigung auch bei gesperrtem Bildschirm klingeln.
    *   Anti-Standby-Option (Display dauerhaft eingeschaltet lassen) beim Kochen.
    *   Lokaler Nährwert- und Gesundheitsscore-Rechner.
*   **Teilen & Sichern**:
    *   Rezepte direkt kabellos auf Netzwerkdruckern ausdrucken.
    *   Rezepte als ansprechend gestaltete PDFs exportieren und teilen.
    *   Sicherung des kompletten lokalen Kochbuchs (Rezepte, Kategorien und Fotos) in einer `.json`-Datei zur einfachen Migration oder Wiederherstellung.

### Technischer Stack

*   **Kern**: Expo React Native, TypeScript, React Navigation
*   **Daten & Sicherheit**: SQLite (`expo-sqlite`) für den Offline-Cache, SecureStore (`expo-secure-store`) für verschlüsselte Passwörter
*   **Design & UI**: Blur-Effekte (Glassmorphismus auf iOS), Fast Image, nativer Image Picker
*   **Qualitätssicherung & i18n**: i18next (Deutsch, Französisch, Englisch, Spanisch, Italienisch), Vitest für Unit-Tests

### Installation & Start

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Metro Bundler starten
npm run start
```
Scannen Sie anschließend den QR-Code mit der App **Expo Go** auf iOS oder Android, oder starten Sie einen Simulator.

### Nextcloud Verbindung

1.  Aktivieren Sie die **Cookbook**-App auf Ihrem Nextcloud-Server.
2.  Navigieren Sie zu *Persönliche Einstellungen > Sicherheit > Geräte & Sitzungen* und generieren Sie ein neues App-Passwort (z. B. `AvoCook`).
3.  Melden Sie sich in der mobilen App mit Ihrer Server-Adresse (nur HTTPS), Ihrem Benutzernamen und dem erstellten App-Passwort an.

### Qualitätssicherung & Qualitätstests

```bash
npm run typecheck                     # TypeScript Validierung
npm test                              # Unittests ausführen (Vitest)
npm run import:check -- <Rezept-URL>  # Website-Importkompatibilität testen
```

### Das Projekt unterstützen ☕

Wenn Ihnen AvoCook gefällt und Sie mir helfen möchten, die Kosten zu decken (insbesondere die Google Play Store Entwicklerlizenz, um die App offiziell auf Android zu veröffentlichen), können Sie das Projekt hier unterstützen:
*   [Spenden via Revolut](https://revolut.me/logarex)
*   [Spenden via PayPal](https://paypal.me/logarex31)

---

### Contributions
*   **Français** : Les contributions sont les bienvenues ! Si vous trouvez un bug, avez une idée d'amélioration ou souhaitez ajouter le support d'un nouveau site de recettes, n'hésitez pas à ouvrir une Pull Request ou une simple Issue de manière détendue.
*   **English**: Contributions are welcome! If you find a bug, have a feature idea, or want to add support for a new recipe website, feel free to open a Pull Request or a simple Issue.
*   **Deutsch**: Beiträge sind herzlich willkommen! Wenn Sie einen Fehler finden, eine Idee haben oder eine neue Kochseite unterstützen möchten, können Sie gerne einen Pull Request oder ein Issue erstellen.

---

### Lizenz / License
Dieses Projekt ist lizenziert unter / This project is licensed under the [MIT License](LICENSE).
