import { describe, expect, it } from "vitest";
import { inferRecipeCategory } from "../features/recipes/categories";

describe("inferRecipeCategory", () => {
  it("keeps an existing category", () => {
    expect(
      inferRecipeCategory({
        description: "Un plat généreux",
        keywords: "",
        name: "Tarte au chocolat",
        recipeCategory: "Favoris",
        recipeIngredient: []
      })
    ).toBe("Favoris");
  });

  it("uses recipe name, description and ingredients for safe defaults", () => {
    expect(
      inferRecipeCategory({
        description: "",
        keywords: "",
        name: "Tarte au chocolat",
        recipeCategory: "",
        recipeIngredient: []
      })
    ).toBe("Dessert");

    expect(
      inferRecipeCategory({
        description: "Une sauce rapide",
        keywords: "",
        name: "Vinaigrette simple",
        recipeCategory: "",
        recipeIngredient: ["moutarde", "vinaigre"]
      })
    ).toBe("Sauce");
  });
});

describe("default category translations", () => {
  it.each(["Soupe", "Suppe", "Soup", "Zuppa", "Sopa", " suppe "])("translates %s without changing stored categories", async (category) => {
    const { getRecipeCategoryLabel } = await import("../features/recipes/categories");
    expect(getRecipeCategoryLabel(category, (key) => key === "recipes.defaultCategories.soup" ? "Soupe" : key)).toBe("Soupe");
  });
  it("leaves a custom category intact", async () => {
    const { getRecipeCategoryLabel } = await import("../features/recipes/categories");
    expect(getRecipeCategoryLabel("Omas Suppen", () => "Soupe")).toBe("Omas Suppen");
  });
});
