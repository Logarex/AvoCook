import { normalizeRecipe, type Recipe, type RecipeLocalTimer } from "./types";
import {
  getExternalRecipeImageSource,
  getLocalRecipeImage,
  getRemoteRecipeImage,
  hasExternalRecipeImageSource
} from "./recipeImageReferences";

export type RecipeImportDecision = {
  action: "create" | "update" | "skip";
  reason: "new" | "id" | "url" | "signature" | "exact" | "name-conflict";
  recipe: Recipe;
  existingRecipe?: Recipe;
  renamed: boolean;
};

export type RecipeDuplicateReason = "url" | "signature" | "name";

export type RecipeDuplicateGroup = {
  id: string;
  reason: RecipeDuplicateReason;
  recipes: Recipe[];
};

export function resolveRecipeImport(
  importedRecipe: Recipe,
  existingRecipes: Recipe[]
): RecipeImportDecision {
  const recipe = normalizeRecipe(importedRecipe);
  const duplicateById = recipe.id
    ? existingRecipes.find((existing) => existing.id === recipe.id)
    : undefined;

  if (duplicateById) {
    return resolveMatchedRecipe(recipe, duplicateById, "id");
  }

  const urlKey = normalizeUrlKey(recipe.url);
  const duplicateByUrl = urlKey
    ? existingRecipes.find((existing) => normalizeUrlKey(existing.url) === urlKey)
    : undefined;

  if (duplicateByUrl) {
    return resolveMatchedRecipe(recipe, duplicateByUrl, "url");
  }

  const signature = getRecipeSignature(recipe);
  const duplicateBySignature = signature
    ? existingRecipes.find(
        (existing) => getRecipeSignature(existing) === signature
      )
    : undefined;

  if (duplicateBySignature) {
    return resolveMatchedRecipe(recipe, duplicateBySignature, "signature");
  }

  const nameKey = normalizeTextKey(recipe.name);
  const nameConflict = nameKey
    ? existingRecipes.find(
        (existing) => normalizeTextKey(existing.name) === nameKey
      )
    : undefined;

  if (nameConflict) {
    return {
      action: "create",
      reason: "name-conflict",
      recipe: normalizeRecipe({
        ...recipe,
        name: makeImportedCopyName(recipe.name, existingRecipes)
      }),
      existingRecipe: nameConflict,
      renamed: true
    };
  }

  return {
    action: "create",
    reason: "new",
    recipe,
    renamed: false
  };
}

export function upsertRecipeInList(recipes: Recipe[], recipe: Recipe) {
  if (!recipe.id) {
    return [...recipes, recipe];
  }

  const index = recipes.findIndex((currentRecipe) => currentRecipe.id === recipe.id);
  if (index === -1) {
    return [...recipes, recipe];
  }

  return recipes.map((currentRecipe, currentIndex) =>
    currentIndex === index ? recipe : currentRecipe
  );
}

export function findDuplicateRecipeGroups(
  recipes: Recipe[]
): RecipeDuplicateGroup[] {
  const normalizedRecipes = recipes
    .map(normalizeRecipe)
    .filter((recipe) => Boolean(recipe.id));
  const seenPairs = new Set<string>();
  const groups: RecipeDuplicateGroup[] = [];

  collectDuplicateGroups(
    normalizedRecipes,
    "url",
    (recipe) => normalizeUrlKey(recipe.url),
    seenPairs,
    groups
  );
  collectDuplicateGroups(
    normalizedRecipes,
    "signature",
    getDuplicateRecipeSignature,
    seenPairs,
    groups
  );
  collectDuplicateGroups(
    normalizedRecipes,
    "name",
    (recipe) => normalizeDuplicateNameKey(recipe.name),
    seenPairs,
    groups
  );

  return groups;
}

export function mergeDuplicateRecipeData(recipes: Recipe[]) {
  const normalizedRecipes = recipes.map(normalizeRecipe).filter((recipe) => recipe.id);
  if (!normalizedRecipes.length) {
    return normalizeRecipe({});
  }

  const retainedRecipe = chooseRetainedDuplicateRecipe(normalizedRecipes);
  const candidates = [
    retainedRecipe,
    ...normalizedRecipes
      .filter((recipe) => recipe.id !== retainedRecipe.id)
      .sort((left, right) => getRecipeCompletenessScore(right) - getRecipeCompletenessScore(left))
  ];
  const referenceImage =
    candidates.map(getExternalRecipeImageSource).find(Boolean) ||
    candidates.map(getRemoteRecipeImage).find(Boolean) ||
    candidates.map(getLocalRecipeImage).find(Boolean) ||
    "";

  return normalizeRecipe({
    ...retainedRecipe,
    name: getPreferredRecipeName(candidates),
    description: getLongestString(candidates.map((recipe) => recipe.description)),
    sourceName: getFirstNonEmpty(candidates.map((recipe) => recipe.sourceName)),
    url: getFirstNonEmpty(candidates.map((recipe) => recipe.url)),
    image: referenceImage || retainedRecipe.image,
    imageUrl: referenceImage || retainedRecipe.imageUrl,
    imagePlaceholderUrl: referenceImage || retainedRecipe.imagePlaceholderUrl,
    keywords: mergeKeywords(candidates),
    prepTime: getFirstNonEmpty(candidates.map((recipe) => recipe.prepTime ?? "")) || null,
    cookTime: getFirstNonEmpty(candidates.map((recipe) => recipe.cookTime ?? "")) || null,
    totalTime:
      getFirstNonEmpty(candidates.map((recipe) => recipe.totalTime ?? "")) || null,
    recipeYield: getFirstPositiveYield(candidates),
    recipeCategory: getFirstNonEmpty(
      candidates.map((recipe) => recipe.recipeCategory)
    ),
    tool: mergeStringArrays(candidates.flatMap((recipe) => recipe.tool)),
    recipeIngredient: mergeStringArrays(
      candidates.flatMap((recipe) => recipe.recipeIngredient)
    ),
    recipeInstructions: mergeStringArrays(
      candidates.flatMap((recipe) => recipe.recipeInstructions)
    ),
    nutrition:
      candidates.find((recipe) => hasNutrition(recipe))?.nutrition ??
      retainedRecipe.nutrition,
    localMeta: mergeLocalMeta(candidates)
  });
}

function resolveMatchedRecipe(
  recipe: Recipe,
  existingRecipe: Recipe,
  reason: "id" | "url" | "signature"
): RecipeImportDecision {
  const recipeWithExistingId = normalizeRecipe({
    ...recipe,
    id: existingRecipe.id
  });

  if (
    isSameRecipeContent(recipeWithExistingId, existingRecipe) &&
    (!hasRecipeImage(recipeWithExistingId) || hasRecipeImage(existingRecipe)) &&
    !shouldPromoteImportedImage(recipeWithExistingId, existingRecipe)
  ) {
    return {
      action: "skip",
      reason: "exact",
      recipe: recipeWithExistingId,
      existingRecipe,
      renamed: false
    };
  }

  return {
    action: "update",
    reason,
    recipe: recipeWithExistingId,
    existingRecipe,
    renamed: false
  };
}

function shouldPromoteImportedImage(recipe: Recipe, existingRecipe: Recipe) {
  return (
    hasExternalRecipeImageSource(recipe) &&
    !hasExternalRecipeImageSource(existingRecipe)
  );
}

function makeImportedCopyName(name: string, existingRecipes: Recipe[]) {
  const cleanName = name.trim() || "Recette importee";
  const existingNames = new Set(
    existingRecipes.map((recipe) => normalizeTextKey(recipe.name))
  );
  // French students love English but sometimes leave little tracks
  // like "importee" instead of imported :)
  let candidate = `${cleanName} (import)`;
  let index = 2;

  while (existingNames.has(normalizeTextKey(candidate))) {
    candidate = `${cleanName} (import ${index})`;
    index += 1;
  }

  return candidate;
}

function isSameRecipeContent(left: Recipe, right: Recipe) {
  return JSON.stringify(getComparableRecipeContent(left)) ===
    JSON.stringify(getComparableRecipeContent(right));
}

function getComparableRecipeContent(recipe: Recipe) {
  const normalized = normalizeRecipe(recipe);
  return {
    name: normalizeTextKey(normalized.name),
    description: normalized.description.trim(),
    url: normalizeUrlKey(normalized.url),
    keywords: normalized.keywords
      .split(",")
      .map(normalizeTextKey)
      .filter(Boolean)
      .sort(),
    prepTime: normalized.prepTime,
    cookTime: normalized.cookTime,
    totalTime: normalized.totalTime,
    recipeYield: normalized.recipeYield,
    recipeCategory: normalizeTextKey(normalized.recipeCategory),
    tool: normalized.tool.map(normalizeTextKey).filter(Boolean),
    recipeIngredient: normalized.recipeIngredient.map(normalizeTextKey),
    recipeInstructions: normalized.recipeInstructions.map(normalizeTextKey),
    nutrition: normalized.nutrition,
    localMeta: normalized.localMeta
  };
}

function getRecipeSignature(recipe: Recipe) {
  const name = normalizeTextKey(recipe.name);
  const ingredients = recipe.recipeIngredient.map(normalizeTextKey).join("\n");
  const instructions = recipe.recipeInstructions.map(normalizeTextKey).join("\n");

  if (!name || (!ingredients && !instructions)) {
    return "";
  }

  return `${name}|${ingredients}|${instructions}`;
}

function getDuplicateRecipeSignature(recipe: Recipe) {
  const name = normalizeDuplicateNameKey(recipe.name);
  const ingredients = recipe.recipeIngredient.map(normalizeTextKey).join("\n");
  const instructions = recipe.recipeInstructions.map(normalizeTextKey).join("\n");

  if (!name || (!ingredients && !instructions)) {
    return "";
  }

  return `${name}|${ingredients}|${instructions}`;
}

function hasRecipeImage(recipe: Recipe) {
  return Boolean(recipe.image || recipe.imageUrl || recipe.imagePlaceholderUrl);
}

function collectDuplicateGroups(
  recipes: Recipe[],
  reason: RecipeDuplicateReason,
  getKey: (recipe: Recipe) => string,
  seenPairs: Set<string>,
  groups: RecipeDuplicateGroup[]
) {
  const byKey = new Map<string, Recipe[]>();

  for (const recipe of recipes) {
    const key = getKey(recipe);
    if (!key) {
      continue;
    }
    byKey.set(key, [...(byKey.get(key) ?? []), recipe]);
  }

  for (const duplicateRecipes of byKey.values()) {
    if (duplicateRecipes.length < 2) {
      continue;
    }

    const newPairs = getRecipePairs(duplicateRecipes).filter(
      (pair) => !seenPairs.has(pair)
    );
    if (!newPairs.length) {
      continue;
    }

    newPairs.forEach((pair) => seenPairs.add(pair));
    groups.push({
      id: `${reason}:${duplicateRecipes
        .map((recipe) => recipe.id)
        .sort()
        .join("|")}`,
      reason,
      recipes: duplicateRecipes.sort(compareDuplicateRecipes)
    });
  }
}

function getRecipePairs(recipes: Recipe[]) {
  const pairs: string[] = [];
  for (let leftIndex = 0; leftIndex < recipes.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < recipes.length;
      rightIndex += 1
    ) {
      const leftId = recipes[leftIndex].id;
      const rightId = recipes[rightIndex].id;
      if (!leftId || !rightId) {
        continue;
      }
      pairs.push([leftId, rightId].sort().join("|"));
    }
  }
  return pairs;
}

function compareDuplicateRecipes(left: Recipe, right: Recipe) {
  return getRecipeCompletenessScore(right) - getRecipeCompletenessScore(left);
}

function chooseRetainedDuplicateRecipe(recipes: Recipe[]) {
  return [...recipes].sort((left, right) => {
    const leftRemote = left.id && !left.id.startsWith("local-") ? 1 : 0;
    const rightRemote = right.id && !right.id.startsWith("local-") ? 1 : 0;
    return (
      rightRemote - leftRemote ||
      getRecipeCompletenessScore(right) - getRecipeCompletenessScore(left) ||
      getTimestamp(right.dateModified) - getTimestamp(left.dateModified)
    );
  })[0];
}

function getRecipeCompletenessScore(recipe: Recipe) {
  return [
    recipe.name,
    recipe.description,
    recipe.sourceName,
    recipe.url,
    recipe.image || recipe.imageUrl || recipe.imagePlaceholderUrl,
    recipe.keywords,
    recipe.recipeCategory,
    recipe.prepTime,
    recipe.cookTime,
    recipe.totalTime
  ].filter(Boolean).length +
    recipe.tool.length +
    recipe.recipeIngredient.length +
    recipe.recipeInstructions.length +
    (hasNutrition(recipe) ? 1 : 0);
}

function getPreferredRecipeName(recipes: Recipe[]) {
  const nonImportedName = recipes
    .map((recipe) => recipe.name.trim())
    .find((name) => name && normalizeDuplicateNameKey(name) === normalizeTextKey(name));
  return nonImportedName || recipes[0].name;
}

function getLongestString(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)[0] ?? "";
}

function getFirstNonEmpty(values: string[]) {
  return values.map((value) => value.trim()).find(Boolean) ?? "";
}

function getFirstPositiveYield(recipes: Recipe[]) {
  return recipes.find((recipe) => recipe.recipeYield > 0)?.recipeYield ?? 1;
}

function mergeKeywords(recipes: Recipe[]) {
  return mergeStringArrays(
    recipes.flatMap((recipe) =>
      recipe.keywords.split(",").map((keyword) => keyword.trim())
    )
  ).join(",");
}

function mergeStringArrays(values: string[]) {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const value of values) {
    const trimmed = value.replace(/\s+/g, " ").trim();
    const key = normalizeTextKey(trimmed);
    if (!trimmed || seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(trimmed);
  }

  return merged;
}

function hasNutrition(recipe: Recipe) {
  const nutrition = Array.isArray(recipe.nutrition)
    ? recipe.nutrition[0]
    : recipe.nutrition;
  if (!nutrition || typeof nutrition !== "object") {
    return false;
  }
  return Object.entries(nutrition).some(
    ([key, value]) => key !== "@type" && Boolean(value)
  );
}

function mergeLocalMeta(recipes: Recipe[]) {
  const metaWithOverride = recipes.map((recipe) => recipe.localMeta).find(Boolean);
  const timers = mergeStringArrays(
    recipes.flatMap((recipe) =>
      recipe.localMeta?.timers?.map((timer) => JSON.stringify(timer)) ?? []
    )
  ).map((timer) => JSON.parse(timer) as RecipeLocalTimer);

  if (!metaWithOverride && !timers.length) {
    return undefined;
  }

  return {
    ...metaWithOverride,
    timers: timers.length ? timers : metaWithOverride?.timers
  };
}

function getTimestamp(value: string | undefined) {
  return value ? Date.parse(value) || 0 : 0;
}

function normalizeTextKey(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function normalizeDuplicateNameKey(value: string) {
  return normalizeTextKey(value).replace(/\s+\(import(?:\s+\d+)?\)$/i, "");
}

function normalizeUrlKey(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "").toLocaleLowerCase();
  } catch {
    return trimmed.replace(/\/$/, "").toLocaleLowerCase();
  }
}
