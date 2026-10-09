import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommunityRecipe } from "../features/community/communityClient";

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { storage.delete(key); })
  }
}));

const recipe: CommunityRecipe = {
  id: "r1", title: "Cake", description: "", ingredients: ["Flour"], steps: ["Bake"],
  language: "en", authorName: "Cook", avgRating: 4, ratingCount: 2, reportCount: 0,
  approved: true, createdAt: "2026-10-09T12:00:00.000Z"
};
const cursor = { id: "r1", field: "title" as const, value: "Cake" };
const feed = { recipes: [recipe], lastDoc: cursor, hasMore: true, fetchedAt: Date.now() };
const flushWrites = async () => { await new Promise((resolve) => setTimeout(resolve, 0)); };

beforeEach(() => { storage.clear(); vi.resetModules(); vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("persistent community cache", () => {
  it("restores full recipes and their pagination cursor after a restart without a network request", async () => {
    const first = await import("../features/community/communityCache");
    first.cacheCommunityFeed("all", feed);
    await flushWrites();
    vi.resetModules();
    const reopened = await import("../features/community/communityCache");
    await reopened.hydrateCommunityCache();
    expect(reopened.getCachedCommunityFeed("all")).toEqual(feed);
    expect(reopened.getCachedCommunityRecipe(recipe.id)).toEqual(recipe);
  });

  it("isolates filters and invalidates a deleted or moderated recipe in every feed", async () => {
    const cache = await import("../features/community/communityCache");
    cache.cacheCommunityFeed("all", feed);
    cache.cacheCommunityFeed("english", { ...feed, recipes: [recipe, { ...recipe, id: "r2" }] });
    await cache.invalidateCommunityCache("r1");
    expect(cache.getCachedCommunityFeed("all")?.recipes).toEqual([]);
    expect(cache.getCachedCommunityFeed("english")?.recipes.map((item) => item.id)).toEqual(["r2"]);
    expect(cache.getCachedCommunityRecipe("r1")).toBeUndefined();
    expect(cache.getCachedCommunityFeed("english")?.fetchedAt).toBe(0);
    await flushWrites();
    vi.resetModules();
    const reopened = await import("../features/community/communityCache");
    await reopened.hydrateCommunityCache();
    expect(reopened.getCachedCommunityRecipe("r1")).toBeUndefined();
  });

  it("ignores corrupt storage and malformed recipes or cursors", async () => {
    storage.set("community.feeds.v1", JSON.stringify([
      ["good", feed], ["badRecipe", { ...feed, recipes: [{ ...recipe, ingredients: null }] }],
      ["badCursor", { ...feed, lastDoc: { field: "createdAt", id: "r1", value: null } }]
    ]));
    const cache = await import("../features/community/communityCache");
    await cache.hydrateCommunityCache();
    expect(cache.getCachedCommunityFeed("good")).toEqual(feed);
    expect(cache.getCachedCommunityFeed("badRecipe")).toBeUndefined();
    expect(cache.getCachedCommunityFeed("badCursor")).toBeUndefined();
    vi.resetModules();
    storage.set("community.feeds.v1", "not json");
    const corrupt = await import("../features/community/communityCache");
    await expect(corrupt.hydrateCommunityCache()).resolves.toBeUndefined();
  });

  it("keeps ratings current without persisting the current user's vote", async () => {
    const cache = await import("../features/community/communityCache");
    cache.cacheCommunityFeed("all", feed);
    await cache.updateCachedCommunityRecipe({ ...recipe, avgRating: 5, ratingCount: 3, userVote: 5 });
    expect(cache.getCachedCommunityRecipe("r1")).toMatchObject({ avgRating: 5, ratingCount: 3 });
    expect(cache.getCachedCommunityRecipe("r1")).not.toHaveProperty("userVote");
    await flushWrites();
    expect(storage.get("community.feeds.v1")).not.toContain("userVote");
  });

  it("preserves the previous complete pages and cursor when reaching the cache limit", async () => {
    const cache = await import("../features/community/communityCache");
    cache.cacheCommunityFeed("all", feed);
    cache.cacheCommunityFeed("all", { ...feed, recipes: Array.from({ length: 301 }, (_, index) => ({ ...recipe, id: String(index) })), lastDoc: { ...cursor, id: "300" } });
    expect(cache.getCachedCommunityFeed("all")).toEqual(feed);
  });

  it("applies deletion to persisted recipes even before the community screen was opened", async () => {
    storage.set("community.feeds.v1", JSON.stringify([["all", feed]]));
    const cache = await import("../features/community/communityCache");
    await cache.invalidateCommunityCache("r1");
    expect(cache.getCachedCommunityRecipe("r1")).toBeUndefined();
    expect(cache.getCachedCommunityFeed("all")?.fetchedAt).toBe(0);
  });
});

describe("persistent community translations", () => {
  it("reuses translated previews and full recipes after a restart while offline", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async (url: string) => {
      const text = new URL(url).searchParams.get("q")!;
      return { ok: true, json: async () => [[[text.split("\n---\n").map((part) => `中文 ${part}`).join("\n---\n")]]] };
    });
    vi.stubGlobal("fetch", fetchMock);
    const first = await import("../features/community/communityTranslation");
    const translated = await first.translateCommunityRecipe(recipe, "zh-CN");
    expect(translated.language).toBe("zh");
    expect(translated.title).toBe("中文 Cake");
    await vi.advanceTimersByTimeAsync(500);
    expect(storage.get("community.translations.v1")).toContain("中文 Cake");
    vi.resetModules();
    const reopened = await import("../features/community/communityTranslation");
    fetchMock.mockClear();
    fetchMock.mockRejectedValue(new Error("offline"));
    expect(await reopened.translateCommunityRecipe(recipe, "zh-Hans")).toEqual(translated);
    expect(reopened.getCachedCommunityRecipePreviews([recipe], "zh")[0].title).toBe("中文 Cake");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("translates Chinese source recipes using Chinese instead of the app language fallback", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async (_url: string) => ({ ok: true, json: async () => [[["Gâteau"]]] }));
    vi.stubGlobal("fetch", fetchMock);
    const translations = await import("../features/community/communityTranslation");
    const chinese = { ...recipe, title: "蛋糕", language: "zh" as const, ingredients: [], steps: [] };
    expect((await translations.translateCommunityRecipe(chinese, "fr")).title).toBe("Gâteau");
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("sl")).toBe("zh");
    translations.clearTranslationCache();
  });

  it("discards a garbled cached translation from a previous app version and translates it again", async () => {
    vi.useFakeTimers();
    const chinese = { ...recipe, title: "可乐鸡翅", description: "", language: "zh" as const, ingredients: [], steps: [] };
    const garbled = "% E 5% 8 F% A F% E 4% B 9% 9 0% E 9% B 8% A 1% E 7% B F% 8 5";
    storage.set("community.translations.v1", JSON.stringify([
      [JSON.stringify(["zh", "ja", chinese.title]), garbled],
      [JSON.stringify(["en", "pt", "Cake"]), "Bolo"]
    ]));
    const translations = await import("../features/community/communityTranslation");
    await translations.hydrateTranslationCache();
    expect(translations.getCachedCommunityRecipePreviews([chinese], "ja")[0].title).toBe(chinese.title);
    expect(translations.getCachedCommunityRecipePreviews([recipe], "pt")[0].title).toBe("Bolo");
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [[["コーラチキン"]]] }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await translations.translateCommunityRecipe(chinese, "ja")).title).toBe("コーラチキン");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(storage.get("community.translations.v1")).not.toContain(garbled);
  });

  it("does not persist failed translations or mistake a new recipe title for cached content", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => ({ ok: false, json: async () => null }));
    vi.stubGlobal("fetch", fetchMock);
    const translations = await import("../features/community/communityTranslation");
    await expect(translations.translateCommunityRecipe(recipe, "pt-BR")).rejects.toThrow("translation failed");
    await vi.advanceTimersByTimeAsync(500);
    expect(storage.has("community.translations.v1")).toBe(false);
    storage.set("community.translations.v1", JSON.stringify([[JSON.stringify(["en", "pt", "Cake"]), "Bolo"]]));
    vi.resetModules();
    const reopened = await import("../features/community/communityTranslation");
    await reopened.hydrateTranslationCache();
    expect(reopened.getCachedCommunityRecipePreviews([recipe], "pt")[0].title).toBe("Bolo");
    expect(reopened.getCachedCommunityRecipePreviews([{ ...recipe, title: "New title" }], "pt")[0].title).toBe("New title");
  });
});
