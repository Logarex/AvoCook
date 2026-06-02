import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteCustomCategory,
  loadCustomCategories,
  saveCustomCategory
} from "../src/features/recipes/categoryStore";
import {
  DEFAULT_RECIPE_CATEGORIES,
  getRecipeCategoryLabel
} from "../src/features/recipes/categories";

const storage = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    })
  }
}));

describe("categoryStore", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("allows empty default categories to be hidden and restored", async () => {
    expect(await loadCustomCategories()).toContain("Dessert");

    const afterDelete = await deleteCustomCategory("Dessert");
    expect(afterDelete).not.toContain("Dessert");

    const afterRestore = await saveCustomCategory("Dessert");
    expect(afterRestore).toContain("Dessert");
  });

  it("keeps custom categories alongside visible defaults", async () => {
    const categories = await saveCustomCategory("Favoris");

    expect(categories).toContain("Favoris");
    expect(categories).toContain(DEFAULT_RECIPE_CATEGORIES[0]);
  });
});

describe("default category labels", () => {
  it("uses translated labels for known defaults and raw labels for custom categories", () => {
    const t = (key: string) =>
      key === "recipes.defaultCategories.dessert" ? "Dessert translated" : key;

    expect(getRecipeCategoryLabel("Dessert", t)).toBe("Dessert translated");
    expect(getRecipeCategoryLabel("Favoris", t)).toBe("Favoris");
  });
});
