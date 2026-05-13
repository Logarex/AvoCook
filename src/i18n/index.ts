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
        useLocal: "Utiliser sans Nextcloud",
        showPassword: "Afficher le mot de passe",
        hidePassword: "Masquer le mot de passe",
        appPasswordHelp: "Comment créer un app password ?",
        localSubtitle:
          "Mode local gratuit : vos recettes restent uniquement sur cet appareil.",
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
          done: "Terminé"
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
        openPrivacy: "Confidentialité et données"
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
        useLocal: "Use without Nextcloud",
        showPassword: "Show password",
        hidePassword: "Hide password",
        appPasswordHelp: "How do I create an app password?",
        localSubtitle:
          "Free local mode: your recipes stay only on this device.",
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
          done: "Done"
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
        openPrivacy: "Privacy and data"
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
  }
} as const;

const deviceLanguage = Localization.getLocales()[0]?.languageCode;
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage === "en" ? "en" : "fr",
  fallbackLng: "fr",
  interpolation: {
    escapeValue: false
  },
  compatibilityJSON: "v4"
});

export default i18n;
