import type { RecipePrintLabels } from "../../features/recipes/recipeSharing";
import type { Recipe } from "../../features/recipes/types";

export function isUserDismissedShareOrPrint(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /printing did not complete|cancel|dismiss|abort/i.test(error.message);
}

export function getPrintLabels(t: (key: string) => string): RecipePrintLabels {
  return {
    appName: "AvoCook",
    calories: t("editor.caloriesKcal"),
    category: t("recipes.category"),
    cookTime: t("recipes.cookTime"),
    carbs: t("editor.carbsGrams"),
    fat: t("editor.fatGrams"),
    fiber: t("editor.fiberGrams"),
    ingredients: t("recipes.ingredients"),
    instructions: t("recipes.instructions"),
    keywords: t("recipes.share.keywords"),
    nutrition: t("recipes.nutrition"),
    nutriScore: "Nutri-Score",
    prepTime: t("recipes.prepTime"),
    protein: t("editor.proteinGrams"),
    saturatedFat: t("editor.saturatedFatGrams"),
    servingSize: t("recipes.share.servingSize"),
    source: t("recipes.source"),
    sodium: t("editor.sodiumMg"),
    sugar: t("editor.sugarGrams"),
    tools: t("recipes.tools"),
    totalTime: t("recipes.totalTime"),
    yield: t("recipes.yield"),
  };
}

export function safeTranslation(value: string, fallback: string) {
  return value.includes(".") ? fallback : value;
}

export function getRecipeSearchText(recipe: Recipe) {
  return [
    recipe.name,
    recipe.description,
    recipe.recipeCategory,
    recipe.keywords,
    recipe.recipeIngredient.join(" "),
    recipe.recipeInstructions.join(" "),
    recipe.tool.join(" "),
  ].join(" ");
}

export function getRecipeSearchScore(recipe: Recipe, normalizedQuery: string) {
  const normalizedName = normalizeSearchText(recipe.name);
  if (normalizedName === normalizedQuery) {
    return 0;
  }
  if (normalizedName.startsWith(normalizedQuery)) {
    return 1;
  }
  if (normalizedName.includes(normalizedQuery)) {
    return 2;
  }
  return 3;
}

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
