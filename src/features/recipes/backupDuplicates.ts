import { normalizeRecipe, type Recipe } from "./types";

export type RecipeImportDecision = {
  action: "create" | "update" | "skip";
  reason: "new" | "id" | "url" | "signature" | "exact" | "name-conflict";
  recipe: Recipe;
  existingRecipe?: Recipe;
  renamed: boolean;
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
    (!hasRecipeImage(recipeWithExistingId) || hasRecipeImage(existingRecipe))
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

function makeImportedCopyName(name: string, existingRecipes: Recipe[]) {
  const cleanName = name.trim() || "Recette importee";
  const existingNames = new Set(
    existingRecipes.map((recipe) => normalizeTextKey(recipe.name))
  );
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

function hasRecipeImage(recipe: Recipe) {
  return Boolean(recipe.image || recipe.imageUrl || recipe.imagePlaceholderUrl);
}

function normalizeTextKey(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
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
