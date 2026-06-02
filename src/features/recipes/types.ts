export type NutritionValue = string | number;

export type Nutrition = {
  "@type"?: "NutritionInformation" | string;
  calories?: NutritionValue;
  carbohydrateContent?: NutritionValue;
  cholesterolContent?: NutritionValue;
  fatContent?: NutritionValue;
  fiberContent?: NutritionValue;
  proteinContent?: NutritionValue;
  saturatedFatContent?: NutritionValue;
  servingSize?: NutritionValue;
  sodiumContent?: NutritionValue;
  sugarContent?: NutritionValue;
  transFatContent?: NutritionValue;
  unsaturatedFatContent?: NutritionValue;
};

export type NutriScoreGrade = "A" | "B" | "C" | "D" | "E" | "?";

export type RecipeLocalTimer = {
  id: string;
  label: string;
  minutes: number;
};

export type RecipeLocalMeta = {
  cachedImage?: string;
  hideServings?: boolean;
  imageRemoved?: boolean;
  nutriScoreOverride?: NutriScoreGrade;
  servingOverride?: number;
  timers?: RecipeLocalTimer[];
};

export type Recipe = {
  "@type"?: "Recipe";
  id: string | null;
  // some old Nextcloud versions give a recipe_id instead of id...
  recipe_id?: number;
  name: string;
  description: string;
  sourceName: string;
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
  // Instructions can be nested in schema.org but we flatten them here
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
    sourceName: "",
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
    nutrition: null,
    localMeta: undefined
  };
}

export function normalizeRecipe(input: Partial<Recipe>): Recipe {
  const empty = createEmptyRecipe();
  const raw = input as Record<string, unknown>;
  const recipeYield = normalizePositiveInteger(raw.recipeYield, empty.recipeYield);
  return {
    ...empty,
    ...input,
    "@type": "Recipe",
    id: raw.id === null || raw.id === undefined ? null : String(raw.id),
    name: toRecipeString(raw.name).trim() || empty.name,
    description: toRecipeString(raw.description),
    sourceName: toRecipeString(raw.sourceName),
    url: toRecipeString(raw.url),
    image: normalizeImageValue(raw.image),
    imageUrl: normalizeImageValue(raw.imageUrl),
    imagePlaceholderUrl: normalizeImageValue(raw.imagePlaceholderUrl),
    keywords: normalizeKeywords(raw.keywords),
    prepTime: normalizeNullableString(raw.prepTime),
    cookTime: normalizeNullableString(raw.cookTime),
    totalTime: normalizeNullableString(raw.totalTime),
    recipeYield,
    recipeCategory: toRecipeString(raw.recipeCategory),
    tool: normalizeRecipeStringArray(raw.tool),
    recipeIngredient: normalizeRecipeStringArray(raw.recipeIngredient),
    recipeInstructions: normalizeRecipeInstructions(raw.recipeInstructions),
    nutrition:
      raw.nutrition === undefined
        ? empty.nutrition
        : normalizeNutrition(raw.nutrition),
    localMeta: normalizeLocalMeta(input.localMeta)
  };
}

export function toCookbookRecipe(recipe: Recipe): Recipe {
  const { localMeta, ...cookbookRecipe } = recipe;
  return omitEmptyCookbookFields(cookbookRecipe);
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
      meta.hideServings ||
      meta.imageRemoved ||
      meta.servingOverride ||
      (meta.timers && meta.timers.length > 0)
  );
}

export function hasNutritionValues(
  nutrition?: Nutrition | Nutrition[] | null
) {
  const nodes = Array.isArray(nutrition) ? nutrition : nutrition ? [nutrition] : [];
  return nodes.some((node) =>
    Object.entries(node).some(
      ([key, value]) => key !== "@type" && toRecipeString(value).trim()
    )
  );
}

function omitEmptyCookbookFields(recipe: Omit<Recipe, "localMeta">): Recipe {
  const payload = { ...recipe } as Recipe;

  for (const field of ["prepTime", "cookTime", "totalTime"] as const) {
    if (!payload[field]) {
      delete (payload as Partial<Recipe>)[field];
    }
  }

  if (!payload.sourceName) {
    delete (payload as Partial<Recipe>).sourceName;
  }

  if (!hasNutritionValues(payload.nutrition)) {
    delete (payload as Partial<Recipe>).nutrition;
  }

  return payload;
}

function normalizeNutrition(value: unknown): Nutrition | Nutrition[] | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    const nutrition = value.flatMap((item) => {
      const normalized = normalizeNutrition(item);
      return Array.isArray(normalized) ? normalized : normalized ? [normalized] : [];
    });
    return nutrition.length ? nutrition : null;
  }

  if (typeof value !== "object") {
    return null;
  }

  const node = value as Record<string, unknown>;
  const nutrition = { ...(value as Nutrition) };
  nutrition["@type"] = toRecipeString(node["@type"]) || "NutritionInformation";
  nutrition.calories = normalizeOptionalNutritionValue(node.calories);
  nutrition.carbohydrateContent = normalizeOptionalNutritionValue(
    node.carbohydrateContent
  );
  nutrition.cholesterolContent = normalizeOptionalNutritionValue(
    node.cholesterolContent
  );
  nutrition.fatContent = normalizeOptionalNutritionValue(node.fatContent);
  nutrition.fiberContent = normalizeOptionalNutritionValue(node.fiberContent);
  nutrition.proteinContent = normalizeOptionalNutritionValue(node.proteinContent);
  nutrition.saturatedFatContent = normalizeOptionalNutritionValue(
    node.saturatedFatContent
  );
  nutrition.servingSize = normalizeOptionalNutritionValue(node.servingSize);
  nutrition.sodiumContent = normalizeOptionalNutritionValue(node.sodiumContent);
  nutrition.sugarContent = normalizeOptionalNutritionValue(node.sugarContent);
  nutrition.transFatContent = normalizeOptionalNutritionValue(
    node.transFatContent
  );
  nutrition.unsaturatedFatContent = normalizeOptionalNutritionValue(
    node.unsaturatedFatContent
  );

  for (const [key, value] of Object.entries(nutrition)) {
    if (key !== "@type" && !toRecipeString(value).trim()) {
      delete (nutrition as Record<string, unknown>)[key];
    }
  }

  return hasNutritionValues(nutrition) ? nutrition : null;
}

function normalizeOptionalNutritionValue(value: unknown) {
  return toRecipeString(value) || undefined;
}

function normalizeLocalMeta(
  localMeta?: RecipeLocalMeta
): RecipeLocalMeta | undefined {
  if (!localMeta) {
    return undefined;
  }

  const normalized: RecipeLocalMeta = {};

  if (typeof localMeta.cachedImage === "string" && localMeta.cachedImage) {
    normalized.cachedImage = localMeta.cachedImage;
  }

  if (localMeta.imageRemoved) {
    normalized.imageRemoved = true;
  }

  if (localMeta.hideServings) {
    normalized.hideServings = true;
  }

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

  return hasPersistableLocalMeta(normalized) ? normalized : undefined;
}

function hasMeaningfulLocalMeta(localMeta: RecipeLocalMeta) {
  return Boolean(
    localMeta.nutriScoreOverride ||
      localMeta.hideServings ||
      localMeta.imageRemoved ||
      localMeta.servingOverride ||
      (localMeta.timers && localMeta.timers.length > 0)
  );
}

function hasPersistableLocalMeta(localMeta: RecipeLocalMeta) {
  return Boolean(localMeta.cachedImage || hasMeaningfulLocalMeta(localMeta));
}

function normalizeRecipeInstructions(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return splitRecipeText(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap(normalizeRecipeInstructions);
  }

  if (typeof value === "object") {
    const node = value as Record<string, unknown>;
    if (node.itemListElement) {
      return normalizeRecipeInstructions(node.itemListElement);
    }

    return splitRecipeText(
      toRecipeString(node.text || node.name || node.description)
    );
  }

  return splitRecipeText(String(value));
}

function normalizeRecipeStringArray(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return splitRecipeText(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap(normalizeRecipeStringArray);
  }

  if (typeof value === "object") {
    const node = value as Record<string, unknown>;
    return splitRecipeText(toRecipeString(node.name || node.text || node.value));
  }

  return splitRecipeText(String(value));
}

function normalizeKeywords(value: unknown) {
  if (Array.isArray(value)) {
    return normalizeRecipeStringArray(value).join(",");
  }
  return toRecipeString(value);
}

function normalizeNullableString(value: unknown) {
  const normalized = toRecipeString(value);
  return normalized || null;
}

function normalizeImageValue(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return normalizeImageValue(value[0]);
  }

  if (typeof value === "object") {
    const node = value as Record<string, unknown>;
    return toRecipeString(node.url || node.contentUrl || node["@id"]);
  }

  return String(value);
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseInt(toRecipeString(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

function toRecipeString(value: unknown): string {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(toRecipeString).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    const node = value as Record<string, unknown>;
    return toRecipeString(node.name || node.text || node.value || node.url);
  }
  return String(value);
}

function splitRecipeText(value: string): string[] {
  return value
    .split(/\r?\n|(?:<br\s*\/?>)/i)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
