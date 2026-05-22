/* eslint-disable import/first */
import { describe, expect, it, vi } from "vitest";

vi.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: vi.fn(async () => "digest"),
  randomUUID: vi.fn(() => "uuid")
}));

vi.mock("expo-file-system", () => ({
  Directory: class {
    uri = "file:///cache/";
    exists = true;
    create = vi.fn();
    list = vi.fn(() => []);
  },
  File: class {
    uri: string;
    exists = false;
    constructor(...parts: { uri?: string; toString?: () => string }[]) {
      this.uri = parts
        .map((part) => (typeof part === "string" ? part : part.uri ?? String(part)))
        .join("/");
    }
    static downloadFileAsync = vi.fn();
    base64 = vi.fn(async () => "");
    copy = vi.fn();
    create = vi.fn();
    delete = vi.fn();
    text = vi.fn(async () => "");
    write = vi.fn();
  },
  Paths: {
    cache: { uri: "file:///cache" },
    document: { uri: "file:///document" }
  }
}));

vi.mock("expo-print", () => ({
  printAsync: vi.fn(),
  printToFileAsync: vi.fn()
}));

vi.mock("expo-sharing", () => ({
  isAvailableAsync: vi.fn(async () => true),
  shareAsync: vi.fn()
}));

import {
  createRecipePrintHtml,
  createRecipeShareBackup,
  type RecipePrintLabels
} from "../src/features/recipes/recipeSharing";
import { getRecipeShareFilename } from "../src/features/recipes/recipeShareFilenames";
import { normalizeRecipe } from "../src/features/recipes/types";

const labels: RecipePrintLabels = {
  appName: "AvoCook",
  calories: "Calories",
  category: "Catégorie",
  cookTime: "Cuisson",
  carbs: "Glucides",
  fat: "Lipides",
  fiber: "Fibres",
  ingredients: "Ingrédients",
  instructions: "Préparation",
  keywords: "Mots-clés",
  nutrition: "Nutrition",
  nutriScore: "Nutri-Score",
  prepTime: "Préparation",
  protein: "Protéines",
  saturatedFat: "Graisses saturées",
  servingSize: "Portion",
  source: "Source",
  sodium: "Sodium",
  sugar: "Sucres",
  tools: "Ustensiles",
  totalTime: "Total",
  yield: "Parts"
};

describe("getRecipeShareFilename", () => {
  it("uses the recipe name for shared PDF and AvoCook files", () => {
    expect(getRecipeShareFilename({ name: "Gâteau léger au chocolat" }, "pdf"))
      .toBe("Gâteau léger au chocolat.pdf");
    expect(getRecipeShareFilename({ name: "Gâteau léger au chocolat" }, "json"))
      .toBe("Gâteau léger au chocolat.avocook.json");
  });

  it("removes filename separators while keeping a readable title", () => {
    expect(getRecipeShareFilename({ name: "Pain / beurre: miel?" }, "pdf"))
      .toBe("Pain beurre miel.pdf");
  });
});

describe("recipe print and share content", () => {
  it("renders the Nutri-Score in printable HTML when nutrition exists", async () => {
    const recipe = normalizeRecipe({
      name: "Salade complète",
      recipeIngredient: ["quinoa", "brocoli"],
      recipeInstructions: ["Mélanger."],
      nutrition: {
        "@type": "NutritionInformation",
        calories: "455 kcal",
        sugarContent: "8 g",
        fiberContent: "8 g",
        proteinContent: "21 g"
      }
    });

    const html = await createRecipePrintHtml(recipe, labels, null);

    expect(html).toContain("Nutri-Score");
    expect(html).toMatch(/class="meta-value">[A-E]<\/span>/);
    expect(html).toContain("Salade complète");
    expect(html).toContain("quinoa");
  });

  it("keeps all recipe data needed by another AvoCook user", async () => {
    const recipe = normalizeRecipe({
      id: "local-salad",
      name: "Salade complète",
      description: "Fraîche et rapide.",
      sourceName: "Carnet",
      url: "https://example.com/salade",
      keywords: "rapide,frais",
      recipeCategory: "Déjeuner",
      recipeYield: 2,
      recipeIngredient: ["quinoa", "brocoli"],
      recipeInstructions: ["Mélanger."],
      tool: ["saladier"],
      nutrition: {
        "@type": "NutritionInformation",
        calories: "455 kcal"
      },
      localMeta: {
        nutriScoreOverride: "B",
        servingOverride: 3,
        timers: [{ id: "timer-1", label: "Repos", minutes: 5 }]
      }
    });

    const result = await createRecipeShareBackup(recipe, null);
    const sharedRecipe = result.backup.recipes[0]?.recipe;

    expect(sharedRecipe).toMatchObject({
      id: null,
      name: "Salade complète",
      description: "Fraîche et rapide.",
      sourceName: "Carnet",
      url: "https://example.com/salade",
      keywords: "rapide,frais",
      recipeCategory: "Déjeuner",
      recipeYield: 2,
      recipeIngredient: ["quinoa", "brocoli"],
      recipeInstructions: ["Mélanger."],
      tool: ["saladier"],
      nutrition: {
        "@type": "NutritionInformation",
        calories: "455 kcal"
      },
      localMeta: {
        nutriScoreOverride: "B",
        servingOverride: 3,
        timers: [{ id: "timer-1", label: "Repos", minutes: 5 }]
      }
    });
  });
});
