import type { Recipe } from "../recipes/types";
import type { KitchenData, Meal } from "./kitchen";
export type KitchenHistoryEntry = {
  id: string;
  date: string;
  recipeId?: string;
  meal?: Meal;
  recipe?: Recipe;
};
export function kitchenHistory(
  data: KitchenData,
  recipes: Recipe[],
): KitchenHistoryEntry[] {
  const completed = data.meals.filter((meal) => meal.completed);
  const entries: KitchenHistoryEntry[] = completed.map((meal) => ({
    id: `meal:${meal.id}`,
    date: meal.date,
    meal,
    recipeId: !meal.kind || meal.kind === "recipe" ? meal.recipeId : undefined,
    recipe:
      !meal.kind || meal.kind === "recipe"
        ? recipes.find((recipe) => recipe.id === meal.recipeId)
        : undefined,
  }));
  for (const recipe of recipes)
    for (const [index, date] of (
      data.journals[recipe.id ?? ""]?.cooked ?? []
    ).entries()) {
      if (
        completed.some(
          (meal) =>
            (!meal.kind || meal.kind === "recipe") &&
            meal.recipeId === recipe.id &&
            meal.date === date,
        )
      )
        continue;
      entries.push({
        id: `journal:${recipe.id}:${index}`,
        recipeId: recipe.id ?? undefined,
        recipe,
        date,
      });
    }
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}
