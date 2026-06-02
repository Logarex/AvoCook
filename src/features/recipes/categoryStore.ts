import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_RECIPE_CATEGORIES,
  isDefaultRecipeCategory
} from "./categories";

const CUSTOM_CATEGORIES_KEY = "recipes.customCategories";
const HIDDEN_DEFAULT_CATEGORIES_KEY = "recipes.hiddenDefaultCategories";

export async function loadCustomCategories() {
  const hiddenDefaults = new Set(await loadHiddenDefaultCategories());
  const storedCategories = await loadStoredCustomCategories();

  return sortCategories([
    ...DEFAULT_RECIPE_CATEGORIES.filter(
      (category) => !hiddenDefaults.has(category)
    ),
    ...storedCategories
  ]);
}

export async function saveCustomCategory(category: string) {
  const normalized = normalizeCategoryName(category);
  if (!normalized) {
    return loadCustomCategories();
  }

  const customCategories = await loadStoredCustomCategories();

  if (isDefaultRecipeCategory(normalized)) {
    await saveHiddenDefaultCategories(
      (await loadHiddenDefaultCategories()).filter(
        (categoryName) => categoryName !== normalized
      )
    );
    return loadCustomCategories();
  }

  const nextCategories = sortCategories([
    ...customCategories,
    normalized
  ]);
  await saveStoredCustomCategories(nextCategories);
  return loadCustomCategories();
}

export async function deleteCustomCategory(category: string) {
  const normalized = normalizeCategoryName(category);
  if (!normalized) {
    return loadCustomCategories();
  }

  if (isDefaultRecipeCategory(normalized)) {
    await saveHiddenDefaultCategories([
      ...(await loadHiddenDefaultCategories()),
      normalized
    ]);
    return loadCustomCategories();
  }

  await saveStoredCustomCategories(
    (await loadStoredCustomCategories()).filter(
      (categoryName) => categoryName !== normalized
    )
  );
  return loadCustomCategories();
}

export async function saveCustomCategories(categories: string[]) {
  const storedCategories = await loadStoredCustomCategories();
  const hiddenDefaults = await loadHiddenDefaultCategories();
  const importedCategories = categories
    .filter((item): item is string => typeof item === "string")
    .map(normalizeCategoryName)
    .filter(Boolean);
  const importedDefaultSet = new Set(
    importedCategories.filter(isDefaultRecipeCategory)
  );
  const importedCustomCategories = importedCategories.filter(
    (categoryName) => !isDefaultRecipeCategory(categoryName)
  );

  await saveHiddenDefaultCategories(
    hiddenDefaults.filter((categoryName) => !importedDefaultSet.has(categoryName))
  );
  await saveStoredCustomCategories([
    ...storedCategories,
    ...importedCustomCategories
  ]);

  return loadCustomCategories();
}

export function normalizeCategoryName(category: string) {
  return category.replace(/\s+/g, " ").trim();
}

function sortCategories(categories: string[]) {
  return Array.from(new Set(categories.map(normalizeCategoryName).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
}

async function loadStoredCustomCategories() {
  return parseStoredCategories(await AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY))
    .filter((categoryName) => !isDefaultRecipeCategory(categoryName));
}

async function saveStoredCustomCategories(categories: string[]) {
  await AsyncStorage.setItem(
    CUSTOM_CATEGORIES_KEY,
    JSON.stringify(sortCategories(categories))
  );
}

async function loadHiddenDefaultCategories() {
  return parseStoredCategories(
    await AsyncStorage.getItem(HIDDEN_DEFAULT_CATEGORIES_KEY)
  ).filter(isDefaultRecipeCategory);
}

async function saveHiddenDefaultCategories(categories: string[]) {
  await AsyncStorage.setItem(
    HIDDEN_DEFAULT_CATEGORIES_KEY,
    JSON.stringify(sortCategories(categories.filter(isDefaultRecipeCategory)))
  );
}

function parseStoredCategories(stored: string | null) {
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
