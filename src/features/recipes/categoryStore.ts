import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_RECIPE_CATEGORIES } from "./categories";

const CUSTOM_CATEGORIES_KEY = "recipes.customCategories";

export async function loadCustomCategories() {
  const stored = await AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY);
  if (!stored) {
    return sortCategories(DEFAULT_RECIPE_CATEGORIES);
  }

  const parsed = JSON.parse(stored) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }

  const storedCategories = parsed
    .filter((item): item is string => typeof item === "string")
    .map(normalizeCategoryName)
    .filter(Boolean);

  return sortCategories([...DEFAULT_RECIPE_CATEGORIES, ...storedCategories]);
}

export async function saveCustomCategory(category: string) {
  const normalized = normalizeCategoryName(category);
  if (!normalized) {
    return loadCustomCategories();
  }

  const categories = await loadCustomCategories();
  const customCategories = categories.filter(
    (categoryName) => !DEFAULT_RECIPE_CATEGORIES.includes(categoryName)
  );
  const nextCategories = sortCategories([
    ...DEFAULT_RECIPE_CATEGORIES,
    ...customCategories,
    normalized
  ]);
  await AsyncStorage.setItem(
    CUSTOM_CATEGORIES_KEY,
    JSON.stringify(
      nextCategories.filter(
        (categoryName) => !DEFAULT_RECIPE_CATEGORIES.includes(categoryName)
      )
    )
  );
  return nextCategories;
}

export function normalizeCategoryName(category: string) {
  return category.replace(/\s+/g, " ").trim();
}

function sortCategories(categories: string[]) {
  return Array.from(new Set(categories.map(normalizeCategoryName).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
}
