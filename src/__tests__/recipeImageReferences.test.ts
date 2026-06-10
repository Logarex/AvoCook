import { describe, expect, it } from "vitest";
import {
  canUseRemoteRecipeImageFallback,
  getCachedRecipeImage,
  getEditableRecipeImageSource,
  getPreferredDisplayRecipeImage,
  getRemoteRecipeImage,
  hasRecipeImageRemovalIntent,
  normalizeCookbookImageEndpointReference,
  mergeRecipeImageReferences,
  replaceLocalRecipeImageReferencesWithRemote,
  sanitizeRecipeImagesForNextcloud,
  withRecipeImageRemovalIntent,
  withCachedRecipeImage
} from "../features/recipes/recipeImageReferences";
import { normalizeRecipe } from "../features/recipes/types";

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

  it("keeps uploaded Nextcloud file paths as Cookbook image sources", () => {
    const recipe = normalizeRecipe({
      name: "Photo maison",
      image: "/AvoCook Images/photo.jpg",
      imageUrl: "/AvoCook Images/photo.jpg",
      imagePlaceholderUrl: "/AvoCook Images/photo.jpg"
    });

    const sanitized = sanitizeRecipeImagesForNextcloud(recipe);

    expect(sanitized.image).toBe("/AvoCook Images/photo.jpg");
    expect(sanitized.imageUrl).toBe("/AvoCook Images/photo.jpg");
    expect(sanitized.imagePlaceholderUrl).toBe("/AvoCook Images/photo.jpg");
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

  it("repairs malformed legacy Cookbook image endpoint sizes", () => {
    expect(
      normalizeCookbookImageEndpointReference(
        "https://cloud.example.com/apps/cookbook/webapp/recipes/1380499/image?size=fulld"
      )
    ).toBe(
      "https://cloud.example.com/apps/cookbook/webapp/recipes/1380499/image?size=full"
    );
    expect(
      normalizeCookbookImageEndpointReference(
        "/apps/cookbook/api/v1/recipes/1380499/image?size=thumb16d"
      )
    ).toBe("/apps/cookbook/api/v1/recipes/1380499/image?size=thumb16");
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

  it("keeps an explicit cached local copy while preserving the Nextcloud file source", () => {
    const recipe = normalizeRecipe({
      name: "Photo maison",
      image: "/AvoCook Images/photo.jpg",
      imageUrl:
        "https://cloud.example.com/apps/cookbook/api/v1/recipes/42/image?size=full",
      imagePlaceholderUrl:
        "https://cloud.example.com/apps/cookbook/api/v1/recipes/42/image?size=thumb"
    });

    const cached = withCachedRecipeImage(
      recipe,
      "file:///documents/recipe-images/photo.jpg"
    );

    expect(cached.image).toBe("/AvoCook Images/photo.jpg");
    expect(cached.imageUrl).toBe(
      "https://cloud.example.com/apps/cookbook/api/v1/recipes/42/image?size=full"
    );
    expect(getCachedRecipeImage(cached)).toBe(
      "file:///documents/recipe-images/photo.jpg"
    );
    expect(getPreferredDisplayRecipeImage(cached)).toBe(
      "file:///documents/recipe-images/photo.jpg"
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

  it("keeps the cached local image when sync returns a server recipe without image fields", () => {
    const serverRecipe = normalizeRecipe({
      id: "12",
      name: "Photo maison",
      image: "",
      imageUrl: "",
      imagePlaceholderUrl: ""
    });
    const localRecipe = normalizeRecipe({
      id: "12",
      name: "Photo maison",
      image: "file:///documents/recipe-images/photo.jpg",
      localMeta: {
        cachedImage: "file:///documents/recipe-images/photo.jpg"
      }
    });

    const merged = mergeRecipeImageReferences(serverRecipe, localRecipe);

    expect(merged.image).toBe("file:///documents/recipe-images/photo.jpg");
    expect(merged.imageUrl).toBe("file:///documents/recipe-images/photo.jpg");
    expect(merged.imagePlaceholderUrl).toBe(
      "file:///documents/recipe-images/photo.jpg"
    );
    expect(merged.localMeta?.cachedImage).toBe(
      "file:///documents/recipe-images/photo.jpg"
    );
  });

  it("remembers when a recipe image was intentionally removed", () => {
    const recipe = normalizeRecipe({
      name: "Sans photo",
      image: "",
      imageUrl: "",
      imagePlaceholderUrl: ""
    });

    const updated = withRecipeImageRemovalIntent(recipe, true);

    expect(hasRecipeImageRemovalIntent(updated)).toBe(true);
  });

  it("does not send a source image when the image was intentionally removed", () => {
    const recipe = withRecipeImageRemovalIntent(
      normalizeRecipe({
        name: "Tarte aux pommes",
        image: "https://example.com/tarte.jpg",
        imageUrl: "https://example.com/tarte.jpg",
        imagePlaceholderUrl: "https://example.com/tarte.jpg"
      }),
      true
    );

    const sanitized = sanitizeRecipeImagesForNextcloud(recipe);

    expect(sanitized.image).toBe("");
    expect(sanitized.imageUrl).toBe("");
    expect(sanitized.imagePlaceholderUrl).toBe("");
    expect(hasRecipeImageRemovalIntent(sanitized)).toBe(true);
  });

  it("does not restore a cached image when the image was intentionally removed", () => {
    const recipe = withRecipeImageRemovalIntent(
      normalizeRecipe({
        name: "Tapenade",
        image: "",
        imageUrl: "",
        imagePlaceholderUrl: ""
      }),
      true
    );

    const cached = withCachedRecipeImage(
      recipe,
      "file:///documents/recipe-images/tapenade.jpg"
    );

    expect(cached.image).toBe("");
    expect(cached.imageUrl).toBe("");
    expect(cached.imagePlaceholderUrl).toBe("");
    expect(getCachedRecipeImage(cached)).toBe("");
    expect(hasRecipeImageRemovalIntent(cached)).toBe(true);
  });

  it("does not fall back to the Cookbook image endpoint after image removal", () => {
    const recipe = withRecipeImageRemovalIntent(
      normalizeRecipe({
        id: "42",
        name: "Sans photo"
      }),
      true
    );

    expect(canUseRemoteRecipeImageFallback(recipe)).toBe(false);
  });

  it("can still fall back to the Cookbook image endpoint for synced recipes without removal intent", () => {
    const recipe = normalizeRecipe({
      id: "42",
      name: "Avec photo distante"
    });

    expect(canUseRemoteRecipeImageFallback(recipe)).toBe(true);
  });
});
