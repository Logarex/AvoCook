export type Nutrition = {
  "@type"?: "NutritionInformation" | string;
  calories?: string;
  carbohydrateContent?: string;
  cholesterolContent?: string;
  fatContent?: string;
  fiberContent?: string;
  proteinContent?: string;
  saturatedFatContent?: string;
  servingSize?: string;
  sodiumContent?: string;
  sugarContent?: string;
  transFatContent?: string;
  unsaturatedFatContent?: string;
};

export type NutriScoreGrade = "A" | "B" | "C" | "D" | "E" | "?";

export type RecipeLocalTimer = {
  id: string;
  label: string;
  minutes: number;
};

export type RecipeLocalMeta = {
  nutriScoreOverride?: NutriScoreGrade;
  servingOverride?: number;
  timers?: RecipeLocalTimer[];
};

export type Recipe = {
  "@type"?: "Recipe";
  id: string | null;
  recipe_id?: number;
  name: string;
  description: string;
  url: string;
  image: string;
  imageUrl: string;
  imagePlaceholderUrl: string;
  keywords: string;
  dateCreated?: string;
  dateModified?: string;
  prepTime: string | null;
  cookTime: string | null;
  totalTime: string | null;
  recipeYield: number;
  recipeCategory: string;
  tool: string[];
  recipeIngredient: string[];
  recipeInstructions: string[];
  nutrition: Nutrition | Nutrition[] | null;
  localMeta?: RecipeLocalMeta;
};

export type RecipeStub = Pick<
  Recipe,
  | "id"
  | "recipe_id"
  | "name"
  | "keywords"
  | "dateCreated"
  | "dateModified"
  | "imageUrl"
  | "imagePlaceholderUrl"
> & {
  id: string;
};

export type Category = {
  name: string;
  recipe_count: number;
};

export type Keyword = Category;

export function createEmptyRecipe(): Recipe {
  const now = new Date().toISOString();
  return {
    "@type": "Recipe",
    id: null,
    name: "",
    description: "",
    url: "",
    image: "",
    imageUrl: "",
    imagePlaceholderUrl: "",
    keywords: "",
    dateCreated: now,
    dateModified: now,
    prepTime: null,
    cookTime: null,
    totalTime: null,
    recipeYield: 1,
    recipeCategory: "",
    tool: [],
    recipeIngredient: [],
    recipeInstructions: [],
    nutrition: {
      "@type": "NutritionInformation"
    },
    localMeta: undefined
  };
}

export function normalizeRecipe(input: Partial<Recipe>): Recipe {
  const empty = createEmptyRecipe();
  return {
    ...empty,
    ...input,
    "@type": "Recipe",
    id: input.id ?? null,
    name: input.name?.trim() || empty.name,
    description: input.description ?? "",
    url: input.url ?? "",
    image: input.image ?? "",
    imageUrl: input.imageUrl ?? "",
    imagePlaceholderUrl: input.imagePlaceholderUrl ?? "",
    keywords: Array.isArray(input.keywords)
      ? input.keywords.join(",")
      : input.keywords ?? "",
    prepTime: input.prepTime ?? null,
    cookTime: input.cookTime ?? null,
    totalTime: input.totalTime ?? null,
    recipeYield: Number(input.recipeYield || 1),
    recipeCategory: input.recipeCategory ?? "",
    tool: Array.isArray(input.tool) ? input.tool : [],
    recipeIngredient: Array.isArray(input.recipeIngredient)
      ? input.recipeIngredient
      : [],
    recipeInstructions: Array.isArray(input.recipeInstructions)
      ? input.recipeInstructions
      : [],
    nutrition: input.nutrition ?? { "@type": "NutritionInformation" },
    localMeta: normalizeLocalMeta(input.localMeta)
  };
}

export function toCookbookRecipe(recipe: Recipe): Recipe {
  const { localMeta, ...cookbookRecipe } = recipe;
  return cookbookRecipe;
}

export function toCookbookCreateRecipe(recipe: Recipe): Recipe {
  return {
    ...toCookbookRecipe(recipe),
    id: null
  };
}

export function hasLocalMetadata(recipe: Recipe) {
  const meta = recipe.localMeta;
  if (!meta) {
    return false;
  }

  return Boolean(
    meta.nutriScoreOverride ||
      meta.servingOverride ||
      (meta.timers && meta.timers.length > 0)
  );
}

function normalizeLocalMeta(
  localMeta?: RecipeLocalMeta
): RecipeLocalMeta | undefined {
  if (!localMeta) {
    return undefined;
  }

  const normalized: RecipeLocalMeta = {};

  if (localMeta.nutriScoreOverride) {
    normalized.nutriScoreOverride = localMeta.nutriScoreOverride;
  }

  if (
    localMeta.servingOverride &&
    Number.isFinite(localMeta.servingOverride) &&
    localMeta.servingOverride > 0
  ) {
    normalized.servingOverride = Math.round(localMeta.servingOverride);
  }

  if (Array.isArray(localMeta.timers)) {
    normalized.timers = localMeta.timers
      .map((timer) => ({
        id: timer.id,
        label: timer.label,
        minutes: Math.max(1, Math.round(timer.minutes))
      }))
      .filter((timer) => timer.id && timer.label && timer.minutes > 0);
  }

  return hasMeaningfulLocalMeta(normalized) ? normalized : undefined;
}

function hasMeaningfulLocalMeta(localMeta: RecipeLocalMeta) {
  return Boolean(
    localMeta.nutriScoreOverride ||
      localMeta.servingOverride ||
      (localMeta.timers && localMeta.timers.length > 0)
  );
}
