import { describe, expect, it } from "vitest";
import { getRecipeHealthProfile } from "../features/recipes/health";
import { createEmptyRecipe } from "../features/recipes/types";

describe("getRecipeHealthProfile", () => {
  it("uses formatted nutrient values rather than numbers in Markdown link URLs", () => {
    const plain = getRecipeHealthProfile({ ...createEmptyRecipe(), nutrition: { calories: "420 kcal", proteinContent: "10 g", sodiumContent: "0.5 g" } });
    const formatted = getRecipeHealthProfile({ ...createEmptyRecipe(), nutrition: { calories: "[420 kcal](https://example.com/9999)", proteinContent: "**10** g", sodiumContent: "*0.5 g*" } });
    expect(formatted.grade).toBe(plain.grade);
    expect(formatted.recommendations).toEqual(plain.recommendations);
    expect(getRecipeHealthProfile({ ...createEmptyRecipe(), nutrition: { calories: "[unknown](https://example.com/9999)" } }).hasNutrition).toBe(false);
  });
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
