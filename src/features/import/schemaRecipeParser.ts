import { normalizeRecipe, type Recipe } from "../recipes/types";

type JsonLdValue = Record<string, unknown> | JsonLdValue[] | string;

export type ImportSource = {
  host: string;
  region: "france" | "world";
};

export const SUPPORTED_IMPORT_SITES: ImportSource[] = [
  { host: "marmiton.org", region: "france" },
  { host: "cuisineaz.com", region: "france" },
  { host: "750g.com", region: "france" },
  { host: "journaldesfemmes.fr", region: "france" },
  { host: "papillesetpupilles.fr", region: "france" },
  { host: "hervecuisine.com", region: "france" },
  { host: "atelierdeschefs.fr", region: "france" },
  { host: "allrecipes.com", region: "world" },
  { host: "bbcgoodfood.com", region: "world" },
  { host: "seriouseats.com", region: "world" },
  { host: "foodnetwork.com", region: "world" },
  { host: "nytimes.com", region: "world" },
  { host: "chefkoch.de", region: "world" },
  { host: "giallozafferano.it", region: "world" },
  { host: "recetasderechupete.com", region: "world" },
  { host: "cookpad.com", region: "world" }
];

export async function importRecipeFromWeb(url: string): Promise<Recipe> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) {
    throw new Error(`Recipe page returned ${response.status}`);
  }

  const html = await response.text();
  const recipeJsonLd = findRecipeJsonLd(html);
  if (!recipeJsonLd) {
    throw new Error("No schema.org Recipe JSON-LD found");
  }

  return jsonLdToRecipe(recipeJsonLd, url);
}

export function findRecipeJsonLd(html: string): Record<string, unknown> | null {
  const scripts = html.matchAll(
    /<script[^>]+type=["']application(?:\/|&#x2F;)ld(?:\+|&#x2B;)json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const script of scripts) {
    const rawJson = decodeHtmlEntities(script[1].trim());
    const parsed = safeJsonParse(rawJson);
    const recipe = findRecipeObject(parsed);
    if (recipe) {
      return recipe;
    }
  }

  return null;
}

export function jsonLdToRecipe(
  jsonLd: Record<string, unknown>,
  sourceUrl = ""
): Recipe {
  const image = normalizeImage(jsonLd.image);
  const instructions = normalizeInstructions(jsonLd.recipeInstructions);
  const ingredients = normalizeStringArray(jsonLd.recipeIngredient);
  const tools = normalizeStringArray(jsonLd.tool);
  const keywords = Array.isArray(jsonLd.keywords)
    ? normalizeStringArray(jsonLd.keywords).join(",")
    : toStringValue(jsonLd.keywords);

  return normalizeRecipe({
    id: null,
    name: toStringValue(jsonLd.name),
    description: toStringValue(jsonLd.description),
    url: toStringValue(jsonLd.url) || sourceUrl,
    image,
    imageUrl: image,
    imagePlaceholderUrl: image,
    keywords,
    prepTime: toStringValue(jsonLd.prepTime) || null,
    cookTime: toStringValue(jsonLd.cookTime) || null,
    totalTime: toStringValue(jsonLd.totalTime) || null,
    recipeYield: normalizeYield(jsonLd.recipeYield),
    recipeCategory: Array.isArray(jsonLd.recipeCategory)
      ? normalizeStringArray(jsonLd.recipeCategory)[0] ?? ""
      : toStringValue(jsonLd.recipeCategory),
    recipeIngredient: ingredients,
    recipeInstructions: instructions,
    tool: tools,
    nutrition:
      typeof jsonLd.nutrition === "object" && jsonLd.nutrition !== null
        ? (jsonLd.nutrition as Recipe["nutrition"])
        : { "@type": "NutritionInformation" }
  });
}

function safeJsonParse(rawJson: string): JsonLdValue | null {
  try {
    return JSON.parse(rawJson) as JsonLdValue;
  } catch {
    const fixed = rawJson.replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(fixed) as JsonLdValue;
    } catch {
      return null;
    }
  }
}

function findRecipeObject(value: JsonLdValue | null): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const recipe = findRecipeObject(item);
      if (recipe) {
        return recipe;
      }
    }
    return null;
  }

  if (typeof value !== "object") {
    return null;
  }

  const maybeType = value["@type"];
  const types = Array.isArray(maybeType) ? maybeType : [maybeType];
  if (
    types.some(
      (type) => typeof type === "string" && type.toLowerCase() === "recipe"
    )
  ) {
    return value;
  }

  const graph = value["@graph"];
  if (Array.isArray(graph)) {
    return findRecipeObject(graph as JsonLdValue[]);
  }

  return null;
}

function normalizeInstructions(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return splitLines(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") {
        return splitLines(item);
      }
      if (typeof item === "object" && item !== null) {
        const node = item as Record<string, unknown>;
        if (Array.isArray(node.itemListElement)) {
          return normalizeInstructions(node.itemListElement);
        }
        return splitLines(toStringValue(node.text || node.name));
      }
      return [];
    });
  }

  if (typeof value === "object") {
    const node = value as Record<string, unknown>;
    return normalizeInstructions(node.itemListElement || node.text || node.name);
  }

  return [];
}

function normalizeImage(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return normalizeImage(value[0]);
  }

  if (typeof value === "object") {
    const image = value as Record<string, unknown>;
    return toStringValue(image.url || image.contentUrl);
  }

  return "";
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return splitLines(value);
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeStringArray(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "object") {
    const node = value as Record<string, unknown>;
    return [toStringValue(node.name || node.text)].filter(Boolean);
  }

  return [String(value)];
}

function normalizeYield(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number.parseInt(toStringValue(value), 10);
  return Number.isNaN(parsed) ? 1 : parsed;
}

function toStringValue(value: unknown): string {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return decodeHtmlEntities(value).trim();
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(toStringValue).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    const node = value as Record<string, unknown>;
    return toStringValue(node.name || node.text || node.url);
  }
  return String(value);
}

function splitLines(value: string): string[] {
  return decodeHtmlEntities(value)
    .split(/\r?\n|(?:<br\s*\/?>)/i)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
