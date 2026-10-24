import {
  localDate,
  newKitchenId,
  normalizeFood,
  parseIngredient,
  shiftDate,
  type Meal,
  type StockItem,
} from "./kitchen";

export function reusableMeals(meals: Meal[], limit = 4): Meal[] {
  const seen = new Set<string>();
  return [...meals]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((meal) => {
      if (meal.kind !== "simple" || !meal.title?.trim()) return false;
      const key = normalizeFood(meal.title);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function upcomingMeals(meals: Meal[], today = localDate()): Meal[] {
  return meals.filter((meal) => meal.date >= today && !meal.completed);
}

export function repeatMeal(
  source: Meal,
  date = localDate(),
  slot: Meal["slot"] = "dinner",
): Meal {
  return {
    ...source,
    id: newKitchenId(),
    date,
    slot,
    completed: false,
    notes: undefined,
    ingredients: source.ingredients ? [...source.ingredients] : undefined,
  };
}

export function urgentStock(
  stock: StockItem[],
  today = localDate(),
): StockItem[] {
  return stock
    .filter(
      (item) =>
        item.expires &&
        item.expires >= today &&
        item.expires <= shiftDate(today, 3),
    )
    .sort((a, b) => a.expires.localeCompare(b.expires));
}

export function stockedShoppingIndices(
  lines: string[],
  stock: StockItem[],
  today = localDate(),
): number[] {
  const keys = new Set(
    stock
      .filter((item) => !item.expires || item.expires >= today)
      .map((item) => parseIngredient(item.name).key),
  );
  return lines.flatMap((line, index) =>
    keys.has(parseIngredient(line).key) ? [index] : [],
  );
}

export const simpleMealIdeas = [
  { id: "omelette", ingredients: ["eggs", "cheese"], vegan: false },
  { id: "tomatoPasta", ingredients: ["pasta", "tomatoes"], vegan: true },
  {
    id: "riceBowl",
    ingredients: ["rice", "vegetables", "chickpeas"],
    vegan: true,
  },
  {
    id: "sandwich",
    ingredients: ["bread", "cheese", "tomatoes"],
    vegan: false,
  },
  {
    id: "chickpeaSalad",
    ingredients: ["chickpeas", "tomatoes", "cucumber"],
    vegan: true,
  },
] as const;
