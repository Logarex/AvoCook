import { localDate, mealRecipeId, shiftDate, type KitchenData } from "./kitchen";
import type { Recipe } from "../recipes/types";
import { markdownToPlainText } from "../markdown/markdown";

export type WidgetLabels = {
  title: string;
  noMeal: string;
  expiring: string;
  shopping: string;
  lunch: string;
  dinner: string;
  empty: string;
};

/** Small, privacy-light summary read by the iOS "Today" widget from the App Group. */
export function todayWidgetSnapshot(
  data: KitchenData,
  recipes: Pick<Recipe, "id" | "name">[],
  shoppingRemaining: number,
  labels: WidgetLabels & { simple: string; leftovers: string; out: string },
  now = new Date(),
) {
  const today = localDate(now);
  const names = new Map(recipes.map((recipe) => [recipe.id, markdownToPlainText(recipe.name)]));
  const meals = data.meals
    .filter((meal) => meal.date === today)
    .sort((a, b) => (a.slot === b.slot ? 0 : a.slot === "lunch" ? -1 : 1))
    .map((meal) => {
      const recipeId = mealRecipeId(meal) || null;
      const title =
        meal.title?.trim() ||
        (recipeId ? names.get(recipeId) : undefined) ||
        (meal.kind === "leftovers" ? labels.leftovers : meal.kind === "out" ? labels.out : labels.simple);
      return { slot: meal.slot, title: markdownToPlainText(title).slice(0, 80), recipeId };
    });
  const soon = shiftDate(today, 3);
  const day = (value: string) => new Date(`${value}T12:00:00`).getTime();
  const expiring = data.stock
    .filter((item) => item.expires && item.expires >= today && item.expires <= soon)
    .sort((a, b) => a.expires.localeCompare(b.expires))
    .slice(0, 5)
    .map((item) => ({ name: item.name.slice(0, 40), days: Math.round((day(item.expires) - day(today)) / 86_400_000) }));
  const { simple: _simple, leftovers: _leftovers, out: _out, ...widgetLabels } = labels;
  return { date: today, meals, expiring, shopping: Math.max(0, shoppingRemaining), labels: widgetLabels };
}
