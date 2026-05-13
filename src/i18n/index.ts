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
        title: "Nextcloud Cookbook",
        subtitle: "Vos recettes Nextcloud, prêtes en cuisine.",
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
        localSubtitle:
          "Mode local gratuit : vos recettes restent uniquement sur cet appareil.",
        badCredentials:
          "Identifiant ou mot de passe d'application incorrect. Créez un app password Nextcloud dédié."
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
        categoryCount_plural: "{{count}} recettes",
        newCategory: "Nouvelle catégorie",
        categoryName: "Nom de catégorie",
        createCategory: "Créer la catégorie",
        folderShortcut: "Dossier Cookbook",
        loadingRecipes: "Chargement des recettes...",
        syncingRecipes: "Synchronisation en cours...",
        loadedRecipes: "{{count}} recette chargée",
        loadedRecipes_plural: "{{count}} recettes chargées",
        selectedCategory: "Catégorie sélectionnée : {{category}}"
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
        cookbookFolder: "Dossier Cookbook",
        folderSaved: "Dossier enregistré",
        saveFolder: "Enregistrer le dossier",
        privacy: "Confidentialité",
        secureStore:
          "Les identifiants restent dans le stockage sécurisé du téléphone.",
        reindex: "Réindexer Cookbook",
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
        title: "Nextcloud Cookbook",
        subtitle: "Your Nextcloud recipes, ready in the kitchen.",
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
        localSubtitle:
          "Free local mode: your recipes stay only on this device.",
        badCredentials:
          "Wrong username or app password. Create a dedicated Nextcloud app password."
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
        categoryCount_plural: "{{count}} recipes",
        newCategory: "New category",
        categoryName: "Category name",
        createCategory: "Create category",
        folderShortcut: "Cookbook folder",
        loadingRecipes: "Loading recipes...",
        syncingRecipes: "Syncing recipes...",
        loadedRecipes: "{{count}} recipe loaded",
        loadedRecipes_plural: "{{count}} recipes loaded",
        selectedCategory: "Selected category: {{category}}"
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
        cookbookFolder: "Cookbook folder",
        folderSaved: "Folder saved",
        saveFolder: "Save folder",
        privacy: "Privacy",
        secureStore: "Credentials stay in the phone secure storage.",
        reindex: "Reindex Cookbook",
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
