import { describe, expect, it } from "vitest";
import { inferRecipeCategory } from "../src/features/recipes/categories";

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
