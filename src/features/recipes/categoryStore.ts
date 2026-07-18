import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_RECIPE_CATEGORIES, isDefaultRecipeCategory } from "./categories";

const CUSTOM_CATEGORIES_KEY = "recipes.customCategories";
const HIDDEN_DEFAULT_CATEGORIES_KEY = "recipes.hiddenDefaultCategories";
const CATEGORY_RENAMES_KEY = "recipes.categoryRenames";

export type CategoryRename = {
  from: string;
  to: string;
};

export async function loadCustomCategories(showDefaults: boolean = true) {
  const storedCategories = await loadStoredCustomCategories();
  const hiddenDefaults = await loadHiddenDefaultCategories();

  const allCategories = [
    ...(showDefaults ? DEFAULT_RECIPE_CATEGORIES.filter((cat) => !hiddenDefaults.includes(cat)) : []),
    ...storedCategories
  ];

  return sortCategories(allCategories);
}

export async function saveCustomCategory(category: string) {
  const normalized = normalizeCategoryName(category);
  if (!normalized) {
    return loadCustomCategories();
  }

  if (isDefaultRecipeCategory(category)) {
    const hidden = await loadHiddenDefaultCategories();
    if (hidden.includes(normalized)) {
      await saveHiddenDefaultCategories(hidden.filter((h) => h !== normalized));
    }
  } else {
    const customCategories = await loadStoredCustomCategories();
    const nextCategories = sortCategories([...customCategories, normalized]);
    await saveStoredCustomCategories(nextCategories);
  }
  return loadCustomCategories();
}

export async function deleteCustomCategory(category: string) {
  const normalized = normalizeCategoryName(category);
  if (!normalized) {
    return loadCustomCategories();
  }

  if (isDefaultRecipeCategory(category)) {
    const hidden = await loadHiddenDefaultCategories();
    if (!hidden.includes(normalized)) {
      await saveHiddenDefaultCategories([...hidden, normalized]);
    }
  } else {
    await saveStoredCustomCategories(
      (await loadStoredCustomCategories()).filter(
        (categoryName) => categoryName !== normalized
      )
    );
  }
  return loadCustomCategories();
}

export async function renameCustomCategory(
  category: string,
  nextCategory: string
) {
  const normalized = normalizeCategoryName(category);
  const nextNormalized = normalizeCategoryName(nextCategory);
  if (!normalized || !nextNormalized || normalized === nextNormalized) {
    return loadCustomCategories();
  }

  if (isDefaultRecipeCategory(category)) {
    const hidden = await loadHiddenDefaultCategories();
    if (!hidden.includes(normalized)) {
      await saveHiddenDefaultCategories([...hidden, normalized]);
    }
  } else {
    const customCategories = await loadStoredCustomCategories();
    const nextCustomCategories = customCategories.filter(
      (categoryName) => categoryName !== normalized
    );
    await saveStoredCustomCategories(nextCustomCategories);
  }

  if (isDefaultRecipeCategory(nextCategory)) {
    const hidden = await loadHiddenDefaultCategories();
    if (hidden.includes(nextNormalized)) {
      await saveHiddenDefaultCategories(hidden.filter((h) => h !== nextNormalized));
    }
  } else {
    const customCategories = await loadStoredCustomCategories();
    customCategories.push(nextNormalized);
    await saveStoredCustomCategories(customCategories);
  }

  return loadCustomCategories();
}

export async function recordCategoryRename(
  category: string,
  nextCategory: string
) {
  const normalized = normalizeCategoryName(category);
  const nextNormalized = normalizeCategoryName(nextCategory);
  if (!normalized || !nextNormalized || normalized === nextNormalized) {
    return loadCategoryRenames();
  }

  const existingRenames = await loadCategoryRenames();
  const destination = resolveCategoryRename(nextNormalized, existingRenames);
  const nextRenames = compactCategoryRenames([
    ...existingRenames
      .filter((rename) => rename.from !== normalized)
      .filter((rename) => rename.from !== destination)
      .map((rename) => ({
        from: rename.from,
        to: rename.to === normalized ? destination : rename.to
      })),
    { from: normalized, to: destination }
  ]);

  await saveCategoryRenames(nextRenames);
  return nextRenames;
}

export async function loadCategoryRenames() {
  const renames = parseStoredCategoryRenames(
    await AsyncStorage.getItem(CATEGORY_RENAMES_KEY)
  );
  return compactCategoryRenames(renames);
}

export async function clearCategoryRenames(categories: string[]) {
  const normalizedCategories = new Set(
    categories.map(normalizeCategoryName).filter(Boolean)
  );
  if (!normalizedCategories.size) {
    return loadCategoryRenames();
  }

  const nextRenames = (await loadCategoryRenames()).filter(
    (rename) => !normalizedCategories.has(rename.from)
  );
  await saveCategoryRenames(nextRenames);
  return nextRenames;
}

export function resolveCategoryRename(
  category: string,
  renames: CategoryRename[]
) {
  let current = normalizeCategoryName(category);
  const visited = new Set<string>();

  while (current && !visited.has(current)) {
    visited.add(current);
    const rename = renames.find((item) => item.from === current);
    if (!rename) {
      return current;
    }
    current = rename.to;
  }

  return current;
}

export async function saveCustomCategories(categories: string[]) {
  const storedCategories = await loadStoredCustomCategories();
  const importedCategories = categories
    .filter((item): item is string => typeof item === "string")
    .map(normalizeCategoryName)
    .filter(Boolean);

  await saveStoredCustomCategories([
    ...storedCategories,
    ...importedCategories
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
  return parseStoredCategories(await AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY));
}

async function saveStoredCustomCategories(categories: string[]) {
  await AsyncStorage.setItem(
    CUSTOM_CATEGORIES_KEY,
    JSON.stringify(sortCategories(categories))
  );
}

async function loadHiddenDefaultCategories() {
  return parseStoredCategories(await AsyncStorage.getItem(HIDDEN_DEFAULT_CATEGORIES_KEY));
}

async function saveHiddenDefaultCategories(categories: string[]) {
  await AsyncStorage.setItem(
    HIDDEN_DEFAULT_CATEGORIES_KEY,
    JSON.stringify(sortCategories(categories))
  );
}async function saveCategoryRenames(renames: CategoryRename[]) {
  await AsyncStorage.setItem(
    CATEGORY_RENAMES_KEY,
    JSON.stringify(compactCategoryRenames(renames))
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

function parseStoredCategoryRenames(stored: string | null) {
  if (!stored) {
    return [];
  }

  const parsed = JSON.parse(stored) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const rename = item as Partial<CategoryRename>;
      const from = normalizeCategoryName(rename.from ?? "");
      const to = normalizeCategoryName(rename.to ?? "");
      return from && to && from !== to ? { from, to } : null;
    })
    .filter((item): item is CategoryRename => Boolean(item));
}

function compactCategoryRenames(renames: CategoryRename[]) {
  const renamesBySource = new Map<string, string>();

  for (const rename of renames) {
    const from = normalizeCategoryName(rename.from);
    const to = normalizeCategoryName(rename.to);
    if (from && to && from !== to) {
      renamesBySource.set(from, to);
    }
  }

  const compacted = Array.from(renamesBySource.entries())
    .map(([from, to]) => ({
      from,
      to: resolveCategoryRename(
        to,
        Array.from(renamesBySource.entries()).map(([source, target]) => ({
          from: source,
          to: target
        }))
      )
    }))
    .filter((rename) => rename.from !== rename.to);

  return Array.from(
    new Map(compacted.map((rename) => [rename.from, rename])).values()
  ).sort((a, b) => a.from.localeCompare(b.from));
}
