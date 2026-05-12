import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  createRecipe as createRecipeInRepository,
  deleteRecipe as deleteRecipeInRepository,
  importRecipe as importRecipeInRepository,
  initialiseRecipeStore,
  syncRecipes,
  updateRecipe as updateRecipeInRepository
} from "./recipeRepository";
import type { Recipe } from "./types";

type RecipesContextValue = {
  recipes: Recipe[];
  loading: boolean;
  syncing: boolean;
  lastError: string | null;
  getRecipe: (id: string) => Recipe | undefined;
  reloadLocal: () => Promise<void>;
  sync: () => Promise<void>;
  createRecipe: (recipe: Recipe) => Promise<Recipe>;
  updateRecipe: (recipe: Recipe) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
  importRecipe: (url: string) => Promise<Recipe>;
};

const RecipesContext = createContext<RecipesContextValue | undefined>(
  undefined
);

export function RecipesProvider({ children }: { children: React.ReactNode }) {
  const { credentials, getClient } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

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

  const sync = useCallback(async () => {
    const client = getClient();
    if (!client) {
      return;
    }

    setSyncing(true);
    try {
      setRecipes(await syncRecipes(client));
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
      setRecipes(await initialiseRecipeStore());
    } finally {
      setSyncing(false);
    }
  }, [getClient]);

  useEffect(() => {
    if (credentials) {
      void sync();
    }
  }, [credentials, sync]);

  const createRecipe = useCallback(
    async (recipe: Recipe) => {
      const saved = await createRecipeInRepository(recipe, getClient());
      setRecipes(await initialiseRecipeStore());
      return saved;
    },
    [getClient]
  );

  const updateRecipe = useCallback(
    async (recipe: Recipe) => {
      const saved = await updateRecipeInRepository(recipe, getClient());
      setRecipes(await initialiseRecipeStore());
      return saved;
    },
    [getClient]
  );

  const deleteRecipe = useCallback(
    async (id: string) => {
      await deleteRecipeInRepository(id, getClient());
      setRecipes(await initialiseRecipeStore());
    },
    [getClient]
  );

  const importRecipe = useCallback(
    async (url: string) => {
      const saved = await importRecipeInRepository(url, getClient());
      setRecipes(await initialiseRecipeStore());
      return saved;
    },
    [getClient]
  );

  const getRecipe = useCallback(
    (id: string) => recipes.find((recipe) => recipe.id === id),
    [recipes]
  );

  const value = useMemo(
    () => ({
      recipes,
      loading,
      syncing,
      lastError,
      getRecipe,
      reloadLocal,
      sync,
      createRecipe,
      updateRecipe,
      deleteRecipe,
      importRecipe
    }),
    [
      recipes,
      loading,
      syncing,
      lastError,
      getRecipe,
      reloadLocal,
      sync,
      createRecipe,
      updateRecipe,
      deleteRecipe,
      importRecipe
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
