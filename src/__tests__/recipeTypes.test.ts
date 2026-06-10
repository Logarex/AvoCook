import { describe, expect, it } from "vitest";
import {
  normalizeRecipe,
  toCookbookRecipe
} from "../features/recipes/types";

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

  it("keeps empty optional recipe data local but omits it from Cookbook payloads", () => {
    const recipe = normalizeRecipe({
      id: "local-optional",
      name: "Grandma soup",
      prepTime: null,
      cookTime: null,
      totalTime: null,
      nutrition: {
        "@type": "NutritionInformation"
      }
    });

    const payload = toCookbookRecipe(recipe) as Record<string, unknown>;

    expect(recipe.prepTime).toBeNull();
    expect(recipe.nutrition).toBeNull();
    expect(payload.prepTime).toBeUndefined();
    expect(payload.cookTime).toBeUndefined();
    expect(payload.totalTime).toBeUndefined();
    expect(payload.nutrition).toBeUndefined();
  });

  it("preserves filled optional recipe data for Cookbook payloads", () => {
    const recipe = normalizeRecipe({
      id: "42",
      name: "Pasta",
      sourceName: "Grandma's notebook",
      prepTime: "PT15M",
      nutrition: {
        "@type": "NutritionInformation",
        calories: "420 kcal"
      }
    });

    const payload = toCookbookRecipe(recipe);

    expect(payload.sourceName).toBe("Grandma's notebook");
    expect(payload.prepTime).toBe("PT15M");
    expect(payload.nutrition).toEqual({
      "@type": "NutritionInformation",
      calories: "420 kcal"
    });
  });

  it("normalizes numeric nutrition values before saving or syncing", () => {
    const recipe = normalizeRecipe({
      id: "nyt",
      name: "Spoon salad",
      nutrition: {
        "@type": "NutritionInformation",
        calories: 455
      }
    });

    const payload = toCookbookRecipe(recipe);

    expect(recipe.nutrition).toEqual({
      "@type": "NutritionInformation",
      calories: "455"
    });
    expect(payload.nutrition).toEqual({
      "@type": "NutritionInformation",
      calories: "455"
    });
  });

  it("keeps hidden servings as local-only recipe metadata", () => {
    const recipe = normalizeRecipe({
      id: "local-meta",
      name: "No serving calculator",
      localMeta: {
        hideServings: true,
        servingOverride: 4
      }
    });

    expect(recipe.localMeta).toEqual({
      hideServings: true,
      servingOverride: 4
    });
    expect(toCookbookRecipe(recipe).localMeta).toBeUndefined();
  });
});
