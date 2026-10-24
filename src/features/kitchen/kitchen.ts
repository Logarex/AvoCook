import { isSeasonalArea, type SeasonalAreaId } from "./seasonalAreas";
import {
  validCookingTimer,
  type CookingTimerSnapshot,
} from "./cookingTimerState";
import type { SavedMenu } from "./menus";
import type { Recipe } from "../recipes/types";
import { markdownToPlainText } from "../markdown/markdown";
import { isoDurationToMinutes } from "../../utils/duration";

export type Meal = {
  linkedRecipeId?: string;
  notes?: string;
  kind?: "recipe" | "simple" | "leftovers" | "out";
  title?: string;
  ingredients?: string[];
  completed?: boolean;
  id: string;
  date: string;
  slot: "lunch" | "dinner";
  recipeId: string;
  servings: number;
};
export const mealRecipeId = (meal: Meal) => !meal.kind || meal.kind === "recipe" ? meal.recipeId : meal.linkedRecipeId ?? "";
export type StockItem = {
  nutrients?: Partial<Record<"energy" | "fat" | "saturatedFat" | "carbohydrates" | "sugars" | "fiber" | "proteins" | "salt", number>>;
  barcode?: string;
  nutriScore?: string;
  greenScore?: string;
  id: string;
  name: string;
  quantity: string;
  location: "fridge" | "cupboard" | "freezer";
  expires: string;
};
export type StepTimer = { id: string; step: number; minutes: number };
export type Diet = "vegetarian" | "vegan" | "glutenFree";
export type Journal = {
  stepTimerStates?: Record<string, CookingTimerSnapshot>;
  diets?: Diet[];
  stepTimers?: StepTimer[];
  rating: number;
  notes: string;
  changes: string;
  difficulty: "" | "easy" | "medium" | "hard";
  cost: string;
  cooked: string[];
};
export type KitchenData = {
  shoppingGroupId?: string;
  dietaryPreference?: Diet | "";
  remindersEnabled?: boolean;
  menus?: SavedMenu[];
  country?: SeasonalAreaId | "other";
  excludedWords?: string;
  version: 1;
  meals: Meal[];
  stock: StockItem[];
  journals: Record<string, Journal>;
};
export const emptyKitchen = (): KitchenData => ({
  version: 1,
  meals: [],
  stock: [],
  journals: {},
});
export const emptyJournal = (): Journal => ({
  rating: 0,
  notes: "",
  changes: "",
  difficulty: "",
  cost: "",
  cooked: [],
});
export function surpriseRecipe(recipes: Recipe[]): Recipe | undefined {
  return recipes[Math.floor(Math.random() * recipes.length)];
}
export const newKitchenId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDate(date) === value;
}
export function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDate(date);
}
export function weekDates(value: string): string[] {
  const date = new Date(`${value}T12:00:00`);
  const monday = shiftDate(value, -((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i));
}
export function normalizeFood(value: string): string {
  return markdownToPlainText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/(\p{L})\((?:s|x)\)(?=\s|$)/gu, "$1")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const aliases: Record<string, string> = {
  oeufs: "oeuf",
  eggs: "egg",
  courgettes: "courgette",
  zucchinis: "zucchini",
  tomates: "tomate",
  tomatoes: "tomato",
  carottes: "carotte",
  carrots: "carrot",
  oignons: "oignon",
  onions: "onion",
  pommes: "pomme",
  apples: "apple",
  citrons: "citron",
  lemons: "lemon",
  poireaux: "poireau",
  leeks: "leek",
  champignons: "champignon",
  mushrooms: "mushroom",
};
const foodNames = [
  [
    "oeuf",
    "oeufs",
    "egg",
    "eggs",
    "ei",
    "eier",
    "huevo",
    "huevos",
    "uovo",
    "uova",
    "æg",
  ],
  ["lait", "milk", "milch", "leche", "latte", "mælk"],
  ["farine", "flour", "mehl", "harina", "farina", "mel"],
  ["beurre", "butter", "mantequilla", "burro", "smør"],
  [
    "courgette",
    "courgettes",
    "zucchini",
    "zucchinis",
    "calabacin",
    "calabacines",
    "zucchina",
    "zucchine",
    "squash",
  ],
  [
    "tomate",
    "tomates",
    "tomato",
    "tomatoes",
    "tomaten",
    "pomodoro",
    "pomodori",
    "tomat",
    "tomater",
  ],
  [
    "oignon",
    "oignons",
    "onion",
    "onions",
    "zwiebel",
    "zwiebeln",
    "cebolla",
    "cebollas",
    "cipolla",
    "cipolle",
    "løg",
  ],
  [
    "carotte",
    "carottes",
    "carrot",
    "carrots",
    "karotte",
    "karotten",
    "zanahoria",
    "zanahorias",
    "carota",
    "carote",
    "gulerod",
    "gulerødder",
  ],
  [
    "pomme de terre",
    "pommes de terre",
    "potato",
    "potatoes",
    "kartoffel",
    "kartoffeln",
    "patata",
    "patatas",
    "patate",
    "kartoffel",
    "kartofler",
  ],
  ["riz", "rice", "reis", "arroz", "riso", "ris"],
  ["pates", "pasta", "nudeln"],
  ["fromage", "cheese", "kase", "queso", "formaggio", "ost"],
  ["ail", "garlic", "knoblauch", "ajo", "aglio", "hvidløg"],
  ["sel", "salt", "salz", "sal", "sale"],
  ["sucre", "sugar", "zucker", "azucar", "zucchero", "sukker"],
];
for (const names of foodNames)
  for (const name of names) aliases[normalizeFood(name)] = names[0];
const units: Record<string, { unit: string; factor: number }> = {
  g: { unit: "g", factor: 1 },
  gramme: { unit: "g", factor: 1 },
  grammes: { unit: "g", factor: 1 },
  grams: { unit: "g", factor: 1 },
  kg: { unit: "g", factor: 1000 },
  mg: { unit: "g", factor: 0.001 },
  ml: { unit: "ml", factor: 1 },
  cl: { unit: "ml", factor: 10 },
  dl: { unit: "ml", factor: 100 },
  l: { unit: "ml", factor: 1000 },
};
const fractions: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
};
export type Ingredient = {
  name: string;
  key: string;
  amount: number | null;
  unit: string;
  original: string;
};
export function parseIngredient(line: string): Ingredient {
  const original = markdownToPlainText(line).trim();
  const match = original.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?[¼½¾⅓⅔⅛]?|[¼½¾⅓⅔⅛])\s*(.*)$/,
  );
  let name = original,
    amount: number | null = null,
    unit = "";
  if (
    match &&
    !/^[\d/.,–—-]/.test(match[2]) &&
    !/^(?:(?:a|à|to|bis|hasta|til|ou|or)\s+\d|[x×]\s*\d)/i.test(match[2]) &&
    !/^[1-9]\d*[.,]\d{3}$/.test(match[1])
  ) {
    const raw = match[1];
    if (raw.includes("/")) {
      const parts = raw.split(/\s+/),
        fraction = parts.pop()!.split("/").map(Number);
      amount = fraction[1]
        ? (parts.length ? Number(parts[0]) : 0) + fraction[0] / fraction[1]
        : null;
    } else {
      const last = raw.slice(-1);
      amount = fractions[last]
        ? Number(raw.slice(0, -1) || 0) + fractions[last]
        : Number(raw.replace(",", "."));
    }
    name = match[2];
    const unitMatch = name.match(/^([a-zA-Z]+)\.?\s+(.*)$/);
    const known = unitMatch && units[unitMatch[1].toLowerCase()];
    if (known) {
      amount = amount === null ? null : amount * known.factor;
      unit = known.unit;
      name = unitMatch![2].replace(/^(?:de\s+|d['’]|of\s+)/i, "");
    }
    if (
      !known &&
      /^(?:cups?|tbsp|tsp|cuill[eè]res?|c\.|pinc[eé]es?|bo[iî]tes?|sachets?|oz|lbs?)\b/i.test(
        name,
      )
    ) {
      name = original;
      amount = null;
    }
  }
  if (
    !name.trim() ||
    (amount !== null && (!Number.isFinite(amount) || amount <= 0))
  ) {
    name = original;
    amount = null;
    unit = "";
  }
  const normalized = normalizeFood(name);
  return {
    name: name.trim(),
    key: aliases[normalized] ?? normalized,
    amount,
    unit,
    original,
  };
}
const formatAmount = (amount: number) => String(Number(amount.toFixed(3)));
export function consolidateIngredients(
  lines: { line: string; factor?: number }[],
): string[] {
  const groups = new Map<
    string,
    { ingredient: Ingredient; total: number; count: number }
  >();
  for (const { line, factor = 1 } of lines) {
    if (!line.trim()) continue;
    const ingredient = parseIngredient(line);
    const safeFactor = Number.isFinite(factor) && factor > 0 ? factor : 1;
    const key =
      ingredient.amount === null
        ? `opaque:${normalizeFood(line)}`
        : `${ingredient.key}:${ingredient.unit}`;
    const groupKey = ingredient.amount === null ? `${key}:${safeFactor}` : key;
    if (ingredient.amount === null && safeFactor !== 1)
      ingredient.original = `${formatAmount(safeFactor)} × (${ingredient.original})`;
    const existing = groups.get(groupKey);
    if (existing) {
      existing.total += (ingredient.amount ?? 0) * safeFactor;
      existing.count += 1;
    } else
      groups.set(groupKey, {
        ingredient,
        total: (ingredient.amount ?? 0) * safeFactor,
        count: 1,
      });
  }
  return [...groups.values()].map(({ ingredient, total, count }) =>
    ingredient.amount === null
      ? `${ingredient.original}${count > 1 ? ` (×${count})` : ""}`
      : `${formatAmount(total)}${ingredient.unit ? ` ${ingredient.unit}` : ""} ${ingredient.name}`,
  );
}
export function sharedBatchIngredients(recipes: Recipe[]) {
  const groups = new Map<
    string,
    { name: string; recipeIds: Set<string>; lines: { line: string }[] }
  >();
  for (const recipe of recipes)
    for (const line of recipe.recipeIngredient) {
      const ingredient = parseIngredient(line);
      const group = groups.get(ingredient.key) ?? {
        name: ingredient.name,
        recipeIds: new Set<string>(),
        lines: [],
      };
      group.recipeIds.add(recipe.id ?? recipe.name);
      group.lines.push({ line });
      groups.set(ingredient.key, group);
    }
  return [...groups.values()]
    .filter((group) => group.recipeIds.size > 1)
    .map((group) => ({
      name: group.name,
      ingredients: consolidateIngredients(group.lines),
      recipes: group.recipeIds.size,
    }));
}
export function mealIngredients(meals: Meal[], recipes: Recipe[]): string[] {
  return consolidateIngredients(
    meals.flatMap((meal) => {
      if (meal.kind === "out" || meal.kind === "leftovers") return [];
      if (meal.kind === "simple")
        return (meal.ingredients ?? []).map((line) => ({ line, factor: 1 }));
      const recipe = recipes.find((recipe) => recipe.id === meal.recipeId);
      return recipe
        ? recipe.recipeIngredient.map((line) => ({
            line,
            factor: meal.servings / (recipe.recipeYield || 1),
          }))
        : [];
    }),
  );
}
export function rankRecipes(
  recipes: Recipe[],
  stock: StockItem[],
  today: string,
) {
  const available = stock.filter(
    (item) => !item.expires || item.expires >= today,
  );
  const keys = new Set(available.map((item) => parseIngredient(item.name).key));
  const urgent = new Set(
    available
      .filter((item) => item.expires && item.expires <= shiftDate(today, 3))
      .map((item) => parseIngredient(item.name).key),
  );
  return recipes
    .filter((recipe) => recipe.recipeIngredient.length)
    .map((recipe) => {
      const ingredients = recipe.recipeIngredient.filter((line) => line.trim());
      const missing = ingredients.filter(
        (line) => !keys.has(parseIngredient(line).key),
      );
      const matched = ingredients.length - missing.length;
      const expiring = new Set(
        ingredients
          .map((line) => parseIngredient(line).key)
          .filter((key) => urgent.has(key)),
      ).size;
      return { recipe, missing, matched, expiring };
    })
    .sort(
      (a, b) =>
        a.missing.length - b.missing.length ||
        b.expiring - a.expiring ||
        b.matched - a.matched ||
        a.recipe.name.localeCompare(b.recipe.name),
    );
}
export function matchesDietPreference(
  recipeId: string | null,
  data: KitchenData,
) {
  if (!data.dietaryPreference) return true;
  const diets = data.journals[recipeId ?? ""]?.diets ?? [];
  return (
    diets.includes(data.dietaryPreference) ||
    (data.dietaryPreference === "vegetarian" && diets.includes("vegan"))
  );
}
export function matchesFoodPreferences(recipe: Recipe, excludedWords = "") {
  const ingredients = normalizeFood(recipe.recipeIngredient.join(" "));
  return !excludedWords
    .split(",")
    .map(normalizeFood)
    .filter(Boolean)
    .some((word) => ingredients.includes(word));
}
export function recipeMinutes(recipe: Recipe): number | null {
  return (
    isoDurationToMinutes(recipe.totalTime) ??
    (isoDurationToMinutes(recipe.prepTime) ||
    isoDurationToMinutes(recipe.cookTime)
      ? (isoDurationToMinutes(recipe.prepTime) ?? 0) +
        (isoDurationToMinutes(recipe.cookTime) ?? 0)
      : null)
  );
}
export function convertKitchen(
  value: number,
  from: string,
  to: string,
): number | null {
  if (!Number.isFinite(value)) return null;
  if (from === to) return value;
  if (from === "°C" && to === "°F") return (value * 9) / 5 + 32;
  if (from === "°F" && to === "°C") return ((value - 32) * 5) / 9;
  const conversions: Record<string, { unit: string; factor: number }> = {
    ...units,
    tsp: { unit: "ml", factor: 5 },
    tbsp: { unit: "ml", factor: 15 },
  };
  const left = conversions[from],
    right = conversions[to];
  return value >= 0 && left && right && left.unit === right.unit
    ? (value * left.factor) / right.factor
    : null;
}
export function parseKitchenData(value: unknown): KitchenData {
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1
  )
    throw new Error("Invalid kitchen data");
  const raw = value as KitchenData;
  if (
    !Array.isArray(raw.meals) ||
    !Array.isArray(raw.stock) ||
    !raw.journals ||
    typeof raw.journals !== "object" ||
    Array.isArray(raw.journals)
  )
    throw new Error("Invalid kitchen data");
  if (
    raw.shoppingGroupId !== undefined &&
    typeof raw.shoppingGroupId !== "string"
  )
    throw new Error("Invalid shopping group");
  if (
    raw.dietaryPreference !== undefined &&
    !["", "vegetarian", "vegan", "glutenFree"].includes(raw.dietaryPreference)
  )
    throw new Error("Invalid dietary preference");
  if (
    raw.remindersEnabled !== undefined &&
    typeof raw.remindersEnabled !== "boolean"
  )
    throw new Error("Invalid reminders preference");
  if (
    (raw.country !== undefined &&
      raw.country !== "other" &&
      !isSeasonalArea(raw.country)) ||
    (raw.excludedWords !== undefined && typeof raw.excludedWords !== "string")
  )
    throw new Error("Invalid kitchen preferences");
  if (
    raw.menus !== undefined &&
    (!Array.isArray(raw.menus) ||
      !raw.menus.every(
        (menu) =>
          menu &&
          typeof menu.id === "string" &&
          typeof menu.title === "string" &&
          Array.isArray(menu.recipeIds) &&
          menu.recipeIds.every((id) => typeof id === "string"),
      ))
  )
    throw new Error("Invalid menus");
  if (
    new Set(raw.meals.map((meal) => meal?.id)).size !== raw.meals.length ||
    new Set(raw.stock.map((item) => item?.id)).size !== raw.stock.length
  )
    throw new Error("Duplicate kitchen record IDs");
  const text = (x: unknown): x is string => typeof x === "string";
  if (
    !raw.meals.every(
      (m) =>
        m &&
        text(m.id) &&
        text(m.recipeId) &&
        validDate(m.date) &&
        ["lunch", "dinner"].includes(m.slot) &&
        Number.isInteger(m.servings) &&
        m.servings > 0 &&
        m.servings <= 1000 &&
        (m.kind === undefined ||
          ["recipe", "simple", "leftovers", "out"].includes(m.kind)) &&
        (m.title === undefined || text(m.title)) &&
        (m.notes === undefined || text(m.notes)) &&
        (m.linkedRecipeId === undefined || text(m.linkedRecipeId)) &&
        (m.ingredients === undefined ||
          (Array.isArray(m.ingredients) && m.ingredients.every(text))) &&
        (m.completed === undefined || typeof m.completed === "boolean"),
    ) ||
    !raw.stock.every(
      (s) =>
        s &&
        text(s.id) &&
        text(s.name) &&
        s.name.trim() &&
        text(s.quantity) &&
        ["fridge", "cupboard", "freezer"].includes(s.location) &&
        (s.barcode === undefined || (text(s.barcode) && /^\d{8,14}$/.test(s.barcode))) &&
        (s.nutriScore === undefined || (text(s.nutriScore) && /^[A-E]$/.test(s.nutriScore))) &&
        (s.greenScore === undefined || (text(s.greenScore) && /^[A-E]$/.test(s.greenScore))) &&
        (s.nutrients === undefined || (s.nutrients !== null && typeof s.nutrients === "object" && !Array.isArray(s.nutrients) && Object.entries(s.nutrients).every(([key, value]) => ["energy", "fat", "saturatedFat", "carbohydrates", "sugars", "fiber", "proteins", "salt"].includes(key) && typeof value === "number" && Number.isFinite(value) && value >= 0))) &&
        text(s.expires) &&
        (!s.expires || validDate(s.expires)),
    ) ||
    !Object.values(raw.journals).every(
      (j) =>
        j &&
        Number.isInteger(j.rating) &&
        j.rating >= 0 &&
        j.rating <= 5 &&
        text(j.notes) &&
        text(j.changes) &&
        text(j.cost) &&
        (j.stepTimerStates === undefined ||
          (j.stepTimerStates !== null &&
            typeof j.stepTimerStates === "object" &&
            !Array.isArray(j.stepTimerStates) &&
            Object.entries(j.stepTimerStates).every(
              ([key, timer]) =>
                /^step-\d+$/.test(key) && validCookingTimer(timer),
            ))) &&
        (j.diets === undefined ||
          (Array.isArray(j.diets) &&
            j.diets.every((diet) =>
              ["vegetarian", "vegan", "glutenFree"].includes(diet),
            ))) &&
        ["", "easy", "medium", "hard"].includes(j.difficulty) &&
        Array.isArray(j.cooked) &&
        j.cooked.every(validDate) &&
        (j.stepTimers === undefined ||
          (Array.isArray(j.stepTimers) &&
            j.stepTimers.every(
              (timer) =>
                timer &&
                /^step-\d+$/.test(timer.id) &&
                Number.isInteger(timer.step) &&
                timer.step >= 0 &&
                timer.id === `step-${timer.step}` &&
                Number.isInteger(timer.minutes) &&
                timer.minutes > 0 &&
                timer.minutes <= 1440,
            ))),
    )
  )
    throw new Error("Invalid kitchen data");
  return {
    version: 1,
    ...(raw.shoppingGroupId ? { shoppingGroupId: raw.shoppingGroupId } : {}),
    ...(raw.dietaryPreference !== undefined
      ? { dietaryPreference: raw.dietaryPreference }
      : {}),
    ...(raw.remindersEnabled !== undefined
      ? { remindersEnabled: raw.remindersEnabled }
      : {}),
    ...(raw.menus ? { menus: raw.menus } : {}),
    ...(raw.country ? { country: raw.country } : {}),
    ...(raw.excludedWords !== undefined
      ? { excludedWords: raw.excludedWords }
      : {}),
    meals: raw.meals,
    stock: raw.stock,
    journals: Object.fromEntries(Object.entries(raw.journals)),
  };
}
