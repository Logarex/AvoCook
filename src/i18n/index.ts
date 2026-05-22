import * as Localization from "expo-localization";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { resolveAppLanguage } from "./languages";

export const resources = {
  fr: {
    translation: {
      common: {
        add: "Ajouter",
        back: "Retour",
        backToTop: "Revenir en haut",
        cancel: "Annuler",
        clearSearch: "Effacer la recherche",
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
      updates: {
        bannerTitle: "Mise à jour disponible : {{version}}",
        download: "Télécharger",
        localBackupWarning: "Attention : vous utilisez le mode local (sans compte Nextcloud). Par précaution, exportez une sauvegarde de vos recettes dans les Réglages avant d'installer la mise à jour pour éviter toute perte de données.",
        dismiss: "Plus tard"
      },
      recipes: {
        title: "Recettes",
        emptyTitle: "Aucune recette",
        emptyBody: "Ajoutez une recette ou synchronisez votre Cookbook.",
        openFailedTitle: "Recette impossible à ouvrir",
        openFailedBody:
          "Cette recette contient des données inattendues. Elle reste conservée ; revenez à la liste puis relancez une synchronisation.",
        ingredients: "Ingrédients",
        ingredientsChecked: "{{checked}}/{{total}} cochés",
        markIngredientReady: "Cocher {{ingredient}} comme prêt",
        unmarkIngredientReady: "Décocher {{ingredient}}",
        resetIngredientChecks: "Tout décocher",
        instructions: "Étapes",
        stepsChecked: "{{checked}}/{{total}} étapes cochées",
        markStepDone: "Cocher l'étape {{step}}",
        unmarkStepDone: "Décocher l'étape {{step}}",
        resetStepChecks: "Tout décocher",
        tools: "Ustensiles",
        nutrition: "Nutrition",
        category: "Catégorie",
        yield: "Portions",
        prepTime: "Préparation",
        cookTime: "Cuisson",
        totalTime: "Total",
        minutes: "min",
        source: "Source",
        openSource: "Ouvrir la source",
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
        deleteCategory: "Supprimer la catégorie",
        deleteCategoryConfirmTitle: "Supprimer cette catégorie ?",
        deleteCategoryConfirmBody:
          "La catégorie « {{category}} » sera retirée de vos catégories personnalisées.",
        categoryHasRecipesTitle: "Catégorie utilisée",
        categoryHasRecipesBody:
          "« {{category}} » contient encore {{count}} recette(s). Modifiez ou déplacez ces recettes avant de supprimer le groupe.",
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
        share: {
          print: "Imprimer la recette",
          sharePdf: "Partager en PDF",
          shareFile: "Partager pour AvoCook",
          updateFromSource: "Mettre à jour depuis la source",
          keywords: "Mots-clés",
          servingSize: "Portion",
          updateFromSourceConfirmTitle: "Mettre à jour cette recette ?",
          updateFromSourceConfirmBody:
            "La recette actuelle sera fusionnée avec sa version disponible sur le site source. Les réglages locaux seront conservés.",
          updateFromSourceSuccessTitle: "Recette mise à jour",
          updateFromSourceSuccessBody:
            "La recette a été rechargée depuis son lien d'origine.",
          updateFromSourceFailedTitle: "Mise à jour impossible",
          updateFromSourceFailedBody:
            "La recette n'a pas pu être rechargée depuis son lien d'origine. Vérifiez la page source ou réessayez plus tard.",
          failedTitle: "Partage impossible",
          failedBody:
            "La recette n'a pas pu être préparée. Vérifiez l'accès à la photo ou réessayez plus tard.",
          partialTitle: "Photo non intégrée",
          partialBody:
            "{{count}} image(s) n'ont pas pu être ajoutée(s), mais les autres informations de la recette sont prêtes."
        },
        health: {
          title: "Santé",
          estimated: "Score santé estimé",
          missingTitle: "Informations nutritionnelles à compléter",
          localNote:
            "Estimation locale non officielle, basée sur les valeurs par portion/personne.",
          calculation:
            "Le score pénalise calories, sucres, graisses saturées et sodium, puis valorise fibres et protéines.",
          calories: "Calories",
          sugar: "Sucres",
          fat: "Matières grasses",
          salt: "Sel",
          fiber: "Fibres",
          protein: "Protéines"
        }
      },
      shoppingList: {
        title: "Courses",
        emptyTitle: "Liste vide",
        emptyBody:
          "Ajoutez des ingrédients depuis une recette ou saisissez un produit.",
        manualItemLabel: "Ajouter un produit",
        itemPlaceholder: "Tomates, farine, lait...",
        addItem: "Ajouter à la liste",
        addFromRecipe: "Ajouter les ingrédients aux courses",
        addIngredientFromRecipe: "Ajouter {{ingredient}} aux courses",
        addedTitle: "Liste mise à jour",
        addedBody: "{{count}} ingrédient ajouté.",
        addedBody_one: "{{count}} ingrédient ajouté.",
        addedBody_other: "{{count}} ingrédients ajoutés.",
        alreadyAddedTitle: "Déjà dans la liste",
        alreadyAddedBody: "Ces ingrédients sont déjà dans vos courses.",
        remainingCount: "{{count}} à acheter",
        remainingCount_one: "{{count}} à acheter",
        remainingCount_other: "{{count}} à acheter",
        checkedCount: "{{count}} coché",
        checkedCount_one: "{{count}} coché",
        checkedCount_other: "{{count}} cochés",
        clearChecked: "Supprimer les cochés",
        clearCheckedConfirmTitle: "Supprimer les produits cochés ?",
        clearCheckedConfirmBody:
          "{{count}} produit(s) cochés seront retirés de la liste.",
        clearAll: "Vider la liste",
        clearAllConfirmTitle: "Vider toute la liste ?",
        clearAllConfirmBody: "Tous les produits de la liste seront supprimés.",
        deleteItem: "Supprimer le produit"
      },
      editor: {
        newRecipe: "Nouvelle recette",
        editRecipe: "Modifier la recette",
        name: "Nom",
        description: "Description",
        ingredients: "Ingrédients",
        instructions: "Étapes",
        addIngredient: "Ajouter un ingrédient",
        addInstruction: "Ajouter une étape",
        ingredientItem: "Ingrédient {{count}}",
        instructionItem: "Étape {{count}}",
        ingredientPlaceholder: "Ex. 200 g de farine",
        instructionPlaceholder: "Décrivez cette étape",
        removeIngredient: "Supprimer cet ingrédient",
        removeInstruction: "Supprimer cette étape",
        tools: "Ustensiles, une ligne par élément",
        addSource: "Ajouter une source",
        sourceName: "Nom de la source",
        sourceNamePlaceholder: "Ex. Marmiton, livre de cuisine...",
        sourceUrl: "URL de la source",
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
        urlPlaceholder: "https://www.marmiton.org/...",
        action: "Importer depuis l'URL",
        fileAction: "Importer un fichier AvoCook",
        sharedFileHint:
          "Vous pouvez aussi choisir un fichier de recette partagé depuis Messages, WhatsApp, Mail ou un autre appareil.",
        fileFailed: "Ce fichier n'a pas pu être importé.",
        invalidFile: "Ce fichier n'est pas une recette AvoCook valide.",
        fileImportedTitle: "Fichier importé",
        fileImportedBody:
          "Import terminé : {{created}} ajoutée(s), {{updated}} mise(s) à jour, {{skipped}} doublon(s) ignoré(s), {{renamed}} renommée(s).",
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
        spanish: "Español",
        italian: "Italiano",
        keepAwake: "Garder l'écran allumé sur une recette",
        keepRecipesLocal:
          "Conserver une copie locale des recettes pour le hors ligne",
        server: "Serveur",
        localMode: "Mode local",
        localOnly: "Utilisation sans compte Nextcloud",
        privacy: "Confidentialité",
        secureStore:
          "Les identifiants restent dans le stockage sécurisé du téléphone.",
        localNotice:
          "Vos recettes restent stockées exclusivement sur cet appareil et ne sont envoyées à aucun serveur.",
        reindex: "Réindexer Cookbook",
        reindexConfirmTitle: "Réindexer le serveur ?",
        reindexConfirmBody:
          "Cette action demande à Nextcloud Cookbook de rescanner le dossier de recettes. C'est utile si des recettes ont été ajoutées ou modifiées hors de l'app, mais cela peut prendre du temps sur un gros Cookbook.",
        reindexDone: "Réindexation demandée",
        openLogs: "Journaux de diagnostic",
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
        backupInvalid: "Ce fichier n'est pas une sauvegarde AvoCook valide.",
        duplicates: "Doublons",
        duplicatesLocalBody:
          "Analyse les recettes de cet appareil et propose de fusionner les doublons probables.",
        duplicatesNextcloudBody:
          "Analyse les recettes synchronisées et applique les fusions validées en local et sur Nextcloud.",
        checkDuplicates: "Vérifier les doublons",
        duplicateFoundTitle: "Doublon possible",
        duplicateFoundBody:
          "{{count}} recettes semblent correspondre ({{reason}}) :\n\n{{recipes}}\n\nVoulez-vous les fusionner ? La recette la plus complète sera conservée.",
        duplicateReason: {
          url: "même URL source",
          signature: "mêmes ingrédients et étapes",
          name: "nom très proche"
        },
        duplicatesNoneTitle: "Aucun doublon trouvé",
        duplicatesNoneBody:
          "Aucune recette suffisamment proche n'a été détectée.",
        duplicatesDoneTitle: "Vérification terminée",
        duplicatesDoneBody:
          "{{merged}} recette(s) fusionnée(s), {{skipped}} groupe(s) conservé(s).",
        duplicatesFailedTitle: "Vérification impossible",
        duplicatesFailed:
          "La vérification ou la fusion n'a pas pu se terminer. Vérifiez la connexion Nextcloud puis réessayez."
      },
      logs: {
        title: "Journaux",
        refresh: "Actualiser",
        count: "{{count}} entrée(s)",
        anonymize: "Anonymiser",
        anonymizedNotice:
          "Le rapport masque domaines, IP, e-mails, chemins locaux et identifiants WebDAV.",
        rawNotice:
          "Les secrets restent masqués, mais les détails personnels peuvent rester visibles.",
        share: "Exporter",
        shareAnonymized: "Envoyer anonymisé",
        clear: "Vider",
        clearConfirmTitle: "Vider les journaux ?",
        clearConfirmBody:
          "Les traces locales et réseau enregistrées sur ce téléphone seront supprimées.",
        emptyTitle: "Aucun journal",
        emptyBody:
          "Utilisez l'app puis revenez ici pour voir les traces détaillées.",
        exportFailedTitle: "Export impossible",
        exportFailed:
          "Le rapport de diagnostic n'a pas pu être créé ou partagé."
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
        back: "Back",
        backToTop: "Back to top",
        cancel: "Cancel",
        clearSearch: "Clear search",
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
      updates: {
        bannerTitle: "Update available: {{version}}",
        download: "Download",
        localBackupWarning: "Warning: you are in local mode (without a Nextcloud account). As a precaution, export a backup of your recipes in Settings before installing the update to prevent any data loss.",
        dismiss: "Later"
      },
      recipes: {
        title: "Recipes",
        emptyTitle: "No recipes",
        emptyBody: "Add a recipe or sync your Cookbook.",
        openFailedTitle: "Recipe could not be opened",
        openFailedBody:
          "This recipe contains unexpected data. It has not been deleted; go back to the list and sync again.",
        ingredients: "Ingredients",
        ingredientsChecked: "{{checked}}/{{total}} checked",
        markIngredientReady: "Mark {{ingredient}} as ready",
        unmarkIngredientReady: "Unmark {{ingredient}}",
        resetIngredientChecks: "Clear checks",
        instructions: "Steps",
        stepsChecked: "{{checked}}/{{total}} steps checked",
        markStepDone: "Mark step {{step}} as done",
        unmarkStepDone: "Unmark step {{step}}",
        resetStepChecks: "Clear checks",
        tools: "Tools",
        nutrition: "Nutrition",
        category: "Category",
        yield: "Servings",
        prepTime: "Prep",
        cookTime: "Cook",
        totalTime: "Total",
        minutes: "min",
        source: "Source",
        openSource: "Open source",
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
        deleteCategory: "Delete category",
        deleteCategoryConfirmTitle: "Delete this category?",
        deleteCategoryConfirmBody:
          "\"{{category}}\" will be removed from your custom categories.",
        categoryHasRecipesTitle: "Category in use",
        categoryHasRecipesBody:
          "\"{{category}}\" still contains {{count}} recipe(s). Edit or move those recipes before deleting the group.",
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
        share: {
          print: "Print recipe",
          sharePdf: "Share as PDF",
          shareFile: "Share for AvoCook",
          updateFromSource: "Update from source",
          keywords: "Keywords",
          servingSize: "Serving size",
          updateFromSourceConfirmTitle: "Update this recipe?",
          updateFromSourceConfirmBody:
            "The current recipe will be merged with the version available on its source website. Local settings will be kept.",
          updateFromSourceSuccessTitle: "Recipe updated",
          updateFromSourceSuccessBody:
            "The recipe was refreshed from its original link.",
          updateFromSourceFailedTitle: "Update failed",
          updateFromSourceFailedBody:
            "The recipe could not be refreshed from its original link. Check the source page or try again later.",
          failedTitle: "Sharing failed",
          failedBody:
            "The recipe could not be prepared. Check photo access or try again later.",
          partialTitle: "Photo not included",
          partialBody:
            "{{count}} image(s) could not be added, but the rest of the recipe is ready."
        },
        health: {
          title: "Health",
          estimated: "Estimated health score",
          missingTitle: "Nutrition details missing",
          localNote:
            "Unofficial local estimate based on per-serving/person nutrition values.",
          calculation:
            "The score penalizes calories, sugar, saturated fat and sodium, then rewards fiber and protein.",
          calories: "Calories",
          sugar: "Sugar",
          fat: "Fat",
          salt: "Salt",
          fiber: "Fiber",
          protein: "Protein"
        }
      },
      shoppingList: {
        title: "Shopping",
        emptyTitle: "Empty list",
        emptyBody: "Add ingredients from a recipe or type an item.",
        manualItemLabel: "Add item",
        itemPlaceholder: "Tomatoes, flour, milk...",
        addItem: "Add to list",
        addFromRecipe: "Add ingredients to shopping list",
        addIngredientFromRecipe: "Add {{ingredient}} to shopping list",
        addedTitle: "List updated",
        addedBody: "{{count}} ingredient added.",
        addedBody_one: "{{count}} ingredient added.",
        addedBody_other: "{{count}} ingredients added.",
        alreadyAddedTitle: "Already in the list",
        alreadyAddedBody: "These ingredients are already in your shopping list.",
        remainingCount: "{{count}} to buy",
        remainingCount_one: "{{count}} to buy",
        remainingCount_other: "{{count}} to buy",
        checkedCount: "{{count}} checked",
        checkedCount_one: "{{count}} checked",
        checkedCount_other: "{{count}} checked",
        clearChecked: "Remove checked",
        clearCheckedConfirmTitle: "Remove checked items?",
        clearCheckedConfirmBody:
          "{{count}} checked item(s) will be removed from the list.",
        clearAll: "Clear list",
        clearAllConfirmTitle: "Clear the whole list?",
        clearAllConfirmBody: "Every item in the shopping list will be removed.",
        deleteItem: "Delete item"
      },
      editor: {
        newRecipe: "New recipe",
        editRecipe: "Edit recipe",
        name: "Name",
        description: "Description",
        ingredients: "Ingredients",
        instructions: "Steps",
        addIngredient: "Add ingredient",
        addInstruction: "Add step",
        ingredientItem: "Ingredient {{count}}",
        instructionItem: "Step {{count}}",
        ingredientPlaceholder: "E.g. 200 g flour",
        instructionPlaceholder: "Describe this step",
        removeIngredient: "Remove this ingredient",
        removeInstruction: "Remove this step",
        tools: "Tools, one per line",
        addSource: "Add source",
        sourceName: "Source name",
        sourceNamePlaceholder: "E.g. Allrecipes, cookbook...",
        sourceUrl: "Source URL",
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
        urlPlaceholder: "https://www.allrecipes.com/...",
        action: "Import from URL",
        fileAction: "Import AvoCook file",
        sharedFileHint:
          "You can also choose a recipe file shared through Messages, WhatsApp, Mail or another device.",
        fileFailed: "This file could not be imported.",
        invalidFile: "This file is not a valid AvoCook recipe.",
        fileImportedTitle: "File imported",
        fileImportedBody:
          "Import complete: {{created}} added, {{updated}} updated, {{skipped}} duplicate(s) skipped, {{renamed}} renamed.",
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
        spanish: "Español",
        italian: "Italiano",
        keepAwake: "Keep screen awake on a recipe",
        keepRecipesLocal: "Keep a local copy of recipes for offline use",
        server: "Server",
        localMode: "Local mode",
        localOnly: "Using without a Nextcloud account",
        privacy: "Privacy",
        secureStore: "Credentials stay in the phone secure storage.",
        localNotice: "Your recipes are stored exclusively on this device and are not sent to any server.",
        reindex: "Reindex Cookbook",
        reindexConfirmTitle: "Reindex the server?",
        reindexConfirmBody:
          "This asks Nextcloud Cookbook to rescan the recipe folder. It is useful if recipes were added or changed outside the app, but it can take a while on a large Cookbook.",
        reindexDone: "Reindex requested",
        openLogs: "Diagnostic logs",
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
        backupInvalid: "This file is not a valid AvoCook backup.",
        duplicates: "Duplicates",
        duplicatesLocalBody:
          "Scans the recipes on this device and offers to merge likely duplicates.",
        duplicatesNextcloudBody:
          "Scans synced recipes and applies approved merges locally and on Nextcloud.",
        checkDuplicates: "Check duplicates",
        duplicateFoundTitle: "Possible duplicate",
        duplicateFoundBody:
          "{{count}} recipes seem to match ({{reason}}):\n\n{{recipes}}\n\nDo you want to merge them? The most complete recipe will be kept.",
        duplicateReason: {
          url: "same source URL",
          signature: "same ingredients and steps",
          name: "very similar name"
        },
        duplicatesNoneTitle: "No duplicates found",
        duplicatesNoneBody: "No sufficiently similar recipes were detected.",
        duplicatesDoneTitle: "Check complete",
        duplicatesDoneBody:
          "{{merged}} recipe(s) merged, {{skipped}} group(s) kept separate.",
        duplicatesFailedTitle: "Check failed",
        duplicatesFailed:
          "The duplicate check or merge could not finish. Check the Nextcloud connection and try again."
      },
      logs: {
        title: "Logs",
        refresh: "Refresh",
        count: "{{count}} entry/entries",
        anonymize: "Anonymize",
        anonymizedNotice:
          "The report masks domains, IPs, emails, local paths, and WebDAV user IDs.",
        rawNotice:
          "Secrets stay redacted, but personal details may remain visible.",
        share: "Export",
        shareAnonymized: "Send anonymized",
        clear: "Clear",
        clearConfirmTitle: "Clear logs?",
        clearConfirmBody:
          "Local and network traces stored on this phone will be deleted.",
        emptyTitle: "No logs",
        emptyBody:
          "Use the app, then come back here to inspect detailed traces.",
        exportFailedTitle: "Export failed",
        exportFailed: "The diagnostic report could not be created or shared."
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
        back: "Zurück",
        backToTop: "Nach oben",
        cancel: "Abbrechen",
        clearSearch: "Suche löschen",
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
      updates: {
        bannerTitle: "Update verfügbar: {{version}}",
        download: "Herunterladen",
        localBackupWarning: "Achtung: Sie verwenden den lokalen Modus (ohne Nextcloud-Konto). Exportieren Sie als Vorsichtsmaßnahme vor der Installation des Updates ein Backup Ihrer Rezepte in den Einstellungen, um Datenverlust zu vermeiden.",
        dismiss: "Später"
      },
      recipes: {
        title: "Rezepte",
        emptyTitle: "Keine Rezepte",
        emptyBody: "Füge ein Rezept hinzu oder synchronisiere dein Cookbook.",
        openFailedTitle: "Rezept konnte nicht geöffnet werden",
        openFailedBody:
          "Dieses Rezept enthält unerwartete Daten. Es wurde nicht gelöscht; gehe zurück zur Liste und synchronisiere erneut.",
        ingredients: "Zutaten",
        ingredientsChecked: "{{checked}}/{{total}} abgehakt",
        markIngredientReady: "{{ingredient}} als bereit markieren",
        unmarkIngredientReady: "{{ingredient}} abwählen",
        resetIngredientChecks: "Alle abwählen",
        instructions: "Schritte",
        stepsChecked: "{{checked}}/{{total}} Schritte abgehakt",
        markStepDone: "Schritt {{step}} abhaken",
        unmarkStepDone: "Schritt {{step}} abwählen",
        resetStepChecks: "Alle abwählen",
        tools: "Werkzeuge",
        nutrition: "Nährwerte",
        category: "Kategorie",
        yield: "Portionen",
        prepTime: "Vorbereitung",
        cookTime: "Kochen",
        totalTime: "Gesamt",
        minutes: "Min.",
        source: "Quelle",
        openSource: "Quelle öffnen",
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
        deleteCategory: "Kategorie löschen",
        deleteCategoryConfirmTitle: "Diese Kategorie löschen?",
        deleteCategoryConfirmBody:
          "\"{{category}}\" wird aus deinen eigenen Kategorien entfernt.",
        categoryHasRecipesTitle: "Kategorie wird verwendet",
        categoryHasRecipesBody:
          "\"{{category}}\" enthält noch {{count}} Rezept(e). Bearbeite oder verschiebe diese Rezepte, bevor du die Gruppe löschst.",
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
        share: {
          print: "Rezept drucken",
          sharePdf: "Als PDF teilen",
          shareFile: "Für AvoCook teilen",
          updateFromSource: "Aus Quelle aktualisieren",
          keywords: "Schlagwörter",
          servingSize: "Portion",
          updateFromSourceConfirmTitle: "Dieses Rezept aktualisieren?",
          updateFromSourceConfirmBody:
            "Das aktuelle Rezept wird mit der Version auf der Quellwebsite zusammengeführt. Lokale Einstellungen bleiben erhalten.",
          updateFromSourceSuccessTitle: "Rezept aktualisiert",
          updateFromSourceSuccessBody:
            "Das Rezept wurde über den ursprünglichen Link neu geladen.",
          updateFromSourceFailedTitle: "Aktualisierung fehlgeschlagen",
          updateFromSourceFailedBody:
            "Das Rezept konnte nicht über den ursprünglichen Link neu geladen werden. Prüfe die Quellseite oder versuche es später erneut.",
          failedTitle: "Teilen fehlgeschlagen",
          failedBody:
            "Das Rezept konnte nicht vorbereitet werden. Prüfe den Fotozugriff oder versuche es später erneut.",
          partialTitle: "Foto nicht enthalten",
          partialBody:
            "{{count}} Bild(er) konnten nicht hinzugefügt werden, aber die übrigen Rezeptdaten sind bereit."
        },
        health: {
          title: "Gesundheit",
          estimated: "Geschätzter Gesundheitsscore",
          missingTitle: "Nährwertangaben fehlen",
          localNote:
            "Inoffizielle lokale Schätzung basierend auf Nährwerten pro Portion/Person.",
          calculation:
            "Der Score bewertet Kalorien, Zucker, gesättigte Fettsäuren und Natrium negativ, Ballaststoffe und Eiweiß positiv.",
          calories: "Kalorien",
          sugar: "Zucker",
          fat: "Fett",
          salt: "Salz",
          fiber: "Ballaststoffe",
          protein: "Eiweiß"
        }
      },
      shoppingList: {
        title: "Einkauf",
        emptyTitle: "Leere Liste",
        emptyBody:
          "Füge Zutaten aus einem Rezept hinzu oder tippe einen Eintrag ein.",
        manualItemLabel: "Eintrag hinzufügen",
        itemPlaceholder: "Tomaten, Mehl, Milch...",
        addItem: "Zur Liste hinzufügen",
        addFromRecipe: "Zutaten zur Einkaufsliste hinzufügen",
        addIngredientFromRecipe: "{{ingredient}} zur Einkaufsliste hinzufügen",
        addedTitle: "Liste aktualisiert",
        addedBody: "{{count}} Zutat hinzugefügt.",
        addedBody_one: "{{count}} Zutat hinzugefügt.",
        addedBody_other: "{{count}} Zutaten hinzugefügt.",
        alreadyAddedTitle: "Bereits in der Liste",
        alreadyAddedBody: "Diese Zutaten stehen bereits auf deiner Einkaufsliste.",
        remainingCount: "{{count}} zu kaufen",
        remainingCount_one: "{{count}} zu kaufen",
        remainingCount_other: "{{count}} zu kaufen",
        checkedCount: "{{count}} abgehakt",
        checkedCount_one: "{{count}} abgehakt",
        checkedCount_other: "{{count}} abgehakt",
        clearChecked: "Abgehakte entfernen",
        clearCheckedConfirmTitle: "Abgehakte Einträge entfernen?",
        clearCheckedConfirmBody:
          "{{count}} abgehakte(r) Eintrag/Einträge werden aus der Liste entfernt.",
        clearAll: "Liste leeren",
        clearAllConfirmTitle: "Ganze Liste leeren?",
        clearAllConfirmBody: "Alle Einträge der Einkaufsliste werden entfernt.",
        deleteItem: "Eintrag löschen"
      },
      editor: {
        newRecipe: "Neues Rezept",
        editRecipe: "Rezept bearbeiten",
        name: "Name",
        description: "Beschreibung",
        ingredients: "Zutaten",
        instructions: "Schritte",
        addIngredient: "Zutat hinzufügen",
        addInstruction: "Schritt hinzufügen",
        ingredientItem: "Zutat {{count}}",
        instructionItem: "Schritt {{count}}",
        ingredientPlaceholder: "z. B. 200 g Mehl",
        instructionPlaceholder: "Beschreibe diesen Schritt",
        removeIngredient: "Diese Zutat entfernen",
        removeInstruction: "Diesen Schritt entfernen",
        tools: "Werkzeuge, eines pro Zeile",
        addSource: "Quelle hinzufügen",
        sourceName: "Quellenname",
        sourceNamePlaceholder: "z. B. Chefkoch, Kochbuch...",
        sourceUrl: "Quellen-URL",
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
        urlPlaceholder: "https://www.chefkoch.de/...",
        action: "Von URL importieren",
        fileAction: "AvoCook-Datei importieren",
        sharedFileHint:
          "Du kannst auch eine Rezeptdatei auswählen, die über Nachrichten, WhatsApp, Mail oder ein anderes Gerät geteilt wurde.",
        fileFailed: "Diese Datei konnte nicht importiert werden.",
        invalidFile: "Diese Datei ist kein gültiges AvoCook-Rezept.",
        fileImportedTitle: "Datei importiert",
        fileImportedBody:
          "Import abgeschlossen: {{created}} hinzugefügt, {{updated}} aktualisiert, {{skipped}} Duplikat(e) übersprungen, {{renamed}} umbenannt.",
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
        spanish: "Español",
        italian: "Italiano",
        keepAwake: "Bildschirm bei einem Rezept wach halten",
        keepRecipesLocal:
          "Lokale Kopie der Rezepte für die Offline-Nutzung speichern",
        server: "Server",
        localMode: "Lokaler Modus",
        localOnly: "Ohne Nextcloud-Konto",
        privacy: "Datenschutz",
        secureStore:
          "Anmeldedaten bleiben im sicheren Speicher des Telefons.",
        localNotice:
          "Deine Rezepte werden ausschließlich auf diesem Gerät gespeichert und an keinen Server gesendet.",
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
        backupInvalid: "Diese Datei ist keine gültige AvoCook-Sicherung.",
        duplicates: "Duplikate",
        duplicatesLocalBody:
          "Prüft die Rezepte auf diesem Gerät und bietet an, wahrscheinliche Duplikate zusammenzuführen.",
        duplicatesNextcloudBody:
          "Prüft synchronisierte Rezepte und übernimmt bestätigte Zusammenführungen lokal und in Nextcloud.",
        checkDuplicates: "Duplikate prüfen",
        duplicateFoundTitle: "Mögliches Duplikat",
        duplicateFoundBody:
          "{{count}} Rezepte scheinen übereinzustimmen ({{reason}}):\n\n{{recipes}}\n\nMöchtest du sie zusammenführen? Das vollständigste Rezept bleibt erhalten.",
        duplicateReason: {
          url: "gleiche Quell-URL",
          signature: "gleiche Zutaten und Schritte",
          name: "sehr ähnlicher Name"
        },
        duplicatesNoneTitle: "Keine Duplikate gefunden",
        duplicatesNoneBody:
          "Es wurden keine ausreichend ähnlichen Rezepte erkannt.",
        duplicatesDoneTitle: "Prüfung abgeschlossen",
        duplicatesDoneBody:
          "{{merged}} Rezept(e) zusammengeführt, {{skipped}} Gruppe(n) getrennt behalten.",
        duplicatesFailedTitle: "Prüfung fehlgeschlagen",
        duplicatesFailed:
          "Die Duplikatprüfung oder Zusammenführung konnte nicht abgeschlossen werden. Prüfe die Nextcloud-Verbindung und versuche es erneut."
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
  },
  es: {
    translation: {
      common: {
        add: "Añadir",
        back: "Atrás",
        backToTop: "Volver arriba",
        cancel: "Cancelar",
        clearSearch: "Borrar búsqueda",
        delete: "Eliminar",
        edit: "Editar",
        save: "Guardar",
        search: "Buscar",
        clear: "Limpiar",
        settings: "Ajustes",
        import: "Importar",
        sync: "Sincronizar",
        logout: "Cerrar sesión",
        loading: "Cargando",
        offline: "Sin conexión",
        online: "Conectado",
        retry: "Reintentar",
        close: "Cerrar",
        continue: "Continuar"
      },
      auth: {
        title: "AvoCook",
        subtitle: "Tus recetas en la nube, listas para cocinar.",
        server: "Dirección de Nextcloud",
        username: "Usuario",
        appPassword: "Contraseña de aplicación",
        login: "Iniciar sesión",
        secure: "Credenciales cifradas en el llavero del dispositivo",
        invalidUrl: "Dirección de Nextcloud no válida.",
        insecureUrl: "Usa HTTPS, salvo localhost durante el desarrollo.",
        failed: "No se pudo iniciar sesión. Revisa el servidor y la contraseña de app.",
        certificateError:
          "No se pudo establecer la conexión de red/TLS. Si tu servidor usa un certificado autofirmado, instala y confía en su autoridad certificadora en el dispositivo, o usa un certificado público válido.",
        useLocal: "Usar sin Nextcloud",
        showPassword: "Mostrar contraseña",
        hidePassword: "Ocultar contraseña",
        appPasswordHelp: "¿Cómo creo una contraseña de aplicación?",
        localSubtitle: "Modo local gratuito: las recetas se guardan solo en este dispositivo.",
        localDataWarning:
          "Atención: en modo local, al eliminar la app también se eliminan las recetas guardadas en este dispositivo. Exporta una copia de seguridad antes de desinstalar.",
        badCredentials:
          "Usuario o contraseña de aplicación incorrectos. Crea una contraseña de app dedicada en Nextcloud.",
        tutorial: {
          title: "Crear una contraseña de aplicación en Nextcloud",
          steps: {
            openNextcloud: "Abre Nextcloud en el navegador e inicia sesión.",
            openSettings:
              "Selecciona tu avatar o nombre y abre Ajustes, Ajustes personales o Personal según la versión.",
            openSecurity:
              "Abre Seguridad. En algunas versiones la sección se llama Dispositivos y sesiones o Contraseñas de aplicación.",
            createPassword: "Crea una nueva contraseña de aplicación, por ejemplo con el nombre Cookbook Mobile.",
            copyPassword:
              "Copia la contraseña que se muestra una sola vez y pégala aquí junto con tu nombre de usuario de Nextcloud."
          },
          versionNote:
            "Los nombres exactos varían según la versión de Nextcloud y el tema, pero la ruta siempre está en los ajustes personales de la cuenta, en Seguridad o Sesiones."
        }
      },
      updates: {
        bannerTitle: "Actualización disponible: {{version}}",
        download: "Descargar",
        localBackupWarning: "Atención: estás usando el modo local (sin cuenta Nextcloud). Como precaución, exporta una copia de seguridad de tus recetas en Ajustes antes de instalar la actualización para evitar la pérdida de datos.",
        dismiss: "Más tarde"
      },
      recipes: {
        title: "Recetas",
        emptyTitle: "Sin recetas",
        emptyBody: "Añade una receta o sincroniza tu Cookbook.",
        openFailedTitle: "No se pudo abrir la receta",
        openFailedBody:
          "Esta receta contiene datos inesperados. Se conserva; vuelve a la lista y sincroniza de nuevo.",
        ingredients: "Ingredientes",
        ingredientsChecked: "{{checked}}/{{total}} marcados",
        markIngredientReady: "Marcar {{ingredient}} como listo",
        unmarkIngredientReady: "Desmarcar {{ingredient}}",
        resetIngredientChecks: "Desmarcar todo",
        instructions: "Pasos",
        stepsChecked: "{{checked}}/{{total}} pasos marcados",
        markStepDone: "Marcar el paso {{step}}",
        unmarkStepDone: "Desmarcar el paso {{step}}",
        resetStepChecks: "Desmarcar todo",
        tools: "Utensilios",
        nutrition: "Nutrición",
        category: "Categoría",
        yield: "Porciones",
        prepTime: "Preparación",
        cookTime: "Cocción",
        totalTime: "Total",
        minutes: "min",
        source: "Fuente",
        openSource: "Abrir fuente",
        noCategory: "Sin categoría",
        deleteConfirm: "¿Eliminar esta receta?",
        duplicateTitle: "Receta con el mismo nombre",
        duplicateTitleBody:
          "\"{{title}}\" ya existe con el nombre \"{{existingTitle}}\". ¿Quieres fusionar los datos o conservar ambas recetas?",
        keepBoth: "Conservar ambas",
        mergeRecipes: "Fusionar",
        allCategories: "Todas",
        uncategorized: "Sin categoría",
        categories: "Categorías",
        categoryCount: "{{count}} receta",
        categoryCount_one: "{{count}} receta",
        categoryCount_other: "{{count}} recetas",
        newCategory: "Nueva categoría",
        categoryName: "Nombre de categoría",
        createCategory: "Crear categoría",
        deleteCategory: "Eliminar categoría",
        deleteCategoryConfirmTitle: "¿Eliminar esta categoría?",
        deleteCategoryConfirmBody:
          "\"{{category}}\" se quitará de tus categorías personalizadas.",
        categoryHasRecipesTitle: "Categoría en uso",
        categoryHasRecipesBody:
          "\"{{category}}\" todavía contiene {{count}} receta(s). Edita o mueve esas recetas antes de eliminar el grupo.",
        chooseCategory: "Elegir categoría",
        moreCategories: "Más",
        loadingRecipes: "Cargando recetas...",
        syncingRecipes: "Sincronizando recetas...",
        syncingRecipesShort: "Sincronizando...",
        loadedRecipes: "{{count}} receta cargada",
        loadedRecipes_one: "{{count}} receta cargada",
        loadedRecipes_other: "{{count}} recetas cargadas",
        selectedCategory: "Categoría seleccionada: {{category}}",
        servings: {
          title: "Porciones",
          people: "personas",
          decrease: "Reducir porciones",
          increase: "Aumentar porciones",
          original: "Receta original: {{count}} persona",
          original_one: "Receta original: {{count}} persona",
          original_other: "Receta original: {{count}} personas",
          reset: "Restablecer original"
        },
        timers: {
          title: "Temporizadores",
          prep: "Preparación",
          cook: "Cocción",
          total: "Total",
          start: "Iniciar temporizador",
          pause: "Pausar",
          reset: "Reiniciar",
          stop: "Detener",
          done: "Listo",
          notificationTitle: "{{timer}} finalizado",
          notificationHint:
            "Los temporizadores suenan mediante notificaciones. Las notificaciones deben estar activadas.",
          notificationsOff: "Notificaciones desactivadas: los temporizadores no pueden sonar.",
          notificationsUnavailable:
            "Las notificaciones no están disponibles en este entorno. Instala una build real para usar temporizadores.",
          notificationsRequiredTitle: "Notificaciones necesarias",
          notificationsRequiredBody:
            "Activa las notificaciones para AvoCook en los ajustes del teléfono. Sin ellas, el temporizador no puede sonar con el iPhone bloqueado.",
          notificationsUnavailableBody:
            "Esta build aún no incluye el módulo nativo de notificaciones. Instala una build iOS real para usar temporizadores."
        },
        share: {
          print: "Imprimir receta",
          sharePdf: "Compartir como PDF",
          shareFile: "Compartir para AvoCook",
          updateFromSource: "Actualizar desde la fuente",
          keywords: "Palabras clave",
          servingSize: "Porción",
          updateFromSourceConfirmTitle: "¿Actualizar esta receta?",
          updateFromSourceConfirmBody:
            "La receta actual se fusionará con la versión disponible en su sitio de origen. Se conservarán los ajustes locales.",
          updateFromSourceSuccessTitle: "Receta actualizada",
          updateFromSourceSuccessBody:
            "La receta se ha recargado desde su enlace original.",
          updateFromSourceFailedTitle: "No se pudo actualizar",
          updateFromSourceFailedBody:
            "No se pudo recargar la receta desde su enlace original. Revisa la página de origen o inténtalo de nuevo más tarde.",
          failedTitle: "No se pudo compartir",
          failedBody:
            "No se pudo preparar la receta. Revisa el acceso a la foto o inténtalo de nuevo más tarde.",
          partialTitle: "Foto no incluida",
          partialBody:
            "{{count}} imagen(es) no se pudieron añadir, pero el resto de la información de la receta está listo."
        },
        health: {
          title: "Salud",
          estimated: "Puntuación de salud estimada",
          missingTitle: "Faltan datos nutricionales",
          localNote:
            "Estimación local no oficial basada en los valores nutricionales por porción.",
          calculation:
            "La puntuación penaliza calorías, azúcar, grasa saturada y sodio, y premia la fibra y la proteína.",
          calories: "Calorías",
          sugar: "Azúcar",
          fat: "Grasa",
          salt: "Sal",
          fiber: "Fibra",
          protein: "Proteína"
        }
      },
      shoppingList: {
        title: "Compras",
        emptyTitle: "Lista vacía",
        emptyBody:
          "Añade ingredientes desde una receta o escribe un producto.",
        manualItemLabel: "Añadir producto",
        itemPlaceholder: "Tomates, harina, leche...",
        addItem: "Añadir a la lista",
        addFromRecipe: "Añadir ingredientes a la lista de compras",
        addIngredientFromRecipe:
          "Añadir {{ingredient}} a la lista de compras",
        addedTitle: "Lista actualizada",
        addedBody: "{{count}} ingrediente añadido.",
        addedBody_one: "{{count}} ingrediente añadido.",
        addedBody_other: "{{count}} ingredientes añadidos.",
        alreadyAddedTitle: "Ya está en la lista",
        alreadyAddedBody: "Estos ingredientes ya están en tu lista de compras.",
        remainingCount: "{{count}} por comprar",
        remainingCount_one: "{{count}} por comprar",
        remainingCount_other: "{{count}} por comprar",
        checkedCount: "{{count}} marcado",
        checkedCount_one: "{{count}} marcado",
        checkedCount_other: "{{count}} marcados",
        clearChecked: "Eliminar marcados",
        clearCheckedConfirmTitle: "¿Eliminar productos marcados?",
        clearCheckedConfirmBody:
          "{{count}} producto(s) marcados se quitarán de la lista.",
        clearAll: "Vaciar lista",
        clearAllConfirmTitle: "¿Vaciar toda la lista?",
        clearAllConfirmBody:
          "Se eliminarán todos los productos de la lista de compras.",
        deleteItem: "Eliminar producto"
      },
      editor: {
        newRecipe: "Nueva receta",
        editRecipe: "Editar receta",
        name: "Nombre",
        description: "Descripción",
        ingredients: "Ingredientes",
        instructions: "Pasos",
        addIngredient: "Añadir ingrediente",
        addInstruction: "Añadir paso",
        ingredientItem: "Ingrediente {{count}}",
        instructionItem: "Paso {{count}}",
        ingredientPlaceholder: "Ej. 200 g de harina",
        instructionPlaceholder: "Describe este paso",
        removeIngredient: "Eliminar este ingrediente",
        removeInstruction: "Eliminar este paso",
        tools: "Utensilios, uno por línea",
        addSource: "Añadir fuente",
        sourceName: "Nombre de la fuente",
        sourceNamePlaceholder: "Ej. Cookpad, libro de cocina...",
        sourceUrl: "URL de la fuente",
        photoUrl: "URL de la foto",
        choosePhoto: "Elegir foto",
        removePhoto: "Eliminar foto",
        keywords: "Palabras clave separadas por comas",
        category: "Categoría",
        prepMinutes: "Minutos de preparación",
        cookMinutes: "Minutos de cocción",
        totalMinutes: "Minutos totales",
        nutrition: "Nutrición por porción",
        nutritionHelp:
          "Estos valores alimentan la puntuación de salud. Déjalos vacíos si no los conoces.",
        caloriesKcal: "Calorías (kcal)",
        carbsGrams: "Carbohidratos (g)",
        sugarGrams: "Azúcar (g)",
        fatGrams: "Grasa (g)",
        saturatedFatGrams: "Grasa saturada (g)",
        sodiumMg: "Sodio / sal (mg)",
        fiberGrams: "Fibra (g)",
        proteinGrams: "Proteína (g)",
        requiredName: "El nombre de la receta es obligatorio."
      },
      importRecipe: {
        title: "Importar",
        url: "URL de la receta",
        urlPlaceholder: "https://cookpad.com/...",
        action: "Importar desde URL",
        fileAction: "Importar archivo AvoCook",
        sharedFileHint:
          "También puedes elegir un archivo de receta compartido por Mensajes, WhatsApp, Mail u otro dispositivo.",
        fileFailed: "No se pudo importar este archivo.",
        invalidFile: "Este archivo no es una receta AvoCook válida.",
        fileImportedTitle: "Archivo importado",
        fileImportedBody:
          "Importación completada: {{created}} añadida(s), {{updated}} actualizada(s), {{skipped}} duplicado(s) omitido(s), {{renamed}} renombrada(s).",
        failed: "No se pudo importar esta página.",
        success: "Receta importada"
      },
      settings: {
        title: "Ajustes",
        appearance: "Apariencia",
        language: "Idioma",
        system: "Sistema",
        light: "Claro",
        dark: "Oscuro",
        french: "Français",
        english: "English",
        german: "Deutsch",
        spanish: "Español",
        italian: "Italiano",
        keepAwake: "Mantener pantalla activa en una receta",
        keepRecipesLocal: "Guardar copia local de recetas para uso sin conexión",
        server: "Servidor",
        localMode: "Modo local",
        localOnly: "Usar sin cuenta de Nextcloud",
        privacy: "Privacidad",
        secureStore: "Las credenciales permanecen en el almacenamiento seguro del teléfono.",
        localNotice:
          "Tus recetas se guardan exclusivamente en este dispositivo y no se envían a ningún servidor.",
        reindex: "Reindexar Cookbook",
        reindexConfirmTitle: "¿Reindexar el servidor?",
        reindexConfirmBody:
          "Esto pide a Nextcloud Cookbook que vuelva a escanear la carpeta de recetas. Es útil si se añadieron o modificaron recetas fuera de la app, pero puede tardar en un Cookbook grande.",
        reindexDone: "Reindexación solicitada",
        openPrivacy: "Privacidad y datos",
        notifications: "Notificaciones",
        notificationsEnabled: "Activadas",
        notificationsDisabled: "Desactivadas (pulsa para activar)",
        dataBackup: "Copia de seguridad",
        dataBackupLocalBody:
          "Exporta o importa un archivo AvoCook con recetas, categorías y fotos de este dispositivo.",
        dataBackupNextcloudBody:
          "La exportación sincroniza primero Nextcloud y luego guarda recetas, categorías y fotos disponibles.",
        localDeleteWarning:
          "Si eliminas la app, los datos locales se eliminan de este teléfono.",
        exportBackup: "Exportar copia",
        importBackup: "Importar copia",
        backupExportTitle: "Copia exportada",
        backupExportDone:
          "Copia lista: {{count}} recetas y {{images}} imágenes.",
        backupExportPartial:
          "{{count}} imagen(es) no se pudieron añadir al archivo.",
        backupImportTitle: "Importación completada",
        backupImportConfirmTitle: "¿Importar esta copia?",
        backupImportConfirmBody:
          "La importación fusiona los datos sin eliminar tus recetas actuales. Los duplicados exactos se omiten, las recetas coincidentes se actualizan y los conflictos de nombre se renombran.",
        backupImportDone:
          "Importación completada: {{created}} añadida(s), {{updated}} actualizada(s), {{skipped}} duplicado(s) omitido(s), {{renamed}} renombrada(s).",
        backupFailedTitle: "No se pudo hacer la copia",
        backupFailed:
          "La operación no pudo terminar. Revisa el archivo elegido, el acceso a la carpeta o la conexión con Nextcloud.",
        backupInvalid: "Este archivo no es una copia de seguridad AvoCook válida.",
        duplicates: "Duplicados",
        duplicatesLocalBody:
          "Analiza las recetas de este dispositivo y propone fusionar duplicados probables.",
        duplicatesNextcloudBody:
          "Analiza las recetas sincronizadas y aplica las fusiones aprobadas en local y en Nextcloud.",
        checkDuplicates: "Comprobar duplicados",
        duplicateFoundTitle: "Posible duplicado",
        duplicateFoundBody:
          "{{count}} recetas parecen coincidir ({{reason}}):\n\n{{recipes}}\n\n¿Quieres fusionarlas? Se conservará la receta más completa.",
        duplicateReason: {
          url: "misma URL de origen",
          signature: "mismos ingredientes y pasos",
          name: "nombre muy parecido"
        },
        duplicatesNoneTitle: "No se encontraron duplicados",
        duplicatesNoneBody:
          "No se detectaron recetas suficientemente parecidas.",
        duplicatesDoneTitle: "Comprobación terminada",
        duplicatesDoneBody:
          "{{merged}} receta(s) fusionada(s), {{skipped}} grupo(s) conservado(s).",
        duplicatesFailedTitle: "No se pudo comprobar",
        duplicatesFailed:
          "La comprobación o la fusión no pudo terminar. Revisa la conexión con Nextcloud e inténtalo de nuevo."
      },
      privacy: {
        title: "Privacidad",
        free: "Esta app es gratuita y desarrollada por un estudiante independiente.",
        independent: "No es una app oficial de Nextcloud y no vende datos.",
        local:
          "En modo local, las recetas permanecen en este dispositivo. Con Nextcloud, se sincronizan solo con el servidor que elijas.",
        credentials:
          "La dirección del servidor, el usuario y la contraseña de app se guardan en el almacenamiento seguro del dispositivo.",
        tracking: "No hay publicidad, rastreadores de marketing ni reventa de datos.",
        photos:
          "Las fotos añadidas manualmente se copian en el almacenamiento de la app para que estén disponibles sin conexión."
      }
    }
  },
  it: {
    translation: {
      common: {
        add: "Aggiungi",
        back: "Indietro",
        backToTop: "Torna in alto",
        cancel: "Annulla",
        clearSearch: "Cancella ricerca",
        delete: "Elimina",
        edit: "Modifica",
        save: "Salva",
        search: "Cerca",
        clear: "Cancella",
        settings: "Impostazioni",
        import: "Importa",
        sync: "Sincronizza",
        logout: "Esci",
        loading: "Caricamento",
        offline: "Non in linea",
        online: "Connesso",
        retry: "Riprova",
        close: "Chiudi",
        continue: "Continua"
      },
      auth: {
        title: "AvoCook",
        subtitle: "Le tue ricette in cloud, pronte in cucina.",
        server: "Indirizzo Nextcloud",
        username: "Nome utente",
        appPassword: "Password dell'app",
        login: "Accedi",
        secure: "Credenziali cifrate nel portachiavi del dispositivo",
        invalidUrl: "Indirizzo Nextcloud non valido.",
        insecureUrl: "Usa HTTPS, tranne localhost durante lo sviluppo.",
        failed: "Accesso non riuscito. Controlla il server e la password dell'app.",
        certificateError:
          "Connessione di rete/TLS non riuscita. Se il server usa un certificato autofirmato, installa e autorizza la sua autorità di certificazione sul dispositivo oppure usa un certificato pubblico valido.",
        useLocal: "Usa senza Nextcloud",
        showPassword: "Mostra password",
        hidePassword: "Nascondi password",
        appPasswordHelp: "Come creo una password dell'app?",
        localSubtitle: "Modalità locale gratuita: le ricette restano solo su questo dispositivo.",
        localDataWarning:
          "Attenzione: in modalità locale, eliminare l'app elimina anche le ricette salvate su questo dispositivo. Esporta un backup prima di disinstallare.",
        badCredentials:
          "Nome utente o password dell'app errati. Crea una password app dedicata in Nextcloud.",
        tutorial: {
          title: "Creare una password dell'app Nextcloud",
          steps: {
            openNextcloud: "Apri Nextcloud nel browser e accedi al tuo account.",
            openSettings:
              "Seleziona il tuo avatar o nome, poi apri Impostazioni, Impostazioni personali o Personale a seconda della versione.",
            openSecurity:
              "Apri Sicurezza. In alcune versioni la sezione si chiama Dispositivi e sessioni o Password dell'app.",
            createPassword: "Crea una nuova password dell'app, ad esempio con il nome Cookbook Mobile.",
            copyPassword:
              "Copia la password mostrata una sola volta e incollala qui insieme al tuo nome utente Nextcloud."
          },
          versionNote:
            "I nomi esatti variano in base alla versione di Nextcloud e al tema, ma il percorso si trova sempre nelle impostazioni personali dell'account, sotto Sicurezza o Sessioni."
        }
      },
      updates: {
        bannerTitle: "Aggiornamento disponibile: {{version}}",
        download: "Scarica",
        localBackupWarning: "Attenzione: stai usando la modalità locale (senza account Nextcloud). Per precauzione, esporta un backup delle tue ricette nelle Impostazioni prima di installare l'aggiornamento per evitare perdite di dati.",
        dismiss: "Più tardi"
      },
      recipes: {
        title: "Ricette",
        emptyTitle: "Nessuna ricetta",
        emptyBody: "Aggiungi una ricetta o sincronizza il tuo Cookbook.",
        openFailedTitle: "Impossibile aprire la ricetta",
        openFailedBody:
          "Questa ricetta contiene dati inattesi. È stata conservata; torna all'elenco e avvia di nuovo la sincronizzazione.",
        ingredients: "Ingredienti",
        ingredientsChecked: "{{checked}}/{{total}} spuntati",
        markIngredientReady: "Segna {{ingredient}} come pronto",
        unmarkIngredientReady: "Deseleziona {{ingredient}}",
        resetIngredientChecks: "Deseleziona tutto",
        instructions: "Passaggi",
        stepsChecked: "{{checked}}/{{total}} passaggi spuntati",
        markStepDone: "Spunta il passaggio {{step}}",
        unmarkStepDone: "Deseleziona il passaggio {{step}}",
        resetStepChecks: "Deseleziona tutto",
        tools: "Strumenti",
        nutrition: "Valori nutrizionali",
        category: "Categoria",
        yield: "Porzioni",
        prepTime: "Preparazione",
        cookTime: "Cottura",
        totalTime: "Totale",
        minutes: "min",
        source: "Fonte",
        openSource: "Apri fonte",
        noCategory: "Nessuna categoria",
        deleteConfirm: "Eliminare questa ricetta?",
        duplicateTitle: "Ricetta con lo stesso nome",
        duplicateTitleBody:
          "\"{{title}}\" esiste già con il nome \"{{existingTitle}}\". Vuoi unire i dati o conservare entrambe le ricette?",
        keepBoth: "Conserva entrambe",
        mergeRecipes: "Unisci",
        allCategories: "Tutte",
        uncategorized: "Nessuna categoria",
        categories: "Categorie",
        categoryCount: "{{count}} ricetta",
        categoryCount_one: "{{count}} ricetta",
        categoryCount_other: "{{count}} ricette",
        newCategory: "Nuova categoria",
        categoryName: "Nome categoria",
        createCategory: "Crea categoria",
        deleteCategory: "Elimina categoria",
        deleteCategoryConfirmTitle: "Eliminare questa categoria?",
        deleteCategoryConfirmBody:
          "\"{{category}}\" sarà rimossa dalle categorie personalizzate.",
        categoryHasRecipesTitle: "Categoria in uso",
        categoryHasRecipesBody:
          "\"{{category}}\" contiene ancora {{count}} ricetta/e. Modifica o sposta queste ricette prima di eliminare il gruppo.",
        chooseCategory: "Scegli categoria",
        moreCategories: "Altro",
        loadingRecipes: "Caricamento ricette...",
        syncingRecipes: "Sincronizzazione ricette...",
        syncingRecipesShort: "Sincronizzazione...",
        loadedRecipes: "{{count}} ricetta caricata",
        loadedRecipes_one: "{{count}} ricetta caricata",
        loadedRecipes_other: "{{count}} ricette caricate",
        selectedCategory: "Categoria selezionata: {{category}}",
        servings: {
          title: "Porzioni",
          people: "persone",
          decrease: "Riduci porzioni",
          increase: "Aumenta porzioni",
          original: "Ricetta originale: {{count}} persona",
          original_one: "Ricetta originale: {{count}} persona",
          original_other: "Ricetta originale: {{count}} persone",
          reset: "Ripristina originale"
        },
        timers: {
          title: "Timer",
          prep: "Preparazione",
          cook: "Cottura",
          total: "Totale",
          start: "Avvia timer",
          pause: "Pausa",
          reset: "Reimposta",
          stop: "Ferma",
          done: "Fatto",
          notificationTitle: "{{timer}} completato",
          notificationHint:
            "I timer suonano tramite notifiche. Le notifiche devono essere abilitate.",
          notificationsOff: "Notifiche disattivate: i timer non possono suonare.",
          notificationsUnavailable:
            "Le notifiche non sono disponibili in questo ambiente. Installa una build reale per usare i timer.",
          notificationsRequiredTitle: "Notifiche necessarie",
          notificationsRequiredBody:
            "Abilita le notifiche per AvoCook nelle impostazioni del telefono. Senza di esse, il timer non può suonare con l'iPhone bloccato.",
          notificationsUnavailableBody:
            "Questa build non include ancora il modulo nativo delle notifiche. Installa una build iOS reale per usare i timer."
        },
        share: {
          print: "Stampa ricetta",
          sharePdf: "Condividi come PDF",
          shareFile: "Condividi per AvoCook",
          updateFromSource: "Aggiorna dalla fonte",
          keywords: "Parole chiave",
          servingSize: "Porzione",
          updateFromSourceConfirmTitle: "Aggiornare questa ricetta?",
          updateFromSourceConfirmBody:
            "La ricetta attuale verrà unita alla versione disponibile sul sito sorgente. Le impostazioni locali saranno conservate.",
          updateFromSourceSuccessTitle: "Ricetta aggiornata",
          updateFromSourceSuccessBody:
            "La ricetta è stata ricaricata dal link originale.",
          updateFromSourceFailedTitle: "Aggiornamento non riuscito",
          updateFromSourceFailedBody:
            "Non è stato possibile ricaricare la ricetta dal link originale. Controlla la pagina sorgente o riprova più tardi.",
          failedTitle: "Condivisione impossibile",
          failedBody:
            "Non è stato possibile preparare la ricetta. Controlla l'accesso alla foto o riprova più tardi.",
          partialTitle: "Foto non inclusa",
          partialBody:
            "{{count}} immagine/i non sono state aggiunte, ma le altre informazioni della ricetta sono pronte."
        },
        health: {
          title: "Salute",
          estimated: "Punteggio di salute stimato",
          missingTitle: "Dati nutrizionali mancanti",
          localNote:
            "Stima locale non ufficiale basata sui valori nutrizionali per porzione.",
          calculation:
            "Il punteggio penalizza calorie, zuccheri, grassi saturi e sodio, e premia fibre e proteine.",
          calories: "Calorie",
          sugar: "Zuccheri",
          fat: "Grassi",
          salt: "Sale",
          fiber: "Fibre",
          protein: "Proteine"
        }
      },
      shoppingList: {
        title: "Spesa",
        emptyTitle: "Lista vuota",
        emptyBody:
          "Aggiungi ingredienti da una ricetta o scrivi un prodotto.",
        manualItemLabel: "Aggiungi prodotto",
        itemPlaceholder: "Pomodori, farina, latte...",
        addItem: "Aggiungi alla lista",
        addFromRecipe: "Aggiungi ingredienti alla lista della spesa",
        addIngredientFromRecipe:
          "Aggiungi {{ingredient}} alla lista della spesa",
        addedTitle: "Lista aggiornata",
        addedBody: "{{count}} ingrediente aggiunto.",
        addedBody_one: "{{count}} ingrediente aggiunto.",
        addedBody_other: "{{count}} ingredienti aggiunti.",
        alreadyAddedTitle: "Già nella lista",
        alreadyAddedBody: "Questi ingredienti sono già nella lista della spesa.",
        remainingCount: "{{count}} da comprare",
        remainingCount_one: "{{count}} da comprare",
        remainingCount_other: "{{count}} da comprare",
        checkedCount: "{{count}} selezionato",
        checkedCount_one: "{{count}} selezionato",
        checkedCount_other: "{{count}} selezionati",
        clearChecked: "Rimuovi selezionati",
        clearCheckedConfirmTitle: "Rimuovere i prodotti selezionati?",
        clearCheckedConfirmBody:
          "{{count}} prodotto/i selezionati saranno rimossi dalla lista.",
        clearAll: "Svuota lista",
        clearAllConfirmTitle: "Svuotare tutta la lista?",
        clearAllConfirmBody:
          "Tutti i prodotti della lista della spesa saranno rimossi.",
        deleteItem: "Elimina prodotto"
      },
      editor: {
        newRecipe: "Nuova ricetta",
        editRecipe: "Modifica ricetta",
        name: "Nome",
        description: "Descrizione",
        ingredients: "Ingredienti",
        instructions: "Passaggi",
        addIngredient: "Aggiungi ingrediente",
        addInstruction: "Aggiungi passaggio",
        ingredientItem: "Ingrediente {{count}}",
        instructionItem: "Passaggio {{count}}",
        ingredientPlaceholder: "Es. 200 g di farina",
        instructionPlaceholder: "Descrivi questo passaggio",
        removeIngredient: "Rimuovi questo ingrediente",
        removeInstruction: "Rimuovi questo passaggio",
        tools: "Strumenti, uno per riga",
        addSource: "Aggiungi fonte",
        sourceName: "Nome della fonte",
        sourceNamePlaceholder: "Es. GialloZafferano, libro di cucina...",
        sourceUrl: "URL della fonte",
        photoUrl: "URL della foto",
        choosePhoto: "Scegli foto",
        removePhoto: "Rimuovi foto",
        keywords: "Parole chiave separate da virgola",
        category: "Categoria",
        prepMinutes: "Minuti di preparazione",
        cookMinutes: "Minuti di cottura",
        totalMinutes: "Minuti totali",
        nutrition: "Valori nutrizionali per porzione",
        nutritionHelp:
          "Questi valori alimentano il punteggio di salute. Lasciali vuoti se non li conosci.",
        caloriesKcal: "Calorie (kcal)",
        carbsGrams: "Carboidrati (g)",
        sugarGrams: "Zuccheri (g)",
        fatGrams: "Grassi (g)",
        saturatedFatGrams: "Grassi saturi (g)",
        sodiumMg: "Sodio / sale (mg)",
        fiberGrams: "Fibre (g)",
        proteinGrams: "Proteine (g)",
        requiredName: "Il nome della ricetta è obbligatorio."
      },
      importRecipe: {
        title: "Importa",
        url: "URL della ricetta",
        urlPlaceholder: "https://www.giallozafferano.it/...",
        action: "Importa da URL",
        fileAction: "Importa file AvoCook",
        sharedFileHint:
          "Puoi anche scegliere un file ricetta condiviso tramite Messaggi, WhatsApp, Mail o un altro dispositivo.",
        fileFailed: "Impossibile importare questo file.",
        invalidFile: "Questo file non è una ricetta AvoCook valida.",
        fileImportedTitle: "File importato",
        fileImportedBody:
          "Importazione completata: {{created}} aggiunta/e, {{updated}} aggiornata/e, {{skipped}} duplicato/i ignorato/i, {{renamed}} rinominata/e.",
        failed: "Impossibile importare questa pagina.",
        success: "Ricetta importata"
      },
      settings: {
        title: "Impostazioni",
        appearance: "Aspetto",
        language: "Lingua",
        system: "Sistema",
        light: "Chiaro",
        dark: "Scuro",
        french: "Français",
        english: "English",
        german: "Deutsch",
        spanish: "Español",
        italian: "Italiano",
        keepAwake: "Tieni lo schermo acceso su una ricetta",
        keepRecipesLocal: "Mantieni una copia locale delle ricette per l'uso offline",
        server: "Server",
        localMode: "Modalità locale",
        localOnly: "Uso senza account Nextcloud",
        privacy: "Privacy",
        secureStore: "Le credenziali rimangono nel deposito sicuro del telefono.",
        localNotice:
          "Le tue ricette sono archiviate esclusivamente su questo dispositivo e non vengono inviate a nessun server.",
        reindex: "Reindicizza Cookbook",
        reindexConfirmTitle: "Reindicizzare il server?",
        reindexConfirmBody:
          "Questo chiede a Nextcloud Cookbook di scansionare nuovamente la cartella delle ricette. È utile se le ricette sono state aggiunte o modificate fuori dall'app, ma può richiedere tempo su un Cookbook grande.",
        reindexDone: "Reindicizzazione richiesta",
        openPrivacy: "Privacy e dati",
        notifications: "Notifiche",
        notificationsEnabled: "Abilitate",
        notificationsDisabled: "Disabilitate (tocca per abilitare)",
        dataBackup: "Backup dei dati",
        dataBackupLocalBody:
          "Esporta o importa un file AvoCook con ricette, categorie e foto da questo dispositivo.",
        dataBackupNextcloudBody:
          "L'esportazione sincronizza prima Nextcloud, poi salva ricette, categorie e foto disponibili.",
        localDeleteWarning:
          "Se elimini l'app, i dati locali vengono rimossi da questo telefono.",
        exportBackup: "Esporta backup",
        importBackup: "Importa backup",
        backupExportTitle: "Backup esportato",
        backupExportDone:
          "Backup pronto: {{count}} ricette e {{images}} immagini.",
        backupExportPartial:
          "{{count}} immagine/i non sono state aggiunte al file.",
        backupImportTitle: "Importazione completata",
        backupImportConfirmTitle: "Importare questo backup?",
        backupImportConfirmBody:
          "L'importazione unisce i dati senza eliminare le ricette attuali. I duplicati esatti vengono ignorati, le ricette corrispondenti aggiornate e i conflitti di nome rinominati.",
        backupImportDone:
          "Importazione completata: {{created}} aggiunta/e, {{updated}} aggiornata/e, {{skipped}} duplicato/i ignorato/i, {{renamed}} rinominata/e.",
        backupFailedTitle: "Backup non riuscito",
        backupFailed:
          "L'operazione non è stata completata. Controlla il file selezionato, l'accesso alla cartella o la connessione Nextcloud.",
        backupInvalid: "Questo file non è un backup AvoCook valido.",
        duplicates: "Duplicati",
        duplicatesLocalBody:
          "Analizza le ricette su questo dispositivo e propone di unire i probabili duplicati.",
        duplicatesNextcloudBody:
          "Analizza le ricette sincronizzate e applica le unioni approvate in locale e su Nextcloud.",
        checkDuplicates: "Controlla duplicati",
        duplicateFoundTitle: "Possibile duplicato",
        duplicateFoundBody:
          "{{count}} ricette sembrano corrispondere ({{reason}}):\n\n{{recipes}}\n\nVuoi unirle? Verrà conservata la ricetta più completa.",
        duplicateReason: {
          url: "stesso URL di origine",
          signature: "stessi ingredienti e passaggi",
          name: "nome molto simile"
        },
        duplicatesNoneTitle: "Nessun duplicato trovato",
        duplicatesNoneBody:
          "Non sono state rilevate ricette sufficientemente simili.",
        duplicatesDoneTitle: "Controllo completato",
        duplicatesDoneBody:
          "{{merged}} ricetta/e unite, {{skipped}} gruppo/i conservato/i.",
        duplicatesFailedTitle: "Controllo non riuscito",
        duplicatesFailed:
          "Il controllo o l'unione non è stato completato. Controlla la connessione Nextcloud e riprova."
      },
      privacy: {
        title: "Privacy",
        free: "Questa app è gratuita e sviluppata da uno studente indipendente.",
        independent: "Non è un'app ufficiale Nextcloud e non vende dati.",
        local:
          "In modalità locale, le ricette rimangono su questo dispositivo. Con Nextcloud, vengono sincronizzate solo con il server che scegli.",
        credentials:
          "L'indirizzo del server, il nome utente e la password dell'app sono memorizzati nel deposito sicuro del dispositivo.",
        tracking: "Nessuna pubblicità, nessun tracker di marketing e nessuna rivendita di dati.",
        photos:
          "Le foto aggiunte manualmente vengono copiate nell'archiviazione dell'app per restare disponibili offline."
      }
    }
  }
} as const;

const deviceLanguage = Localization.getLocales()[0]?.languageCode;
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveAppLanguage(deviceLanguage),
  fallbackLng: "fr",
  interpolation: {
    escapeValue: false
  },
  compatibilityJSON: "v4"
});

export default i18n;
