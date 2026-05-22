import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import type { Recipe } from "./types";

const IMAGE_DIR = new Directory(Paths.document, "recipe-images");

export async function persistRecipeImage(
  uri: string,
  options?: { headers?: Record<string, string> }
): Promise<string> {
  if (!uri) {
    return uri;
  }

  if (uri.startsWith(IMAGE_DIR.uri)) {
    return uri;
  }

  IMAGE_DIR.create({ idempotent: true, intermediates: true });
  const extension = getImageExtension(uri);
  const filename = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    await getImageCacheKey(uri)
  );
  const destination = new File(IMAGE_DIR, `${filename}.${extension}`);

  if (destination.exists) {
    return destination.uri;
  }

  if (/^https?:\/\//i.test(uri)) {
    const file = await File.downloadFileAsync(uri, destination, {
      headers: options?.headers,
      idempotent: true
    });
    return file.uri;
  }

  new File(uri).copy(destination);
  return destination.uri;
}

export async function pruneRecipeImageCache(recipes: Recipe[]) {
  if (!IMAGE_DIR.exists) {
    return;
  }

  const referencedUris = new Set(
    recipes
      .flatMap((recipe) => [
        recipe.image,
        recipe.imageUrl,
        recipe.imagePlaceholderUrl,
        recipe.localMeta?.cachedImage ?? ""
      ])
      .filter((uri) => uri.startsWith(IMAGE_DIR.uri))
  );

  for (const entry of IMAGE_DIR.list()) {
    if (entry instanceof File && !referencedUris.has(entry.uri)) {
      entry.delete();
    }
  }
}

export async function restoreRecipeImageFromBackup({
  base64,
  extension
}: {
  base64: string;
  extension: string;
}) {
  IMAGE_DIR.create({ idempotent: true, intermediates: true });
  const safeExtension = normalizeImageExtension(extension);
  const filename = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    base64
  );
  const destination = new File(IMAGE_DIR, `${filename}.${safeExtension}`);

  if (!destination.exists) {
    destination.create({ intermediates: true });
    destination.write(base64, { encoding: "base64" });
  }

  return destination.uri;
}

function getImageExtension(uri: string) {
  const withoutQuery = uri.split("?")[0] ?? uri;
  const extension = withoutQuery.split(".").pop()?.toLowerCase();
  if (extension && ["jpg", "jpeg", "png", "webp", "heic"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }
  return "jpg";
}

function normalizeImageExtension(extension: string) {
  const normalized = extension.replace(/^\./, "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "heic"].includes(normalized)) {
    return normalized === "jpeg" ? "jpg" : normalized;
  }
  return "jpg";
}

async function getImageCacheKey(uri: string) {
  if (/^https?:\/\//i.test(uri)) {
    return uri;
  }

  try {
    const info = new File(uri).info({ md5: true });
    return `${uri}-${info.size ?? "unknown"}-${info.md5 ?? "no-md5"}`;
  } catch {
    return `${uri}-${Date.now()}`;
  }
}
