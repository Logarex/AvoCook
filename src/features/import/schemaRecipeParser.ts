import { normalizeRecipe, type Recipe } from "../recipes/types";

type JsonLdValue = Record<string, unknown> | JsonLdValue[] | string;

// ─── Errors ────────────────────────────────────────────────────────────────────

// ─── Public API ────────────────────────────────────────────────────────────────

export async function importRecipeFromWeb(url: string): Promise<Recipe> {
  // Use realistic Safari/iOS headers.
  // This dramatically improves success rates on sites protected by Cloudflare
  // because URLSession's TLS fingerprint already matches Safari; adding the
  // matching HTTP headers completes the picture and avoids bot-detection.
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
        "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
        "Version/17.0 Mobile/15E148 Safari/604.1",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "max-age=0",
    }
  });

  if (!response.ok) {
    throw new Error(`Recipe page returned ${response.status}`);
  }

  const html = await response.text();

  const recipeJsonLd = findRecipeJsonLd(html);

  if (recipeJsonLd) {
    const hasIngredients =
      Array.isArray(recipeJsonLd.recipeIngredient) &&
      (recipeJsonLd.recipeIngredient as unknown[]).length > 0;

    let hasInstructions = false;
    if (Array.isArray(recipeJsonLd.recipeInstructions)) {
      hasInstructions = recipeJsonLd.recipeInstructions.length > 0;
    } else if (typeof recipeJsonLd.recipeInstructions === "string") {
      hasInstructions = recipeJsonLd.recipeInstructions.trim().length > 0;
    } else if (recipeJsonLd.recipeInstructions) {
      hasInstructions = true; // e.g. HowToSection objects
    }

    if (hasIngredients && hasInstructions) {
      // JSON-LD is fully valid and has content — use it directly
      return jsonLdToRecipe(recipeJsonLd, url);
    }

    // JSON-LD found but missing ingredients / instructions
    // Try Semantic HTML fallback to supplement it.
    const semanticData = extractSemanticHtmlRecipe(html);
    if (semanticData) {
      const semIngredients = semanticData.recipeIngredient as string[] | undefined;
      const semInstructions = semanticData.recipeInstructions as string[] | undefined;

      const merged: Record<string, unknown> = {
        ...semanticData,
        ...recipeJsonLd,
        prepTime: recipeJsonLd.prepTime || semanticData.prepTime,
        cookTime: recipeJsonLd.cookTime || semanticData.cookTime,
        recipeYield: recipeJsonLd.recipeYield || semanticData.recipeYield,
        // Prefer semantic ingredients if present, as they usually contain full quantities.
        recipeIngredient:
          semIngredients && semIngredients.length > 0
            ? semanticData.recipeIngredient
            : recipeJsonLd.recipeIngredient,
        // Prefer semantic instructions if present.
        recipeInstructions:
          semInstructions && semInstructions.length > 0
            ? semanticData.recipeInstructions
            : recipeJsonLd.recipeInstructions,
      };
      const mergedRecipe = jsonLdToRecipe(merged, url);
      if (mergedRecipe.recipeIngredient.length === 0 && mergedRecipe.recipeInstructions.length === 0) {
        throw new Error("INCOMPLETE_RECIPE");
      }
      return mergedRecipe;
    }

    const fallbackRecipe = jsonLdToRecipe(recipeJsonLd, url);
    if (fallbackRecipe.recipeIngredient.length === 0 && fallbackRecipe.recipeInstructions.length === 0) {
      throw new Error("INCOMPLETE_RECIPE");
    }
    return fallbackRecipe;
  }

  // No JSON-LD Recipe at all → try Semantic HTML fallback
  const semanticData = extractSemanticHtmlRecipe(html);
  if (semanticData) {
    return jsonLdToRecipe(semanticData, url);
  }

  throw new Error("No schema.org Recipe JSON-LD found");
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
  const image = normalizeImage(jsonLd.image, sourceUrl);
  const instructions = normalizeInstructions(jsonLd.recipeInstructions);
  const ingredients = normalizeStringArray(jsonLd.recipeIngredient);
  const tools = normalizeStringArray(jsonLd.tool);
  const keywords = Array.isArray(jsonLd.keywords)
    ? normalizeStringArray(jsonLd.keywords).join(",")
    : toStringValue(jsonLd.keywords);
  const recipeUrl = resolveUrl(toStringValue(jsonLd.url), sourceUrl) || sourceUrl;

  return normalizeRecipe({
    id: null,
    name: toStringValue(jsonLd.name),
    description: toStringValue(jsonLd.description),
    url: recipeUrl,
    image,
    imageUrl: image,
    imagePlaceholderUrl: image,
    keywords,
    prepTime: toStringValue(jsonLd.prepTime) || null,
    cookTime: toStringValue(jsonLd.cookTime) || null,
    totalTime: toStringValue(jsonLd.totalTime) || null,
    recipeYield: normalizeYield(jsonLd.recipeYield),
    recipeCategory: "",
    recipeIngredient: ingredients,
    recipeInstructions: instructions,
    tool: tools,
    nutrition:
      typeof jsonLd.nutrition === "object" && jsonLd.nutrition !== null
        ? (jsonLd.nutrition as Recipe["nutrition"])
        : { "@type": "NutritionInformation" }
  });
}

// ─── Semantic HTML fallback ──────────────────────────────────────────────────

export function extractSemanticHtmlRecipe(html: string): Record<string, unknown> | null {
  const recipe: Record<string, unknown> = {
    "@type": "Recipe",
    recipeIngredient: [] as string[],
    recipeInstructions: [] as string[]
  };

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    let title = stripHtmlTags(titleMatch[1]);
    title = decodeHtmlEntities(title);
    title = title.split('|')[0].split('-')[0].trim();
    recipe.name = title;
  }

  const imgMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (imgMatch) {
    recipe.image = imgMatch[1];
  }

  const ingHeadingRegex = /<h[1-6][^>]*>[^<]*(?:Ingr[eé]dients|Ingredients|Ingredientes|Zutaten|Ingredienti)[^<]*<\/h[1-6]>/i;
  const ingMatch = html.match(ingHeadingRegex);

  if (ingMatch) {
    const afterHeading = html.slice(ingMatch.index! + ingMatch[0].length);
    const nextHeadingMatch = afterHeading.match(/<h[1-6][^>]*>/i);
    const sectionHtml = nextHeadingMatch
      ? afterHeading.slice(0, nextHeadingMatch.index)
      : afterHeading;

    // Extract yield
    const yieldMatch = sectionHtml.match(/(?:pour|donne|servings?|serves|yields?|para|porciones|rinde|f[üu]r|personen|porzioni|per)\s*(\d+)/i);
    if (yieldMatch) {
      recipe.recipeYield = yieldMatch[1];
    }

    // Extract prep and cook times
    const prepMatch = sectionHtml.match(/(?:pr[eé]paration|prep(?:aration)?(?:\s*time)?|tiempo\s+de\s+preparaci[oó]n|preparaci[oó]n|zubereitungszeit|zubereitung|tempo\s+di\s+preparazione|preparazione)\s*(?::|[-–])?\s*(\d+)\s*(h|min|m\b)/i);
    if (prepMatch) {
      const isHour = prepMatch[2].toLowerCase().startsWith("h");
      recipe.prepTime = `PT${prepMatch[1]}${isHour ? "H" : "M"}`;
    }

    const cookMatch = sectionHtml.match(/(?:cuisson|cook(?:ing)?(?:\s*time)?|tiempo\s+de\s+cocci[oó]n|cocci[oó]n|kochzeit|backzeit|garzeit|tempo\s+di\s+cottura|cottura)\s*(?::|[-–])?\s*(\d+)\s*(h|min|m\b)/i);
    if (cookMatch) {
      const isHour = cookMatch[2].toLowerCase().startsWith("h");
      recipe.cookTime = `PT${cookMatch[1]}${isHour ? "H" : "M"}`;
    }

    const listMatch = sectionHtml.match(/<(?:ul|ol)[^>]*>([\s\S]*?)<\/(?:ul|ol)>/i);
    if (listMatch) {
      const items = [...listMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(m => m[1]);
      recipe.recipeIngredient = items
        .map(stripHtmlTags)
        .map(decodeHtmlEntities)
        .filter(i => i.length > 0);
    }
  }

  const instHeadingRegex = /<h[1-6][^>]*>[^<]*(?:Pr[eé]paration|Preparation|Instructions|Recette|Assemblez|Preparaci[oó]n|Instrucciones|Receta|Zubereitung|Anleitung|Rezept|Preparazione|Istruzioni|Ricetta)[^<]*<\/h[1-6]>/gi;
  const instMatches = [...html.matchAll(instHeadingRegex)];

  if (instMatches.length > 0) {
    const instructions: string[] = [];
    
    for (let i = 0; i < instMatches.length; i++) {
      const match = instMatches[i];
      const afterHeading = html.slice(match.index! + match[0].length);
      const nextHeadingMatch = afterHeading.match(/<h[1-6][^>]*>|<\/div>/i);
      const sectionHtml = nextHeadingMatch
        ? afterHeading.slice(0, nextHeadingMatch.index)
        : afterHeading;

      const pMatches = [...sectionHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => m[1]);
      if (pMatches.length > 0) {
        instructions.push(
          ...pMatches
            .map(stripHtmlTags)
            .map(decodeHtmlEntities)
            .filter(item => item.length > 0 && !item.toLowerCase().includes("temps de"))
        );
      } else {
        const listMatch = sectionHtml.match(/<(?:ul|ol)[^>]*>([\s\S]*?)<\/(?:ul|ol)>/i);
        if (listMatch) {
          const items = [...listMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(m => m[1]);
          instructions.push(
            ...items
              .map(stripHtmlTags)
              .map(decodeHtmlEntities)
              .filter(item => item.length > 0)
          );
        }
      }
    }
    recipe.recipeInstructions = instructions;
  }

  const hasIngredients = (recipe.recipeIngredient as string[]).length > 0;
  const hasInstructions = (recipe.recipeInstructions as string[]).length > 0;

  if (hasIngredients || hasInstructions) {
    return recipe;
  }
  return null;
}

// ─── JSON-LD Helpers ────────────────────────────────────────────────────────────

function safeJsonParse(rawJson: string): JsonLdValue | null {
  // Remove BOM character that some WordPress installations output.
  const cleaned = rawJson.replace(/^\uFEFF/, "");

  try {
    return JSON.parse(cleaned) as JsonLdValue;
  } catch {
    // Fix 1: trailing commas before } or ]
    const fix1 = cleaned.replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(fix1) as JsonLdValue;
    } catch {
      // Fix 2: strip C0 control characters that are invalid in JSON strings
      // (keeps \n, \r, \t which are valid outside strings as whitespace)
      const fix2 = fix1.replace(
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
        " "
      );
      try {
        return JSON.parse(fix2) as JsonLdValue;
      } catch {
        return null;
      }
    }
  }
}

function findRecipeObject(
  value: JsonLdValue | null
): Record<string, unknown> | null {
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

function normalizeImage(value: unknown, sourceUrl = ""): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return resolveUrl(value, sourceUrl);
  }

  if (Array.isArray(value)) {
    return normalizeImage(value[0], sourceUrl);
  }

  if (typeof value === "object") {
    const image = value as Record<string, unknown>;
    return resolveUrl(toStringValue(image.url || image.contentUrl), sourceUrl);
  }

  return "";
}

function resolveUrl(value: string, sourceUrl: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    return sourceUrl ? new URL(trimmed, sourceUrl).toString() : trimmed;
  } catch {
    return trimmed;
  }
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
    return stripHtmlTags(decodeHtmlEntities(value)).trim();
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
    .map((item) => stripHtmlTags(item).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Removes HTML / XML tags from a string, collapsing whitespace. */
function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Decodes HTML entities in a string.
 *
 * Handles:
 *   • Hex numeric entities:     &#xE9; → é
 *   • Decimal numeric entities: &#233; → é
 *   • Common named entities:    &amp; &lt; &gt; &quot; &apos;
 *   • European/French named:    &eacute; &agrave; &ccedil; &laquo; …
 *   • Typography:               &rsquo; &ldquo; &hellip; &mdash; &nbsp; …
 */
function decodeHtmlEntities(value: string): string {
  return value
    // Hex numeric entities (before decimal to avoid partial overlap)
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    // Decimal numeric entities
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10))
    )
    // Core named entities
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    // Whitespace / typography
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "\u2019") // '
    .replace(/&lsquo;/g, "\u2018") // '
    .replace(/&rdquo;/g, "\u201D") // "
    .replace(/&ldquo;/g, "\u201C") // "
    .replace(/&hellip;/g, "\u2026") // …
    .replace(/&mdash;/g, "\u2014") // —
    .replace(/&ndash;/g, "\u2013") // –
    .replace(/&laquo;/g, "\u00AB") // «
    .replace(/&raquo;/g, "\u00BB") // »
    // French / European accented letters
    .replace(/&eacute;/g, "\u00E9") // é
    .replace(/&Eacute;/g, "\u00C9") // É
    .replace(/&agrave;/g, "\u00E0") // à
    .replace(/&Agrave;/g, "\u00C0") // À
    .replace(/&egrave;/g, "\u00E8") // è
    .replace(/&Egrave;/g, "\u00C8") // È
    .replace(/&ecirc;/g, "\u00EA")  // ê
    .replace(/&Ecirc;/g, "\u00CA")  // Ê
    .replace(/&ocirc;/g, "\u00F4")  // ô
    .replace(/&Ocirc;/g, "\u00D4")  // Ô
    .replace(/&ugrave;/g, "\u00F9") // ù
    .replace(/&Ugrave;/g, "\u00D9") // Ù
    .replace(/&ucirc;/g, "\u00FB")  // û
    .replace(/&Ucirc;/g, "\u00DB")  // Û
    .replace(/&ccedil;/g, "\u00E7") // ç
    .replace(/&Ccedil;/g, "\u00C7") // Ç
    .replace(/&icirc;/g, "\u00EE")  // î
    .replace(/&Icirc;/g, "\u00CE")  // Î
    .replace(/&acirc;/g, "\u00E2")  // â
    .replace(/&Acirc;/g, "\u00C2"); // Â
}
