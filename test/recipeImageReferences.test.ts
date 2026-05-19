import { describe, expect, it } from "vitest";
import {
  getEditableRecipeImageSource,
  getRemoteRecipeImage,
  replaceLocalRecipeImageReferencesWithRemote,
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

  it("does not make a cached Cookbook endpoint image primary", () => {
    const imageUrl =
      "https://cloud.example.com/apps/cookbook/webapp/recipes/3264/image?size=full";
    const recipe = normalizeRecipe({
      name: "Tapenade",
      image: imageUrl,
      imageUrl,
      imagePlaceholderUrl: imageUrl
    });

    const cached = withCachedRecipeImage(
      recipe,
      "file:///documents/recipe-images/tapenade.jpg"
    );

    expect(cached.image).toBe(imageUrl);
    expect(cached.imageUrl).toBe(imageUrl);
    expect(cached.imagePlaceholderUrl).toBe(imageUrl);
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

  it("prefers a remote image over a stale local cache in editable fields", () => {
    const recipe = normalizeRecipe({
      name: "Tapenade",
      image: "file:///documents/recipe-images/tapenade.jpg",
      imageUrl:
        "https://cloud.example.com/apps/cookbook/webapp/recipes/3264/image?size=full",
      imagePlaceholderUrl:
        "https://cloud.example.com/apps/cookbook/webapp/recipes/3264/image?size=thumb"
    });

    expect(getEditableRecipeImageSource(recipe)).toBe(
      "https://cloud.example.com/apps/cookbook/webapp/recipes/3264/image?size=full"
    );
  });

  it("repairs stale local cache references when a remote image exists", () => {
    const recipe = normalizeRecipe({
      name: "Tapenade",
      image: "file:///documents/recipe-images/tapenade.jpg",
      imageUrl:
        "https://cloud.example.com/apps/cookbook/webapp/recipes/3264/image?size=full",
      imagePlaceholderUrl:
        "https://cloud.example.com/apps/cookbook/webapp/recipes/3264/image?size=thumb"
    });

    const repaired = replaceLocalRecipeImageReferencesWithRemote(recipe);

    expect(repaired.image).toBe(
      "https://cloud.example.com/apps/cookbook/webapp/recipes/3264/image?size=full"
    );
    expect(repaired.imageUrl).toBe(
      "https://cloud.example.com/apps/cookbook/webapp/recipes/3264/image?size=full"
    );
    expect(repaired.imagePlaceholderUrl).toBe(
      "https://cloud.example.com/apps/cookbook/webapp/recipes/3264/image?size=thumb"
    );
  });

  it("keeps local-only image references", () => {
    const recipe = normalizeRecipe({
      name: "Photo maison",
      image: "file:///documents/recipe-images/photo.jpg",
      imageUrl: "",
      imagePlaceholderUrl: ""
    });

    const repaired = replaceLocalRecipeImageReferencesWithRemote(recipe);

    expect(repaired.image).toBe("file:///documents/recipe-images/photo.jpg");
    expect(getEditableRecipeImageSource(repaired)).toBe(
      "file:///documents/recipe-images/photo.jpg"
    );
  });
});
