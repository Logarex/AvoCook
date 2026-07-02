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
import { useLongActionToast } from "../../components/LongActionToast";
import { useAuth } from "../auth/AuthProvider";
import { usePreferences } from "../preferences/PreferencesProvider";
import {
  deleteCustomCategory,
  loadCustomCategories,
  saveCustomCategory
} from "./categoryStore";
import {
  clearSyncedLocalRecipes,
  createRecipe as createRecipeInRepository,
  deleteRecipe as deleteRecipeInRepository,
  exportRecipeBackup,
  findDuplicateRecipes,
  importRecipeBackup,
  importRecipeBackupFile,
  importRecipe as importRecipeInRepository,
  initialiseRecipeStore,
  mergeDuplicateRecipes,
  renameRecipeCategory as renameRecipeCategoryInRepository,
  syncRecipes,
  updateRecipeFromSource as updateRecipeFromSourceInRepository,
  updateRecipeLocalPreferences,
  updateRecipe as updateRecipeInRepository,
  type RecipeBackupImportResult,
  type RecipeDuplicateMergeResult,
  type RecipeNameConflict,
  type RecipeNameConflictResolution,
  type RecipeRepositoryOptions
} from "./recipeRepository";
import type { RecipeDuplicateGroup } from "./backupDuplicates";
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
  updateRecipeFromSource: (recipe: Recipe) => Promise<Recipe>;
  updateRecipePreferences: (recipe: Recipe) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
  importRecipe: (url: string) => Promise<Recipe>;
  exportBackup: () => Promise<RecipeBackupExportResult & { fileUri: string }>;
  importBackup: () => Promise<RecipeBackupImportResult>;
  importBackupFile: (uri: string) => Promise<RecipeBackupImportResult>;
  findDuplicateGroups: () => Promise<RecipeDuplicateGroup[]>;
  mergeDuplicateGroup: (
    group: RecipeDuplicateGroup
  ) => Promise<RecipeDuplicateMergeResult>;
  createCategory: (category: string) => Promise<string[]>;
  deleteCategory: (category: string) => Promise<string[]>;
  renameCategory: (category: string, nextCategory: string) => Promise<string[]>;
};

const RecipesContext = createContext<RecipesContextValue | undefined>(
  undefined
);

export function RecipesProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { credentials, getClient, isLocalMode } = useAuth();
  const { keepRecipesLocal } = usePreferences();
  const { watchLongAction } = useLongActionToast();
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
    const stopLongActionNotice = watchLongAction("longActions.sync");
    setSyncing(true);
    try {
      setRecipes(await syncRecipes(client, keepRecipesLocal, repositoryOptions));
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
      setRecipes(await initialiseRecipeStore());
    } finally {
      stopLongActionNotice();
      syncInFlightRef.current = false;
      setSyncing(false);
    }
  }, [getClient, keepRecipesLocal, repositoryOptions, watchLongAction]);

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
      const stopLongActionNotice = watchLongAction("longActions.saveRecipe");
      try {
        const saved = await createRecipeInRepository(
          recipe,
          getClient(),
          repositoryOptions
        );
        setRecipes(await initialiseRecipeStore());
        return saved;
      } finally {
        stopLongActionNotice();
      }
    },
    [getClient, repositoryOptions, watchLongAction]
  );

  const updateRecipe = useCallback(
    async (recipe: Recipe) => {
      const stopLongActionNotice = watchLongAction("longActions.saveRecipe");
      try {
        const saved = await updateRecipeInRepository(
          recipe,
          getClient(),
          repositoryOptions
        );
        setRecipes(await initialiseRecipeStore());
        return saved;
      } finally {
        stopLongActionNotice();
      }
    },
    [getClient, repositoryOptions, watchLongAction]
  );

  const updateRecipeFromSource = useCallback(
    async (recipe: Recipe) => {
      const stopLongActionNotice = watchLongAction("longActions.updateFromSource");
      try {
        const saved = await updateRecipeFromSourceInRepository(
          recipe,
          getClient(),
          repositoryOptions
        );
        setRecipes(await initialiseRecipeStore());
        return saved;
      } finally {
        stopLongActionNotice();
      }
    },
    [getClient, repositoryOptions, watchLongAction]
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
      const stopLongActionNotice = watchLongAction("longActions.deleteRecipe");
      try {
        await deleteRecipeInRepository(id, getClient());
        setRecipes(await initialiseRecipeStore());
      } finally {
        stopLongActionNotice();
      }
    },
    [getClient, watchLongAction]
  );

  const importRecipe = useCallback(
    async (url: string) => {
      const stopLongActionNotice = watchLongAction("longActions.importRecipe");
      try {
        const saved = await importRecipeInRepository(
          url,
          getClient(),
          recipes,
          repositoryOptions
        );
        setRecipes(await initialiseRecipeStore());
        return saved;
      } finally {
        stopLongActionNotice();
      }
    },
    [getClient, recipes, repositoryOptions, watchLongAction]
  );

  const exportBackup = useCallback(async () => {
    const stopLongActionNotice = watchLongAction("longActions.exportBackup");
    try {
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
    } finally {
      stopLongActionNotice();
    }
  }, [
    customCategories,
    getClient,
    isLocalMode,
    repositoryOptions,
    watchLongAction
  ]);

  const importBackup = useCallback(async () => {
    const backup = await pickRecipeBackupFile();
    const stopLongActionNotice = watchLongAction("longActions.importBackup");
    try {
      const result = await importRecipeBackup(backup, getClient(), repositoryOptions);
      setRecipes(result.recipes);
      setCustomCategories(await loadCustomCategories());
      return result;
    } finally {
      stopLongActionNotice();
    }
  }, [getClient, repositoryOptions, watchLongAction]);

  const importBackupFile = useCallback(
    async (uri: string) => {
      const stopLongActionNotice = watchLongAction("longActions.importBackup");
      try {
        const result = await importRecipeBackupFile(
          uri,
          getClient(),
          repositoryOptions
        );
        setRecipes(result.recipes);
        setCustomCategories(await loadCustomCategories());
        return result;
      } finally {
        stopLongActionNotice();
      }
    },
    [getClient, repositoryOptions, watchLongAction]
  );

  const findDuplicateGroups = useCallback(() => findDuplicateRecipes(), []);

  const mergeDuplicateGroup = useCallback(
    async (group: RecipeDuplicateGroup) => {
      const stopLongActionNotice = watchLongAction("longActions.mergeDuplicates");
      try {
        const result = await mergeDuplicateRecipes(group, getClient());
        setRecipes(result.recipes);
        return result;
      } finally {
        stopLongActionNotice();
      }
    },
    [getClient, watchLongAction]
  );

  const createCategory = useCallback(async (category: string) => {
    const nextCategories = await saveCustomCategory(category);
    setCustomCategories(nextCategories);
    return nextCategories;
  }, []);

  const deleteCategory = useCallback(async (category: string) => {
    const nextCategories = await deleteCustomCategory(category);
    setCustomCategories(nextCategories);
    return nextCategories;
  }, []);

  const renameCategory = useCallback(
    async (category: string, nextCategory: string) => {
      const stopLongActionNotice = watchLongAction("longActions.renameCategory");
      try {
        const result = await renameRecipeCategoryInRepository(
          category,
          nextCategory,
          getClient(),
          repositoryOptions,
          recipes
        );
        const nextCategories = await loadCustomCategories();
        setRecipes(result.recipes);
        setCustomCategories(nextCategories);
        return nextCategories;
      } finally {
        stopLongActionNotice();
      }
    },
    [getClient, recipes, repositoryOptions, watchLongAction]
  );

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
      updateRecipeFromSource,
      updateRecipePreferences,
      deleteRecipe,
      importRecipe,
      exportBackup,
      importBackup,
      importBackupFile,
      findDuplicateGroups,
      mergeDuplicateGroup,
      createCategory,
      deleteCategory,
      renameCategory
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
      updateRecipeFromSource,
      updateRecipePreferences,
      deleteRecipe,
      importRecipe,
      exportBackup,
      importBackup,
      importBackupFile,
      findDuplicateGroups,
      mergeDuplicateGroup,
      createCategory,
      deleteCategory,
      renameCategory
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
