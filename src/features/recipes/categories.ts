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

const defaultRecipeCategoryTranslationKeys: Record<string, string> = {
  Apéritif: "recipes.defaultCategories.appetizer",
  Entrée: "recipes.defaultCategories.starter",
  "Plat principal": "recipes.defaultCategories.mainCourse",
  Dessert: "recipes.defaultCategories.dessert",
  Viande: "recipes.defaultCategories.meat",
  Poisson: "recipes.defaultCategories.fish",
  Volaille: "recipes.defaultCategories.poultry",
  Végétarien: "recipes.defaultCategories.vegetarian",
  Soupe: "recipes.defaultCategories.soup",
  Salade: "recipes.defaultCategories.salad",
  Pâtes: "recipes.defaultCategories.pasta",
  Riz: "recipes.defaultCategories.rice",
  Gâteau: "recipes.defaultCategories.cake",
  Boisson: "recipes.defaultCategories.drink",
  Sauce: "recipes.defaultCategories.sauce"
};

const categoryRules: { category: string; keywords: string[] }[] = [
  {
    category: "Apéritif",
    keywords: ["apéritif", "apero", "apéro", "toast", "verrine", "canapé", "appetizer", "snack", "dip", "aperitivo", "antipasto", "stuzzichini", "tapa", "pincho", "picoteo", "vorspeise"]
  },
  {
    category: "Entrée",
    keywords: ["entrée", "quiche", "terrine", "bruschetta", "tartare", "starter", "entrante", "primo"]
  },
  {
    category: "Dessert",
    keywords: [
      "dessert", "gâteau", "gateau", "tarte", "cake", "crème", "creme", "mousse", "chocolat", "panna cotta", "flan", "biscuit", "cookies", "glace",
      "pie", "sweet", "ice cream", "cookie", "pudding",
      "dolce", "torta", "gelato", "biscotto", "budino",
      "postre", "pastel", "helado", "galleta", "dulce",
      "kuchen", "torte", "eis", "keks", "süßspeise"
    ]
  },
  {
    category: "Poisson",
    keywords: [
      "poisson", "saumon", "cabillaud", "thon", "truite", "sardine", "crevette", "moules", "coquille",
      "fish", "salmon", "cod", "tuna", "trout", "shrimp", "seafood",
      "pesce", "salmone", "merluzzo", "tonno", "trota", "gambero", "crostacei",
      "pescado", "salmón", "bacalao", "atún", "trucha", "gamba", "marisco",
      "fisch", "lachs", "kabeljau", "thunfisch", "forelle", "garnele", "meeresfrüchte"
    ]
  },
  {
    category: "Volaille",
    keywords: ["poulet", "dinde", "canard", "volaille", "pintade", "poultry", "chicken", "turkey", "duck", "pollame", "pollo", "tacchino", "anatra", "ave", "pavo", "pato", "geflügel", "huhn", "hähnchen", "pute", "ente"]
  },
  {
    category: "Viande",
    keywords: [
      "boeuf", "bœuf", "porc", "agneau", "veau", "jambon", "lard", "steak", "burger",
      "meat", "beef", "pork", "lamb", "veal", "ham", "bacon",
      "carne", "manzo", "maiale", "agnello", "vitello", "prosciutto", "pancetta", "bistecca",
      "ternera", "cerdo", "cordero", "jamón", "tocino", "hamburguesa",
      "fleisch", "rind", "schwein", "lamm", "kalb", "schinken", "speck"
    ]
  },
  {
    category: "Végétarien",
    keywords: ["végétarien", "vegetarien", "tofu", "lentilles", "pois chiche", "vegetarian", "vegan", "lentil", "chickpea", "vegetariano", "vegano", "lenticchia", "cece", "lenteja", "garbanzo", "vegetarisch", "linse", "kichererbse"]
  },
  {
    category: "Soupe",
    keywords: ["soupe", "velouté", "veloute", "potage", "bouillon", "soup", "broth", "zuppa", "minestra", "brodo", "sopa", "caldo", "crema", "suppe", "brühe", "eintopf"]
  },
  {
    category: "Salade",
    keywords: ["salade", "taboulé", "taboule", "crudités", "crudites", "salad", "insalata", "ensalada", "salat"]
  },
  {
    category: "Pâtes",
    keywords: ["pâtes", "pates", "spaghetti", "lasagne", "tagliatelle", "ravioli", "pasta", "noodle", "macaroni", "maccheroni", "fideo", "macarrón", "nudel", "makkaroni"]
  },
  {
    category: "Riz",
    keywords: ["riz", "risotto", "paella", "pilaf", "rice", "riso", "arroz", "reis"]
  },
  {
    category: "Sauce",
    keywords: ["sauce", "vinaigrette", "mayonnaise", "pesto", "coulis", "dressing", "gravy", "salsa", "sugo", "condimento", "aderezo", "soße"]
  },
  {
    category: "Boisson",
    keywords: [
      "boisson", "cocktail", "smoothie", "jus", "limonade", "infusion",
      "drink", "beverage", "juice", "lemonade", "coffee",
      "bevanda", "bibita", "succo", "caffè",
      "bebida", "refresco", "jugo", "zumo", "café",
      "getränk", "saft", "kaffee"
    ]
  },
  {
    category: "Plat principal",
    keywords: ["gratin", "curry", "tajine", "ragoût", "ragout", "parmentier", "main course", "main dish", "casserole", "stew", "secondo piatto", "stufato", "plato principal", "guiso", "estofado", "hauptgericht", "auflauf"]
  }
];

export function inferRecipeCategory(recipe: Pick<
  Recipe,
  "description" | "keywords" | "name" | "recipeCategory" | "recipeIngredient"
>) {
  if (recipe.recipeCategory?.trim()) {
    return recipe.recipeCategory.trim();
  }

  const text = normalizeSearchText(
    [
      recipe.name,
      recipe.description,
      recipe.keywords,
      ...(recipe.recipeIngredient || [])
    ].join(" ")
  );

  for (const rule of categoryRules) {
    if (rule.keywords.some((keyword) => {
      const normalized = normalizeSearchText(keyword);
      return new RegExp(`\\b${normalized}\\b`).test(text);
    })) {
      return rule.category;
    }
  }

  return "";
}

export function withInferredCategory(recipe: Recipe) {
  const recipeCategory = inferRecipeCategory(recipe);
  return recipeCategory ? { ...recipe, recipeCategory } : recipe;
}

export function isDefaultRecipeCategory(category: string) {
  return DEFAULT_RECIPE_CATEGORIES.includes(category);
}

export function getDefaultRecipeCategoryTranslationKey(category: string) {
  return defaultRecipeCategoryTranslationKeys[category] ?? "";
}

export function getRecipeCategoryLabel(
  category: string,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const key = getDefaultRecipeCategoryTranslationKey(category);
  return key ? t(key, { defaultValue: category }) : category;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
