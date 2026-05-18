import { normalizeRecipe, type Recipe } from "./types";

const REMOTE_IMAGE_PATTERN = /^https?:\/\//i;
const COOKBOOK_IMAGE_ENDPOINT_PATTERN =
  /\/apps\/cookbook\/(?:api\/v1|webapp)\/recipes\/[^/?#]+\/image(?:[?#]|$)/i;

export function isRemoteImageReference(value: string | null | undefined) {
  return Boolean(value && REMOTE_IMAGE_PATTERN.test(value));
}

export function getRemoteRecipeImage(
  recipe: Pick<Recipe, "image" | "imageUrl" | "imagePlaceholderUrl">
) {
  return (
    [recipe.image, recipe.imageUrl, recipe.imagePlaceholderUrl].find(
      isRemoteImageReference
    ) ?? ""
  );
}

export function getExternalRecipeImageSource(
  recipe: Pick<Recipe, "image" | "imageUrl" | "imagePlaceholderUrl">
) {
  return (
    [recipe.image, recipe.imageUrl, recipe.imagePlaceholderUrl].find(
      (value) =>
        isRemoteImageReference(value) &&
        !COOKBOOK_IMAGE_ENDPOINT_PATTERN.test(value ?? "")
    ) ?? ""
  );
}

export function hasExternalRecipeImageSource(
  recipe: Pick<Recipe, "image" | "imageUrl" | "imagePlaceholderUrl">
) {
  return Boolean(getExternalRecipeImageSource(recipe));
}

export function isCookbookImageEndpoint(value: string | null | undefined) {
  return Boolean(value && COOKBOOK_IMAGE_ENDPOINT_PATTERN.test(value));
}

export function isDisplayableRecipeImage(value: string | null | undefined) {
  return Boolean(value && /^(?:https?:|file:|data:)/i.test(value));
}

export function getLocalRecipeImage(
  recipe: Pick<Recipe, "image" | "imageUrl" | "imagePlaceholderUrl">
) {
  return (
    [recipe.image, recipe.imageUrl, recipe.imagePlaceholderUrl].find(
      (value) =>
        Boolean(value) &&
        !isRemoteImageReference(value) &&
        !String(value).startsWith("/")
    ) ?? ""
  );
}

export function withCachedRecipeImage(recipe: Recipe, cachedImage: string) {
  const externalImage = getExternalRecipeImageSource(recipe);
  const remoteImage = getRemoteRecipeImage(recipe);
  const referenceImage = externalImage || remoteImage || cachedImage;

  return normalizeRecipe({
    ...recipe,
    image: externalImage || cachedImage,
    imageUrl: referenceImage,
    imagePlaceholderUrl: referenceImage
  });
}

export function preferRecipeImageUrls(
  recipe: Recipe,
  fallbackRecipe?: Recipe
) {
  const image =
    getExternalRecipeImageSource(recipe) ||
    (fallbackRecipe ? getExternalRecipeImageSource(fallbackRecipe) : "");

  if (!image) {
    return recipe;
  }

  return normalizeRecipe({
    ...recipe,
    image,
    imageUrl: image,
    imagePlaceholderUrl: image
  });
}

export function sanitizeRecipeImagesForNextcloud(recipe: Recipe) {
  const externalImage = getExternalRecipeImageSource(recipe);

  if (externalImage) {
    return normalizeRecipe({
      ...recipe,
      image: externalImage,
      imageUrl: externalImage,
      imagePlaceholderUrl: externalImage
    });
  }

  return normalizeRecipe({
    ...recipe,
    image:
      isRemoteImageReference(recipe.image) &&
      !isCookbookImageEndpoint(recipe.image)
        ? recipe.image
        : "",
    imageUrl:
      isRemoteImageReference(recipe.imageUrl) &&
      !isCookbookImageEndpoint(recipe.imageUrl)
        ? recipe.imageUrl
        : "",
    imagePlaceholderUrl:
      isRemoteImageReference(recipe.imagePlaceholderUrl) &&
      !isCookbookImageEndpoint(recipe.imagePlaceholderUrl)
        ? recipe.imagePlaceholderUrl
        : ""
  });
}
