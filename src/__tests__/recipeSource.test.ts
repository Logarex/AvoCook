import { describe, expect, it } from "vitest";
import {
  isExternalRecipeSourceUrl,
  mergeRecipeUpdateFromSource
} from "../features/recipes/recipeSource";
import { normalizeRecipe } from "../features/recipes/types";

describe("recipe source updates", () => {
  it("recognizes internet recipe source URLs", () => {
    expect(isExternalRecipeSourceUrl("https://example.com/recipe")).toBe(true);
    expect(isExternalRecipeSourceUrl("http://example.com/recipe")).toBe(true);
    expect(isExternalRecipeSourceUrl("file:///recipe.json")).toBe(false);
    expect(isExternalRecipeSourceUrl("http://localhost:3000/recipe")).toBe(false);
    expect(isExternalRecipeSourceUrl("http://192.168.1.20/recipe")).toBe(false);
  });

  it("keeps the current id and local metadata when refreshing from source", () => {
    const current = normalizeRecipe({
      id: "42",
      name: "Ancienne tarte",
      url: "https://example.com/tarte",
      localMeta: {
        servingOverride: 8
      }
    });
    const imported = normalizeRecipe({
      id: null,
      name: "Nouvelle tarte",
      url: "https://example.com/tarte",
      image: "https://example.com/tarte.jpg",
      imageUrl: "https://example.com/tarte.jpg",
      imagePlaceholderUrl: "https://example.com/tarte.jpg"
    });

    const refreshed = mergeRecipeUpdateFromSource(current, imported);

    expect(refreshed.id).toBe("42");
    expect(refreshed.name).toBe("Nouvelle tarte");
    expect(refreshed.localMeta?.servingOverride).toBe(8);
    expect(refreshed.image).toBe("https://example.com/tarte.jpg");
  });

  it("prefers an internet image over an existing Cookbook endpoint", () => {
    const current = normalizeRecipe({
      id: "42",
      name: "Tarte",
      url: "https://example.com/tarte",
      image:
        "https://cloud.example.com/apps/cookbook/api/v1/recipes/42/image?size=full",
      imageUrl:
        "https://cloud.example.com/apps/cookbook/api/v1/recipes/42/image?size=full",
      imagePlaceholderUrl:
        "https://cloud.example.com/apps/cookbook/api/v1/recipes/42/image?size=thumb"
    });
    const imported = normalizeRecipe({
      name: "Tarte",
      url: "https://example.com/tarte",
      image: "https://example.com/source.jpg",
      imageUrl: "https://example.com/source.jpg",
      imagePlaceholderUrl: "https://example.com/source.jpg"
    });

    const refreshed = mergeRecipeUpdateFromSource(current, imported);

    expect(refreshed.image).toBe("https://example.com/source.jpg");
    expect(refreshed.imageUrl).toBe("https://example.com/source.jpg");
    expect(refreshed.imagePlaceholderUrl).toBe("https://example.com/source.jpg");
  });
});
