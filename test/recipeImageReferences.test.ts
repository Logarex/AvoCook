import { describe, expect, it } from "vitest";
import {
  getRemoteRecipeImage,
  sanitizeRecipeImagesForNextcloud,
  withCachedRecipeImage
} from "../src/features/recipes/recipeImageReferences";
import { normalizeRecipe } from "../src/features/recipes/types";

describe("recipe image references", () => {
  it("keeps the imported remote image URL as the primary image when caching a local copy", () => {
    const recipe = normalizeRecipe({
      name: "Tarte aux pommes",
      image: "https://example.com/tarte.jpg",
      imageUrl: "https://example.com/tarte.jpg",
      imagePlaceholderUrl: "https://example.com/tarte.jpg"
    });

    const cached = withCachedRecipeImage(
      recipe,
      "file:///documents/recipe-images/tarte.jpg"
    );

    expect(cached.image).toBe("https://example.com/tarte.jpg");
    expect(cached.imageUrl).toBe("https://example.com/tarte.jpg");
    expect(cached.imagePlaceholderUrl).toBe("https://example.com/tarte.jpg");
  });

  it("sends the remote image URL to every Cookbook image field", () => {
    const recipe = normalizeRecipe({
      name: "Tarte aux pommes",
      image: "file:///documents/recipe-images/tarte.jpg",
      imageUrl: "https://example.com/tarte.jpg",
      imagePlaceholderUrl: ""
    });

    const sanitized = sanitizeRecipeImagesForNextcloud(recipe);

    expect(sanitized.image).toBe("https://example.com/tarte.jpg");
    expect(sanitized.imageUrl).toBe("https://example.com/tarte.jpg");
    expect(sanitized.imagePlaceholderUrl).toBe("https://example.com/tarte.jpg");
  });

  it("does not leak local file paths to Nextcloud", () => {
    const recipe = normalizeRecipe({
      name: "Tarte aux pommes",
      image: "file:///documents/recipe-images/tarte.jpg",
      imageUrl: "file:///documents/recipe-images/tarte.jpg",
      imagePlaceholderUrl: "file:///documents/recipe-images/tarte.jpg"
    });

    const sanitized = sanitizeRecipeImagesForNextcloud(recipe);

    expect(getRemoteRecipeImage(recipe)).toBe("");
    expect(sanitized.image).toBe("");
    expect(sanitized.imageUrl).toBe("");
    expect(sanitized.imagePlaceholderUrl).toBe("");
  });

  it("does not send Cookbook image endpoints back as source images", () => {
    const imageUrl =
      "https://cloud.example.com/apps/cookbook/api/v1/recipes/12/image?size=thumb";
    const recipe = normalizeRecipe({
      name: "Tarte aux pommes",
      image: "",
      imageUrl,
      imagePlaceholderUrl: ""
    });

    const sanitized = sanitizeRecipeImagesForNextcloud(recipe);

    expect(sanitized.image).toBe("");
    expect(sanitized.imageUrl).toBe("");
    expect(sanitized.imagePlaceholderUrl).toBe("");
  });

  it("does not send Cookbook webapp image endpoints back as source images", () => {
    const imageUrl =
      "https://cloud.example.com/apps/cookbook/webapp/recipes/3254/image?size=full";
    const recipe = normalizeRecipe({
      name: "Tarte aux pommes",
      image: imageUrl,
      imageUrl,
      imagePlaceholderUrl: imageUrl
    });

    const sanitized = sanitizeRecipeImagesForNextcloud(recipe);

    expect(sanitized.image).toBe("");
    expect(sanitized.imageUrl).toBe("");
    expect(sanitized.imagePlaceholderUrl).toBe("");
  });
});
