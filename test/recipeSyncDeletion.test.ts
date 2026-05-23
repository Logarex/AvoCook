import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as SQLite from "expo-sqlite";
import { loadAnyLocalRecipeById } from "../src/features/recipes/offlineDatabase";
import { deleteRecipe } from "../src/features/recipes/recipeRepository";
import { CookbookClient } from "../src/features/nextcloud/cookbookClient";
import { normalizeRecipe } from "../src/features/recipes/types";

// Mock expo-crypto
vi.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: vi.fn(async () => "digest"),
  randomUUID: vi.fn(() => "uuid")
}));

// Mock expo-file-system
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

// Mock expo-sqlite
vi.mock("expo-sqlite", () => {
  const dbInstance = {
    execAsync: vi.fn(),
    getAllAsync: vi.fn(async () => []),
    runAsync: vi.fn(),
  };
  return {
    openDatabaseAsync: vi.fn(async () => dbInstance)
  };
});

describe("recipe manual photo sync deletion", () => {
  let mockDb: any;

  beforeEach(async () => {
    mockDb = await (SQLite.openDatabaseAsync as any)();
    mockDb.getAllAsync.mockReset();
    mockDb.runAsync.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadAnyLocalRecipeById", () => {
    it("queries SQLite database by ID and returns normalized recipe", async () => {
      const mockRecipeRow = {
        id: "recipe-123",
        payload: JSON.stringify({
          id: "recipe-123",
          name: "Test Recipe",
          image: "/AvoCook Images/photo.jpg"
        }),
        dirty: 0,
        deleted: 1,
        updated_at: "2026-05-23T00:00:00.000Z"
      };

      mockDb.getAllAsync.mockResolvedValueOnce([mockRecipeRow]);

      const result = await loadAnyLocalRecipeById("recipe-123");

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        "SELECT * FROM recipes WHERE id = ?",
        "recipe-123"
      );
      expect(result).not.toBeNull();
      expect(result?.name).toBe("Test Recipe");
      expect(result?.image).toBe("/AvoCook Images/photo.jpg");
    });

    it("returns null if recipe is not found in database", async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      const result = await loadAnyLocalRecipeById("recipe-nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("deleteRecipe remote manual photo deletion", () => {
    it("deletes stale manual images via WebDAV when deleting a recipe", async () => {
      const mockRecipe = normalizeRecipe({
        id: "recipe-123",
        name: "Test Recipe",
        image: "/AvoCook Images/photo-123.jpg",
        imageUrl: "/AvoCook Images/photo-123.jpg",
        imagePlaceholderUrl: "/AvoCook Images/photo-123.jpg"
      });

      // Mock database calls
      // 1st database call: loadAnyLocalRecipeById
      // 2nd database call: loadLocalRecipes (all recipes to check for duplicates)
      mockDb.getAllAsync.mockImplementation(
        async (query: string, ..._args: unknown[]) => {
          if (query.includes("recipes WHERE id = ?")) {
            return [
              {
                id: "recipe-123",
                payload: JSON.stringify(mockRecipe),
                dirty: 0,
                deleted: 0,
                updated_at: "2026"
              }
            ];
          }
          if (query.includes("recipes WHERE deleted = 0")) {
            // No duplicate recipe exists referencing this photo
            return [];
          }
          return [];
        }
      );

      const client = new CookbookClient({
        serverUrl: "https://cloud.example.com",
        username: "reedstrm",
        appPassword: "app-password"
      });

      const deleteRecipeSpy = vi.spyOn(client, "deleteRecipe").mockResolvedValue("");
      const getRecipeSpy = vi.spyOn(client, "getRecipe").mockResolvedValue(mockRecipe);
      const deleteWebDavFileSpy = vi.spyOn(client, "deleteWebDavFile").mockResolvedValue(undefined);

      await deleteRecipe("recipe-123", client);

      // Verify server calls
      expect(getRecipeSpy).toHaveBeenCalledWith("recipe-123");
      expect(deleteWebDavFileSpy).toHaveBeenCalledWith("/AvoCook Images/photo-123.jpg");
      expect(deleteRecipeSpy).toHaveBeenCalledWith("recipe-123");
      // Verify local recipe is deleted
      expect(mockDb.runAsync).toHaveBeenCalledWith("DELETE FROM recipes WHERE id = ?", "recipe-123");
    });

    it("does not delete manual image if another active recipe still references it (duplicate protection)", async () => {
      const mockRecipe = normalizeRecipe({
        id: "recipe-123",
        name: "Test Recipe",
        image: "/AvoCook Images/photo-shared.jpg"
      });

      const mockDuplicateRecipe = {
        id: "recipe-dup",
        payload: JSON.stringify(normalizeRecipe({
          id: "recipe-dup",
          name: "Duplicate Recipe",
          image: "/AvoCook Images/photo-shared.jpg"
        })),
        dirty: 0,
        deleted: 0,
        updated_at: "2026"
      };

      // Mock database calls
      mockDb.getAllAsync.mockImplementation(
        async (query: string, ..._args: unknown[]) => {
          if (query.includes("recipes WHERE id = ?")) {
            return [
              {
                id: "recipe-123",
                payload: JSON.stringify(mockRecipe),
                dirty: 0,
                deleted: 0,
                updated_at: "2026"
              }
            ];
          }
          if (query.includes("recipes WHERE deleted = 0")) {
            // Duplicate recipe exists referencing this photo
            return [mockDuplicateRecipe];
          }
          return [];
        }
      );

      const client = new CookbookClient({
        serverUrl: "https://cloud.example.com",
        username: "reedstrm",
        appPassword: "app-password"
      });

      const deleteRecipeSpy = vi.spyOn(client, "deleteRecipe").mockResolvedValue("");
      const getRecipeSpy = vi.spyOn(client, "getRecipe").mockResolvedValue(mockRecipe);
      const deleteWebDavFileSpy = vi.spyOn(client, "deleteWebDavFile").mockResolvedValue(undefined);

      await deleteRecipe("recipe-123", client);

      // Verify duplicate protection works
      expect(getRecipeSpy).toHaveBeenCalledWith("recipe-123");
      expect(deleteWebDavFileSpy).not.toHaveBeenCalled(); // Image preserved!
      expect(deleteRecipeSpy).toHaveBeenCalledWith("recipe-123");
    });
  });
});
