import * as Localization from "expo-localization";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

export const resources = {
  fr: {
    translation: {
      common: {
        add: "Ajouter",
        cancel: "Annuler",
        delete: "Supprimer",
        edit: "Modifier",
        save: "Enregistrer",
        search: "Rechercher",
        clear: "Effacer",
        settings: "Réglages",
        import: "Importer",
        sync: "Synchroniser",
        logout: "Déconnexion",
        loading: "Chargement",
        offline: "Hors ligne",
        online: "Connecté",
        retry: "Réessayer",
        close: "Fermer",
        continue: "Continuer"
      },
      auth: {
        title: "AvoCook",
        subtitle: "Vos recettes cloud, prêtes en cuisine.",
        server: "Adresse Nextcloud",
        username: "Identifiant",
        appPassword: "Mot de passe d'application",
        login: "Se connecter",
        secure: "Identifiants chiffrés dans le trousseau de l'appareil",
        invalidUrl: "Adresse Nextcloud invalide.",
        insecureUrl:
          "Utilisez HTTPS, sauf pour localhost pendant le développement.",
        failed: "Connexion impossible. Vérifiez le serveur et l'app password.",
        certificateError:
          "Connexion réseau/TLS impossible. Si votre serveur utilise un certificat auto-signé, installez et approuvez son autorité de certification sur l'appareil, ou utilisez un certificat public valide.",
        useLocal: "Utiliser sans Nextcloud",
        showPassword: "Afficher le mot de passe",
        hidePassword: "Masquer le mot de passe",
        appPasswordHelp: "Comment créer un app password ?",
        localSubtitle:
          "Mode local gratuit : vos recettes restent uniquement sur cet appareil.",
        localDataWarning:
          "Attention : en mode local, supprimer l'application supprime aussi les recettes stockées sur cet appareil. Exportez une sauvegarde avant de désinstaller.",
        badCredentials:
          "Identifiant ou mot de passe d'application incorrect. Créez un app password Nextcloud dédié.",
        tutorial: {
          title: "Créer un mot de passe d'application Nextcloud",
          steps: {
            openNextcloud:
              "Ouvrez Nextcloud dans un navigateur et connectez-vous à votre compte.",
            openSettings:
              "Cliquez sur votre avatar ou votre nom, puis ouvrez Paramètres, Paramètres personnels ou Personal settings selon la version.",
            openSecurity:
              "Ouvrez Sécurité. Sur certaines versions, la section s'appelle Appareils et sessions, Devices & sessions ou App passwords.",
            createPassword:
              "Créez un nouveau mot de passe d'application, par exemple nommé Cookbook Mobile.",
            copyPassword:
              "Copiez le mot de passe affiché une seule fois, puis collez-le ici avec votre identifiant Nextcloud."
          },
          versionNote:
            "Les noms exacts changent selon les versions et thèmes Nextcloud, mais le chemin reste toujours dans les paramètres personnels du compte, section sécurité ou sessions."
        }
      },
      recipes: {
        title: "Recettes",
        emptyTitle: "Aucune recette",
        emptyBody: "Ajoutez une recette ou synchronisez votre Cookbook.",
        openFailedTitle: "Recette impossible à ouvrir",
        openFailedBody:
          "Cette recette contient des données inattendues. Elle reste conservée ; revenez à la liste puis relancez une synchronisation.",
        ingredients: "Ingrédients",
        instructions: "Étapes",
        tools: "Ustensiles",
        nutrition: "Nutrition",
        category: "Catégorie",
        yield: "Portions",
        prepTime: "Préparation",
        cookTime: "Cuisson",
        totalTime: "Total",
        minutes: "min",
        source: "Source",
        noCategory: "Sans catégorie",
        deleteConfirm: "Supprimer cette recette ?",
        duplicateTitle: "Recette du même nom",
        duplicateTitleBody:
          "« {{title}} » existe déjà sous le nom « {{existingTitle}} ». Voulez-vous fusionner les données ou garder les deux recettes ?",
        keepBoth: "Garder les deux",
        mergeRecipes: "Fusionner",
        allCategories: "Toutes",
        uncategorized: "Sans catégorie",
        categories: "Catégories",
        categoryCount: "{{count}} recette",
        categoryCount_one: "{{count}} recette",
        categoryCount_other: "{{count}} recettes",
        newCategory: "Nouvelle catégorie",
        categoryName: "Nom de catégorie",
        createCategory: "Créer la catégorie",
        chooseCategory: "Choisir une catégorie",
        moreCategories: "Plus",
        loadingRecipes: "Chargement des recettes...",
        syncingRecipes: "Synchronisation en cours...",
        syncingRecipesShort: "Synchronisation...",
        loadedRecipes: "{{count}} recette chargée",
        loadedRecipes_one: "{{count}} recette chargée",
        loadedRecipes_other: "{{count}} recettes chargées",
        selectedCategory: "Catégorie sélectionnée : {{category}}",
        servings: {
          title: "Portions",
          people: "personnes",
          decrease: "Réduire les portions",
          increase: "Augmenter les portions",
          original: "Recette d'origine : {{count}} personne",
          original_one: "Recette d'origine : {{count}} personne",
          original_other: "Recette d'origine : {{count}} personnes",
          reset: "Revenir à l'origine"
        },
        timers: {
          title: "Minuteurs",
          prep: "Préparation",
          cook: "Cuisson",
          total: "Total",
          start: "Lancer le minuteur",
          pause: "Mettre en pause",
          reset: "Réinitialiser",
          stop: "Arrêter",
          done: "Terminé",
          notificationTitle: "{{timer}} terminé",
          notificationHint:
            "Les minuteurs sonnent via les notifications. Elles doivent être autorisées.",
          notificationsOff:
            "Notifications désactivées : les minuteurs ne peuvent pas sonner.",
          notificationsUnavailable:
            "Notifications indisponibles dans ce runtime. Installez un vrai build pour utiliser les minuteurs.",
          notificationsRequiredTitle: "Notifications nécessaires",
          notificationsRequiredBody:
            "Activez les notifications pour AvoCook dans les réglages du téléphone. Sans elles, le minuteur ne peut pas sonner quand l'iPhone est verrouillé.",
          notificationsUnavailableBody:
            "Ce build ne contient pas encore le module natif de notifications. Installez un vrai build iOS reconstruit pour utiliser les minuteurs."
        },
        health: {
          title: "Santé",
          estimated: "Score santé estimé",
          missingTitle: "Informations nutritionnelles à compléter",
          localNote:
            "Estimation locale non officielle, basée sur les valeurs par portion/personne.",
          calculation:
            "Le score pénalise calories, sucres, graisses saturées et sodium, puis valorise fibres et protéines. Il devient fiable seulement si les valeurs nutritionnelles sont renseignées.",
          calories: "Calories",
          sugar: "Sucres",
          fat: "Matières grasses",
          salt: "Sel",
          fiber: "Fibres",
          protein: "Protéines",
          recommendations: {
            balanced: "Profil équilibré pour les données disponibles.",
            missingNutrition:
              "Ajoutez calories, sucres, sel, fibres et protéines pour obtenir une recommandation plus précise.",
            highCalories:
              "Servez une portion plus petite ou accompagnez avec des légumes.",
            highSugar:
              "Réduisez le sucre ou ajoutez un fruit frais en accompagnement.",
            highFat:
              "Privilégiez une matière grasse plus légère ou diminuez la quantité.",
            highSalt:
              "Goûtez avant de saler et utilisez herbes, épices ou citron.",
            addFiber:
              "Ajoutez fibres, légumes, légumineuses ou céréales complètes.",
            goodProtein:
              "Bon apport en protéines pour la satiété."
          }
        }
      },
      editor: {
        newRecipe: "Nouvelle recette",
        editRecipe: "Modifier la recette",
        name: "Nom",
        description: "Description",
        ingredients: "Ingrédients, une ligne par élément",
        instructions: "Étapes, une ligne par étape",
        tools: "Ustensiles, une ligne par élément",
        photoUrl: "URL de la photo",
        choosePhoto: "Choisir une photo",
        removePhoto: "Retirer la photo",
        keywords: "Mots-clés séparés par des virgules",
        category: "Catégorie",
        prepMinutes: "Préparation en minutes",
        cookMinutes: "Cuisson en minutes",
        totalMinutes: "Total en minutes",
        nutrition: "Nutrition par portion",
        nutritionHelp:
          "Ces valeurs servent au score santé. Laissez vide si vous ne les connaissez pas.",
        caloriesKcal: "Calories (kcal)",
        carbsGrams: "Glucides (g)",
        sugarGrams: "Sucres (g)",
        fatGrams: "Matières grasses (g)",
        saturatedFatGrams: "Graisses saturées (g)",
        sodiumMg: "Sodium / sel (mg)",
        fiberGrams: "Fibres (g)",
        proteinGrams: "Protéines (g)",
        requiredName: "Le nom de la recette est obligatoire."
      },
      importRecipe: {
        title: "Importer",
        url: "URL de la recette",
        action: "Importer depuis l'URL",
        failed: "Import impossible pour cette page.",
        success: "Recette importée"
      },
      settings: {
        title: "Réglages",
        appearance: "Apparence",
        language: "Langue",
        system: "Système",
        light: "Clair",
        dark: "Sombre",
        french: "Français",
        english: "English",
        german: "Deutsch",
        keepAwake: "Garder l'écran allumé sur une recette",
        keepRecipesLocal:
          "Conserver une copie locale des recettes pour le hors ligne",
        server: "Serveur",
        localMode: "Mode local",
        localOnly: "Utilisation sans compte Nextcloud",
        privacy: "Confidentialité",
        secureStore:
          "Les identifiants restent dans le stockage sécurisé du téléphone.",
        reindex: "Réindexer Cookbook",
        reindexConfirmTitle: "Réindexer le serveur ?",
        reindexConfirmBody:
          "Cette action demande à Nextcloud Cookbook de rescanner le dossier de recettes. C'est utile si des recettes ont été ajoutées ou modifiées hors de l'app, mais cela peut prendre du temps sur un gros Cookbook.",
        reindexDone: "Réindexation demandée",
        openPrivacy: "Confidentialité et données",
        notifications: "Notifications",
        notificationsEnabled: "Activées",
        notificationsDisabled: "Désactivées (cliquer pour activer)",
        dataBackup: "Sauvegarde des données",
        dataBackupLocalBody:
          "Exportez ou importez un fichier AvoCook contenant les recettes, catégories et photos de cet appareil.",
        dataBackupNextcloudBody:
          "L'export synchronise d'abord Nextcloud, puis sauvegarde recettes, catégories et photos disponibles.",
        localDeleteWarning:
          "Si vous supprimez l'application, les données locales sont supprimées de ce téléphone.",
        exportBackup: "Exporter une sauvegarde",
        importBackup: "Importer une sauvegarde",
        backupExportTitle: "Sauvegarde exportée",
        backupExportDone:
          "Sauvegarde prête : {{count}} recettes et {{images}} images.",
        backupExportPartial:
          "{{count}} image(s) n'ont pas pu être ajoutée(s) au fichier.",
        backupImportTitle: "Import terminé",
        backupImportConfirmTitle: "Importer cette sauvegarde ?",
        backupImportConfirmBody:
          "L'import fusionne les données sans supprimer vos recettes actuelles. Les doublons exacts sont ignorés, les mêmes recettes sont mises à jour et les conflits de nom sont renommés.",
        backupImportDone:
          "Import terminé : {{created}} ajoutée(s), {{updated}} mise(s) à jour, {{skipped}} doublon(s) ignoré(s), {{renamed}} renommée(s).",
        backupFailedTitle: "Sauvegarde impossible",
        backupFailed:
          "L'opération n'a pas pu se terminer. Vérifiez le fichier choisi, l'accès au dossier ou la connexion Nextcloud.",
        backupInvalid: "Ce fichier n'est pas une sauvegarde AvoCook valide."
      },
      privacy: {
        title: "Confidentialité",
        free:
          "Cette application est gratuite et développée par un étudiant indépendant.",
        independent:
          "Elle n'est pas une application officielle Nextcloud et ne vend aucune donnée.",
        local:
          "En mode local, les recettes restent sur cet appareil. Avec Nextcloud, elles sont synchronisées uniquement avec le serveur que vous choisissez.",
        credentials:
          "L'adresse du serveur, l'identifiant et l'app password sont stockés dans le stockage sécurisé de l'appareil.",
        tracking:
          "Aucune publicité, aucun traceur marketing et aucune revente de données ne sont prévus.",
        photos:
          "Les photos ajoutées manuellement sont copiées dans le stockage de l'application pour rester disponibles hors ligne."
      }
    }
  },
  en: {
    translation: {
      common: {
        add: "Add",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        save: "Save",
        search: "Search",
        clear: "Clear",
        settings: "Settings",
        import: "Import",
        sync: "Sync",
        logout: "Log out",
        loading: "Loading",
        offline: "Offline",
        online: "Connected",
        retry: "Retry",
        close: "Close",
        continue: "Continue"
      },
      auth: {
        title: "AvoCook",
        subtitle: "Your cloud recipes, ready in the kitchen.",
        server: "Nextcloud address",
        username: "Username",
        appPassword: "App password",
        login: "Sign in",
        secure: "Credentials encrypted in the device keychain",
        invalidUrl: "Invalid Nextcloud address.",
        insecureUrl: "Use HTTPS except localhost during development.",
        failed: "Unable to sign in. Check the server and app password.",
        certificateError:
          "Network/TLS connection failed. If your server uses a self-signed certificate, install and trust its certificate authority on the device, or use a valid public certificate.",
        useLocal: "Use without Nextcloud",
        showPassword: "Show password",
        hidePassword: "Hide password",
        appPasswordHelp: "How do I create an app password?",
        localSubtitle:
          "Free local mode: your recipes stay only on this device.",
        localDataWarning:
          "Warning: in local mode, deleting the app also deletes recipes stored on this device. Export a backup before uninstalling.",
        badCredentials:
          "Wrong username or app password. Create a dedicated Nextcloud app password.",
        tutorial: {
          title: "Create a Nextcloud app password",
          steps: {
            openNextcloud:
              "Open Nextcloud in a browser and sign in to your account.",
            openSettings:
              "Select your avatar or name, then open Settings, Personal settings or Personal depending on the version.",
            openSecurity:
              "Open Security. On some versions, the section is called Devices & sessions or App passwords.",
            createPassword:
              "Create a new app password, for example named Cookbook Mobile.",
            copyPassword:
              "Copy the password shown once, then paste it here with your Nextcloud username."
          },
          versionNote:
            "Exact labels vary across Nextcloud versions and themes, but the path stays in personal account settings under security or sessions."
        }
      },
      recipes: {
        title: "Recipes",
        emptyTitle: "No recipes",
        emptyBody: "Add a recipe or sync your Cookbook.",
        openFailedTitle: "Recipe could not be opened",
        openFailedBody:
          "This recipe contains unexpected data. It has not been deleted; go back to the list and sync again.",
        ingredients: "Ingredients",
        instructions: "Steps",
        tools: "Tools",
        nutrition: "Nutrition",
        category: "Category",
        yield: "Servings",
        prepTime: "Prep",
        cookTime: "Cook",
        totalTime: "Total",
        minutes: "min",
        source: "Source",
        noCategory: "No category",
        deleteConfirm: "Delete this recipe?",
        duplicateTitle: "Recipe with the same title",
        duplicateTitleBody:
          "\"{{title}}\" already exists as \"{{existingTitle}}\". Do you want to merge the data or keep both recipes?",
        keepBoth: "Keep both",
        mergeRecipes: "Merge",
        allCategories: "All",
        uncategorized: "No category",
        categories: "Categories",
        categoryCount: "{{count}} recipe",
        categoryCount_one: "{{count}} recipe",
        categoryCount_other: "{{count}} recipes",
        newCategory: "New category",
        categoryName: "Category name",
        createCategory: "Create category",
        chooseCategory: "Choose category",
        moreCategories: "More",
        loadingRecipes: "Loading recipes...",
        syncingRecipes: "Syncing recipes...",
        syncingRecipesShort: "Syncing...",
        loadedRecipes: "{{count}} recipe loaded",
        loadedRecipes_one: "{{count}} recipe loaded",
        loadedRecipes_other: "{{count}} recipes loaded",
        selectedCategory: "Selected category: {{category}}",
        servings: {
          title: "Servings",
          people: "people",
          decrease: "Decrease servings",
          increase: "Increase servings",
          original: "Original recipe: {{count}} person",
          original_one: "Original recipe: {{count}} person",
          original_other: "Original recipe: {{count}} people",
          reset: "Reset to original"
        },
        timers: {
          title: "Timers",
          prep: "Prep",
          cook: "Cook",
          total: "Total",
          start: "Start timer",
          pause: "Pause",
          reset: "Reset",
          stop: "Stop",
          done: "Done",
          notificationTitle: "{{timer}} done",
          notificationHint:
            "Timers ring through notifications. Notifications must be allowed.",
          notificationsOff: "Notifications are off: timers cannot ring.",
          notificationsUnavailable:
            "Notifications are unavailable in this runtime. Install a real build to use timers.",
          notificationsRequiredTitle: "Notifications required",
          notificationsRequiredBody:
            "Enable notifications for AvoCook in phone settings. Without them, the timer cannot ring when the iPhone is locked.",
          notificationsUnavailableBody:
            "This build does not include the native notifications module yet. Install a rebuilt real iOS build to use timers."
        },
        health: {
          title: "Health",
          estimated: "Estimated health score",
          missingTitle: "Nutrition details missing",
          localNote:
            "Unofficial local estimate based on per-serving/person nutrition values.",
          calculation:
            "The score penalizes calories, sugar, saturated fat and sodium, then rewards fiber and protein. It is reliable only when nutrition values are filled in.",
          calories: "Calories",
          sugar: "Sugar",
          fat: "Fat",
          salt: "Salt",
          fiber: "Fiber",
          protein: "Protein",
          recommendations: {
            balanced: "Balanced profile for the available data.",
            missingNutrition:
              "Add calories, sugar, salt, fiber and protein for a more precise recommendation.",
            highCalories:
              "Serve a smaller portion or pair it with vegetables.",
            highSugar: "Reduce sugar or add fresh fruit on the side.",
            highFat:
              "Use a lighter fat source or reduce the quantity.",
            highSalt:
              "Taste before salting and use herbs, spices or lemon.",
            addFiber:
              "Add fiber, vegetables, legumes or whole grains.",
            goodProtein: "Good protein level for satiety."
          }
        }
      },
      editor: {
        newRecipe: "New recipe",
        editRecipe: "Edit recipe",
        name: "Name",
        description: "Description",
        ingredients: "Ingredients, one per line",
        instructions: "Steps, one per line",
        tools: "Tools, one per line",
        photoUrl: "Photo URL",
        choosePhoto: "Choose photo",
        removePhoto: "Remove photo",
        keywords: "Comma-separated keywords",
        category: "Category",
        prepMinutes: "Prep minutes",
        cookMinutes: "Cook minutes",
        totalMinutes: "Total minutes",
        nutrition: "Nutrition per serving",
        nutritionHelp:
          "These values feed the health score. Leave them empty if you do not know them.",
        caloriesKcal: "Calories (kcal)",
        carbsGrams: "Carbs (g)",
        sugarGrams: "Sugar (g)",
        fatGrams: "Fat (g)",
        saturatedFatGrams: "Saturated fat (g)",
        sodiumMg: "Sodium / salt (mg)",
        fiberGrams: "Fiber (g)",
        proteinGrams: "Protein (g)",
        requiredName: "Recipe name is required."
      },
      importRecipe: {
        title: "Import",
        url: "Recipe URL",
        action: "Import from URL",
        failed: "This page could not be imported.",
        success: "Recipe imported"
      },
      settings: {
        title: "Settings",
        appearance: "Appearance",
        language: "Language",
        system: "System",
        light: "Light",
        dark: "Dark",
        french: "Français",
        english: "English",
        german: "Deutsch",
        keepAwake: "Keep screen awake on a recipe",
        keepRecipesLocal: "Keep a local copy of recipes for offline use",
        server: "Server",
        localMode: "Local mode",
        localOnly: "Using without a Nextcloud account",
        privacy: "Privacy",
        secureStore: "Credentials stay in the phone secure storage.",
        reindex: "Reindex Cookbook",
        reindexConfirmTitle: "Reindex the server?",
        reindexConfirmBody:
          "This asks Nextcloud Cookbook to rescan the recipe folder. It is useful if recipes were added or changed outside the app, but it can take a while on a large Cookbook.",
        reindexDone: "Reindex requested",
        openPrivacy: "Privacy and data",
        notifications: "Notifications",
        notificationsEnabled: "Enabled",
        notificationsDisabled: "Disabled (click to enable)",
        dataBackup: "Data backup",
        dataBackupLocalBody:
          "Export or import an AvoCook file containing recipes, categories and photos from this device.",
        dataBackupNextcloudBody:
          "Export syncs Nextcloud first, then saves recipes, categories and available photos.",
        localDeleteWarning:
          "If you delete the app, local data is removed from this phone.",
        exportBackup: "Export backup",
        importBackup: "Import backup",
        backupExportTitle: "Backup exported",
        backupExportDone:
          "Backup ready: {{count}} recipes and {{images}} images.",
        backupExportPartial:
          "{{count}} image(s) could not be added to the file.",
        backupImportTitle: "Import complete",
        backupImportConfirmTitle: "Import this backup?",
        backupImportConfirmBody:
          "Import merges data without deleting your current recipes. Exact duplicates are skipped, matching recipes are updated and name conflicts are renamed.",
        backupImportDone:
          "Import complete: {{created}} added, {{updated}} updated, {{skipped}} duplicate(s) skipped, {{renamed}} renamed.",
        backupFailedTitle: "Backup failed",
        backupFailed:
          "The operation could not finish. Check the selected file, folder access or Nextcloud connection.",
        backupInvalid: "This file is not a valid AvoCook backup."
      },
      privacy: {
        title: "Privacy",
        free:
          "This app is free and developed by an independent student.",
        independent:
          "It is not an official Nextcloud app and does not sell data.",
        local:
          "In local mode, recipes stay on this device. With Nextcloud, they sync only with the server you choose.",
        credentials:
          "The server address, username and app password are stored in the device secure storage.",
        tracking:
          "No ads, no marketing trackers and no data resale are planned.",
        photos:
          "Photos added manually are copied into app storage so they remain available offline."
      }
    }
  },
  de: {
    translation: {
      common: {
        add: "Hinzufügen",
        cancel: "Abbrechen",
        delete: "Löschen",
        edit: "Bearbeiten",
        save: "Speichern",
        search: "Suchen",
        clear: "Löschen",
        settings: "Einstellungen",
        import: "Importieren",
        sync: "Synchronisieren",
        logout: "Abmelden",
        loading: "Laden",
        offline: "Offline",
        online: "Verbunden",
        retry: "Wiederholen",
        close: "Schließen",
        continue: "Weiter"
      },
      auth: {
        title: "AvoCook",
        subtitle: "Deine Cloud-Rezepte, küchenfertig.",
        server: "Nextcloud-Adresse",
        username: "Benutzername",
        appPassword: "App-Passwort",
        login: "Anmelden",
        secure: "Anmeldedaten verschlüsselt im Geräteschlüsselbund",
        invalidUrl: "Ungültige Nextcloud-Adresse.",
        insecureUrl:
          "Verwende HTTPS, außer für localhost während der Entwicklung.",
        failed:
          "Anmeldung fehlgeschlagen. Prüfe Server und App-Passwort.",
        certificateError:
          "Netzwerk-/TLS-Verbindung fehlgeschlagen. Wenn dein Server ein selbstsigniertes Zertifikat nutzt, installiere und vertraue der Zertifizierungsstelle auf dem Gerät oder nutze ein gültiges öffentliches Zertifikat.",
        useLocal: "Ohne Nextcloud verwenden",
        showPassword: "Passwort anzeigen",
        hidePassword: "Passwort verbergen",
        appPasswordHelp: "Wie erstelle ich ein App-Passwort?",
        localSubtitle:
          "Kostenloser lokaler Modus: Rezepte bleiben nur auf diesem Gerät.",
        localDataWarning:
          "Achtung: Im lokalen Modus werden beim Löschen der App auch die auf diesem Gerät gespeicherten Rezepte gelöscht. Exportiere vor dem Deinstallieren eine Sicherung.",
        badCredentials:
          "Falscher Benutzername oder App-Passwort. Erstelle ein dediziertes Nextcloud-App-Passwort.",
        tutorial: {
          title: "Nextcloud-App-Passwort erstellen",
          steps: {
            openNextcloud:
              "Öffne Nextcloud im Browser und melde dich an.",
            openSettings:
              "Klicke auf deinen Avatar oder Namen, dann öffne Einstellungen oder Persönliche Einstellungen.",
            openSecurity:
              "Öffne Sicherheit. In manchen Versionen heißt die Sektion Geräte & Sitzungen oder App-Passwörter.",
            createPassword:
              "Erstelle ein neues App-Passwort, z. B. mit dem Namen Cookbook Mobile.",
            copyPassword:
              "Kopiere das einmalig angezeigte Passwort und füge es hier zusammen mit deinem Nextcloud-Benutzernamen ein."
          },
          versionNote:
            "Die genauen Bezeichnungen variieren je nach Nextcloud-Version und Theme, aber der Pfad liegt immer in den persönlichen Kontoeinstellungen unter Sicherheit oder Sitzungen."
        }
      },
      recipes: {
        title: "Rezepte",
        emptyTitle: "Keine Rezepte",
        emptyBody: "Füge ein Rezept hinzu oder synchronisiere dein Cookbook.",
        openFailedTitle: "Rezept konnte nicht geöffnet werden",
        openFailedBody:
          "Dieses Rezept enthält unerwartete Daten. Es wurde nicht gelöscht; gehe zurück zur Liste und synchronisiere erneut.",
        ingredients: "Zutaten",
        instructions: "Schritte",
        tools: "Werkzeuge",
        nutrition: "Nährwerte",
        category: "Kategorie",
        yield: "Portionen",
        prepTime: "Vorbereitung",
        cookTime: "Kochen",
        totalTime: "Gesamt",
        minutes: "Min.",
        source: "Quelle",
        noCategory: "Keine Kategorie",
        deleteConfirm: "Dieses Rezept löschen?",
        duplicateTitle: "Rezept mit gleichem Titel",
        duplicateTitleBody:
          "\"{{title}}\" existiert bereits als \"{{existingTitle}}\". Möchtest du die Daten zusammenführen oder beide Rezepte behalten?",
        keepBoth: "Beide behalten",
        mergeRecipes: "Zusammenführen",
        allCategories: "Alle",
        uncategorized: "Keine Kategorie",
        categories: "Kategorien",
        categoryCount: "{{count}} Rezept",
        categoryCount_one: "{{count}} Rezept",
        categoryCount_other: "{{count}} Rezepte",
        newCategory: "Neue Kategorie",
        categoryName: "Kategoriename",
        createCategory: "Kategorie erstellen",
        chooseCategory: "Kategorie wählen",
        moreCategories: "Mehr",
        loadingRecipes: "Rezepte werden geladen...",
        syncingRecipes: "Synchronisierung läuft...",
        syncingRecipesShort: "Synchronisieren...",
        loadedRecipes: "{{count}} Rezept geladen",
        loadedRecipes_one: "{{count}} Rezept geladen",
        loadedRecipes_other: "{{count}} Rezepte geladen",
        selectedCategory: "Ausgewählte Kategorie: {{category}}",
        servings: {
          title: "Portionen",
          people: "Personen",
          decrease: "Portionen verringern",
          increase: "Portionen erhöhen",
          original: "Originalrezept: {{count}} Person",
          original_one: "Originalrezept: {{count}} Person",
          original_other: "Originalrezept: {{count}} Personen",
          reset: "Zum Original zurücksetzen"
        },
        timers: {
          title: "Timer",
          prep: "Vorbereitung",
          cook: "Kochen",
          total: "Gesamt",
          start: "Timer starten",
          pause: "Pausieren",
          reset: "Zurücksetzen",
          stop: "Stoppen",
          done: "Fertig",
          notificationTitle: "{{timer}} abgeschlossen",
          notificationHint:
            "Timer klingeln über Benachrichtigungen. Diese müssen erlaubt sein.",
          notificationsOff:
            "Benachrichtigungen deaktiviert: Timer können nicht klingeln.",
          notificationsUnavailable:
            "Benachrichtigungen in dieser Laufzeitumgebung nicht verfügbar. Installiere einen echten Build für Timer.",
          notificationsRequiredTitle: "Benachrichtigungen erforderlich",
          notificationsRequiredBody:
            "Aktiviere Benachrichtigungen für AvoCook in den Telefoneinstellungen. Ohne sie kann der Timer nicht klingeln, wenn das iPhone gesperrt ist.",
          notificationsUnavailableBody:
            "Dieser Build enthält noch kein natives Benachrichtigungsmodul. Installiere einen neu erstellten iOS-Build für Timer."
        },
        health: {
          title: "Gesundheit",
          estimated: "Geschätzter Gesundheitsscore",
          missingTitle: "Nährwertangaben fehlen",
          localNote:
            "Inoffizielle lokale Schätzung basierend auf Nährwerten pro Portion/Person.",
          calculation:
            "Der Score bewertet Kalorien, Zucker, gesättigte Fettsäuren und Natrium negativ, Ballaststoffe und Eiweiß positiv. Er ist nur verlässlich, wenn Nährwerte angegeben sind.",
          calories: "Kalorien",
          sugar: "Zucker",
          fat: "Fett",
          salt: "Salz",
          fiber: "Ballaststoffe",
          protein: "Eiweiß",
          recommendations: {
            balanced: "Ausgewogenes Profil für die verfügbaren Daten.",
            missingNutrition:
              "Füge Kalorien, Zucker, Salz, Ballaststoffe und Eiweiß für eine genauere Empfehlung hinzu.",
            highCalories:
              "Serviere eine kleinere Portion oder ergänze mit Gemüse.",
            highSugar:
              "Reduziere Zucker oder füge frisches Obst als Beilage hinzu.",
            highFat:
              "Verwende ein leichteres Fett oder reduziere die Menge.",
            highSalt:
              "Koste vor dem Salzen und verwende Kräuter, Gewürze oder Zitrone.",
            addFiber:
              "Füge Ballaststoffe, Gemüse, Hülsenfrüchte oder Vollkorngetreide hinzu.",
            goodProtein: "Guter Eiweißgehalt für die Sättigung."
          }
        }
      },
      editor: {
        newRecipe: "Neues Rezept",
        editRecipe: "Rezept bearbeiten",
        name: "Name",
        description: "Beschreibung",
        ingredients: "Zutaten, eine pro Zeile",
        instructions: "Schritte, einer pro Zeile",
        tools: "Werkzeuge, eines pro Zeile",
        photoUrl: "Foto-URL",
        choosePhoto: "Foto auswählen",
        removePhoto: "Foto entfernen",
        keywords: "Kommagetrennte Schlagwörter",
        category: "Kategorie",
        prepMinutes: "Vorbereitungszeit in Minuten",
        cookMinutes: "Kochzeit in Minuten",
        totalMinutes: "Gesamtzeit in Minuten",
        nutrition: "Nährwerte pro Portion",
        nutritionHelp:
          "Diese Werte fließen in den Gesundheitsscore ein. Lass sie leer, wenn du sie nicht kennst.",
        caloriesKcal: "Kalorien (kcal)",
        carbsGrams: "Kohlenhydrate (g)",
        sugarGrams: "Zucker (g)",
        fatGrams: "Fett (g)",
        saturatedFatGrams: "Gesättigte Fettsäuren (g)",
        sodiumMg: "Natrium / Salz (mg)",
        fiberGrams: "Ballaststoffe (g)",
        proteinGrams: "Eiweiß (g)",
        requiredName: "Rezeptname ist erforderlich."
      },
      importRecipe: {
        title: "Importieren",
        url: "Rezept-URL",
        action: "Von URL importieren",
        failed: "Diese Seite konnte nicht importiert werden.",
        success: "Rezept importiert"
      },
      settings: {
        title: "Einstellungen",
        appearance: "Darstellung",
        language: "Sprache",
        system: "System",
        light: "Hell",
        dark: "Dunkel",
        french: "Français",
        english: "English",
        german: "Deutsch",
        keepAwake: "Bildschirm bei einem Rezept wach halten",
        keepRecipesLocal:
          "Lokale Kopie der Rezepte für die Offline-Nutzung speichern",
        server: "Server",
        localMode: "Lokaler Modus",
        localOnly: "Ohne Nextcloud-Konto",
        privacy: "Datenschutz",
        secureStore:
          "Anmeldedaten bleiben im sicheren Speicher des Telefons.",
        reindex: "Cookbook neu indizieren",
        reindexConfirmTitle: "Server neu indizieren?",
        reindexConfirmBody:
          "Damit wird Nextcloud Cookbook aufgefordert, den Rezeptordner erneut zu scannen. Nützlich, wenn Rezepte außerhalb der App hinzugefügt oder geändert wurden, kann aber bei einem großen Cookbook dauern.",
        reindexDone: "Neuindizierung angefordert",
        openPrivacy: "Datenschutz und Daten",
        notifications: "Benachrichtigungen",
        notificationsEnabled: "Aktiviert",
        notificationsDisabled: "Deaktiviert (zum Aktivieren tippen)",
        dataBackup: "Datensicherung",
        dataBackupLocalBody:
          "Exportiere oder importiere eine AvoCook-Datei mit Rezepten, Kategorien und Fotos von diesem Gerät.",
        dataBackupNextcloudBody:
          "Der Export synchronisiert zuerst Nextcloud und sichert dann Rezepte, Kategorien und verfügbare Fotos.",
        localDeleteWarning:
          "Wenn du die App löschst, werden lokale Daten von diesem Telefon entfernt.",
        exportBackup: "Sicherung exportieren",
        importBackup: "Sicherung importieren",
        backupExportTitle: "Sicherung exportiert",
        backupExportDone:
          "Sicherung bereit: {{count}} Rezepte und {{images}} Bilder.",
        backupExportPartial:
          "{{count}} Bild(er) konnten nicht zur Datei hinzugefügt werden.",
        backupImportTitle: "Import abgeschlossen",
        backupImportConfirmTitle: "Diese Sicherung importieren?",
        backupImportConfirmBody:
          "Der Import führt Daten zusammen, ohne aktuelle Rezepte zu löschen. Exakte Duplikate werden übersprungen, passende Rezepte aktualisiert und Namenskonflikte umbenannt.",
        backupImportDone:
          "Import abgeschlossen: {{created}} hinzugefügt, {{updated}} aktualisiert, {{skipped}} Duplikat(e) übersprungen, {{renamed}} umbenannt.",
        backupFailedTitle: "Sicherung fehlgeschlagen",
        backupFailed:
          "Der Vorgang konnte nicht abgeschlossen werden. Prüfe die ausgewählte Datei, den Ordnerzugriff oder die Nextcloud-Verbindung.",
        backupInvalid: "Diese Datei ist keine gültige AvoCook-Sicherung."
      },
      privacy: {
        title: "Datenschutz",
        free:
          "Diese App ist kostenlos und wurde von einem unabhängigen Entwickler erstellt.",
        independent:
          "Sie ist keine offizielle Nextcloud-App und verkauft keine Daten.",
        local:
          "Im lokalen Modus bleiben Rezepte auf diesem Gerät. Mit Nextcloud werden sie nur mit dem von dir gewählten Server synchronisiert.",
        credentials:
          "Serveradresse, Benutzername und App-Passwort werden im sicheren Speicher des Geräts gespeichert.",
        tracking:
          "Keine Werbung, kein Marketing-Tracking und kein Datenverkauf sind geplant.",
        photos:
          "Manuell hinzugefügte Fotos werden in den App-Speicher kopiert, damit sie offline verfügbar bleiben."
      }
    }
  }
} as const;

const deviceLanguage = Localization.getLocales()[0]?.languageCode;
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage === "en" ? "en" : deviceLanguage === "de" ? "de" : "fr",
  fallbackLng: "fr",
  interpolation: {
    escapeValue: false
  },
  compatibilityJSON: "v4"
});

export default i18n;
