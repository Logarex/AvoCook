import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthProvider";
import { usePreferences } from "../preferences/PreferencesProvider";
import { loadCustomCategories, saveCustomCategory } from "./categoryStore";
import {
  clearSyncedLocalRecipes,
  createRecipe as createRecipeInRepository,
  deleteRecipe as deleteRecipeInRepository,
  exportRecipeBackup,
  importRecipeBackup,
  importRecipeBackupFile,
  importRecipe as importRecipeInRepository,
  initialiseRecipeStore,
  syncRecipes,
  updateRecipeLocalPreferences,
  updateRecipe as updateRecipeInRepository,
  type RecipeBackupImportResult,
  type RecipeNameConflict,
  type RecipeNameConflictResolution,
  type RecipeRepositoryOptions
} from "./recipeRepository";
import {
  pickRecipeBackupFile,
  writeRecipeBackupToPickedDirectory,
  type RecipeBackupExportResult
} from "./recipeBackup";
import type { Recipe } from "./types";

type RecipesContextValue = {
  recipes: Recipe[];
  customCategories: string[];
  loading: boolean;
  syncing: boolean;
  lastError: string | null;
  getRecipe: (id: string) => Recipe | undefined;
  reloadLocal: () => Promise<void>;
  sync: () => Promise<void>;
  createRecipe: (recipe: Recipe) => Promise<Recipe>;
  updateRecipe: (recipe: Recipe) => Promise<Recipe>;
  updateRecipePreferences: (recipe: Recipe) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
  importRecipe: (url: string) => Promise<Recipe>;
  exportBackup: () => Promise<RecipeBackupExportResult & { fileUri: string }>;
  importBackup: () => Promise<RecipeBackupImportResult>;
  importBackupFile: (uri: string) => Promise<RecipeBackupImportResult>;
  createCategory: (category: string) => Promise<string[]>;
};

const RecipesContext = createContext<RecipesContextValue | undefined>(
  undefined
);

export function RecipesProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { credentials, getClient, isLocalMode } = useAuth();
  const { keepRecipesLocal } = usePreferences();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const syncInFlightRef = useRef(false);

  const resolveNameConflict = useCallback(
    (conflict: RecipeNameConflict) =>
      new Promise<RecipeNameConflictResolution>((resolve) => {
        Alert.alert(
          t("recipes.duplicateTitle"),
          t("recipes.duplicateTitleBody", {
            title: conflict.recipe.name,
            existingTitle: conflict.existingRecipe.name
          }),
          [
            {
              text: t("recipes.keepBoth"),
              onPress: () => resolve("keep-both"),
              style: "cancel"
            },
            {
              text: t("recipes.mergeRecipes"),
              onPress: () => resolve("merge")
            }
          ],
          {
            cancelable: true,
            onDismiss: () => resolve("keep-both")
          }
        );
      }),
    [t]
  );
  const repositoryOptions = useMemo<RecipeRepositoryOptions>(
    () => ({ resolveNameConflict }),
    [resolveNameConflict]
  );

  const reloadLocal = useCallback(async () => {
    setLoading(true);
    try {
      setRecipes(await initialiseRecipeStore());
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadLocal();
  }, [reloadLocal]);

  useEffect(() => {
    void loadCustomCategories().then(setCustomCategories);
  }, []);

  const sync = useCallback(async () => {
    const client = getClient();
    if (!client) {
      return;
    }
    if (syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;
    setSyncing(true);
    try {
      setRecipes(await syncRecipes(client, keepRecipesLocal, repositoryOptions));
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
      setRecipes(await initialiseRecipeStore());
    } finally {
      syncInFlightRef.current = false;
      setSyncing(false);
    }
  }, [getClient, keepRecipesLocal, repositoryOptions]);

  useEffect(() => {
    if (credentials) {
      void sync();
    }
  }, [credentials, sync]);

  useEffect(() => {
    if (credentials && !keepRecipesLocal && !isLocalMode) {
      void clearSyncedLocalRecipes();
    }
  }, [credentials, isLocalMode, keepRecipesLocal]);

  const createRecipe = useCallback(
    async (recipe: Recipe) => {
      const saved = await createRecipeInRepository(
        recipe,
        getClient(),
        repositoryOptions
      );
      setRecipes(await initialiseRecipeStore());
      return saved;
    },
    [getClient, repositoryOptions]
  );

  const updateRecipe = useCallback(
    async (recipe: Recipe) => {
      const saved = await updateRecipeInRepository(
        recipe,
        getClient(),
        repositoryOptions
      );
      setRecipes(await initialiseRecipeStore());
      return saved;
    },
    [getClient, repositoryOptions]
  );

  const updateRecipePreferences = useCallback(async (recipe: Recipe) => {
    setRecipes((currentRecipes) =>
      currentRecipes.map((currentRecipe) =>
        currentRecipe.id === recipe.id ? recipe : currentRecipe
      )
    );
    const saved = await updateRecipeLocalPreferences(recipe);
    setRecipes((currentRecipes) =>
      currentRecipes.map((currentRecipe) =>
        currentRecipe.id === saved.id ? saved : currentRecipe
      )
    );
    return saved;
  }, []);

  const deleteRecipe = useCallback(
    async (id: string) => {
      await deleteRecipeInRepository(id, getClient());
      setRecipes(await initialiseRecipeStore());
    },
    [getClient]
  );

  const importRecipe = useCallback(
    async (url: string) => {
      const saved = await importRecipeInRepository(
        url,
        getClient(),
        recipes,
        repositoryOptions
      );
      setRecipes(await initialiseRecipeStore());
      return saved;
    },
    [getClient, recipes, repositoryOptions]
  );

  const exportBackup = useCallback(async () => {
    const result = await exportRecipeBackup(
      {
        client: getClient(),
        customCategories,
        isLocalMode
      },
      repositoryOptions
    );
    const fileUri = await writeRecipeBackupToPickedDirectory(result.backup);
    setRecipes(await initialiseRecipeStore());
    return { ...result, fileUri };
  }, [customCategories, getClient, isLocalMode, repositoryOptions]);

  const importBackup = useCallback(async () => {
    const backup = await pickRecipeBackupFile();
    const result = await importRecipeBackup(backup, getClient(), repositoryOptions);
    setRecipes(result.recipes);
    setCustomCategories(await loadCustomCategories());
    return result;
  }, [getClient, repositoryOptions]);

  const importBackupFile = useCallback(
    async (uri: string) => {
      const result = await importRecipeBackupFile(
        uri,
        getClient(),
        repositoryOptions
      );
      setRecipes(result.recipes);
      setCustomCategories(await loadCustomCategories());
      return result;
    },
    [getClient, repositoryOptions]
  );

  const createCategory = useCallback(async (category: string) => {
    const nextCategories = await saveCustomCategory(category);
    setCustomCategories(nextCategories);
    return nextCategories;
  }, []);

  const getRecipe = useCallback(
    (id: string) => recipes.find((recipe) => recipe.id === id),
    [recipes]
  );

  const value = useMemo(
    () => ({
      recipes,
      customCategories,
      loading,
      syncing,
      lastError,
      getRecipe,
      reloadLocal,
      sync,
      createRecipe,
      updateRecipe,
      updateRecipePreferences,
      deleteRecipe,
      importRecipe,
      exportBackup,
      importBackup,
      importBackupFile,
      createCategory
    }),
    [
      recipes,
      customCategories,
      loading,
      syncing,
      lastError,
      getRecipe,
      reloadLocal,
      sync,
      createRecipe,
      updateRecipe,
      updateRecipePreferences,
      deleteRecipe,
      importRecipe,
      exportBackup,
      importBackup,
      importBackupFile,
      createCategory
    ]
  );

  return (
    <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>
  );
}

export function useRecipes() {
  const value = useContext(RecipesContext);
  if (!value) {
    throw new Error("useRecipes must be used inside RecipesProvider");
  }
  return value;
}
