import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLocalAiStatus,
  isDeviceScanAvailable,
  isFaithfulToText,
  LOCAL_AI_TIMEOUT_MS,
  MAX_PDF_PAGES,
  NoRecipeFoundError,
  PdfLockedError,
  recipeFromPastedText,
  recipeFromPdf,
  recipeFromPhotos,
  setRecipeScanModuleForTests,
} from "../features/import/localRecipeScan";
import { parseRecipeText, type OcrLine } from "../features/import/recipeTextParser";

vi.mock("expo", () => ({ requireOptionalNativeModule: () => null }));

const page: OcrLine[] = [
  { text: "Crêpes", x: 0.1, y: 0.05, width: 0.8, height: 0.04 },
  { text: "Ingrédients", x: 0.1, y: 0.15, width: 0.3, height: 0.02 },
  { text: "250 g de farine", x: 0.1, y: 0.18, width: 0.3, height: 0.02 },
  { text: "4 œufs", x: 0.1, y: 0.21, width: 0.2, height: 0.02 },
  { text: "Préparation", x: 0.1, y: 0.3, width: 0.3, height: 0.02 },
  { text: "1. Mélangez la farine et les œufs.", x: 0.1, y: 0.33, width: 0.5, height: 0.02 },
  { text: "2. Faites cuire à la poêle.", x: 0.1, y: 0.36, width: 0.5, height: 0.02 },
];

const native = {
  recognizeText: vi.fn(),
  readPdf: vi.fn(),
  localModelStatus: vi.fn(),
  structureRecipe: vi.fn(),
};

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  for (const fn of Object.values(native)) fn.mockReset();
  native.localModelStatus.mockResolvedValue("unavailable");
  native.recognizeText.mockResolvedValue(page);
  setRecipeScanModuleForTests(native);
});
afterEach(() => {
  setRecipeScanModuleForTests(undefined);
  vi.restoreAllMocks();
});

describe("without the device's AI", () => {
  it("reads photos with rules and keeps the pages in order", async () => {
    native.recognizeText
      .mockResolvedValueOnce(page.slice(0, 4))
      .mockResolvedValueOnce(page.slice(4));
    const result = await recipeFromPhotos(["file:///1.jpg", "file:///2.jpg"]);
    expect(native.recognizeText.mock.calls.map(([uri]) => uri)).toEqual(["file:///1.jpg", "file:///2.jpg"]);
    expect(result.usedLocalAi).toBe(false);
    expect(result.complete).toBe(true);
    expect(result.recipe).toMatchObject({
      id: null,
      name: "Crêpes",
      recipeIngredient: ["250 g de farine", "4 œufs"],
      recipeInstructions: ["Mélangez la farine et les œufs.", "Faites cuire à la poêle."],
    });
    expect(native.structureRecipe).not.toHaveBeenCalled();
  });

  it("reports a photo without a recipe", async () => {
    native.recognizeText.mockResolvedValue([{ text: "Bon appétit", x: 0.1, y: 0.1, width: 0.3, height: 0.02 }]);
    await expect(recipeFromPhotos(["file:///dish.jpg"])).rejects.toBeInstanceOf(NoRecipeFoundError);
  });

  it("reads PDF text pages and scanned pages, within the page limit", async () => {
    native.readPdf.mockResolvedValue([
      { text: "Crêpes\nIngrédients\n250 g de farine" },
      { lines: page.slice(4) },
    ]);
    const result = await recipeFromPdf("file:///recette.pdf");
    expect(native.readPdf).toHaveBeenCalledWith("file:///recette.pdf", MAX_PDF_PAGES);
    expect(result.recipe.recipeIngredient).toEqual(["250 g de farine"]);
    expect(result.recipe.recipeInstructions).toHaveLength(2);
  });

  it("explains a password-protected PDF", async () => {
    native.readPdf.mockRejectedValue(Object.assign(new Error("locked"), { code: "ERR_PDF_LOCKED" }));
    await expect(recipeFromPdf("file:///secret.pdf")).rejects.toBeInstanceOf(PdfLockedError);
  });

  it("arranges pasted text, also when the native scanner is missing", async () => {
    setRecipeScanModuleForTests(null);
    expect(isDeviceScanAvailable()).toBe(false);
    expect(await getLocalAiStatus()).toBe("unavailable");
    const result = await recipeFromPastedText("Omelette\nIngredients\n3 eggs\nMethod\nWhisk and cook the eggs.");
    expect(result.recipe.recipeIngredient).toEqual(["3 eggs"]);
    await expect(recipeFromPastedText("hello")).rejects.toBeInstanceOf(NoRecipeFoundError);
    await expect(recipeFromPhotos(["file:///x.jpg"])).rejects.toThrow("not available");
  });
});

describe("with the device's AI", () => {
  const faithful = {
    name: "Crêpes",
    description: "",
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 0,
    ingredients: ["250 g de farine", "4 œufs"],
    steps: ["Mélangez la farine et les œufs.", "Faites cuire à la poêle."],
  };

  beforeEach(() => {
    native.localModelStatus.mockResolvedValue("available");
  });

  it("uses the iOS answer when it matches the text", async () => {
    native.structureRecipe.mockResolvedValue(faithful);
    const result = await recipeFromPhotos(["file:///1.jpg"]);
    expect(result.usedLocalAi).toBe(true);
    expect(result.recipe).toMatchObject({ recipeYield: 4, prepTime: "PT10M", cookTime: null });
    expect(native.structureRecipe.mock.calls[0][0]).toContain("250 g de farine");
  });

  it("reads the Android JSON answer, even inside a code block", async () => {
    native.structureRecipe.mockResolvedValue("Sure!\n```json\n" + JSON.stringify(faithful) + "\n```");
    expect((await recipeFromPhotos(["file:///1.jpg"])).usedLocalAi).toBe(true);
  });

  it.each([
    ["an invented ingredient", { ...faithful, ingredients: ["250 g de farine", "200 g de chocolat noir", "1 sachet de levure"] }],
    ["a translated recipe", { ...faithful, ingredients: ["250 g flour", "4 eggs"], steps: ["Mix the flour and eggs.", "Cook in a pan."] }],
    ["an empty answer", { ...faithful, steps: [] }],
    ["text that is not JSON", "I cannot help with that."],
  ])("falls back to rules on %s", async (_case, answer) => {
    native.structureRecipe.mockResolvedValue(answer);
    const result = await recipeFromPhotos(["file:///1.jpg"]);
    expect(result.usedLocalAi).toBe(false);
    expect(result.recipe.recipeIngredient).toEqual(["250 g de farine", "4 œufs"]);
  });

  it("falls back to rules when the model fails", async () => {
    native.structureRecipe.mockRejectedValue(new Error("unsupportedLanguageOrLocale"));
    expect((await recipeFromPhotos(["file:///1.jpg"])).usedLocalAi).toBe(false);
  });

  it("falls back to rules when the model takes too long", async () => {
    vi.useFakeTimers();
    native.structureRecipe.mockReturnValue(new Promise(() => {}));
    const pending = recipeFromPhotos(["file:///1.jpg"]);
    await vi.advanceTimersByTimeAsync(LOCAL_AI_TIMEOUT_MS);
    const result = await pending;
    vi.useRealTimers();
    expect(result.usedLocalAi).toBe(false);
    expect(result.recipe.recipeIngredient).toEqual(["250 g de farine", "4 œufs"]);
  });

  it("does not call the model when it is still downloading or turned off", async () => {
    for (const status of ["downloading", "downloadable", "disabled"]) {
      native.localModelStatus.mockResolvedValue(status);
      await recipeFromPhotos(["file:///1.jpg"]);
    }
    expect(native.structureRecipe).not.toHaveBeenCalled();
  });

  it("treats a failing status check as unavailable", async () => {
    native.localModelStatus.mockRejectedValue(new Error("AICore missing"));
    expect(await getLocalAiStatus()).toBe("unavailable");
  });
});

it("checks that a draft only uses words from the source text", () => {
  const source = "Crêpes 250 g de farine 4 œufs Mélangez la farine et les œufs.";
  const { recipe } = parseRecipeText(["Crêpes", "Ingrédients", "250 g de farine", "4 œufs", "Préparation", "Mélangez la farine et les œufs."]);
  expect(isFaithfulToText(recipe, source)).toBe(true);
  expect(isFaithfulToText({ ...recipe, recipeIngredient: ["1 kg de sucre"] }, source)).toBe(false);
});
