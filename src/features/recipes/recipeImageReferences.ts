import { normalizeRecipe, type Recipe } from "./types";

const REMOTE_IMAGE_PATTERN = /^https?:\/\//i;
const LOCAL_IMAGE_PATTERN = /^file:\/\//i;
const NEXTCLOUD_FILE_IMAGE_PATTERN = /^\/(?!apps\/cookbook\/)/i;
const COOKBOOK_IMAGE_ENDPOINT_PATTERN =
  /\/apps\/cookbook\/(?:api\/v1|webapp)\/recipes\/[^/?#]+\/image(?:[?#]|$)/i;

export function isRemoteImageReference(value: string | null | undefined) {
  return Boolean(value && REMOTE_IMAGE_PATTERN.test(value));
}

export function isLocalImageReference(value: string | null | undefined) {
  return Boolean(value && LOCAL_IMAGE_PATTERN.test(value));
}

export function isNextcloudFileImageReference(
  value: string | null | undefined
) {
  return Boolean(value && NEXTCLOUD_FILE_IMAGE_PATTERN.test(value));
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

export function getNextcloudFileRecipeImage(
  recipe: Pick<Recipe, "image" | "imageUrl" | "imagePlaceholderUrl">
) {
  return (
    [recipe.image, recipe.imageUrl, recipe.imagePlaceholderUrl].find(
      isNextcloudFileImageReference
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

export function normalizeCookbookImageEndpointReference(value: string) {
  if (!COOKBOOK_IMAGE_ENDPOINT_PATTERN.test(value)) {
    return value;
  }

  try {
    const isRelative = value.startsWith("/");
    const url = new URL(value, "https://avocook.local");
    const size = url.searchParams.get("size");
    // Cookbook v1 sometimes appends a trailing "d" to image size params
    // (e.g. "fulld" instead of "full") — not sure if it's a bug on their end
    // but we need to handle it either way
    if (size && !["full", "thumb", "thumb16"].includes(size)) {
      url.searchParams.set("size", normalizeCookbookImageSize(size));
    }
    return isRelative
      ? `${url.pathname}${url.search}${url.hash}`
      : url.toString();
  } catch {
    return value;
  }
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

export function getCachedRecipeImage(recipe: Pick<Recipe, "localMeta">) {
  return hasRecipeImageRemovalIntent(recipe)
    ? ""
    : recipe.localMeta?.cachedImage ?? "";
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
  const localMeta = { ...recipe.localMeta };
  delete localMeta.cachedImage;

  return normalizeRecipe({
    ...recipe,
    image: "",
    imageUrl: "",
    imagePlaceholderUrl: "",
    localMeta: Object.keys(localMeta).length ? localMeta : undefined
  });
}

export function withRecipeImageRemovalIntent(
  recipe: Recipe,
  imageRemoved: boolean
) {
  const localMeta = { ...recipe.localMeta };

  if (imageRemoved) {
    localMeta.imageRemoved = true;
    delete localMeta.cachedImage;
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
  const nextcloudFileImage = getNextcloudFileRecipeImage(recipe);
  const remoteImage = getRemoteRecipeImage(recipe);
  const sourceImage =
    externalImage || nextcloudFileImage || remoteImage || cachedImage;
  const displayImage =
    externalImage || remoteImage || nextcloudFileImage || cachedImage;
  const localMeta = {
    ...recipe.localMeta,
    cachedImage
  };

  return normalizeRecipe({
    ...recipe,
    image: sourceImage,
    imageUrl: externalImage ? externalImage : recipe.imageUrl || displayImage,
    imagePlaceholderUrl: externalImage
      ? externalImage
      : recipe.imagePlaceholderUrl || displayImage,
    localMeta
  });
}

export function getEditableRecipeImageSource(
  recipe: Pick<
    Recipe,
    "image" | "imageUrl" | "imagePlaceholderUrl" | "localMeta"
  >
) {
  const image =
    getCachedRecipeImage(recipe) ||
    getExternalRecipeImageSource(recipe) ||
    getRemoteRecipeImage(recipe) ||
    getLocalRecipeImage(recipe) ||
    getNextcloudFileRecipeImage(recipe);

  return image ? normalizeCookbookImageEndpointReference(image) : "";
}

export function getPreferredDisplayRecipeImage(
  recipe: Pick<
    Recipe,
    "image" | "imageUrl" | "imagePlaceholderUrl" | "localMeta"
  >
) {
  const image =
    [
      getCachedRecipeImage(recipe),
      recipe.image,
      recipe.imagePlaceholderUrl,
      recipe.imageUrl
    ].find(isDisplayableRecipeImage) ?? "";

  return image ? normalizeCookbookImageEndpointReference(image) : "";
}

export function normalizeRecipeImageReferences(recipe: Recipe) {
  return normalizeRecipe({
    ...recipe,
    image: normalizeCookbookImageEndpointReference(recipe.image),
    imageUrl: normalizeCookbookImageEndpointReference(recipe.imageUrl),
    imagePlaceholderUrl: normalizeCookbookImageEndpointReference(
      recipe.imagePlaceholderUrl
    )
  });
}

export function replaceLocalRecipeImageReferencesWithRemote(recipe: Recipe) {
  const normalizedRecipe = normalizeRecipeImageReferences(recipe);

  if (getCachedRecipeImage(normalizedRecipe)) {
    return normalizedRecipe;
  }

  const remoteImage = getRemoteRecipeImage(normalizedRecipe);
  if (
    !remoteImage ||
    ![
      normalizedRecipe.image,
      normalizedRecipe.imageUrl,
      normalizedRecipe.imagePlaceholderUrl
    ].some(
      isLocalImageReference
    )
  ) {
    return normalizedRecipe;
  }

  return normalizeRecipe({
    ...normalizedRecipe,
    image: isLocalImageReference(normalizedRecipe.image)
      ? remoteImage
      : normalizedRecipe.image,
    imageUrl: isLocalImageReference(normalizedRecipe.imageUrl)
      ? remoteImage
      : normalizedRecipe.imageUrl,
    imagePlaceholderUrl: isLocalImageReference(
      normalizedRecipe.imagePlaceholderUrl
    )
      ? remoteImage
      : normalizedRecipe.imagePlaceholderUrl
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
  const nextcloudFileImage = getNextcloudFileRecipeImage(recipe);

  if (externalImage) {
    return normalizeRecipe({
      ...recipe,
      image: externalImage,
      imageUrl: externalImage,
      imagePlaceholderUrl: externalImage
    });
  }

  if (nextcloudFileImage) {
    return normalizeRecipe({
      ...recipe,
      image: nextcloudFileImage,
      imageUrl: nextcloudFileImage,
      imagePlaceholderUrl: nextcloudFileImage
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

function normalizeCookbookImageSize(size: string) {
  const normalized = size.toLowerCase();
  if (normalized.startsWith("thumb16")) {
    return "thumb16";
  }
  if (normalized.startsWith("thumb")) {
    return "thumb";
  }
  return "full";
}
