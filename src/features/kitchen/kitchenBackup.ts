import type { Recipe } from "../recipes/types";
import { normalizeRecipe } from "../recipes/types";
import { parseKitchenData, type KitchenData } from "./kitchen";
export function recipeKitchenSignature(recipe: Recipe) {
  return JSON.stringify([
    recipe.name.trim().toLocaleLowerCase(),
    recipe.recipeIngredient,
    recipe.recipeInstructions,
  ]);
}
export function remapKitchenBackup(
  data: KitchenData,
  originalRecipes: Recipe[],
  restoredRecipes: Recipe[],
) {
  const ids = new Map<string, string>();
  for (const recipe of originalRecipes) {
    if (!recipe.id) continue;
    const signature = recipeKitchenSignature(normalizeRecipe(recipe));
    const matches = restoredRecipes.filter(
      (candidate) =>
        recipeKitchenSignature(normalizeRecipe(candidate)) === signature,
    );
    const sameId = matches.find((candidate) => candidate.id === recipe.id);
    const match = sameId ?? (matches.length === 1 ? matches[0] : undefined);
    if (match?.id) ids.set(recipe.id, match.id);
  }
  const unresolved = new Set<string>();
  const resolve = (id: string) => {
    const mapped = ids.get(id);
    if (mapped) return mapped;
    unresolved.add(id);
    return `unresolved:${id}`;
  };
  const journals = Object.fromEntries(
    Object.entries(data.journals).map(([id, journal]) => [
      resolve(id),
      { ...journal, stepTimerStates: undefined },
    ]),
  );
  const meals = data.meals.map((meal) =>
    !meal.kind || meal.kind === "recipe"
      ? { ...meal, recipeId: resolve(meal.recipeId) }
      : meal,
  );
  const menus = data.menus?.map((menu) => ({
    ...menu,
    recipeIds: menu.recipeIds.map(resolve),
  }));
  return {
    data: parseKitchenData({
      ...data,
      meals,
      journals,
      menus,
      remindersEnabled: false,
    }),
    unresolved: unresolved.size,
  };
}
