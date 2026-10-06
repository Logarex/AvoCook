import type { CommunityRecipe } from "./communityClient";
import { resolveAppLanguage } from "../../i18n/languages";

type TranslationResult = { text: string; success: boolean };

const TEXT_CACHE = new Map<string, string>();
const PENDING_TRANSLATIONS = new Map<string, Promise<TranslationResult>>();
const MAX_CACHE_ENTRIES = 500;
const GOOGLE_MAX_BYTES = 1500;
// MyMemory accepts at most 500 UTF-8 bytes per query.
const MYMEMORY_MAX_BYTES = 450;
const REQUEST_TIMEOUT_MS = 10000;
const MAX_CONCURRENT_REQUESTS = 4;
const DELIMITER = "\n---\n";
const PROVIDER_ERROR = /MYMEMORY WARNING|QUERY LENGTH LIMIT|QUOTA EXCEEDED|INVALID KEY|RESPONSE STATUS 4|TOO MANY REQUESTS/i;
let cacheGeneration = 0;
let activeRequests = 0;
const requestQueue: (() => void)[] = [];

export function clearTranslationCache(): void {
  cacheGeneration++;
  TEXT_CACHE.clear();
  PENDING_TRANSLATIONS.clear();
}

export function hasCorruptedText(item: string | CommunityRecipe): boolean {
  const isCorrupt = (text: string) =>
    /%[0-9A-Fa-f]{2}|%\s+20|(?:bl){3,}/i.test(text) || PROVIDER_ERROR.test(text);
  if (typeof item === "string") return isCorrupt(item);
  return [item.title, item.description, ...item.ingredients, ...item.steps].some(isCorrupt);
}

export function cleanTranslatedText(raw: string): string {
  if (!raw || PROVIDER_ERROR.test(raw)) return "";
  let text = raw;
  // A percentage such as "40% de crème" is not a URI escape.
  text = text.replace(/%\s+20/g, "%20");
  for (let i = 0; i < 3; i++) {
    const decoded = text.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
      try {
        return decodeURIComponent(match);
      } catch {
        return match;
      }
    });
    if (decoded === text) break;
    text = decoded;
  }
  const entities: Record<string, string> = {
    quot: '"', apos: "'", amp: "&", lt: "<", gt: ">", nbsp: " ", deg: "°",
    agrave: "à", aacute: "á", acirc: "â", auml: "ä", aring: "å", atilde: "ã", aelig: "æ",
    ccedil: "ç", egrave: "è", eacute: "é", ecirc: "ê", euml: "ë",
    igrave: "ì", iacute: "í", icirc: "î", iuml: "ï", ntilde: "ñ",
    ograve: "ò", oacute: "ó", ocirc: "ô", ouml: "ö", otilde: "õ", oslash: "ø", oelig: "œ",
    ugrave: "ù", uacute: "ú", ucirc: "û", uuml: "ü", yacute: "ý", yuml: "ÿ", szlig: "ß",
    rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", ndash: "–", mdash: "—",
    laquo: "«", raquo: "»", frac12: "½", frac14: "¼", frac34: "¾", times: "×"
  };
  for (let i = 0; i < 3; i++) {
    const decoded = text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (match, entity: string) => {
      if (!entity.startsWith("#")) {
        const value = entities[entity.toLowerCase()];
        return value ? (/^[A-Z]/.test(entity) ? value.toUpperCase() : value) : match;
      }
      const code = entity[1].toLowerCase() === "x"
        ? parseInt(entity.slice(2), 16)
        : Number(entity.slice(1));
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : match;
    });
    if (decoded === text) break;
    text = decoded;
  }
  return text
    .replace(/(?:bl){3,}/gi, "")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function byteLength(text: string): number {
  return Array.from(text).reduce((bytes, char) => {
    const code = char.codePointAt(0)!;
    return bytes + (code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4);
  }, 0);
}

function splitText(text: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let remaining = text;
  while (byteLength(remaining) > maxBytes) {
    let end = 0;
    let bytes = 0;
    let wordEnd = 0;
    let sentenceEnd = 0;
    for (const char of remaining) {
      const size = byteLength(char);
      if (bytes + size > maxBytes) break;
      bytes += size;
      end += char.length;
      if (/\s/.test(char)) {
        wordEnd = end;
        if (char === "\n" || /[.!?]\s$/.test(remaining.slice(0, end))) sentenceEnd = end;
      }
    }
    const boundary = sentenceEnd > end / 2 ? sentenceEnd : wordEnd || end;
    chunks.push(remaining.slice(0, boundary));
    remaining = remaining.slice(boundary);
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function fetchTranslationJson(url: string): Promise<unknown> {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>((resolve) => requestQueue.push(resolve));
  } else {
    activeRequests++;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    const next = requestQueue.shift();
    if (next) next();
    else activeRequests--;
  }
}

function validTranslation(raw: string): string | null {
  if (PROVIDER_ERROR.test(raw) || /(?:bl){3,}/i.test(raw)) return null;
  const cleaned = cleanTranslatedText(raw);
  return cleaned && !hasCorruptedText(cleaned) ? cleaned : null;
}

async function translateWithGoogle(text: string, from: string, to: string): Promise<string | null> {
  const data = await fetchTranslationJson(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text)}`
  );
  if (!Array.isArray(data) || !Array.isArray(data[0]) || !data[0].length) return null;
  const chunks: unknown[] = data[0];
  if (chunks.some((chunk) => !Array.isArray(chunk) || typeof chunk[0] !== "string")) return null;
  return validTranslation(chunks.map((chunk) => (chunk as string[])[0]).join(""));
}

async function translateWithMyMemory(text: string, from: string, to: string): Promise<string | null> {
  const data = await fetchTranslationJson(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`
  ) as { responseData?: { translatedText?: unknown }; responseStatus?: number } | null;
  if (data?.responseStatus !== 200 || typeof data.responseData?.translatedText !== "string") return null;
  return validTranslation(data.responseData.translatedText);
}

function cacheKey(text: string, from: string, to: string): string {
  return JSON.stringify([from, to, text]);
}

function remember(text: string, from: string, to: string, result: TranslationResult, generation: number): void {
  // Keep unchanged text retryable when a provider returns the source.
  if (generation !== cacheGeneration || !result.success || result.text === text) return;
  const key = cacheKey(text, from, to);
  TEXT_CACHE.delete(key);
  TEXT_CACHE.set(key, result.text);
  if (TEXT_CACHE.size > MAX_CACHE_ENTRIES) TEXT_CACHE.delete(TEXT_CACHE.keys().next().value!);
}

async function translateChunks(
  text: string,
  maxBytes: number,
  translate: (chunk: string) => Promise<TranslationResult>
): Promise<TranslationResult> {
  const results = await Promise.all(splitText(text, maxBytes).map(async (chunk) => {
    const result = await translate(chunk.trim());
    return { ...result, text: result.text + (chunk.match(/\s+$/)?.[0] ?? "") };
  }));
  return {
    text: cleanTranslatedText(results.map((result) => result.text).join("")),
    success: results.every((result) => result.success)
  };
}

async function translateTextResult(text: string, from: string, to: string): Promise<TranslationResult> {
  if (!text || from === to) return { text, success: true };
  const key = cacheKey(text, from, to);
  const cached = TEXT_CACHE.get(key);
  if (cached !== undefined) return { text: cached, success: true };
  const pending = PENDING_TRANSLATIONS.get(key);
  if (pending) return pending;
  const generation = cacheGeneration;
  const request = translateChunks(text, GOOGLE_MAX_BYTES, async (chunk) => {
    const google = await translateWithGoogle(chunk, from, to);
    if (google && google !== chunk) return { text: google, success: true };
    const fallback = await translateChunks(chunk, MYMEMORY_MAX_BYTES, async (part) => {
      const translated = await translateWithMyMemory(part, from, to);
      return { text: translated ?? part, success: translated !== null };
    });
    return fallback.success ? fallback : { text: google ?? chunk, success: google !== null };
  });
  PENDING_TRANSLATIONS.set(key, request);
  try {
    const result = await request;
    remember(text, from, to, result, generation);
    return result;
  } finally {
    if (PENDING_TRANSLATIONS.get(key) === request) PENDING_TRANSLATIONS.delete(key);
  }
}

export async function translateText(text: string, fromLang: string, toLang: string): Promise<string> {
  return (await translateTextResult(cleanTranslatedText(text), resolveAppLanguage(fromLang), resolveAppLanguage(toLang))).text;
}

async function translateBatchResults(items: string[], from: string, to: string): Promise<TranslationResult[]> {
  const cleaned = items.map(cleanTranslatedText);
  const results = cleaned.map((text) => ({ text, success: !text || from === to }));
  if (from === to) return results;
  const generation = cacheGeneration;
  const groups: number[][] = [];
  let group: number[] = [];
  let bytes = 0;
  cleaned.forEach((text, index) => {
    if (!text) return;
    const cached = TEXT_CACHE.get(cacheKey(text, from, to));
    if (cached !== undefined) {
      results[index] = { text: cached, success: true };
      return;
    }
    const size = byteLength(text);
    if (size > GOOGLE_MAX_BYTES || text.includes("---")) {
      if (group.length) groups.push(group);
      groups.push([index]);
      group = [];
      bytes = 0;
      return;
    }
    if (bytes + size + (group.length ? byteLength(DELIMITER) : 0) > GOOGLE_MAX_BYTES) {
      groups.push(group);
      group = [];
      bytes = 0;
    }
    bytes += size + (group.length ? byteLength(DELIMITER) : 0);
    group.push(index);
  });
  if (group.length) groups.push(group);
  await Promise.all(groups.map(async (indices) => {
    const joined = indices.map((index) => cleaned[index]).join(DELIMITER);
    const translated = indices.length > 1 ? await translateWithGoogle(joined, from, to) : null;
    const parts = translated?.split(/\s*---\s*/).map(cleanTranslatedText);
    await Promise.all(indices.map(async (index, position) => {
      const part = parts?.length === indices.length ? parts[position] : null;
      const result = part && part !== cleaned[index] && !hasCorruptedText(part)
        ? { text: part, success: true }
        : await translateTextResult(cleaned[index], from, to);
      results[index] = result;
      remember(cleaned[index], from, to, result, generation);
    }));
  }));
  return results;
}

export async function translateBatch(items: string[], fromLang: string, toLang: string): Promise<string[]> {
  return (await translateBatchResults(items, resolveAppLanguage(fromLang), resolveAppLanguage(toLang)))
    .map((result) => result.text);
}

// Previews retain the source language for filtering.
export async function translateCommunityRecipePreviews(recipes: CommunityRecipe[], targetLang: string): Promise<CommunityRecipe[]> {
  const target = resolveAppLanguage(targetLang);
  const translated = [...recipes];
  const sourceLanguages = [...new Set(recipes.map((recipe) => resolveAppLanguage(recipe.language)))];
  await Promise.all(sourceLanguages.map(async (source) => {
    if (source === target) return;
    const indices = recipes.flatMap((recipe, index) => resolveAppLanguage(recipe.language) === source ? [index] : []);
    const fields = indices.flatMap((index) => [recipes[index].title, recipes[index].description]);
    const results = await translateBatchResults(fields, source, target);
    indices.forEach((index, position) => {
      translated[index] = {
        ...recipes[index],
        title: results[position * 2].text,
        description: results[position * 2 + 1].text
      };
    });
  }));
  return translated;
}

export async function translateCommunityRecipe(recipe: CommunityRecipe, targetLang: string): Promise<CommunityRecipe> {
  const target = resolveAppLanguage(targetLang);
  const source = resolveAppLanguage(recipe.language);
  if (source === target) return recipe;
  const results = await translateBatchResults(
    [recipe.title, recipe.description, ...recipe.ingredients, ...recipe.steps], source, target
  );
  if (results.some((result) => !result.success)) throw new Error("Community recipe translation failed");
  return {
    ...recipe,
    language: target,
    title: results[0].text,
    description: results[1].text,
    ingredients: results.slice(2, 2 + recipe.ingredients.length).map((result) => result.text),
    steps: results.slice(2 + recipe.ingredients.length).map((result) => result.text)
  };
}
