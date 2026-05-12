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
    }
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
    nutrition: input.nutrition ?? { "@type": "NutritionInformation" }
  };
}
