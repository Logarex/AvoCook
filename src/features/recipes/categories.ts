import type { Recipe } from "./types";

export const DEFAULT_RECIPE_CATEGORIES = [
  "Apéritif",
  "Entrée",
  "Plat principal",
  "Dessert",
  "Viande",
  "Poisson",
  "Volaille",
  "Végétarien",
  "Soupe",
  "Salade",
  "Pâtes",
  "Riz",
  "Gâteau",
  "Boisson",
  "Sauce"
];

const categoryRules: { category: string; keywords: string[] }[] = [
  {
    category: "Apéritif",
    keywords: ["apéritif", "apero", "apéro", "toast", "verrine", "canapé"]
  },
  {
    category: "Entrée",
    keywords: ["entrée", "quiche", "terrine", "bruschetta", "tartare"]
  },
  {
    category: "Dessert",
    keywords: [
      "dessert",
      "gâteau",
      "gateau",
      "tarte",
      "cake",
      "crème",
      "creme",
      "mousse",
      "chocolat",
      "panna cotta",
      "flan",
      "biscuit",
      "cookies",
      "glace"
    ]
  },
  {
    category: "Poisson",
    keywords: [
      "poisson",
      "saumon",
      "cabillaud",
      "thon",
      "truite",
      "sardine",
      "crevette",
      "moules",
      "coquille"
    ]
  },
  {
    category: "Volaille",
    keywords: ["poulet", "dinde", "canard", "volaille", "pintade"]
  },
  {
    category: "Viande",
    keywords: [
      "boeuf",
      "bœuf",
      "porc",
      "agneau",
      "veau",
      "jambon",
      "lard",
      "steak",
      "burger"
    ]
  },
  {
    category: "Végétarien",
    keywords: ["végétarien", "vegetarien", "tofu", "lentilles", "pois chiche"]
  },
  {
    category: "Soupe",
    keywords: ["soupe", "velouté", "veloute", "potage", "bouillon"]
  },
  {
    category: "Salade",
    keywords: ["salade", "taboulé", "taboule", "crudités", "crudites"]
  },
  {
    category: "Pâtes",
    keywords: ["pâtes", "pates", "spaghetti", "lasagne", "tagliatelle", "ravioli"]
  },
  {
    category: "Riz",
    keywords: ["riz", "risotto", "paella", "pilaf"]
  },
  {
    category: "Sauce",
    keywords: ["sauce", "vinaigrette", "mayonnaise", "pesto", "coulis"]
  },
  {
    category: "Boisson",
    keywords: ["boisson", "cocktail", "smoothie", "jus", "limonade", "thé"]
  },
  {
    category: "Plat principal",
    keywords: ["gratin", "curry", "tajine", "ragoût", "ragout", "parmentier"]
  }
];

export function inferRecipeCategory(recipe: Pick<
  Recipe,
  "description" | "keywords" | "name" | "recipeCategory" | "recipeIngredient"
>) {
  if (recipe.recipeCategory.trim()) {
    return recipe.recipeCategory.trim();
  }

  const searchable = normalizeSearchText(
    [
      recipe.name,
      recipe.description,
      recipe.keywords,
      recipe.recipeIngredient.join(" ")
    ].join(" ")
  );

  for (const rule of categoryRules) {
    if (
      rule.keywords.some((keyword) =>
        searchable.includes(normalizeSearchText(keyword))
      )
    ) {
      return rule.category;
    }
  }

  return "";
}

export function withInferredCategory(recipe: Recipe) {
  const recipeCategory = inferRecipeCategory(recipe);
  return recipeCategory ? { ...recipe, recipeCategory } : recipe;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
