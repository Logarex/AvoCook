import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  cleanTranslatedText,
  clearTranslationCache,
  hasCorruptedText,
  translateBatch,
  translateCommunityRecipe,
  translateText
} from "../features/community/communityTranslation";
import type { CommunityRecipe } from "../features/community/communityClient";
import { resolveAppLanguage } from "../i18n/languages";

describe("communityTranslation", () => {
  beforeEach(() => {
    clearTranslationCache();
    vi.restoreAllMocks();
  });

  it("resolves regional language locales properly in resolveAppLanguage", () => {
    expect(resolveAppLanguage("fr-FR")).toBe("fr");
    expect(resolveAppLanguage("fr-CA")).toBe("fr");
    expect(resolveAppLanguage("de-DE")).toBe("de");
    expect(resolveAppLanguage("en-US")).toBe("en");
    expect(resolveAppLanguage("es-ES")).toBe("es");
    expect(resolveAppLanguage("it-IT")).toBe("it");
    expect(resolveAppLanguage("da-DK")).toBe("da");
    expect(resolveAppLanguage("unknown-lang")).toBe("en");
  });

  it("detects corrupted text and warning messages with hasCorruptedText", () => {
    expect(hasCorruptedText("300-400g%20Weinbl%C3%A4tter")).toBe(true);
    expect(hasCorruptedText("4 % 20 gousses d'ail")).toBe(true);
    expect(hasCorruptedText("Astuce: blblblblblblblblblbl")).toBe(true);
    expect(hasCorruptedText("MYMEMORY WARNING: YOU USED ALL YOUR DAILY CREDITS")).toBe(true);
    expect(hasCorruptedText("QUERY LENGTH LIMIT EXCEEDED")).toBe(true);
    expect(hasCorruptedText("40% de crème fraîche")).toBe(false);
    expect(hasCorruptedText("1 aubergine fraîche")).toBe(false);
  });

  it("cleans malformed percent encodings, HTML entities, and warning messages", () => {
    expect(cleanTranslatedText("300-400g% 20Feuillede vin %C3%A4tter")).toBe("300-400g Feuillede vin ätter");
    expect(cleanTranslatedText("200 g% 20 Viande hachée")).toBe("200 g Viande hachée");
    expect(cleanTranslatedText("4 % 20 gousses d'ail")).toBe("4 gousses d'ail");
    expect(cleanTranslatedText("2-3% 20EL  pulpe detomate")).toBe("2-3 EL pulpe detomate");
    expect(cleanTranslatedText("Sel%2Poivre")).toBe("SelPoivre");
    expect(cleanTranslatedText("H%C3% Cuisse de poulet A4  (en option)")).toBe("Huisse de poulet A4 (en option)");
    expect(cleanTranslatedText("300-400g%20Weinbl%C3%A4tter")).toBe("300-400g Weinblätter");
    expect(cleanTranslatedText("Sel &amp; Pfeffer &#39;test&#39;")).toBe("Sel & Pfeffer 'test'");
    expect(cleanTranslatedText("le blblblblblblblblblbl")).toBe("le");
    expect(cleanTranslatedText("MYMEMORY WARNING: YOU USED ALL YOUR DAILY CREDITS")).toBe("");
  });

  it("returns same text if languages match or text is empty", async () => {
    const text = await translateText("Hello", "en", "en");
    expect(text).toBe("Hello");

    const empty = await translateText("", "en", "fr");
    expect(empty).toBe("");
  });

  it("translates text using Google GTX primary provider", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("translate.googleapis.com")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([[["Bonjour", "Hello", null, null]]])
        });
      }
      return Promise.reject(new Error("Unexpected URL"));
    }));

    const result = await translateText("Hello", "en", "fr");
    expect(result).toBe("Bonjour");
    vi.unstubAllGlobals();
  });

  it("falls back to MyMemory API if Google GTX fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("translate.googleapis.com")) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      if (url.includes("api.mymemory.translated.net")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ responseStatus: 200, responseData: { translatedText: "Bonjour" } })
        });
      }
      return Promise.reject(new Error("Unexpected URL"));
    }));

    const result = await translateText("Hello", "en", "fr");
    expect(result).toBe("Bonjour");
    vi.unstubAllGlobals();
  });

  it("batches multiline items into single translation call", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      callCount++;
      const decoded = decodeURIComponent(url);
      if (decoded.includes("1 fresh eggplant")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([[["1 aubergine fraîche\n---\n2 c. à s. de pâte de miso", "1 fresh eggplant\n---\n2 tbsp miso paste"]]])
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([[[ "Autre", "Other" ]]])
      });
    }));

    const items = ["1 fresh eggplant", "2 tbsp miso paste"];
    const res = await translateBatch(items, "en", "fr");
    expect(res).toEqual(["1 aubergine fraîche", "2 c. à s. de pâte de miso"]);
    expect(callCount).toBe(1); // Single request for batch!
    vi.unstubAllGlobals();
  });

  it("translates full CommunityRecipe fields and caches results", async () => {
    const dummyRecipe: CommunityRecipe = {
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
      createdAt: new Date().toISOString()
    };

    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      const decoded = decodeURIComponent(url);
      if (decoded.includes("Miso Eggplant")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([[["Aubergine au miso", "Miso Eggplant"]]])
        });
      }
      if (decoded.includes("Tasty dish")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([[["Plat savoureux", "Tasty dish"]]])
        });
      }
      if (decoded.includes("1 fresh eggplant")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([[["1 aubergine fraîche\n---\n2 c. à s. de pâte de miso", "1 fresh eggplant\n---\n2 tbsp miso paste"]]])
        });
      }
      if (decoded.includes("Cut into slices")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([[["Couper en tranches\n---\nGriller doucement", "Cut into slices\n---\nGrill gently"]]])
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([[["Traduit", "Original"]]])
      });
    }));

    const translated = await translateCommunityRecipe(dummyRecipe, "fr");

    expect(translated.title).toBe("Aubergine au miso");
    expect(translated.description).toBe("Plat savoureux");
    expect(translated.ingredients).toEqual(["1 aubergine fraîche", "2 c. à s. de pâte de miso"]);
    expect(translated.steps).toEqual(["Couper en tranches", "Griller doucement"]);

    vi.unstubAllGlobals();
  });
});
