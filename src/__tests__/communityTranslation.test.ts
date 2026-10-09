import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanTranslatedText,
  clearTranslationCache,
  hasCorruptedText,
  translateBatch,
  translateCommunityRecipe,
  translateCommunityRecipePreviews,
  translateText
} from "../features/community/communityTranslation";
import type { CommunityRecipe } from "../features/community/communityClient";
import { resolveAppLanguage } from "../i18n/languages";

const recipe: CommunityRecipe = {
  id: "recipe-1",
  title: "Miso Eggplant",
  description: "Tasty dish",
  ingredients: ["1 fresh eggplant", "2 tbsp miso paste"],
  steps: ["Cut into slices", "Grill gently"],
  language: "en",
  authorName: "Chef",
  authorUid: "uid-1",
  avgRating: 4.5,
  ratingCount: 2,
  reportCount: 0,
  approved: true,
  createdAt: "2026-10-06T12:00:00.000Z"
};
const french: Record<string, string> = {
  "Miso Eggplant": "Aubergine au miso",
  "Tasty dish": "Plat savoureux",
  "1 fresh eggplant": "1 aubergine fraîche",
  "2 tbsp miso paste": "2 c. à s. de pâte de miso",
  "Cut into slices": "Couper en tranches",
  "Grill gently": "Griller doucement"
};

function googleResponse(text: string) {
  return { ok: true, json: async () => [[[text]]] };
}

function myMemoryResponse(text: string) {
  return { ok: true, json: async () => ({ responseStatus: 200, responseData: { translatedText: text } }) };
}

function mockTranslator(translations = french) {
  const fetchMock = vi.fn(async (url: string) => {
    const query = new URL(url).searchParams.get("q")!;
    const translated = query.split("\n---\n").map((text) => translations[text] ?? text).join("\n---\n");
    return url.includes("googleapis") ? googleResponse(translated) : myMemoryResponse(translated);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("communityTranslation", () => {
  beforeEach(() => {
    clearTranslationCache();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("resolves regional locales", () => {
    for (const [locale, language] of [["fr-FR", "fr"], ["fr-CA", "fr"], ["de-DE", "de"], ["en-US", "en"], ["es-ES", "es"], ["it-IT", "it"], ["da-DK", "da"]]) {
      expect(resolveAppLanguage(locale)).toBe(language);
    }
    expect(resolveAppLanguage("unknown-lang")).toBe("en");
  });

  it("detects corrupted encodings and provider warnings", () => {
    for (const text of ["300-400g%20Weinbl%C3%A4tter", "4 % 20 gousses d'ail", "Astuce: blblblblblbl", "MYMEMORY WARNING: DAILY CREDITS", "QUERY LENGTH LIMIT EXCEEDED"]) {
      expect(hasCorruptedText(text)).toBe(true);
    }
    expect(hasCorruptedText("40% de crème fraîche")).toBe(false);
    expect(hasCorruptedText("1 aubergine fraîche")).toBe(false);
    expect(hasCorruptedText({ ...recipe, steps: ["QUOTA EXCEEDED"] })).toBe(true);
  });

  it("decodes valid URI escapes and HTML entities, including Unicode code points", () => {
    expect(cleanTranslatedText("300-400g% 20Weinbl%C3%A4tter")).toBe("300-400g Weinblätter");
    expect(cleanTranslatedText("4 % 20 gousses d'ail")).toBe("4 gousses d'ail");
    expect(cleanTranslatedText("2-3% 20EL  pulpe de tomate")).toBe("2-3 EL pulpe de tomate");
    expect(cleanTranslatedText("Cr%C3%A8me%2520fra%C3%AEche")).toBe("Crème fraîche");
    expect(cleanTranslatedText("Sel &amp; poivre &#39;test&#39; &nbsp; &#xE9; &#233; &#x1F951;")).toBe("Sel & poivre 'test' é é 🥑");
    expect(cleanTranslatedText("&amp;quot;sel&amp;quot;")).toBe('"sel"');
    expect(cleanTranslatedText("Cr&egrave;me, &Eacute;pinards, &aelig;ble, &Ouml;l, &frac12; citron")).toBe("Crème, Épinards, æble, Öl, ½ citron");
    expect(cleanTranslatedText("&#99999999; &#xD800;")).toBe("&#99999999; &#xD800;");
    expect(cleanTranslatedText("MYMEMORY WARNING: DAILY CREDITS")).toBe("");
  });

  it("preserves words and quantities after a percentage and unrecoverable bytes", () => {
    for (const text of ["40% de crème fraîche", "20% cacao", "35% fat", "50 % butter", "Sel%2Poivre", "H%C3% Cuisse de poulet A4 (en option)"]) {
      expect(cleanTranslatedText(text)).toBe(text);
    }
  });

  it("recognizes and repairs spaced UTF-8 escapes from Chinese and Japanese translations", () => {
    for (const title of ["可乐鸡翅", "コーラチキン", "Crème brûlée 🥑"]) {
      const encoded = encodeURIComponent(title);
      const spaced = encoded.replace(/%([0-9A-F])([0-9A-F])/g, "% $1 $2");
      expect(hasCorruptedText(spaced)).toBe(true);
      expect(cleanTranslatedText(spaced)).toBe(title);
      if (!/[a-z]/i.test(title)) expect(cleanTranslatedText(encoded.replaceAll("%", " % "))).toBe(title);
    }
    expect(cleanTranslatedText("%E 5%8 F% AF %E 4% B9%90% E9% B8% A1% E7% BF % 85")).toBe("可乐鸡翅");
  });

  it("keeps natural percentages intact when repairing translation encodings", () => {
    for (const text of ["40% de crème fraîche", "20% cacao", "35% fat", "50 % butter", "10% de 20% de farine"]) {
      expect(hasCorruptedText(text)).toBe(false);
      expect(cleanTranslatedText(text)).toBe(text);
    }
  });

  it("uses a readable fallback when a provider returns broken spaced byte sequences", async () => {
    const fetchMock = vi.fn(async (url: string) => url.includes("googleapis")
      ? googleResponse("% E 5% 8 F% A F% E") : myMemoryResponse("コーラチキン"));
    vi.stubGlobal("fetch", fetchMock);
    const chinese = { ...recipe, title: "可乐鸡翅", description: "", language: "zh" as const, ingredients: [], steps: [] };
    expect((await translateCommunityRecipe(chinese, "ja")).title).toBe("コーラチキン");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("skips empty text and recipes already in the target language", async () => {
    const fetchMock = mockTranslator();
    expect(await translateText("Hello", "en-US", "en")).toBe("Hello");
    expect(await translateText("", "en", "fr")).toBe("");
    expect(await translateBatch([], "en", "fr")).toEqual([]);
    expect(await translateCommunityRecipe(recipe, "en-US")).toBe(recipe);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("joins every Google response segment in order", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [[["Bonjour "], ["le monde"]]] })));
    expect(await translateText("Hello world", "en", "fr")).toBe("Bonjour le monde");
  });

  it.each(["unavailable", "unchanged", "warning", "corrupted", "missing segment"])("uses MyMemory when Google is %s", async (failure) => {
    const fetchMock = vi.fn(async (url: string) => {
      if (!url.includes("googleapis")) return myMemoryResponse("Bonjour");
      if (failure === "unavailable") return { ok: false, json: async () => null };
      if (failure === "missing segment") return { ok: true, json: async () => [[["Bon"], [null]]] };
      return googleResponse({ unchanged: "Hello", warning: "MYMEMORY WARNING: DAILY CREDITS", corrupted: "H%C3% broken" }[failure]!);
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await translateText("Hello", "en", "fr")).toBe("Bonjour");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps failed translations retryable instead of caching the original", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await translateText("Hello", "en", "fr")).toBe("Hello");
    fetchMock.mockImplementation(async () => googleResponse("Bonjour"));
    expect(await translateText("Hello", "en", "fr")).toBe("Bonjour");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not accept MyMemory error text even with an HTTP success", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("googleapis") ? { ok: false } : myMemoryResponse("QUERY LENGTH LIMIT EXCEEDED")));
    await expect(translateCommunityRecipe({ ...recipe, description: "", ingredients: [], steps: [] }, "fr"))
      .rejects.toThrow("translation failed");
  });

  it("translates a batch in one request while keeping empty items in place", async () => {
    const fetchMock = mockTranslator();
    expect(await translateBatch([recipe.ingredients[0], "", recipe.ingredients[1]], "en", "fr"))
      .toEqual([french[recipe.ingredients[0]], "", french[recipe.ingredients[1]]]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries each item if the provider removes the batch separators", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const query = new URL(url).searchParams.get("q")!;
      return googleResponse(query.includes("---") ? "Une seule ligne fusionnée" : french[query]);
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await translateBatch(recipe.ingredients, "en", "fr")).toEqual(recipe.ingredients.map((text) => french[text]));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries a single untranslated item without discarding the translated items", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const query = new URL(url).searchParams.get("q")!;
      if (query.includes("---")) return googleResponse("1 aubergine fraîche\n---\n2 tbsp miso paste");
      return url.includes("googleapis") ? googleResponse(query) : myMemoryResponse(french[query]);
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await translateBatch(recipe.ingredients, "en", "fr")).toEqual(recipe.ingredients.map((text) => french[text]));
    expect(fetchMock.mock.calls.slice(1).every(([url]) => new URL(url).searchParams.get("q") === recipe.ingredients[1])).toBe(true);
  });

  it("handles separators already inside a source item without changing the item count", async () => {
    mockTranslator({ "Mix --- then bake": "Mélanger --- puis cuire", "Add salt": "Ajouter du sel" });
    expect(await translateBatch(["Mix --- then bake", "Add salt"], "en", "fr"))
      .toEqual(["Mélanger --- puis cuire", "Ajouter du sel"]);
  });

  it("splits long Unicode batches without exceeding the Google request budget", async () => {
    const queries: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const query = new URL(url).searchParams.get("q")!;
      queries.push(query);
      return googleResponse(query.replaceAll("Ingredient", "Ingrédient"));
    }));
    const items = Array.from({ length: 40 }, (_, index) => `Ingredient ${index} ${"é🥑 ".repeat(15)}`.trim());
    expect(await translateBatch(items, "en", "fr")).toEqual(items.map((text) => text.replace("Ingredient", "Ingrédient")));
    expect(queries.length).toBeGreaterThan(1);
    expect(queries.every((query) => Buffer.byteLength(query, "utf8") <= 1500)).toBe(true);
  });

  it("splits long steps for MyMemory by UTF-8 bytes and preserves word boundaries", async () => {
    const queries: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("googleapis")) return { ok: false };
      const query = new URL(url).searchParams.get("q")!;
      queries.push(query);
      return myMemoryResponse(query.replaceAll("Mix", "Mélanger"));
    }));
    const step = "Mix épeautre 🥑 in a bowl. ".repeat(100).trim();
    expect(await translateText(step, "en", "fr")).toBe(step.replaceAll("Mix", "Mélanger"));
    expect(queries.length).toBeGreaterThan(1);
    expect(queries.every((query) => Buffer.byteLength(query, "utf8") <= 500)).toBe(true);
  });

  it("translates every recipe field and reuses successful translations", async () => {
    const fetchMock = mockTranslator();
    const translated = await translateCommunityRecipe(recipe, "fr-FR");
    expect(translated).toEqual({
      ...recipe,
      language: "fr",
      title: french[recipe.title],
      description: french[recipe.description],
      ingredients: recipe.ingredients.map((text) => french[text]),
      steps: recipe.steps.map((text) => french[text])
    });
    const calls = fetchMock.mock.calls.length;
    expect(await translateCommunityRecipe(recipe, "fr-CA")).toEqual(translated);
    expect(fetchMock).toHaveBeenCalledTimes(calls);
    expect(recipe.language).toBe("en");
    expect(recipe.title).toBe("Miso Eggplant");
  });

  it("does not reuse stale content or metadata for the same recipe ID", async () => {
    const fetchMock = mockTranslator({ ...french, "New title": "Nouveau titre" });
    await translateCommunityRecipe(recipe, "fr");
    fetchMock.mockClear();
    const updated = await translateCommunityRecipe({ ...recipe, title: "New title", avgRating: 5, ratingCount: 10, imageUrl: "https://example.com/new.jpg" }, "fr");
    expect(updated.title).toBe("Nouveau titre");
    expect(updated.avgRating).toBe(5);
    expect(updated.ratingCount).toBe(10);
    expect(updated.imageUrl).toBe("https://example.com/new.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("q")).toBe("New title");
  });

  it("separates cached translations by target language", async () => {
    const fetchMock = vi.fn(async (url: string) => googleResponse(new URL(url).searchParams.get("tl") === "fr" ? "Bonjour" : "Hallo"));
    vi.stubGlobal("fetch", fetchMock);
    expect(await translateText("Hello", "en", "fr")).toBe("Bonjour");
    expect(await translateText("Hello", "en", "de")).toBe("Hallo");
    expect(await translateText("Hello", "en", "fr")).toBe("Bonjour");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries only failed fields after a partial recipe translation", async () => {
    let offline = true;
    const fetchMock = vi.fn(async (url: string) => {
      const query = new URL(url).searchParams.get("q")!;
      if (query.includes("---")) return googleResponse("Invalid batch separators");
      if (query === "Grill gently" && offline) return { ok: false };
      return googleResponse(french[query]);
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(translateCommunityRecipe(recipe, "fr")).rejects.toThrow("translation failed");
    offline = false;
    fetchMock.mockClear();
    const translated = await translateCommunityRecipe(recipe, "fr");
    expect(translated.steps).toEqual(recipe.steps.map((text) => french[text]));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("q")).toBe("Grill gently");
  });

  it("translates list previews in the user language, keeping authors and source filters", async () => {
    const fetchMock = mockTranslator({ ...french, "Apfelkuchen": "Tarte aux pommes" });
    const native = { ...recipe, id: "native", title: "Soupe", language: "fr" as const };
    const german = { ...recipe, id: "german", title: "Apfelkuchen", description: "", language: "de" as const };
    const previews = await translateCommunityRecipePreviews([recipe, native, german], "fr-FR");
    expect(previews.map((item) => item.title)).toEqual(["Aubergine au miso", "Soupe", "Tarte aux pommes"]);
    expect(previews.map((item) => item.language)).toEqual(["en", "fr", "de"]);
    expect(previews[0].authorName).toBe(recipe.authorName);
    expect(previews[0].ingredients).toEqual(recipe.ingredients);
    expect(previews[1]).toBe(native);
    fetchMock.mockClear();
    await translateCommunityRecipe(recipe, "fr");
    expect(fetchMock.mock.calls.every(([url]) => !new URL(url).searchParams.get("q")!.includes(recipe.title))).toBe(true);
  });

  it("keeps previews readable when offline and retries once connectivity returns", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await translateCommunityRecipePreviews([recipe], "fr")).toEqual([recipe]);
    mockTranslator();
    expect((await translateCommunityRecipePreviews([recipe], "fr"))[0].title).toBe("Aubergine au miso");
  });

  it("deduplicates simultaneous requests for the same text", async () => {
    const fetchMock = mockTranslator({ Hello: "Bonjour" });
    expect(await Promise.all([translateText("Hello", "en", "fr"), translateText("Hello", "en", "fr")]))
      .toEqual(["Bonjour", "Bonjour"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("limits concurrent provider requests", async () => {
    let active = 0;
    let maximum = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 0));
      active--;
      return googleResponse(`FR ${new URL(url).searchParams.get("q")}`);
    }));
    await Promise.all(Array.from({ length: 12 }, (_, index) => translateText(`Text ${index}`, "en", "fr")));
    expect(maximum).toBeLessThanOrEqual(4);
  });

  it("aborts a stalled provider and uses the fallback", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((url: string, options: RequestInit) => {
      if (!url.includes("googleapis")) return Promise.resolve(myMemoryResponse("Bonjour"));
      return new Promise((_, reject) => options.signal!.addEventListener("abort", () => reject(new Error("aborted"))));
    }));
    const result = translateText("Hello", "en", "fr");
    await vi.advanceTimersByTimeAsync(10000);
    expect(await result).toBe("Bonjour");
  });

  it("does not repopulate a cleared cache from a pending request", async () => {
    let finish!: (response: ReturnType<typeof googleResponse>) => void;
    const fetchMock = vi.fn(() => new Promise<ReturnType<typeof googleResponse>>((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    const first = translateText("Hello", "en", "fr");
    clearTranslationCache();
    finish(googleResponse("Bonjour"));
    expect(await first).toBe("Bonjour");
    const second = translateText("Hello", "en", "fr");
    finish(googleResponse("Salut"));
    expect(await second).toBe("Salut");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
