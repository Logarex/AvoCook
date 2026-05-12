import * as Localization from "expo-localization";
import i18n from "i18next";
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
        settings: "Réglages",
        import: "Importer",
        sync: "Synchroniser",
        logout: "Déconnexion",
        loading: "Chargement",
        offline: "Hors ligne",
        online: "Connecté",
        retry: "Réessayer"
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
        failed: "Connexion impossible. Vérifiez le serveur et l'app password."
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
        deleteConfirm: "Supprimer cette recette ?"
      },
      editor: {
        newRecipe: "Nouvelle recette",
        editRecipe: "Modifier la recette",
        name: "Nom",
        description: "Description",
        ingredients: "Ingrédients, une ligne par élément",
        instructions: "Étapes, une ligne par étape",
        tools: "Ustensiles, une ligne par élément",
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
        server: "Serveur",
        privacy: "Confidentialité",
        secureStore:
          "Les identifiants restent dans le stockage sécurisé du téléphone.",
        reindex: "Réindexer Cookbook",
        reindexDone: "Réindexation demandée"
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
        settings: "Settings",
        import: "Import",
        sync: "Sync",
        logout: "Log out",
        loading: "Loading",
        offline: "Offline",
        online: "Connected",
        retry: "Retry"
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
        failed: "Unable to sign in. Check the server and app password."
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
        deleteConfirm: "Delete this recipe?"
      },
      editor: {
        newRecipe: "New recipe",
        editRecipe: "Edit recipe",
        name: "Name",
        description: "Description",
        ingredients: "Ingredients, one per line",
        instructions: "Steps, one per line",
        tools: "Tools, one per line",
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
        server: "Server",
        privacy: "Privacy",
        secureStore: "Credentials stay in the phone secure storage.",
        reindex: "Reindex Cookbook",
        reindexDone: "Reindex requested"
      }
    }
  }
} as const;

const deviceLanguage = Localization.getLocales()[0]?.languageCode;

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
