import { describe, expect, it } from "vitest";
import { getRecipeHealthProfile } from "../features/recipes/health";
import { createEmptyRecipe } from "../features/recipes/types";

describe("getRecipeHealthProfile", () => {
  it("handles JSON-LD nutrition values imported as numbers", () => {
    const recipe = {
      ...createEmptyRecipe(),
      id: "nyt-spoon-salad",
      name: "Quinoa and Broccoli Spoon Salad",
      nutrition: {
        "@type": "NutritionInformation",
        calories: 455,
        carbohydrateContent: "51 grams",
        fatContent: "25 grams",
        fiberContent: "8 grams",
        proteinContent: "14 grams",
        saturatedFatContent: "6 grams",
        sodiumContent: "600 milligrams",
        sugarContent: "21 grams"
      }
    };

    const profile = getRecipeHealthProfile(recipe);

    expect(profile.hasNutrition).toBe(true);
    expect(profile.facts).toContainEqual({
      labelKey: "recipes.health.calories",
      value: "455"
    });
    expect(profile.recommendations).toContain("highSugar");
  });
});
