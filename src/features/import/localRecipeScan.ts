import { requireOptionalNativeModule } from "expo";
import type { Recipe } from "../recipes/types";
import {
  orderOcrLines,
  parseRecipeText,
  recipeFromStructured,
  type OcrLine,
  type StructuredRecipe,
} from "./recipeTextParser";

/**
 * Free recipe import that runs entirely on the device: the phone reads the
 * text (Apple Vision, ML Kit), its own AI tidies it when available (Apple
 * Intelligence, Gemini Nano), and simple rules do the job otherwise.
 */

export type LocalAiStatus = "available" | "downloading" | "downloadable" | "disabled" | "unavailable";

type PdfPage = { text?: string; lines?: OcrLine[] };

type RecipeScanModule = {
  recognizeText(uri: string): Promise<OcrLine[]>;
  readPdf(uri: string, maxPages: number): Promise<PdfPage[]>;
  localModelStatus(): Promise<LocalAiStatus>;
  /** An object on iOS, JSON text on Android. */
  structureRecipe(text: string): Promise<StructuredRecipe | string>;
};

export const MAX_SCAN_PAGES = 5;
export const MAX_PDF_PAGES = 10;
/** The device's AI only tidies the text: past this delay the rules answer instead. */
export const LOCAL_AI_TIMEOUT_MS = 30_000;

export type LocalRecipeResult = {
  recipe: Recipe;
  /** True when the device's own AI shaped the recipe. */
  usedLocalAi: boolean;
  /** False when ingredients or steps are missing: the user fills them in. */
  complete: boolean;
};

/** Nothing readable looks like a recipe. */
export class NoRecipeFoundError extends Error {
  constructor() {
    super("No recipe text found");
    this.name = "NoRecipeFoundError";
  }
}

export class PdfLockedError extends Error {
  constructor() {
    super("The PDF is protected by a password");
    this.name = "PdfLockedError";
  }
}

let nativeModule: RecipeScanModule | null | undefined;
function scanModule(): RecipeScanModule | null {
  if (nativeModule === undefined) {
    nativeModule = requireOptionalNativeModule<RecipeScanModule>("AvoCookRecipeScan");
  }
  return nativeModule;
}

/** Test hook. */
export function setRecipeScanModuleForTests(module: RecipeScanModule | null | undefined) {
  nativeModule = module;
}

/** False in Expo Go or on the web, where the native scanner is not built in. */
export function isDeviceScanAvailable() {
  return scanModule() !== null;
}

export async function getLocalAiStatus(): Promise<LocalAiStatus> {
  try {
    return (await scanModule()?.localModelStatus()) ?? "unavailable";
  } catch {
    return "unavailable";
  }
}

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Small on-device models can rephrase or invent. Keep their answer only when
 * the ingredients and steps are really in the text that was read.
 */
export function isFaithfulToText(recipe: Recipe, source: string): boolean {
  const words = new Set(fold(source).match(/[\p{L}\d]+/gu) ?? []);
  const supported = (item: string, threshold: number) => {
    const itemWords = (fold(item).match(/[\p{L}\d]+/gu) ?? []).filter((word) => word.length > 2 || /\d/.test(word));
    if (!itemWords.length) return true;
    return itemWords.filter((word) => words.has(word)).length / itemWords.length >= threshold;
  };
  const share = (items: string[], threshold: number) =>
    items.length ? items.filter((item) => supported(item, threshold)).length / items.length : 0;
  return share(recipe.recipeIngredient, 0.75) >= 0.8 && share(recipe.recipeInstructions, 0.6) >= 0.8;
}

function parseModelAnswer(answer: StructuredRecipe | string): StructuredRecipe | null {
  if (typeof answer !== "string") return answer;
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(answer);
  const body = fenced ? fenced[1] : answer.slice(answer.indexOf("{"), answer.lastIndexOf("}") + 1);
  try {
    const value: unknown = JSON.parse(body);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as StructuredRecipe) : null;
  } catch {
    return null;
  }
}

/** Builds a draft from text: the device's AI when it is available and faithful, rules otherwise. */
export async function recipeFromLocalText(lines: string[]): Promise<LocalRecipeResult> {
  const text = lines.join("\n").trim();
  if (text.replace(/\s/g, "").length < 15) throw new NoRecipeFoundError();
  const parsed = parseRecipeText(lines);
  const module = scanModule();
  if (module && (await getLocalAiStatus()) === "available") {
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const answer = await Promise.race([
        module.structureRecipe(text),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("On-device AI took too long")), LOCAL_AI_TIMEOUT_MS);
        }),
      ]).finally(() => clearTimeout(timer));
      const structured = recipeFromStructured(parseModelAnswer(answer));
      if (structured && isFaithfulToText(structured, text)) {
        const rules = parsed.recipe;
        return {
          recipe: {
            ...structured,
            name: structured.name || rules.name,
            description: structured.description || rules.description,
            recipeYield: structured.recipeYield > 1 ? structured.recipeYield : rules.recipeYield,
            prepTime: structured.prepTime ?? rules.prepTime,
            cookTime: structured.cookTime ?? rules.cookTime,
            totalTime: rules.totalTime,
          },
          usedLocalAi: true,
          complete: true,
        };
      }
      console.warn("import", "On-device AI answer did not match the scanned text; using rules");
    } catch (error) {
      console.warn("import", "On-device AI could not structure the recipe; using rules", error);
    }
  }
  const { recipe, complete } = parsed;
  if (!recipe.recipeIngredient.length && !recipe.recipeInstructions.length) throw new NoRecipeFoundError();
  return { recipe, usedLocalAi: false, complete };
}

function requireModule(): RecipeScanModule {
  const module = scanModule();
  if (!module) throw new Error("On-device recipe scan is not available in this build");
  return module;
}

/** Reads one or more photos of the same recipe (pages in order). */
export async function recipeFromPhotos(uris: string[]): Promise<LocalRecipeResult> {
  const module = requireModule();
  const lines: string[] = [];
  for (const uri of uris.slice(0, MAX_SCAN_PAGES)) {
    const pageLines = orderOcrLines(await module.recognizeText(uri));
    if (lines.length && pageLines.length) lines.push("");
    lines.push(...pageLines);
  }
  return recipeFromLocalText(lines);
}

export async function recipeFromPdf(uri: string): Promise<LocalRecipeResult> {
  const module = requireModule();
  let pages: PdfPage[];
  try {
    pages = await module.readPdf(uri, MAX_PDF_PAGES);
  } catch (error) {
    if ((error as { code?: string } | null)?.code === "ERR_PDF_LOCKED") throw new PdfLockedError();
    throw error;
  }
  const lines: string[] = [];
  for (const page of pages) {
    const pageLines = page.text !== undefined ? page.text.replace(/\r\n?/g, "\n").split("\n") : orderOcrLines(page.lines ?? []);
    if (lines.length && pageLines.length) lines.push("");
    lines.push(...pageLines);
  }
  return recipeFromLocalText(lines);
}

/** Pasted text: works without the native module (rules only). */
export function recipeFromPastedText(text: string): Promise<LocalRecipeResult> {
  return recipeFromLocalText(text.replace(/\r\n?/g, "\n").split("\n"));
}
