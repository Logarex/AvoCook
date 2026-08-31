import type { CommunityRecipe } from "./communityClient";
import { resolveAppLanguage } from "../../i18n/languages";

const TRANSLATION_CACHE = new Map<string, CommunityRecipe>();

export function clearTranslationCache(): void {
  TRANSLATION_CACHE.clear();
}

export function hasCorruptedText(item: string | CommunityRecipe): boolean {
  const isCorrupt = (str: string) => {
    if (!str) return false;
    if (/%[0-9A-Fa-f]{1,2}/i.test(str)) return true;
    if (/%\s+20/i.test(str)) return true;
    if (/(?:bl){3,}/i.test(str)) return true;
    if (/MYMEMORY WARNING/i.test(str)) return true;
    if (/QUERY LENGTH LIMIT/i.test(str)) return true;
    if (/QUOTA EXCEEDED/i.test(str)) return true;
    if (/INVALID KEY/i.test(str)) return true;
    return false;
  };

  if (typeof item === "string") {
    return isCorrupt(item);
  }

  return (
    isCorrupt(item.title) ||
    isCorrupt(item.description) ||
    item.ingredients.some(isCorrupt) ||
    item.steps.some(isCorrupt)
  );
}

export function cleanTranslatedText(raw: string): string {
  if (!raw) return "";
  let text = raw;

  if (
    /MYMEMORY WARNING/i.test(text) ||
    /QUERY LENGTH LIMIT/i.test(text) ||
    /QUOTA EXCEEDED/i.test(text) ||
    /INVALID KEY/i.test(text) ||
    /RESPONSE STATUS 4/i.test(text)
  ) {
    return "";
  }

  text = text.replace(/%\s+([0-9A-Fa-f]{1,2})/g, "%$1");

  text = text.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
    try {
      return decodeURIComponent(match);
    } catch {
      return match;
    }
  });

  for (let i = 0; i < 3; i++) {
    if (!text.includes("%")) break;
    try {
      const decoded = decodeURIComponent(text);
      if (decoded === text) break;
      text = decoded;
    } catch {
      try {
        const decoded = decodeURI(text);
        if (decoded === text) break;
        text = decoded;
      } catch {
        break;
      }
    }
  }

  text = text
    .replace(/%[0-9A-Fa-f]{1,2}/gi, "")
    .replace(/(?:bl){3,}/gi, "");

  text = text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function translateWithGoogleGtx(
  text: string,
  fromLang: string,
  toLang: string
): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
      fromLang
    )}&tl=${encodeURIComponent(toLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0]
        .map((chunk: any) =>
          Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : ""
        )
        .join("");
      const cleaned = cleanTranslatedText(translated);
      return cleaned || null;
    }
  } catch {
    // ignore fetch error
  }
  return null;
}

async function translateWithMyMemory(
  text: string,
  fromLang: string,
  toLang: string
): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=${encodeURIComponent(fromLang)}|${encodeURIComponent(toLang)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    if (
      data?.responseStatus === 200 &&
      data?.responseData?.translatedText &&
      typeof data.responseData.translatedText === "string"
    ) {
      const cleaned = cleanTranslatedText(data.responseData.translatedText);
      return cleaned || null;
    }
  } catch {
    // ignore fetch error
  }
  return null;
}

export async function translateText(
  text: string,
  fromLang: string,
  toLang: string
): Promise<string> {
  const cleanedInput = cleanTranslatedText(text);
  const src = resolveAppLanguage(fromLang);
  const tgt = resolveAppLanguage(toLang);

  if (!cleanedInput || src === tgt) return cleanedInput;

  const googleResult = await translateWithGoogleGtx(cleanedInput, src, tgt);
  if (googleResult) return googleResult;

  const myMemoryResult = await translateWithMyMemory(cleanedInput, src, tgt);
  if (myMemoryResult) return myMemoryResult;

  return cleanedInput;
}

export async function translateBatch(
  items: string[],
  fromLang: string,
  toLang: string
): Promise<string[]> {
  const cleanedItems = items.map((item) => cleanTranslatedText(item));
  const src = resolveAppLanguage(fromLang);
  const tgt = resolveAppLanguage(toLang);

  if (cleanedItems.length === 0 || src === tgt) return cleanedItems;

  const DELIMITER = "\n---\n";
  const joined = cleanedItems.join(DELIMITER);

  const translatedJoined = await translateText(joined, src, tgt);
  if (!translatedJoined || translatedJoined === joined) {
    return cleanedItems;
  }

  const parts = translatedJoined
    .split(/\n?---\n?/)
    .map((p) => cleanTranslatedText(p));

  if (parts.length === cleanedItems.length) {
    return parts.map((part, idx) => part || cleanedItems[idx]);
  }

  return cleanedItems;
}

export async function translateCommunityRecipe(
  recipe: CommunityRecipe,
  targetLang: string
): Promise<CommunityRecipe> {
  const resolvedTarget = resolveAppLanguage(targetLang);
  const resolvedSrc = resolveAppLanguage(recipe.language);

  const cacheKey = `${recipe.id}_${resolvedTarget}`;
  if (TRANSLATION_CACHE.has(cacheKey)) {
    const cached = TRANSLATION_CACHE.get(cacheKey)!;
    if (!hasCorruptedText(cached)) {
      return cached;
    }
    TRANSLATION_CACHE.delete(cacheKey);
  }

  if (resolvedSrc === resolvedTarget) return recipe;

  const cleanedRecipe: CommunityRecipe = {
    ...recipe,
    title: cleanTranslatedText(recipe.title),
    description: cleanTranslatedText(recipe.description),
    ingredients: recipe.ingredients.map((ing) => cleanTranslatedText(ing)),
    steps: recipe.steps.map((step) => cleanTranslatedText(step))
  };

  const [translatedTitle, translatedDesc, translatedIngredients, translatedSteps] =
    await Promise.all([
      translateText(cleanedRecipe.title, resolvedSrc, resolvedTarget),
      cleanedRecipe.description
        ? translateText(cleanedRecipe.description, resolvedSrc, resolvedTarget)
        : Promise.resolve(""),
      translateBatch(cleanedRecipe.ingredients, resolvedSrc, resolvedTarget),
      translateBatch(cleanedRecipe.steps, resolvedSrc, resolvedTarget)
    ]);

  const translatedRecipe: CommunityRecipe = {
    ...cleanedRecipe,
    title: translatedTitle || cleanedRecipe.title,
    description: translatedDesc,
    ingredients: translatedIngredients,
    steps: translatedSteps
  };

  TRANSLATION_CACHE.set(cacheKey, translatedRecipe);
  return translatedRecipe;
}
