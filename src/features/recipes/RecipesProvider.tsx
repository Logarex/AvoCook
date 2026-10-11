import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, AppState } from "react-native";
import { useTranslation } from "react-i18next";
import { useLongActionToast } from "../../components/LongActionToast";
import { useAuth } from "../auth/AuthProvider";
import { usePreferences } from "../preferences/PreferencesProvider";
import {
  deleteCustomCategory,
  loadCustomCategories,
  saveCustomCategory,
  loadFavoriteCategories,
  toggleFavoriteCategory as toggleFavoriteCategoryInStore
} from "./categoryStore";
import {
  createRecipeRepository,
  RecipeSyncError,
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
  favoriteCategories: string[];
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
  toggleFavoriteCategory: (category: string) => Promise<string[]>;
};

const RecipesContext = createContext<RecipesContextValue | undefined>(
  undefined
);

export function RecipesProvider({ children }: { children: React.ReactNode }) {
  const { getClient, isLocalMode, hydrated } = useAuth();
  const accountKey = hydrated ? getClient()?.getAccountKey() ?? (isLocalMode ? "local" : null) : null;
  return <AccountRecipesProvider key={accountKey ?? "signed-out"} accountKey={accountKey}>{children}</AccountRecipesProvider>;
}

function AccountRecipesProvider({ children, accountKey }: { children: React.ReactNode; accountKey: string | null }) {
  const {
    initialiseRecipeStore, clearSyncedLocalRecipes, updateRecipeLocalPreferences,
    findDuplicateRecipes, mergeDuplicateRecipes, createRecipe: createRecipeInRepository,
    updateRecipe: updateRecipeInRepository, deleteRecipe: deleteRecipeInRepository,
    renameRecipeCategory: renameRecipeCategoryInRepository, importRecipe: importRecipeInRepository,
    updateRecipeFromSource: updateRecipeFromSourceInRepository, syncRecipes,
    exportRecipeBackup, importRecipeBackup, importRecipeBackupFile
  } = useMemo(() => createRecipeRepository(accountKey), [accountKey]);
  const { t } = useTranslation();
  const { credentials, getClient, isLocalMode } = useAuth();
  const { keepRecipesLocal, showDefaultCategories, nextcloudImageFolder, hydrated: preferencesHydrated } = usePreferences();
  const { watchLongAction } = useLongActionToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [favoriteCategories, setFavoriteCategories] = useState<string[]>([]);
  const effectiveShowDefaultCategories = showDefaultCategories ?? isLocalMode;
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const syncInFlightRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

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
    if (!accountKey) { setLoading(false); return; }
    setLoading(true);
    try {
      setRecipes(await initialiseRecipeStore());
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [accountKey, initialiseRecipeStore]);

  useEffect(() => {
    void reloadLocal();
  }, [reloadLocal]);

  useEffect(() => {
    void loadCustomCategories(effectiveShowDefaultCategories)
      .then(setCustomCategories)
      .catch((error: unknown) => console.warn("local", "Could not load categories", error));
    void loadFavoriteCategories()
      .then(setFavoriteCategories)
      .catch((error: unknown) => console.warn("local", "Could not load favorite categories", error));
  }, [effectiveShowDefaultCategories]);

  const sync = useCallback(async () => {
    const client = getClient();
    if (!client || !accountKey || !mounted.current) {
      return;
    }
    if (syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;
    let stopLongActionNotice = () => {};
    setSyncing(true);
    try {
      const firstSyncCompleted = await AsyncStorage.getItem("recipes.firstSyncCompleted")
        .catch(() => null);
      const isFirstSync = firstSyncCompleted !== "true";
      if (isFirstSync) {
        stopLongActionNotice = watchLongAction("longActions.sync");
      }
      const synced = await syncRecipes(client, keepRecipesLocal);
      if (!mounted.current) return;
      setRecipes(synced);

      if (isFirstSync) {
        await AsyncStorage.setItem("recipes.firstSyncCompleted", "true")
          .catch((error: unknown) => console.warn("local", "Could not save first sync status", error));
      }
      
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
      try {
        if (error instanceof RecipeSyncError) setRecipes(error.recipes);
        else if (keepRecipesLocal) setRecipes(await initialiseRecipeStore());
      } catch (localError) {
        console.warn("local", "Could not reload recipes after sync failure", localError);
      }
    } finally {
      syncInFlightRef.current = false;
      setSyncing(false);
      stopLongActionNotice();
    }
  }, [accountKey, getClient, keepRecipesLocal, watchLongAction, syncRecipes, initialiseRecipeStore]);

  useEffect(() => {
    const client = getClient();
    if (client) {
      client.setImageFolder(nextcloudImageFolder);
    }
  }, [getClient, nextcloudImageFolder]);

  useEffect(() => {
    if (!credentials || !preferencesHydrated) return;
    void sync();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void sync();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === "active") void sync();
    }, 60_000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [credentials, preferencesHydrated, sync]);

  useEffect(() => {
    if (accountKey && credentials && !keepRecipesLocal && !isLocalMode) {
      void clearSyncedLocalRecipes().catch((error: unknown) => {
        setLastError(error instanceof Error ? error.message : String(error));
      });
    }
  }, [accountKey, credentials, isLocalMode, keepRecipesLocal, clearSyncedLocalRecipes]);

  const createRecipe = useCallback(
    async (recipe: Recipe) => {
      const stopLongActionNotice = watchLongAction("longActions.saveRecipe");
      try {
        const saved = await createRecipeInRepository(
          recipe,
          getClient(),
          repositoryOptions
        );
        setRecipes((current) => [...current.filter((item) => item.id !== recipe.id && item.id !== saved.id), saved]);
        void sync();
        return saved;
      } finally {
        stopLongActionNotice();
      }
    },
    [getClient, repositoryOptions, sync, watchLongAction, createRecipeInRepository]
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
        setRecipes((current) => [...current.filter((item) => item.id !== recipe.id && item.id !== saved.id), saved]);
        void sync();
        return saved;
      } finally {
        stopLongActionNotice();
      }
    },
    [getClient, repositoryOptions, sync, watchLongAction, updateRecipeInRepository]
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
        setRecipes((current) => [...current.filter((item) => item.id !== recipe.id && item.id !== saved.id), saved]);
        void sync();
        return saved;
      } finally {
        stopLongActionNotice();
      }
    },
    [getClient, repositoryOptions, sync, watchLongAction, updateRecipeFromSourceInRepository]
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
  }, [updateRecipeLocalPreferences]);

  const deleteRecipe = useCallback(
    async (id: string) => {
      const stopLongActionNotice = watchLongAction("longActions.deleteRecipe");
      try {
        await deleteRecipeInRepository(id, getClient());
        setRecipes((current) => current.filter((recipe) => recipe.id !== id));
        void sync();
      } finally {
        stopLongActionNotice();
      }
    },
    [getClient, sync, watchLongAction, deleteRecipeInRepository]
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
        setRecipes((current) => [...current.filter((item) => item.id !== saved.id), saved]);
        void sync();
        return saved;
      } finally {
        stopLongActionNotice();
      }
    },
    [getClient, recipes, repositoryOptions, sync, watchLongAction, importRecipeInRepository]
  );

  const exportBackup = useCallback(async () => {
    const stopLongActionNotice = watchLongAction("longActions.exportBackup");
    try {
      const result = await exportRecipeBackup(
        {
          client: getClient(),
          customCategories,
          favoriteCategories,
          isLocalMode
        },
        repositoryOptions
      );
      const fileUri = await writeRecipeBackupToPickedDirectory(result.backup);
      return { ...result, fileUri };
    } finally {
      stopLongActionNotice();
    }
  }, [
    exportRecipeBackup,
    customCategories,
    favoriteCategories,
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
      setCustomCategories(await loadCustomCategories(effectiveShowDefaultCategories));
      setFavoriteCategories(await loadFavoriteCategories());
      return result;
    } finally {
      stopLongActionNotice();
    }
  }, [effectiveShowDefaultCategories, getClient, repositoryOptions, watchLongAction, importRecipeBackup]);

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
        setCustomCategories(await loadCustomCategories(effectiveShowDefaultCategories));
        setFavoriteCategories(await loadFavoriteCategories());
        return result;
      } finally {
        stopLongActionNotice();
      }
    },
    [effectiveShowDefaultCategories, getClient, repositoryOptions, watchLongAction, importRecipeBackupFile]
  );

  const findDuplicateGroups = useCallback(() => findDuplicateRecipes(), [findDuplicateRecipes]);

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
    [getClient, watchLongAction, mergeDuplicateRecipes]
  );

  const createCategory = useCallback(async (category: string) => {
    await saveCustomCategory(category);
    const nextCategories = await loadCustomCategories(effectiveShowDefaultCategories);
    setCustomCategories(nextCategories);
    return nextCategories;
  }, [effectiveShowDefaultCategories]);

  const deleteCategory = useCallback(async (category: string) => {
    await deleteCustomCategory(category);
    const nextCategories = await loadCustomCategories(effectiveShowDefaultCategories);
    setCustomCategories(nextCategories);
    return nextCategories;
  }, [effectiveShowDefaultCategories]);

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
        const nextCategories = await loadCustomCategories(effectiveShowDefaultCategories);
        setRecipes(result.recipes);
        setCustomCategories(nextCategories);
        return nextCategories;
      } finally {
        stopLongActionNotice();
      }
    },
    [getClient, recipes, repositoryOptions, watchLongAction, effectiveShowDefaultCategories, renameRecipeCategoryInRepository]
  );

  const toggleFavoriteCategory = useCallback(async (category: string) => {
    const nextFavorites = await toggleFavoriteCategoryInStore(category);
    setFavoriteCategories(nextFavorites);
    return nextFavorites;
  }, []);

  const getRecipe = useCallback(
    (id: string) => recipes.find((recipe) => recipe.id === id),
    [recipes]
  );

  const value = useMemo(
    () => ({
      recipes,
      customCategories,
      favoriteCategories,
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
      renameCategory,
      toggleFavoriteCategory
    }),
    [
      recipes,
      customCategories,
      favoriteCategories,
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
      renameCategory,
      toggleFavoriteCategory
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
