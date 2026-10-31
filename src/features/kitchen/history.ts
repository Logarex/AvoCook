import type { Recipe } from "../recipes/types";
import { isMealCompleted, localDate, mealRecipeId, normalizeFood, validDate, type KitchenData, type Meal } from "./kitchen";
export type KitchenHistoryEntry = {
  id: string;
  date: string;
  recipeId?: string;
  meal?: Meal;
  recipe?: Recipe;
};

export function parseHistorySearch(query: string) {
  let text = query;
  let date: string | undefined;
  const match = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})\b/);
  if (match) {
    date = match[1] ? `${match[1]}-${match[2]}-${match[3]}` : `${match[6]}-${match[5].padStart(2, "0")}-${match[4].padStart(2, "0")}`;
    text = text.replace(match[0], " ");
  }
  const words = normalizeFood(text).replace(/[.,:;!?]/g, " ").split(/\s+/);
  const lunch = ["dejeuner", "midi", "lunch", "mittagessen", "mittag", "almuerzo", "comida", "pranzo", "frokost"];
  const dinner = ["diner", "soir", "dinner", "abendessen", "abend", "cena", "aftensmad"];
  const slots = new Set<Meal["slot"]>();
  for (const word of words) {
    if (lunch.includes(word)) slots.add("lunch");
    if (dinner.includes(word)) slots.add("dinner");
  }
  const ignored = date || slots.size ? new Set([...lunch, ...dinner, "du", "le", "la", "de", "des", "au", "on", "the", "of", "for", "am", "vom", "den", "el", "del", "il", "di"]) : new Set<string>();
  return { date, slots: [...slots], text: words.filter((word) => word && !ignored.has(word)).join(" "), invalidDate: Boolean(date && !validDate(date)) };
}

export function filterKitchenHistory(entries: KitchenHistoryEntry[], query: string, date = "", slot: Meal["slot"] | "all" = "all") {
  const search = parseHistorySearch(query);
  return entries.filter((entry) => !search.invalidDate &&
    (!date || entry.date === date) && (!search.date || entry.date === search.date) &&
    (slot === "all" || entry.meal?.slot === slot) &&
    (!search.slots.length || (entry.meal && search.slots.includes(entry.meal.slot))) &&
    normalizeFood(`${entry.meal?.title ?? ""} ${entry.recipe?.name ?? ""} ${entry.meal?.notes ?? ""}`).includes(search.text));
}
export function kitchenHistory(
  data: KitchenData,
  recipes: Recipe[],
  today = localDate(),
): KitchenHistoryEntry[] {
  const completed = data.meals.filter((meal) => isMealCompleted(meal, today)).map((meal) => meal.completed ? meal : { ...meal, completed: true });
  const entries: KitchenHistoryEntry[] = completed.map((meal) => ({
    id: `meal:${meal.id}`,
    date: meal.date,
    meal,
    recipeId: mealRecipeId(meal) || undefined,
    recipe: recipes.find((recipe) => recipe.id === mealRecipeId(meal)),
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
