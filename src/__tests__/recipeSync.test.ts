import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "ios" }
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
    exists = false;
    constructor(...parts: { uri?: string; toString?: () => string }[]) {
      this.uri = parts
        .map((part) => (typeof part === "string" ? part : part.uri ?? String(part)))
        .join("/");
    }
    static downloadFileAsync = vi.fn();
    base64 = vi.fn(async () => "");
    copy = vi.fn();
    create = vi.fn();
    delete = vi.fn();
    text = vi.fn(async () => "");
    write = vi.fn();
  },
  Paths: {
    cache: { uri: "file:///cache" },
    document: { uri: "file:///document" }
  }
}));

vi.mock("expo-sqlite", () => {
  const dbInstance = {
    execAsync: vi.fn(),
    getAllAsync: vi.fn(async () => []),
    runAsync: vi.fn()
  };
  return {
    openDatabaseAsync: vi.fn(async () => dbInstance)
  };
});

import { areRecipeDatesEqual } from "../features/recipes/recipeRepository";
import { toCookbookCreateRecipe, toCookbookRecipe, normalizeRecipe } from "../features/recipes/types";

describe("Recipe Sync & Serialization", () => {
  describe("toCookbookCreateRecipe", () => {
    it("omits the id property so JSON.stringify does not produce 'id': null", () => {
      const recipe = normalizeRecipe({
        id: "local-12345",
        name: "Test Recipe",
        description: "A test recipe",
        recipeCategory: "Dinner"
      });

      const payload = toCookbookCreateRecipe(recipe);

      expect(payload).not.toHaveProperty("id");
      expect(payload).not.toHaveProperty("recipe_id");
      expect(payload).not.toHaveProperty("localMeta");

      const jsonString = JSON.stringify(payload);
      expect(jsonString).not.toContain('"id":');
      expect(jsonString).toContain('"name":"Test Recipe"');
    });
  });

  describe("toCookbookRecipe", () => {
    it("strips localMeta and recipe_id from update payload", () => {
      const recipe = normalizeRecipe({
        id: "42",
        recipe_id: 42,
        name: "Nextcloud Recipe",
        localMeta: { hideServings: true }
      });

      const payload = toCookbookRecipe(recipe);

      expect(payload.id).toBe("42");
      expect(payload).not.toHaveProperty("recipe_id");
      expect(payload).not.toHaveProperty("localMeta");
    });
  });

  describe("areRecipeDatesEqual", () => {
    it("returns true for identical date strings", () => {
      expect(areRecipeDatesEqual("2026-09-21T20:30:00Z", "2026-09-21T20:30:00Z")).toBe(true);
    });

    it("returns true for dates differing only by milliseconds or timezone formatting", () => {
      expect(areRecipeDatesEqual("2026-09-21T20:30:00.123Z", "2026-09-21T20:30:00+00:00")).toBe(true);
      expect(areRecipeDatesEqual("2026-09-21T20:30:00.000Z", "2026-09-21T20:30:02Z")).toBe(true);
    });

    it("returns false for dates differing by more than 5 seconds", () => {
      expect(areRecipeDatesEqual("2026-09-21T20:30:00Z", "2026-09-21T20:30:10Z")).toBe(false);
    });

    it("returns false if either date is missing or invalid", () => {
      expect(areRecipeDatesEqual(undefined, "2026-09-21T20:30:00Z")).toBe(false);
      expect(areRecipeDatesEqual("invalid", "2026-09-21T20:30:00Z")).toBe(false);
    });
  });
});
