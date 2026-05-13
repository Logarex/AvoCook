import AsyncStorage from "@react-native-async-storage/async-storage";

const CUSTOM_CATEGORIES_KEY = "recipes.customCategories";

export async function loadCustomCategories() {
  const stored = await AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY);
  if (!stored) {
    return [];
  }

  const parsed = JSON.parse(stored) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((item): item is string => typeof item === "string")
    .map(normalizeCategoryName)
    .filter(Boolean);
}

export async function saveCustomCategory(category: string) {
  const normalized = normalizeCategoryName(category);
  if (!normalized) {
    return loadCustomCategories();
  }

  const categories = await loadCustomCategories();
  const nextCategories = Array.from(new Set([...categories, normalized])).sort(
    (a, b) => a.localeCompare(b)
  );
  await AsyncStorage.setItem(
    CUSTOM_CATEGORIES_KEY,
    JSON.stringify(nextCategories)
  );
  return nextCategories;
}

export function normalizeCategoryName(category: string) {
  return category.replace(/\s+/g, " ").trim();
}
