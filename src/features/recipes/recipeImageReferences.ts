import { normalizeRecipe, type Recipe } from "./types";

const REMOTE_IMAGE_PATTERN = /^https?:\/\//i;
const LOCAL_IMAGE_PATTERN = /^file:\/\//i;
const COOKBOOK_IMAGE_ENDPOINT_PATTERN =
  /\/apps\/cookbook\/(?:api\/v1|webapp)\/recipes\/[^/?#]+\/image(?:[?#]|$)/i;

export function isRemoteImageReference(value: string | null | undefined) {
  return Boolean(value && REMOTE_IMAGE_PATTERN.test(value));
}

export function isLocalImageReference(value: string | null | undefined) {
  return Boolean(value && LOCAL_IMAGE_PATTERN.test(value));
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
      (value) => isLocalImageReference(value)
    ) ?? ""
  );
}

export function hasRecipeImageReference(
  recipe: Pick<Recipe, "image" | "imageUrl" | "imagePlaceholderUrl">
) {
  return Boolean(recipe.image || recipe.imageUrl || recipe.imagePlaceholderUrl);
}

export function hasRecipeImageRemovalIntent(
  recipe: Pick<Recipe, "localMeta">
) {
  return Boolean(recipe.localMeta?.imageRemoved);
}

export function canUseRemoteRecipeImageFallback<
  T extends Pick<Recipe, "id" | "localMeta">
>(recipe: T): recipe is T & { id: string } {
  return Boolean(
    recipe.id &&
      !recipe.id.startsWith("local-") &&
      !hasRecipeImageRemovalIntent(recipe)
  );
}

export function withoutRecipeImages(recipe: Recipe) {
  return normalizeRecipe({
    ...recipe,
    image: "",
    imageUrl: "",
    imagePlaceholderUrl: ""
  });
}

export function withRecipeImageRemovalIntent(
  recipe: Recipe,
  imageRemoved: boolean
) {
  const localMeta = { ...recipe.localMeta };

  if (imageRemoved) {
    localMeta.imageRemoved = true;
  } else {
    delete localMeta.imageRemoved;
  }

  return normalizeRecipe({
    ...recipe,
    localMeta: Object.keys(localMeta).length ? localMeta : undefined
  });
}

export function withCachedRecipeImage(recipe: Recipe, cachedImage: string) {
  if (hasRecipeImageRemovalIntent(recipe)) {
    return withoutRecipeImages(recipe);
  }

  const externalImage = getExternalRecipeImageSource(recipe);
  const remoteImage = getRemoteRecipeImage(recipe);
  const referenceImage = externalImage || remoteImage || cachedImage;

  return normalizeRecipe({
    ...recipe,
    image: referenceImage,
    imageUrl: referenceImage,
    imagePlaceholderUrl: referenceImage
  });
}

export function getEditableRecipeImageSource(
  recipe: Pick<Recipe, "image" | "imageUrl" | "imagePlaceholderUrl">
) {
  return (
    getExternalRecipeImageSource(recipe) ||
    getRemoteRecipeImage(recipe) ||
    getLocalRecipeImage(recipe)
  );
}

export function replaceLocalRecipeImageReferencesWithRemote(recipe: Recipe) {
  const remoteImage = getRemoteRecipeImage(recipe);
  if (
    !remoteImage ||
    ![recipe.image, recipe.imageUrl, recipe.imagePlaceholderUrl].some(
      isLocalImageReference
    )
  ) {
    return recipe;
  }

  return normalizeRecipe({
    ...recipe,
    image: isLocalImageReference(recipe.image) ? remoteImage : recipe.image,
    imageUrl: isLocalImageReference(recipe.imageUrl)
      ? remoteImage
      : recipe.imageUrl,
    imagePlaceholderUrl: isLocalImageReference(recipe.imagePlaceholderUrl)
      ? remoteImage
      : recipe.imagePlaceholderUrl
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
  if (hasRecipeImageRemovalIntent(recipe)) {
    return withoutRecipeImages(recipe);
  }

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
