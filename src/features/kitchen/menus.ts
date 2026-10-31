import type { Recipe } from "../recipes/types";
import { normalizeFood } from "./kitchen";
export type SavedMenu = { id: string; title: string; recipeIds: string[] };
const courses = [
  [
    "entree",
    "entrees",
    "starter",
    "starters",
    "appetizer",
    "appetizers",
    "vorspeise",
    "entrante",
    "antipasto",
    "forret",
  ],
  [
    "plat",
    "plats",
    "plat principal",
    "main",
    "main course",
    "hauptgericht",
    "plato principal",
    "secondo",
    "hovedret",
  ],
  ["dessert", "desserts", "postre", "dolce", "nachspeise"],
];
export function suggestMenu(
  recipes: Recipe[],
  occasion: "christmas" | "birthday" | "friends",
) {
  const words =
    occasion === "christmas"
      ? ["noel", "christmas", "weihnachten", "navidad", "natale", "jul"]
      : occasion === "birthday"
        ? [
            "anniversaire",
            "birthday",
            "geburtstag",
            "cumpleanos",
            "compleanno",
            "fodselsdag",
          ]
        : [];
  const selected: Recipe[] = [];
  const ranked = [...recipes].sort((a, b) => {
    const matches = (recipe: Recipe) =>
      words.some((word) =>
        normalizeFood(`${recipe.name} ${recipe.keywords}`).includes(word),
      );
    return (
      Number(matches(b)) - Number(matches(a)) || a.name.localeCompare(b.name)
    );
  });
  for (const categories of courses) {
    const match = ranked.find(
      (recipe) =>
        !selected.includes(recipe) &&
        categories.includes(normalizeFood(recipe.recipeCategory)),
    );
    if (match) selected.push(match);
  }
  return selected
    .map((recipe) => recipe.id)
    .filter((id): id is string => Boolean(id));
}
