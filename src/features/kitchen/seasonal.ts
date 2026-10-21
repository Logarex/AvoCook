import { normalizeFood, parseIngredient } from "./kitchen";
import type { Recipe } from "../recipes/types";
import catalog from "./seasonalCatalog.json";
import { seasonalArea } from "./seasonalAreas";
export const seasonalFoods = catalog.foods;
export type SeasonalFood = (typeof seasonalFoods)[number];
export function foodsInSeason(areaId: string | undefined, month: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12) return [];
  const entries = seasonalArea(areaId)?.entries ?? [];
  return seasonalFoods.flatMap((food) => {
    const entry = entries.find(
      (item) => item.food === food.id && item.months.includes(month),
    );
    return entry
      ? [{ ...food, storage: entry.storageMonths?.includes(month) === true }]
      : [];
  });
}
// Match the longest known ingredient name first (e.g. pomme de terre before pomme).
// Processed/shelf-stable ingredients do not imply buying fresh seasonal produce.
function normalizeSeasonalTerm(value: string) {
  return normalizeFood(value)
    .replace(/[-‐‑–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const aliases = seasonalFoods
  .flatMap((food) =>
    food.names.flatMap((name) =>
      [parseIngredient(name).key, normalizeFood(name)].map((key) => ({
        id: food.id,
        key: normalizeSeasonalTerm(key),
      })),
    ),
  )
  .filter((item) => item.key)
  .sort((a, b) => b.key.length - a.key.length);
const processed =
  /\b(jus|juice|saft|zumo|succo|sauce|salsa|sugo|conserve|canned|tinned|konserve|boite|frozen|surgele\w*|congele\w*|gefroren|congelad\w*|surgelat\w*|frossen|frosne|dried|powder|poudre|pulver|polvere|dose|dosen|seche\w*|getrocknet\w*|essiccat\w*|torret|jam|confiture|marmelad\w*|compote|puree|passata|concentr\w*)\b/;
const freshPrefix =
  /^(?:(?:fresh|frais|fraiche|fraiches|frische|frischer|frisches|fresco|fresca|freschi|frescas|frescos|frisk|friske|red|green|yellow|rouge|rouges|vert|verts|verte|vertes|roja|rojo|gron|rode|organic|bio)\s+)+/;
export function seasonalIngredientId(line: string) {
  const key = normalizeSeasonalTerm(parseIngredient(line).key);
  if (processed.test(key)) return undefined;
  const match = (value: string) =>
    aliases.find(
      (alias) => value === alias.key || value.startsWith(`${alias.key} `),
    )?.id;
  return match(key) ?? match(key.replace(freshPrefix, ""));
}
export function seasonalRecipes(
  recipes: Recipe[],
  areaId: string | undefined,
  month: number,
  selectedIds?: readonly string[],
) {
  const foods = foodsInSeason(areaId, month).filter(
    (food) => !selectedIds?.length || selectedIds.includes(food.id),
  );
  return recipes
    .map((recipe) => {
      const ids = new Set(recipe.recipeIngredient.map(seasonalIngredientId));
      return { recipe, foods: foods.filter((food) => ids.has(food.id)) };
    })
    .filter((result) => result.foods.length)
    .sort(
      (a, b) =>
        b.foods.length - a.foods.length ||
        a.recipe.name.localeCompare(b.recipe.name),
    );
}
