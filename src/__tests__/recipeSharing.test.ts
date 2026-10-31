/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from "vitest";

const printImages = vi.hoisted(() => ({ existing: new Set<string>(), base64: vi.fn(), download: vi.fn(), remove: vi.fn() }));

const { copyFile } = vi.hoisted(() => ({
  copyFile: vi.fn(async () => {})
}));

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
    get exists() { return printImages.existing.has(this.uri); }
    constructor(...parts: { uri?: string; toString?: () => string }[]) {
      this.uri = parts
        .map((part) => (typeof part === "string" ? part : part.uri ?? String(part)))
        .join("/");
    }
    static downloadFileAsync = printImages.download;
    base64 = printImages.base64;
    copy = copyFile;
    create = vi.fn();
    delete = printImages.remove;
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
  getRecipePrintImageDataUri,
  createRecipeShareBackup,
  shareRecipePdf,
  type RecipePrintLabels
} from "../features/recipes/recipeSharing";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { getRecipeShareFilename } from "../features/recipes/recipeShareFilenames";
import { normalizeRecipe } from "../features/recipes/types";

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
  it("uses a readable filename for a Markdown recipe name", () => {
    expect(getRecipeShareFilename({ name: "**Crème** *fraîche*" }, "pdf")).toBe("Crème fraîche.pdf");
  });
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
  beforeEach(() => {
    vi.clearAllMocks();
    copyFile.mockResolvedValue(undefined);
  });

  it("waits for the PDF copy before opening the share sheet", async () => {
    let finishCopy!: () => void;
    copyFile.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishCopy = resolve;
    }));
    vi.mocked(Print.printToFileAsync).mockResolvedValueOnce({
      uri: "file:///cache/printed.pdf",
      numberOfPages: 1
    });
    const recipe = normalizeRecipe({ name: "Salade", recipeIngredient: ["quinoa"] });

    const exportResult = shareRecipePdf(recipe, labels, null);
    await vi.waitFor(() => expect(copyFile).toHaveBeenCalledOnce());
    expect(Sharing.shareAsync).not.toHaveBeenCalled();

    finishCopy();
    await exportResult;
    expect(Sharing.shareAsync).toHaveBeenCalledOnce();
  });

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

  it("renders Markdown in all printable recipe text fields and keeps HTML inert", async () => {
    const recipe = normalizeRecipe({ name: "**Soup**", description: "## Sauce\n\n> *Cool*\n\n<script>alert(1)</script>", recipeCategory: "**Main**", keywords: "*Quick*", sourceName: "[Chef](https://example.com)", recipeIngredient: ["**200 g** flour"], recipeInstructions: ["### Mix\n\n- **Stir**\n  - salt"], tool: ["*Whisk*"], nutrition: { calories: "**420** kcal" } });
    const html = await createRecipePrintHtml(recipe, labels, null);
    for (const value of ["<strong>Soup</strong>", "<h2>Sauce</h2>", "<em>Cool</em>", "<strong>Main</strong>", "<em>Quick</em>", '<a href="https://example.com">Chef</a>', "<strong>200 g</strong>", "<h3>Mix</h3>", "<em>Whisk</em>", "<strong>420</strong>"]) expect(html).toContain(value);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
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


describe("recipe book image embedding", () => {
  beforeEach(() => {
    printImages.existing.clear();
    printImages.base64.mockReset().mockResolvedValue("cGhvdG8=");
    printImages.download.mockReset();
    printImages.remove.mockClear();
  });
  it("embeds an offline cached photo without downloading or deleting the original", async () => {
    const uri = "file:///documents/cached.png";
    printImages.existing.add(uri);
    const recipe = normalizeRecipe({ name: "Soup", localMeta: { cachedImage: uri } });
    expect(await getRecipePrintImageDataUri(recipe, null)).toBe("data:image/png;base64,cGhvdG8=");
    expect(printImages.download).not.toHaveBeenCalled();
    expect(printImages.remove).not.toHaveBeenCalled();
  });
  it("downloads Nextcloud photos with the account's headers, embeds bytes and deletes the temporary file", async () => {
    const client = {
      getRecipeImageUrl: vi.fn(() => "https://cloud.example/recipe/42/image"),
      getImageHeaders: vi.fn(() => ({ Authorization: "Basic test" })),
    };
    printImages.download.mockResolvedValue({ uri: "file:///cache/download.jpg" });
    const recipe = normalizeRecipe({ id: "42", name: "Soup" });
    expect(await getRecipePrintImageDataUri(recipe, client as never)).toBe("data:image/jpeg;base64,cGhvdG8=");
    expect(printImages.download).toHaveBeenCalledWith("https://cloud.example/recipe/42/image", expect.anything(), { headers: { Authorization: "Basic test" }, idempotent: true });
    expect(printImages.remove).toHaveBeenCalledOnce();
  });
  it("omits unreadable photos and still cleans up temporary downloads", async () => {
    printImages.download.mockResolvedValue({ uri: "file:///cache/download.jpg" });
    printImages.base64.mockRejectedValue(new Error("Unreadable photo"));
    expect(await getRecipePrintImageDataUri(normalizeRecipe({ name: "Soup", image: "https://images.example/soup.jpg" }), null)).toBe("");
    expect(printImages.remove).toHaveBeenCalledOnce();
  });
  it("respects intentionally removed photos", async () => {
    expect(await getRecipePrintImageDataUri(normalizeRecipe({ name: "Soup", localMeta: { imageRemoved: true, cachedImage: "file:///old.jpg" } }), null)).toBe("");
    expect(printImages.base64).not.toHaveBeenCalled();
    expect(printImages.download).not.toHaveBeenCalled();
  });
});
