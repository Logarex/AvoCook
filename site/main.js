/* =========================================
   AVOCOOK — Translations & App Logic
   ========================================= */

const translations = {

  /* ---- FRENCH ---- */
  fr: {
    nav_download: "Télécharger",
    hero_title: "Votre carnet de recettes,<br><em>toujours avec vous</em>",
    hero_subtitle: "Fonctionne entièrement hors ligne, sans compte. Synchronisation Nextcloud disponible si vous le souhaitez.",
    hero_note: "Mode local — aucun compte requis. Vos données restent sur l'appareil.",
    hero_cta_appstore: "App Store",
    hero_cta_apk: "APK Android",
    stat_languages: "langues",
    stat_downloads: "téléchargements",
    stat_offline: "hors ligne",
    screenshot_placeholder: "Capture à venir",
    features_label: "Fonctionnalités",
    features_title: "Tout ce dont vous avez besoin",
    features_subtitle: "Un carnet de recettes complet, sans superflu.",
    feat_1_name: "Créer & modifier",
    feat_1_desc: "Rédigez vos recettes de zéro, étape par étape. Modifiez-les à tout moment, sans connexion.",
    feat_2_name: "Catégories",
    feat_2_desc: "Organisez vos recettes par catégorie (entrées, desserts, plats rapides…). Filtrez en un geste.",
    feat_3_name: "Ajuster les portions",
    feat_3_desc: "Changez le nombre de portions et toutes les quantités se mettent à jour automatiquement. Plus de calcul mental.",
    feat_4_name: "Photos",
    feat_4_desc: "Ajoutez une ou plusieurs photos par recette depuis votre bibliothèque ou directement depuis l'appareil photo.",
    feat_5_name: "PDF & impression",
    feat_5_desc: "Exportez n'importe quelle recette en fichier PDF, ou envoyez-la directement à l'impression depuis l'app.",
    feat_6_name: "Partager une recette",
    feat_6_desc: "Partagez une recette vers une autre application via la feuille de partage standard du système.",
    feat_7_name: "Import depuis une URL",
    feat_7_desc: "Collez un lien depuis Marmiton, 750g, BBC Good Food — la recette s'importe automatiquement via schema.org/Recipe.",
    feat_8_name: "Partager depuis le navigateur",
    feat_8_desc: "Vous repérez une recette en ligne ? Partagez la page depuis votre navigateur vers AvoCook. Import en un geste.",
    feat_9_name: "Génération IA",
    feat_9_desc: "Scannez une recette depuis une photo, ou décrivez un plat pour obtenir une recette complète. Compatible OpenAI.",
    feat_10_name: "Liste de courses",
    feat_10_desc: "Copiez les ingrédients dans le presse-papiers en un geste, ou exportez une liste vers les Rappels iOS.",
    feat_11_name: "Minuteurs",
    feat_11_desc: "Lancez un ou plusieurs minuteurs de cuisson directement depuis une recette. Notification locale même en arrière-plan.",
    feat_12_name: "Sauvegarde & restauration",
    feat_12_desc: "Exportez toutes vos recettes dans un fichier JSON et restaurez-les n'importe quand, sur n'importe quel appareil.",
    feat_13_name: "Synchronisation Nextcloud",
    feat_13_desc: "Connectez votre propre serveur Nextcloud Cookbook pour synchroniser vos recettes entre appareils. Entièrement optionnel.",
    feat_14_name: "100% hors ligne & privé",
    feat_14_desc: "AvoCook fonctionne sans connexion internet. Pas de compte, pas de tracking, pas de serveur tiers. Vos données vous appartiennent.",
    tag_optional: "Optionnel",
    screenshots_label: "Aperçu",
    screenshots_title: "L'application en images",
    screenshots_subtitle: "Glissez pour naviguer entre les captures.",
    ph_home: "Écran d'accueil",
    ph_list: "Liste des recettes",
    ph_detail: "Détail d'une recette",
    ph_editor: "Éditeur de recette",
    ph_import: "Import depuis une URL",
    ph_shopping: "Liste de courses",
    ph_timer: "Minuteurs",
    how_label: "Fonctionnement",
    how_title: "Local d'abord. Nextcloud si vous voulez.",
    how_subtitle: "AvoCook est conçu pour fonctionner sans aucun compte. La synchronisation Nextcloud est une option, pas une obligation.",
    local_title: "Mode local",
    local_desc: "Le mode par défaut. Aucun compte, aucune connexion requise. Vos recettes sont stockées dans une base SQLite directement sur votre appareil.",
    local_p1: "Fonctionne en mode avion",
    local_p2: "Données uniquement sur l'appareil",
    local_p3: "Aucun serveur tiers impliqué",
    local_p4: "Sauvegarde manuelle vers un fichier JSON",
    mode_or: "ou",
    nextcloud_title: "Synchronisation Nextcloud",
    nextcloud_desc: "Connectez votre propre serveur Nextcloud avec l'application Cookbook. Les données circulent directement entre l'app et votre serveur.",
    nextcloud_p1: "Compatible Nextcloud Cookbook",
    nextcloud_p2: "Synchronisation multi-appareils",
    nextcloud_p3: "Mot de passe d'application, HTTPS obligatoire",
    nextcloud_p4: "Aucun serveur tiers — votre Nextcloud uniquement",
    import_label: "Import intelligent",
    import_title: "Importez depuis n'importe quel site",
    import_subtitle: "AvoCook lit les données structurées schema.org/Recipe exposées par la plupart des sites de cuisine. Collez une URL, la recette est prête en quelques secondes.",
    and_many_more: "et beaucoup d'autres",
    import_ai_title: "Import par IA",
    import_ai_desc: "Prenez en photo une page de livre de cuisine, une carte au restaurant ou n'importe quel plat — AvoCook peut générer une recette complète via un modèle compatible OpenAI. Fonctionnalité optionnelle, votre propre clé API.",
    import_result_meta: "4 portions · 45 min · Importée depuis Marmiton",
    import_tag_ingredients: "12 ingrédients",
    import_tag_steps: "6 étapes",
    import_tag_photo: "Photo incluse",
    about_label: "Le projet",
    about_title: "Fait par un étudiant, pour tous les jours",
    about_quote: "\"J'avais mes recettes éparpillées entre des photos, des onglets Safari et des notes. J'ai décidé de construire l'app qui me manquait.\"",
    about_p1: "AvoCook a commencé comme un projet perso pendant mes études d'informatique. L'objectif était double : avoir une vraie app de recettes sur mon téléphone, et apprendre à mener un projet React Native de A à Z — de l'écriture du premier composant jusqu'à la publication sur l'App Store.",
    about_p2: "Au fil du temps, le projet a grandi : modules natifs, synchronisation Nextcloud, import de recettes, génération IA, support multi-plateforme. Chaque fonctionnalité a été l'occasion d'apprendre quelque chose de concret — parfois en se battant deux heures sur un bug qu'on ne comprend finalement pas si mal.",
    about_p3: "L'app est entièrement open source sous licence GPLv3. Si vous voulez vous en inspirer, contribuer, ou juste regarder comment c'est construit, le code est sur GitHub.",
    about_highlight_title: "Contexte",
    about_highlight_text: "Étudiant en informatique · Projet personnel · Développé en France · Publié sur l'App Store et GitHub · Maintenu activement",
    num_languages: "Langues disponibles dans l'application",
    num_platforms: "Plateformes — iOS et Android",
    num_license: "Licence open source · Code disponible sur GitHub",
    num_tracking: "Traceurs · Analytics · Publicités",
    tech_label: "Stack technique",
    tech_title: "Ce qui tourne sous le capot",
    tech_subtitle: "Un projet React Native complet, sans raccourcis.",
    tech_rn: "Base cross-platform. Expo pour les modules natifs, les assets et le build CI/CD.",
    tech_ts: "Typage complet, du composant à la couche de données. Aucun any implicite.",
    tech_sqlite: "Stockage local des recettes dans une base relationnelle embarquée via expo-sqlite.",
    tech_i18n: "Internationalisation complète en 5 langues avec détection automatique de la locale.",
    tech_secure: "Identifiants Nextcloud stockés dans l'enclave sécurisée (Keychain iOS / Keystore Android).",
    tech_calendar: "Synchronisation des listes de courses avec les Rappels iOS via l'API native.",
    tech_schema: "Import de recettes depuis n'importe quel site exposant des données structurées Recipe.",
    tech_native: "avocook-timer-notifications — notifications locales pour les minuteurs, même app en arrière-plan.",
    os_label: "Open source",
    os_title: "Le code est ouvert",
    os_p1: "AvoCook est publié sous licence GPLv3. Vous pouvez lire le code, le forker et contribuer. Les pull requests sont les bienvenues — il y a un template et un guide de contribution.",
    os_link_repo: "Dépôt GitHub",
    os_link_releases: "Releases & APK",
    os_link_releases_sub: "Téléchargez la dernière version",
    os_link_contrib: "Contribuer",
    os_link_contrib_sub: "Guide & PR template",
    os_link_issues: "Signaler un bug",
    os_link_issues_sub: "GitHub Issues",
    os_license_desc: "Vous êtes libre d'utiliser, modifier et distribuer AvoCook, à condition de conserver la même licence. Le code source doit rester accessible.",
    os_lic_p1: "Utiliser librement",
    os_lic_p2: "Modifier et redistribuer",
    os_lic_p3: "Accès au code source garanti",
    os_lic_p4: "Copyleft — même licence conservée",
    donate_label: "Soutenir",
    donate_title: "Vous trouvez AvoCook utile ?",
    donate_subtitle: "L'application est gratuite et open source. Si elle vous fait gagner du temps en cuisine, un don aide à couvrir les frais de développement (compte développeur Apple, serveur de test…).",
    donate_revolut: "Donner via Revolut",
    donate_paypal: "Donner via PayPal",
    donate_note: "Aucun montant minimum. Tout est apprécié.",
    footer_copy: "Projet open source · Licence GPLv3 · Fait avec soin",
    footer_releases: "Releases",
    footer_privacy: "Confidentialité",
    contact_label: "Contact",
    contact_title: "Une question ? Une idée ?",
    contact_subtitle: "Pour les bugs et demandes de fonctionnalités, GitHub Issues est le meilleur endroit. Pour tout le reste, l'email fonctionne.",
    contact_email_label: "Par email",
    contact_email_note: "Pour les bugs ou demandes de fonctionnalités, préférez une issue GitHub — c'est plus facile à suivre.",
    contact_gh_label: "Via GitHub",
    contact_gh_cta: "Ouvrir une issue",
    contact_gh_note: "Bugs, demandes de fonctionnalités, questions techniques — les templates guident le rapport.",
    apk_sub: "GitHub Releases",
  },

  /* ---- ENGLISH ---- */
  en: {
    nav_download: "Download",
    hero_title: "Your recipe notebook,<br><em>always with you</em>",
    hero_subtitle: "Works completely offline, no account needed. Nextcloud sync available if you want it.",
    hero_note: "Local mode — no account required. Your data stays on your device.",
    hero_cta_appstore: "App Store",
    hero_cta_apk: "Android APK",
    stat_languages: "languages",
    stat_downloads: "downloads",
    stat_offline: "offline",
    screenshot_placeholder: "Screenshot coming soon",
    features_label: "Features",
    features_title: "Everything you need",
    features_subtitle: "A complete recipe notebook, nothing more.",
    feat_1_name: "Create & edit",
    feat_1_desc: "Write recipes from scratch, step by step. Edit them anytime, no internet needed.",
    feat_2_name: "Categories",
    feat_2_desc: "Organise recipes by category (starters, desserts, quick meals…). Filter instantly.",
    feat_3_name: "Adjust servings",
    feat_3_desc: "Change the number of servings and all quantities update automatically. No mental math.",
    feat_4_name: "Photos",
    feat_4_desc: "Add one or more photos per recipe from your library or directly from the camera.",
    feat_5_name: "PDF & print",
    feat_5_desc: "Export any recipe as a PDF file, or send it straight to print from the app.",
    feat_6_name: "Share a recipe",
    feat_6_desc: "Share a recipe to another app using the standard system share sheet.",
    feat_7_name: "Import from URL",
    feat_7_desc: "Paste a link from Marmiton, 750g, BBC Good Food — it imports automatically via schema.org/Recipe.",
    feat_8_name: "Share from your browser",
    feat_8_desc: "Spot a recipe online? Share the page from your browser to AvoCook. One-tap import.",
    feat_9_name: "AI generation",
    feat_9_desc: "Scan a recipe from a photo, or describe a dish to get a complete recipe. OpenAI-compatible.",
    feat_10_name: "Shopping list",
    feat_10_desc: "Copy ingredients to the clipboard in one tap, or export a list to iOS Reminders.",
    feat_11_name: "Timers",
    feat_11_desc: "Start one or several cooking timers directly from a recipe. Local notification even in the background.",
    feat_12_name: "Backup & restore",
    feat_12_desc: "Export all your recipes to a JSON file and restore them anytime, on any device.",
    feat_13_name: "Nextcloud sync",
    feat_13_desc: "Connect your own Nextcloud Cookbook server to sync recipes across devices. Fully optional.",
    feat_14_name: "100% offline & private",
    feat_14_desc: "AvoCook works without any internet connection. No account, no tracking, no third-party server. Your data is yours.",
    tag_optional: "Optional",
    screenshots_label: "Preview",
    screenshots_title: "The app in pictures",
    screenshots_subtitle: "Swipe to browse through the screenshots.",
    ph_home: "Home screen",
    ph_list: "Recipe list",
    ph_detail: "Recipe detail",
    ph_editor: "Recipe editor",
    ph_import: "URL import",
    ph_shopping: "Shopping List",
    ph_timer: "Timers",
    how_label: "How it works",
    how_title: "Local first. Nextcloud if you want.",
    how_subtitle: "AvoCook is designed to work without any account. Nextcloud sync is an option, not a requirement.",
    local_title: "Local mode",
    local_desc: "The default mode. No account, no connection needed. Recipes are stored in a SQLite database directly on your device.",
    local_p1: "Works in airplane mode",
    local_p2: "Data stays on device only",
    local_p3: "No third-party server involved",
    local_p4: "Manual backup to a JSON file",
    mode_or: "or",
    nextcloud_title: "Nextcloud sync",
    nextcloud_desc: "Connect your own Nextcloud server running the Cookbook app. Data goes directly between the app and your server.",
    nextcloud_p1: "Compatible with Nextcloud Cookbook",
    nextcloud_p2: "Multi-device sync",
    nextcloud_p3: "App password, HTTPS required",
    nextcloud_p4: "No third party — your Nextcloud only",
    import_label: "Smart import",
    import_title: "Import from any recipe site",
    import_subtitle: "AvoCook reads schema.org/Recipe structured data exposed by most cooking sites. Paste a URL, the recipe is ready in seconds.",
    and_many_more: "and many more",
    import_ai_title: "AI import",
    import_ai_desc: "Take a photo of a cookbook page, a restaurant menu, or any dish — AvoCook can generate a complete recipe using an OpenAI-compatible model. Fully optional, your own API key.",
    import_result_meta: "4 servings · 45 min · Imported from Marmiton",
    import_tag_ingredients: "12 ingredients",
    import_tag_steps: "6 steps",
    import_tag_photo: "Photo included",
    about_label: "The project",
    about_title: "Built by a student, used every day",
    about_quote: "\"My recipes were scattered across photos, Safari tabs, and notes. I decided to build the app I was missing.\"",
    about_p1: "AvoCook started as a personal project during my computer science studies. The goal was twofold: have a proper recipe app on my phone, and learn how to run a React Native project from start to finish — from writing the first component to publishing on the App Store.",
    about_p2: "Over time the project grew: native modules, Nextcloud sync, recipe import, AI generation, cross-platform support. Every feature was an opportunity to learn something concrete — sometimes by spending two hours on a bug you end up understanding pretty well.",
    about_p3: "The app is fully open source under the GPLv3 licence. If you want to learn from it, contribute, or just see how it's built, the code is on GitHub.",
    about_highlight_title: "Context",
    about_highlight_text: "Computer science student · Personal project · Built in France · Published on App Store and GitHub · Actively maintained",
    num_languages: "Languages available in the app",
    num_platforms: "Platforms — iOS and Android",
    num_license: "Open source licence · Code on GitHub",
    num_tracking: "Trackers · Analytics · Ads",
    tech_label: "Tech stack",
    tech_title: "What runs under the hood",
    tech_subtitle: "A complete React Native project, no shortcuts.",
    tech_rn: "Cross-platform foundation. Expo for native modules, assets, and CI/CD builds.",
    tech_ts: "Full typing, from component to data layer. No implicit any.",
    tech_sqlite: "Local recipe storage in an embedded relational database via expo-sqlite.",
    tech_i18n: "Full internationalisation in 5 languages with automatic locale detection.",
    tech_secure: "Nextcloud credentials stored in the system's secure enclave (Keychain / Keystore).",
    tech_calendar: "Shopping list sync with iOS Reminders via the native API.",
    tech_schema: "Recipe import from any site exposing structured Recipe data.",
    tech_native: "avocook-timer-notifications — local notifications for timers, even with the app in the background.",
    os_label: "Open source",
    os_title: "The code is open",
    os_p1: "AvoCook is published under the GPLv3 licence. You can read the code, fork it, and contribute. Pull requests are welcome — there's a template and a contributing guide.",
    os_link_repo: "GitHub repository",
    os_link_releases: "Releases & APK",
    os_link_releases_sub: "Download the latest version",
    os_link_contrib: "Contribute",
    os_link_contrib_sub: "Contributing guide & PR template",
    os_link_issues: "Report a bug",
    os_link_issues_sub: "GitHub Issues",
    os_license_desc: "You are free to use, modify and distribute AvoCook, as long as you keep the same licence. Source code must remain accessible.",
    os_lic_p1: "Free to use",
    os_lic_p2: "Modify and redistribute",
    os_lic_p3: "Source code access guaranteed",
    os_lic_p4: "Copyleft — same licence kept",
    donate_label: "Support",
    donate_title: "Find AvoCook useful?",
    donate_subtitle: "The app is free and open source. If it saves you time in the kitchen, a donation helps cover development costs (Apple developer account, test server…).",
    donate_revolut: "Donate via Revolut",
    donate_paypal: "Donate via PayPal",
    donate_note: "No minimum amount. Everything helps.",
    footer_copy: "Open source project · GPLv3 licence · Made with care",
    footer_releases: "Releases",
    footer_privacy: "Privacy",
    contact_label: "Contact",
    contact_title: "A question? An idea?",
    contact_subtitle: "For bugs and feature requests, GitHub Issues is the best place. For anything else, email works.",
    contact_email_label: "By email",
    contact_email_note: "For bugs or feature requests, a GitHub issue is easier to track.",
    contact_gh_label: "Via GitHub",
    contact_gh_cta: "Open an issue",
    contact_gh_note: "Bugs, feature requests, technical questions — templates are there to help.",
    apk_sub: "GitHub Releases",
  },

  /* ---- GERMAN ---- */
  de: {
    nav_download: "Herunterladen",
    hero_title: "Dein Rezeptheft,<br><em>immer dabei</em>",
    hero_subtitle: "Funktioniert vollständig offline, ohne Konto. Nextcloud-Synchronisierung optional verfügbar.",
    hero_note: "Lokaler Modus — kein Konto erforderlich. Deine Daten bleiben auf deinem Gerät.",
    hero_cta_appstore: "App Store",
    hero_cta_apk: "Android APK",
    stat_languages: "Sprachen",
    stat_downloads: "Downloads",
    stat_offline: "offline",
    screenshot_placeholder: "Screenshot folgt",
    features_label: "Funktionen",
    features_title: "Alles, was du brauchst",
    features_subtitle: "Ein vollständiges Rezeptheft, ohne Überflüssiges.",
    feat_1_name: "Erstellen & bearbeiten",
    feat_1_desc: "Schreibe Rezepte von Grund auf, Schritt für Schritt. Bearbeite sie jederzeit, ohne Internetverbindung.",
    feat_2_name: "Kategorien",
    feat_2_desc: "Organisiere Rezepte nach Kategorie (Vorspeisen, Desserts, schnelle Gerichte…). Sofort filtern.",
    feat_3_name: "Portionen anpassen",
    feat_3_desc: "Ändere die Portionenanzahl und alle Mengen werden automatisch aktualisiert. Kein Kopfrechnen.",
    feat_4_name: "Fotos",
    feat_4_desc: "Füge ein oder mehrere Fotos pro Rezept aus der Bibliothek oder direkt von der Kamera hinzu.",
    feat_5_name: "PDF & Drucken",
    feat_5_desc: "Exportiere jedes Rezept als PDF-Datei oder schicke es direkt zum Drucken.",
    feat_6_name: "Rezept teilen",
    feat_6_desc: "Teile ein Rezept mit einer anderen App über das Standard-Teilen-Menü des Systems.",
    feat_7_name: "Import von URL",
    feat_7_desc: "Füge einen Link von Marmiton, 750g, BBC Good Food ein — das Rezept wird automatisch via schema.org/Recipe importiert.",
    feat_8_name: "Vom Browser teilen",
    feat_8_desc: "Rezept online entdeckt? Seite vom Browser an AvoCook teilen. Import mit einem Tippen.",
    feat_9_name: "KI-Generierung",
    feat_9_desc: "Scanne ein Rezept aus einem Foto oder beschreibe ein Gericht für ein vollständiges Rezept. OpenAI-kompatibel.",
    feat_10_name: "Einkaufsliste",
    feat_10_desc: "Zutaten mit einem Tippen in die Zwischenablage kopieren oder eine Liste in iOS-Erinnerungen exportieren.",
    feat_11_name: "Timer",
    feat_11_desc: "Starte einen oder mehrere Kochzähler direkt aus einem Rezept. Lokale Benachrichtigung auch im Hintergrund.",
    feat_12_name: "Backup & Wiederherstellung",
    feat_12_desc: "Exportiere alle Rezepte in eine JSON-Datei und stelle sie jederzeit auf jedem Gerät wieder her.",
    feat_13_name: "Nextcloud-Synchronisierung",
    feat_13_desc: "Verbinde deinen eigenen Nextcloud Cookbook-Server, um Rezepte geräteübergreifend zu synchronisieren. Vollständig optional.",
    feat_14_name: "100% offline & privat",
    feat_14_desc: "AvoCook funktioniert ohne Internetverbindung. Kein Konto, kein Tracking, kein Drittanbieter-Server. Deine Daten gehören dir.",
    tag_optional: "Optional",
    screenshots_label: "Vorschau",
    screenshots_title: "Die App in Bildern",
    screenshots_subtitle: "Wische, um durch die Screenshots zu navigieren.",
    ph_home: "Startbildschirm",
    ph_list: "Rezeptliste",
    ph_detail: "Rezeptdetails",
    ph_editor: "Rezepteditor",
    ph_import: "URL-Import",
    ph_shopping: "Einkaufsliste",
    ph_timer: "Timer",
    how_label: "Funktionsweise",
    how_title: "Lokal zuerst. Nextcloud wenn gewünscht.",
    how_subtitle: "AvoCook ist darauf ausgelegt, ohne jedes Konto zu funktionieren. Die Nextcloud-Synchronisierung ist eine Option, keine Pflicht.",
    local_title: "Lokaler Modus",
    local_desc: "Der Standardmodus. Kein Konto, keine Verbindung nötig. Rezepte werden in einer SQLite-Datenbank direkt auf deinem Gerät gespeichert.",
    local_p1: "Funktioniert im Flugzeugmodus",
    local_p2: "Daten nur auf dem Gerät",
    local_p3: "Kein Drittanbieter-Server beteiligt",
    local_p4: "Manuelles Backup in eine JSON-Datei",
    mode_or: "oder",
    nextcloud_title: "Nextcloud-Synchronisierung",
    nextcloud_desc: "Verbinde deinen eigenen Nextcloud-Server mit der Cookbook-App. Daten fließen direkt zwischen der App und deinem Server.",
    nextcloud_p1: "Kompatibel mit Nextcloud Cookbook",
    nextcloud_p2: "Geräteübergreifende Synchronisierung",
    nextcloud_p3: "App-Passwort, HTTPS erforderlich",
    nextcloud_p4: "Kein Drittanbieter — nur dein Nextcloud",
    import_label: "Intelligenter Import",
    import_title: "Von jeder Rezept-Website importieren",
    import_subtitle: "AvoCook liest schema.org/Recipe-Strukturdaten, die die meisten Koch-Websites bereitstellen. URL einfügen, Rezept ist in Sekunden bereit.",
    and_many_more: "und viele weitere",
    import_ai_title: "KI-Import",
    import_ai_desc: "Fotografiere eine Kochbuchseite, eine Restaurantkarte oder ein Gericht — AvoCook kann mit einem OpenAI-kompatiblen Modell ein vollständiges Rezept generieren. Vollständig optional, eigener API-Schlüssel.",
    import_result_meta: "4 Portionen · 45 Min · Importiert von Marmiton",
    import_tag_ingredients: "12 Zutaten",
    import_tag_steps: "6 Schritte",
    import_tag_photo: "Foto enthalten",
    about_label: "Das Projekt",
    about_title: "Von einem Studenten gebaut, täglich genutzt",
    about_quote: "\"Meine Rezepte waren verstreut über Fotos, Safari-Tabs und Notizen. Ich entschied mich, die App zu bauen, die mir fehlte.\"",
    about_p1: "AvoCook begann als persönliches Projekt während meines Informatikstudiums. Das Ziel war zweigeteilt: eine echte Rezept-App auf dem Telefon haben und lernen, ein React Native-Projekt von A bis Z umzusetzen — vom ersten Komponenten bis zur Veröffentlichung im App Store.",
    about_p2: "Mit der Zeit wuchs das Projekt: native Module, Nextcloud-Synchronisierung, Rezept-Import, KI-Generierung, plattformübergreifende Unterstützung. Jede Funktion war eine Gelegenheit, etwas Konkretes zu lernen.",
    about_p3: "Die App ist vollständig open source unter der GPLv3-Lizenz. Wenn du dich davon inspirieren lassen, beitragen oder einfach sehen möchtest, wie es gebaut ist, liegt der Code auf GitHub.",
    about_highlight_title: "Kontext",
    about_highlight_text: "Informatikstudent · Persönliches Projekt · In Frankreich entwickelt · Im App Store und auf GitHub veröffentlicht · Aktiv gepflegt",
    num_languages: "Verfügbare Sprachen in der App",
    num_platforms: "Plattformen — iOS und Android",
    num_license: "Open-Source-Lizenz · Code auf GitHub",
    num_tracking: "Tracker · Analytics · Werbung",
    tech_label: "Tech-Stack",
    tech_title: "Was unter der Haube läuft",
    tech_subtitle: "Ein vollständiges React Native-Projekt, ohne Abkürzungen.",
    tech_rn: "Cross-Platform-Grundlage. Expo für native Module, Assets und CI/CD-Builds.",
    tech_ts: "Vollständige Typisierung, von der Komponente bis zur Datenschicht. Kein implizites any.",
    tech_sqlite: "Lokale Rezeptspeicherung in einer eingebetteten relationalen Datenbank via expo-sqlite.",
    tech_i18n: "Vollständige Internationalisierung in 5 Sprachen mit automatischer Erkennung.",
    tech_secure: "Nextcloud-Anmeldedaten in der sicheren Enklave des Systems gespeichert (Keychain / Keystore).",
    tech_calendar: "Einkaufslisten-Sync mit iOS-Erinnerungen über die native API.",
    tech_schema: "Rezept-Import von jeder Website, die strukturierte Recipe-Daten bereitstellt.",
    tech_native: "avocook-timer-notifications — lokale Benachrichtigungen für Timer, auch im Hintergrund.",
    os_label: "Open Source",
    os_title: "Der Code ist offen",
    os_p1: "AvoCook wird unter der GPLv3-Lizenz veröffentlicht. Du kannst den Code lesen, forken und beitragen. Pull Requests sind willkommen.",
    os_link_repo: "GitHub-Repository",
    os_link_releases: "Releases & APK",
    os_link_releases_sub: "Neueste Version herunterladen",
    os_link_contrib: "Beitragen",
    os_link_contrib_sub: "Beitragsanleitung & PR-Vorlage",
    os_link_issues: "Bug melden",
    os_link_issues_sub: "GitHub Issues",
    os_license_desc: "Du bist frei, AvoCook zu nutzen, zu modifizieren und zu verbreiten, solange du dieselbe Lizenz beibehältst. Der Quellcode muss zugänglich bleiben.",
    os_lic_p1: "Frei nutzbar",
    os_lic_p2: "Modifizieren und weitergeben",
    os_lic_p3: "Zugang zum Quellcode garantiert",
    os_lic_p4: "Copyleft — gleiche Lizenz beibehalten",
    donate_label: "Unterstützen",
    donate_title: "Findest du AvoCook nützlich?",
    donate_subtitle: "Die App ist kostenlos und open source. Wenn sie dir in der Küche Zeit spart, hilft eine Spende dabei, die Entwicklungskosten zu decken.",
    donate_revolut: "Spenden via Revolut",
    donate_paypal: "Spenden via PayPal",
    donate_note: "Kein Mindestbetrag. Alles ist willkommen.",
    footer_copy: "Open-Source-Projekt · GPLv3-Lizenz · Mit Sorgfalt gemacht",
    footer_releases: "Releases",
    footer_privacy: "Datenschutz",
    contact_label: "Kontakt",
    contact_title: "Eine Frage? Eine Idee?",
    contact_subtitle: "Für Bugs und Feature-Anfragen ist GitHub Issues am besten. Für alles andere funktioniert die E-Mail.",
    contact_email_label: "Per E-Mail",
    contact_email_note: "Für Bugs oder Feature-Anfragen ist ein GitHub-Issue einfacher zu verfolgen.",
    contact_gh_label: "Via GitHub",
    contact_gh_cta: "Issue öffnen",
    contact_gh_note: "Bugs, Feature-Anfragen, technische Fragen — Templates helfen dabei.",
    apk_sub: "GitHub Releases",
  },

  /* ---- SPANISH ---- */
  es: {
    nav_download: "Descargar",
    hero_title: "Tu cuaderno de recetas,<br><em>siempre contigo</em>",
    hero_subtitle: "Funciona completamente sin conexión, sin cuenta. Sincronización Nextcloud disponible si la necesitas.",
    hero_note: "Modo local — sin cuenta requerida. Tus datos permanecen en tu dispositivo.",
    hero_cta_appstore: "App Store",
    hero_cta_apk: "APK Android",
    stat_languages: "idiomas",
    stat_downloads: "descargas",
    stat_offline: "sin conexión",
    screenshot_placeholder: "Captura próximamente",
    features_label: "Funcionalidades",
    features_title: "Todo lo que necesitas",
    features_subtitle: "Un cuaderno de recetas completo, sin lo superfluo.",
    feat_1_name: "Crear y editar",
    feat_1_desc: "Escribe recetas desde cero, paso a paso. Edítalas en cualquier momento, sin conexión.",
    feat_2_name: "Categorías",
    feat_2_desc: "Organiza recetas por categoría (entrantes, postres, platos rápidos…). Filtra al instante.",
    feat_3_name: "Ajustar raciones",
    feat_3_desc: "Cambia el número de raciones y todas las cantidades se actualizan automáticamente. Sin cálculo mental.",
    feat_4_name: "Fotos",
    feat_4_desc: "Añade una o varias fotos por receta desde tu biblioteca o directamente desde la cámara.",
    feat_5_name: "PDF e imprimir",
    feat_5_desc: "Exporta cualquier receta como PDF o envíala directamente a imprimir desde la app.",
    feat_6_name: "Compartir receta",
    feat_6_desc: "Comparte una receta con otra app usando el menú de compartir estándar del sistema.",
    feat_7_name: "Importar desde URL",
    feat_7_desc: "Pega un enlace de Marmiton, 750g, BBC Good Food — la receta se importa automáticamente via schema.org/Recipe.",
    feat_8_name: "Compartir desde el navegador",
    feat_8_desc: "¿Ves una receta online? Comparte la página desde tu navegador a AvoCook. Importación en un toque.",
    feat_9_name: "Generación IA",
    feat_9_desc: "Escanea una receta desde una foto o describe un plato para obtener una receta completa. Compatible OpenAI.",
    feat_10_name: "Lista de la compra",
    feat_10_desc: "Copia los ingredientes al portapapeles o exporta una lista a Recordatorios iOS.",
    feat_11_name: "Temporizadores",
    feat_11_desc: "Inicia uno o varios temporizadores desde una receta. Notificación local incluso en segundo plano.",
    feat_12_name: "Copia de seguridad",
    feat_12_desc: "Exporta todas tus recetas a un archivo JSON y restáuralas en cualquier momento, en cualquier dispositivo.",
    feat_13_name: "Sincronización Nextcloud",
    feat_13_desc: "Conecta tu propio servidor Nextcloud Cookbook para sincronizar recetas entre dispositivos. Completamente opcional.",
    feat_14_name: "100% sin conexión y privado",
    feat_14_desc: "AvoCook funciona sin conexión a internet. Sin cuenta, sin rastreo, sin servidor de terceros. Tus datos son tuyos.",
    tag_optional: "Opcional",
    screenshots_label: "Vista previa",
    screenshots_title: "La app en imágenes",
    screenshots_subtitle: "Desliza para navegar entre las capturas.",
    ph_home: "Pantalla de inicio",
    ph_list: "Lista de recetas",
    ph_detail: "Detalle de receta",
    ph_editor: "Editor de recetas",
    ph_import: "Importar desde URL",
    ph_shopping: "Lista de compras",
    ph_timer: "Temporizadores",
    how_label: "Funcionamiento",
    how_title: "Local primero. Nextcloud si quieres.",
    how_subtitle: "AvoCook está diseñado para funcionar sin ninguna cuenta. La sincronización Nextcloud es una opción, no un requisito.",
    local_title: "Modo local",
    local_desc: "El modo predeterminado. Sin cuenta, sin conexión necesaria. Las recetas se almacenan en una base de datos SQLite directamente en tu dispositivo.",
    local_p1: "Funciona en modo avión",
    local_p2: "Datos solo en el dispositivo",
    local_p3: "Sin servidor de terceros implicado",
    local_p4: "Copia de seguridad manual en archivo JSON",
    mode_or: "o",
    nextcloud_title: "Sincronización Nextcloud",
    nextcloud_desc: "Conecta tu propio servidor Nextcloud con la app Cookbook. Los datos van directamente entre la app y tu servidor.",
    nextcloud_p1: "Compatible con Nextcloud Cookbook",
    nextcloud_p2: "Sincronización entre dispositivos",
    nextcloud_p3: "Contraseña de app, HTTPS obligatorio",
    nextcloud_p4: "Sin terceros — solo tu Nextcloud",
    import_label: "Importación inteligente",
    import_title: "Importa desde cualquier sitio",
    import_subtitle: "AvoCook lee los datos estructurados schema.org/Recipe que expone la mayoría de sitios de cocina. Pega una URL, la receta está lista en segundos.",
    and_many_more: "y muchos más",
    import_ai_title: "Importación por IA",
    import_ai_desc: "Fotografía una página de libro de cocina, una carta de restaurante o cualquier plato — AvoCook puede generar una receta completa con un modelo compatible con OpenAI. Completamente opcional, tu propia clave API.",
    import_result_meta: "4 raciones · 45 min · Importada de Marmiton",
    import_tag_ingredients: "12 ingredientes",
    import_tag_steps: "6 pasos",
    import_tag_photo: "Foto incluida",
    about_label: "El proyecto",
    about_title: "Hecho por un estudiante, usado cada día",
    about_quote: "\"Tenía mis recetas repartidas entre fotos, pestañas de Safari y notas. Decidí construir la app que me faltaba.\"",
    about_p1: "AvoCook empezó como un proyecto personal durante mis estudios de informática. El objetivo era doble: tener una app de recetas de verdad en el teléfono y aprender a llevar un proyecto React Native de principio a fin.",
    about_p2: "Con el tiempo el proyecto creció: módulos nativos, sincronización Nextcloud, importación de recetas, generación IA, soporte multiplataforma. Cada funcionalidad fue una oportunidad de aprender algo concreto.",
    about_p3: "La app es completamente open source bajo licencia GPLv3. Si quieres inspirarte, contribuir o simplemente ver cómo está construida, el código está en GitHub.",
    about_highlight_title: "Contexto",
    about_highlight_text: "Estudiante de informática · Proyecto personal · Desarrollado en Francia · Publicado en App Store y GitHub · Mantenido activamente",
    num_languages: "Idiomas disponibles en la app",
    num_platforms: "Plataformas — iOS y Android",
    num_license: "Licencia open source · Código en GitHub",
    num_tracking: "Rastreadores · Analytics · Publicidad",
    tech_label: "Stack técnico",
    tech_title: "Lo que corre bajo el capó",
    tech_subtitle: "Un proyecto React Native completo, sin atajos.",
    tech_rn: "Base multiplataforma. Expo para módulos nativos, assets y builds CI/CD.",
    tech_ts: "Tipado completo, del componente a la capa de datos. Sin any implícito.",
    tech_sqlite: "Almacenamiento local de recetas en una base de datos relacional embebida via expo-sqlite.",
    tech_i18n: "Internacionalización completa en 5 idiomas con detección automática.",
    tech_secure: "Credenciales Nextcloud almacenadas en el enclave seguro del sistema (Keychain / Keystore).",
    tech_calendar: "Sincronización de listas de la compra con Recordatorios iOS.",
    tech_schema: "Importación de recetas desde cualquier sitio que exponga datos estructurados Recipe.",
    tech_native: "avocook-timer-notifications — notificaciones locales para temporizadores, incluso en segundo plano.",
    os_label: "Open source",
    os_title: "El código está abierto",
    os_p1: "AvoCook está publicado bajo la licencia GPLv3. Puedes leer el código, hacer un fork y contribuir. Las pull requests son bienvenidas.",
    os_link_repo: "Repositorio GitHub",
    os_link_releases: "Releases y APK",
    os_link_releases_sub: "Descarga la última versión",
    os_link_contrib: "Contribuir",
    os_link_contrib_sub: "Guía de contribución y plantilla de PR",
    os_link_issues: "Reportar un bug",
    os_link_issues_sub: "Issues de GitHub",
    os_license_desc: "Eres libre de usar, modificar y distribuir AvoCook, siempre que conserves la misma licencia. El código fuente debe permanecer accesible.",
    os_lic_p1: "Uso libre",
    os_lic_p2: "Modificar y redistribuir",
    os_lic_p3: "Acceso al código fuente garantizado",
    os_lic_p4: "Copyleft — misma licencia conservada",
    donate_label: "Apoyar",
    donate_title: "¿Te resulta útil AvoCook?",
    donate_subtitle: "La app es gratuita y open source. Si te ahorra tiempo en la cocina, una donación ayuda a cubrir los costes de desarrollo.",
    donate_revolut: "Donar vía Revolut",
    donate_paypal: "Donar vía PayPal",
    donate_note: "Sin importe mínimo. Todo se agradece.",
    footer_copy: "Proyecto open source · Licencia GPLv3 · Hecho con cuidado",
    footer_releases: "Releases",
    footer_privacy: "Privacidad",
    contact_label: "Contacto",
    contact_title: "¿Una pregunta? ¿Una idea?",
    contact_subtitle: "Para bugs y solicitudes de funciones, GitHub Issues es el mejor lugar. Para cualquier otra cosa, el email funciona.",
    contact_email_label: "Por email",
    contact_email_note: "Para bugs o solicitudes de funciones, una issue en GitHub es más fácil de seguir.",
    contact_gh_label: "Via GitHub",
    contact_gh_cta: "Abrir una issue",
    contact_gh_note: "Bugs, solicitudes de funciones, preguntas técnicas — los templates ayudan.",
    apk_sub: "GitHub Releases",
  },

  /* ---- ITALIAN ---- */
  it: {
    nav_download: "Scarica",
    hero_title: "Il tuo taccuino di ricette,<br><em>sempre con te</em>",
    hero_subtitle: "Funziona completamente offline, senza account. Sincronizzazione Nextcloud disponibile se la vuoi.",
    hero_note: "Modalità locale — nessun account richiesto. I tuoi dati rimangono sul tuo dispositivo.",
    hero_cta_appstore: "App Store",
    hero_cta_apk: "APK Android",
    stat_languages: "lingue",
    stat_downloads: "download",
    stat_offline: "offline",
    screenshot_placeholder: "Screenshot in arrivo",
    features_label: "Funzionalità",
    features_title: "Tutto quello che ti serve",
    features_subtitle: "Un taccuino di ricette completo, senza fronzoli.",
    feat_1_name: "Crea e modifica",
    feat_1_desc: "Scrivi ricette da zero, passo dopo passo. Modificale in qualsiasi momento, senza connessione.",
    feat_2_name: "Categorie",
    feat_2_desc: "Organizza le ricette per categoria (antipasti, dolci, piatti veloci…). Filtra all'istante.",
    feat_3_name: "Regola le porzioni",
    feat_3_desc: "Cambia il numero di porzioni e tutte le quantità si aggiornano automaticamente. Nessun calcolo mentale.",
    feat_4_name: "Foto",
    feat_4_desc: "Aggiungi una o più foto per ricetta dalla libreria o direttamente dalla fotocamera.",
    feat_5_name: "PDF e stampa",
    feat_5_desc: "Esporta qualsiasi ricetta come PDF, o inviala direttamente alla stampa dall'app.",
    feat_6_name: "Condividi ricetta",
    feat_6_desc: "Condividi una ricetta con un'altra app tramite il menu di condivisione standard del sistema.",
    feat_7_name: "Importa da URL",
    feat_7_desc: "Incolla un link da Marmiton, 750g, BBC Good Food — la ricetta si importa automaticamente via schema.org/Recipe.",
    feat_8_name: "Condividi dal browser",
    feat_8_desc: "Vedi una ricetta online? Condividi la pagina dal browser ad AvoCook. Importazione in un tocco.",
    feat_9_name: "Generazione IA",
    feat_9_desc: "Scansiona una ricetta da una foto o descrivi un piatto per ottenere una ricetta completa. Compatibile OpenAI.",
    feat_10_name: "Lista della spesa",
    feat_10_desc: "Copia gli ingredienti negli appunti con un tocco, o esporta una lista in Promemoria iOS.",
    feat_11_name: "Timer",
    feat_11_desc: "Avvia uno o più timer di cottura direttamente da una ricetta. Notifica locale anche in background.",
    feat_12_name: "Backup e ripristino",
    feat_12_desc: "Esporta tutte le ricette in un file JSON e ripristinale in qualsiasi momento, su qualsiasi dispositivo.",
    feat_13_name: "Sincronizzazione Nextcloud",
    feat_13_desc: "Collega il tuo server Nextcloud Cookbook per sincronizzare le ricette tra i dispositivi. Completamente opzionale.",
    feat_14_name: "100% offline e privato",
    feat_14_desc: "AvoCook funziona senza connessione internet. Nessun account, nessun tracciamento, nessun server di terze parti. I tuoi dati sono tuoi.",
    tag_optional: "Opzionale",
    screenshots_label: "Anteprima",
    screenshots_title: "L'app in immagini",
    screenshots_subtitle: "Scorri per navigare tra gli screenshot.",
    ph_home: "Schermata home",
    ph_list: "Lista ricette",
    ph_detail: "Dettaglio ricetta",
    ph_editor: "Editor ricetta",
    ph_import: "Importa da URL",
    ph_shopping: "Lista della spesa",
    ph_timer: "Timer",
    how_label: "Come funziona",
    how_title: "Prima locale. Nextcloud se vuoi.",
    how_subtitle: "AvoCook è progettato per funzionare senza nessun account. La sincronizzazione Nextcloud è un'opzione, non un obbligo.",
    local_title: "Modalità locale",
    local_desc: "La modalità predefinita. Nessun account, nessuna connessione necessaria. Le ricette sono memorizzate in un database SQLite direttamente sul tuo dispositivo.",
    local_p1: "Funziona in modalità aereo",
    local_p2: "Dati solo sul dispositivo",
    local_p3: "Nessun server di terze parti coinvolto",
    local_p4: "Backup manuale su file JSON",
    mode_or: "oppure",
    nextcloud_title: "Sincronizzazione Nextcloud",
    nextcloud_desc: "Collega il tuo server Nextcloud con l'app Cookbook. I dati vanno direttamente tra l'app e il tuo server.",
    nextcloud_p1: "Compatibile con Nextcloud Cookbook",
    nextcloud_p2: "Sincronizzazione multi-dispositivo",
    nextcloud_p3: "Password app, HTTPS obbligatorio",
    nextcloud_p4: "Nessuna terza parte — solo il tuo Nextcloud",
    import_label: "Importazione intelligente",
    import_title: "Importa da qualsiasi sito",
    import_subtitle: "AvoCook legge i dati strutturati schema.org/Recipe esposti dalla maggior parte dei siti di cucina. Incolla un URL, la ricetta è pronta in pochi secondi.",
    and_many_more: "e molti altri",
    import_ai_title: "Importazione IA",
    import_ai_desc: "Fotografa una pagina di libro di cucina, un menu di ristorante o qualsiasi piatto — AvoCook può generare una ricetta completa con un modello compatibile OpenAI. Completamente opzionale, tua propria chiave API.",
    import_result_meta: "4 porzioni · 45 min · Importata da Marmiton",
    import_tag_ingredients: "12 ingredienti",
    import_tag_steps: "6 passaggi",
    import_tag_photo: "Foto inclusa",
    about_label: "Il progetto",
    about_title: "Fatto da uno studente, usato ogni giorno",
    about_quote: "\"Avevo le mie ricette sparse tra foto, schede Safari e note. Ho deciso di costruire l'app che mi mancava.\"",
    about_p1: "AvoCook è iniziato come un progetto personale durante i miei studi di informatica. L'obiettivo era duplice: avere una vera app di ricette sul telefono e imparare a portare avanti un progetto React Native dall'inizio alla fine.",
    about_p2: "Nel tempo il progetto è cresciuto: moduli nativi, sincronizzazione Nextcloud, importazione ricette, generazione IA, supporto multipiattaforma. Ogni funzionalità è stata un'occasione per imparare qualcosa di concreto.",
    about_p3: "L'app è completamente open source sotto licenza GPLv3. Se vuoi ispiratene, contribuire o semplicemente vedere com'è costruita, il codice è su GitHub.",
    about_highlight_title: "Contesto",
    about_highlight_text: "Studente di informatica · Progetto personale · Sviluppato in Francia · Pubblicato su App Store e GitHub · Attivamente mantenuto",
    num_languages: "Lingue disponibili nell'app",
    num_platforms: "Piattaforme — iOS e Android",
    num_license: "Licenza open source · Codice su GitHub",
    num_tracking: "Tracker · Analytics · Pubblicità",
    tech_label: "Stack tecnico",
    tech_title: "Cosa gira sotto il cofano",
    tech_subtitle: "Un progetto React Native completo, senza scorciatoie.",
    tech_rn: "Base multipiattaforma. Expo per moduli nativi, asset e build CI/CD.",
    tech_ts: "Tipizzazione completa, dal componente al livello dati. Nessun any implicito.",
    tech_sqlite: "Archiviazione locale delle ricette in un database relazionale incorporato via expo-sqlite.",
    tech_i18n: "Internazionalizzazione completa in 5 lingue con rilevamento automatico.",
    tech_secure: "Credenziali Nextcloud memorizzate nell'enclave sicura del sistema (Keychain / Keystore).",
    tech_calendar: "Sincronizzazione delle liste della spesa con Promemoria iOS.",
    tech_schema: "Importazione di ricette da qualsiasi sito che esponga dati strutturati Recipe.",
    tech_native: "avocook-timer-notifications — notifiche locali per i timer, anche in background.",
    os_label: "Open source",
    os_title: "Il codice è aperto",
    os_p1: "AvoCook è pubblicato sotto licenza GPLv3. Puoi leggere il codice, forkarlo e contribuire. Le pull request sono benvenute.",
    os_link_repo: "Repository GitHub",
    os_link_releases: "Release e APK",
    os_link_releases_sub: "Scarica l'ultima versione",
    os_link_contrib: "Contribuire",
    os_link_contrib_sub: "Guida al contributo e template PR",
    os_link_issues: "Segnalare un bug",
    os_link_issues_sub: "GitHub Issues",
    os_license_desc: "Sei libero di usare, modificare e distribuire AvoCook, purché tu mantenga la stessa licenza. Il codice sorgente deve rimanere accessibile.",
    os_lic_p1: "Uso libero",
    os_lic_p2: "Modifica e ridistribuisci",
    os_lic_p3: "Accesso al codice sorgente garantito",
    os_lic_p4: "Copyleft — stessa licenza mantenuta",
    donate_label: "Supporta",
    donate_title: "Trovi AvoCook utile?",
    donate_subtitle: "L'app è gratuita e open source. Se ti fa risparmiare tempo in cucina, una donazione aiuta a coprire i costi di sviluppo.",
    donate_revolut: "Dona tramite Revolut",
    donate_paypal: "Dona tramite PayPal",
    donate_note: "Nessun importo minimo. Tutto è apprezzato.",
    footer_copy: "Progetto open source · Licenza GPLv3 · Fatto con cura",
    footer_releases: "Release",
    footer_privacy: "Privacy",
    contact_label: "Contatto",
    contact_title: "Una domanda? Un'idea?",
    contact_subtitle: "Per bug e richieste di funzionalità, GitHub Issues è il posto migliore. Per tutto il resto, l'email funziona.",
    contact_email_label: "Via email",
    contact_email_note: "Per bug o richieste di funzionalità, una issue su GitHub è più facile da seguire.",
    contact_gh_label: "Via GitHub",
    contact_gh_cta: "Aprire una issue",
    contact_gh_note: "Bug, richieste di funzionalità, domande tecniche — i template guidano il report.",
    apk_sub: "GitHub Releases",
  },
};

/* =========================================
   Language management
   ========================================= */

function detectLanguage() {
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  if (urlLang && translations[urlLang]) return urlLang;

  const saved = localStorage.getItem('avocook-lang');
  if (saved && translations[saved]) return saved;

  const browser = (navigator.language || 'fr').slice(0, 2).toLowerCase();
  return translations[browser] ? browser : 'fr';
}

function applyLanguage(lang) {
  if (!translations[lang]) return;
  const t = translations[lang];

  document.documentElement.lang = lang;

  // Text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) el.textContent = t[key];
  });

  // HTML content (hero title with <br> and <em>)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (t[key] !== undefined) el.innerHTML = t[key];
  });

  // Image sources
  document.querySelectorAll('[data-i18n-img]').forEach(el => {
    const template = el.getAttribute('data-i18n-img');
    el.src = template.replace('{lang}', lang);
  });

  // Update active button
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  localStorage.setItem('avocook-lang', lang);
}

/* =========================================
   Theme management
   ========================================= */

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // ◑ is a neutral monochrome Unicode character, not an emoji
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = '◑';
  localStorage.setItem('avocook-theme', theme);
}

function initTheme() {
  const saved = localStorage.getItem('avocook-theme');
  if (saved) { applyTheme(saved); return; }
  const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  applyTheme(preferred);
}

/* =========================================
   Scroll animations
   ========================================= */

function initScrollAnimations() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
}

/* =========================================
   Nav scroll effect
   ========================================= */

function initNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* =========================================
   Carousel drag-to-scroll
   ========================================= */

function initCarousel() {
  const track = document.getElementById('carousel');
  if (!track) return;

  let isDown = false, startX = 0, scrollLeft = 0;

  track.addEventListener('mousedown', e => {
    isDown = true;
    startX = e.pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
  });
  track.addEventListener('mouseleave', () => { isDown = false; });
  track.addEventListener('mouseup', () => { isDown = false; });
  track.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    track.scrollLeft = scrollLeft - (x - startX) * 1.4;
  });
}

/* =========================================
   Init
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  applyLanguage(detectLanguage());
  initScrollAnimations();
  initNav();
  initCarousel();

  // Language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => applyLanguage(btn.getAttribute('data-lang')));
  });

  // Theme toggle
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  // Download dropdown — accessible via hover (CSS) and click/keyboard (JS)
  const dlBtn = document.getElementById('nav-download-btn');
  const dlWrap = dlBtn ? dlBtn.closest('.nav-download-wrap') : null;
  if (dlBtn && dlWrap) {
    dlBtn.addEventListener('click', () => {
      const open = dlWrap.classList.toggle('open');
      dlBtn.setAttribute('aria-expanded', String(open));
    });
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!dlWrap.contains(e.target)) {
        dlWrap.classList.remove('open');
        dlBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Email protection — build address from parts, never hardcoded in HTML
  const emailLink = document.getElementById('contact-email-link');
  if (emailLink) {
    const parts = ['avocook', 'nephoos', 'com'];
    const addr = parts[0] + '@' + parts[1] + '.' + parts[2];
    emailLink.href = 'mail\u0074o:' + addr;
    emailLink.textContent = addr;
  }
});
