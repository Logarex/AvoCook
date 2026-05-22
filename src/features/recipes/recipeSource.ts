import { preferRecipeImageUrls } from "./recipeImageReferences";
import { normalizeRecipe, type Recipe } from "./types";

export function isExternalRecipeSourceUrl(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    return !isLocalNetworkHostname(url.hostname);
  } catch {
    return false;
  }
}

export function mergeRecipeUpdateFromSource(
  currentRecipe: Recipe,
  importedRecipe: Recipe
) {
  const imported = normalizeRecipe(importedRecipe);
  const current = normalizeRecipe(currentRecipe);
  const merged = normalizeRecipe({
    ...imported,
    id: current.id,
    recipe_id: current.recipe_id,
    dateCreated: current.dateCreated || imported.dateCreated,
    image: imported.image || current.image,
    imageUrl: imported.imageUrl || current.imageUrl,
    imagePlaceholderUrl:
      imported.imagePlaceholderUrl || current.imagePlaceholderUrl,
    sourceName: imported.sourceName || current.sourceName,
    url: imported.url || current.url,
    localMeta: current.localMeta
  });

  return preferRecipeImageUrls(merged, current);
}

function isLocalNetworkHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  if (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  if (
    /^127\./.test(normalized) ||
    /^10\./.test(normalized) ||
    /^192\.168\./.test(normalized)
  ) {
    return true;
  }

  const private172 = normalized.match(/^172\.(\d+)\./);
  if (private172) {
    const secondOctet = Number(private172[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}
