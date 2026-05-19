import { describe, expect, it } from "vitest";
import { normalizeRecipe } from "../src/features/recipes/types";

describe("normalizeRecipe", () => {
  it("flattens structured Cookbook instructions before rendering", () => {
    const recipe = normalizeRecipe({
      id: 42 as never,
      name: "Layer cake",
      recipeYield: "6 personnes" as never,
      recipeIngredient: [{ name: "200 g flour" }, "2 eggs"] as never,
      recipeInstructions: [
        {
          "@type": "HowToSection",
          itemListElement: [
            { "@type": "HowToStep", text: "Mix the batter." },
            { "@type": "HowToStep", name: "Bake for 30 minutes." }
          ]
        }
      ] as never,
      tool: [{ text: "Whisk" }] as never
    });

    expect(recipe.id).toBe("42");
    expect(recipe.recipeYield).toBe(6);
    expect(recipe.recipeIngredient).toEqual(["200 g flour", "2 eggs"]);
    expect(recipe.recipeInstructions).toEqual([
      "Mix the batter.",
      "Bake for 30 minutes."
    ]);
    expect(recipe.tool).toEqual(["Whisk"]);
  });

  it("keeps malformed scalar fields render-safe", () => {
    const recipe = normalizeRecipe({
      name: { text: "Soup" } as never,
      image: [{ url: "https://example.com/soup.jpg" }] as never,
      keywords: ["quick", { name: "veggie" }] as never,
      recipeYield: "many" as never
    });

    expect(recipe.name).toBe("Soup");
    expect(recipe.image).toBe("https://example.com/soup.jpg");
    expect(recipe.keywords).toBe("quick,veggie");
    expect(recipe.recipeYield).toBe(1);
  });
});
