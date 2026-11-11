import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { createRecipeBackup } from "../recipes/recipeBackup";
import { useRecipes } from "../recipes/RecipesProvider";
import {
  autoBackupDue,
  isAutoBackupEnabled,
  loadAutoBackupStatus,
  writeAutoBackup,
} from "./autoBackup";
import type { KitchenData } from "./kitchen";

/** Serialises recipes and My kitchen exactly like a manual export so any version can be restored. */
export async function serializeKitchenBackup(
  recipes: ReturnType<typeof useRecipes>,
  kitchen: KitchenData,
  localImagesOnly = false,
) {
  const result = await createRecipeBackup({
    recipes: recipes.recipes,
    customCategories: recipes.customCategories,
    favoriteCategories: recipes.favoriteCategories,
    source: "local",
    client: null,
    localImagesOnly,
  });
  return { result, serialized: JSON.stringify({ ...result.backup, kitchen }) };
}

export function useAutomaticBackup(account: string, ready: boolean, data: KitchenData) {
  const recipes = useRecipes();
  const [resume, setResume] = useState(0);
  const running = useRef(false);
  const latest = useRef({ recipes, data });
  latest.current = { recipes, data };
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setResume((value) => value + 1);
    });
    return () => subscription.remove();
  }, []);
  const eligible = ready && !recipes.loading && !["loading", "signed-out"].includes(account);
  useEffect(() => {
    if (!eligible || running.current) return;
    let cancelled = false;
    running.current = true;
    void (async () => {
      try {
        if (!(await isAutoBackupEnabled())) return;
        const status = await loadAutoBackupStatus(account);
        if (cancelled || !autoBackupDue(status.lastSuccess)) return;
        const current = latest.current;
        if (!current.recipes.recipes.length && !current.data.meals.length && !current.data.stock.length) return;
        const { serialized } = await serializeKitchenBackup(current.recipes, current.data, true);
        if (!cancelled) await writeAutoBackup(account, serialized);
      } catch (error) {
        console.warn("[AutoBackup] Automatic backup failed", error);
      } finally {
        running.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eligible, account, resume]);
}
