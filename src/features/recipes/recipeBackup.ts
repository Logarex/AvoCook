import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import type { CookbookClient } from "../nextcloud/cookbookClient";
import {
  canUseRemoteRecipeImageFallback,
  getCachedRecipeImage,
  hasRecipeImageReference,
  hasRecipeImageRemovalIntent
} from "./recipeImageReferences";
import { normalizeRecipe, type Recipe } from "./types";

export const RECIPE_BACKUP_SCHEMA_VERSION = 1;
export const RECIPE_BACKUP_APP_ID = "AvoCook";

export type RecipeBackupSource = "local" | "nextcloud" | "mixed";

export type RecipeBackupImageAsset = {
  id: string;
  data: string;
  extension: string;
  mimeType: string;
  originalUri?: string;
};

export type RecipeBackupEntry = {
  recipe: Recipe;
  imageAssetId?: string;
};

export type RecipeBackup = {
  app: typeof RECIPE_BACKUP_APP_ID;
  schemaVersion: typeof RECIPE_BACKUP_SCHEMA_VERSION;
  createdAt: string;
  source: RecipeBackupSource;
  recipes: RecipeBackupEntry[];
  customCategories: string[];
  assets: Record<string, RecipeBackupImageAsset>;
};

export type RecipeBackupExportResult = {
  backup: RecipeBackup;
  recipeCount: number;
  categoryCount: number;
  imageCount: number;
  skippedImageCount: number;
};

type CreateRecipeBackupOptions = {
  recipes: Recipe[];
  customCategories: string[];
  source: RecipeBackupSource;
  client?: CookbookClient | null;
  imageDownloadTimeoutMs?: number;
};

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    }
  );
  await Promise.all(workers);
  return results;
}

export async function createRecipeBackup({
  recipes,
  customCategories,
  source,
  client,
  imageDownloadTimeoutMs
}: CreateRecipeBackupOptions): Promise<RecipeBackupExportResult> {
  const assets: Record<string, RecipeBackupImageAsset> = {};
  let skippedImageCount = 0;

  // Process recipe assets concurrently with a limit of 4
  const entries = await mapWithConcurrency(recipes, 4, async (recipe) => {
    const normalizedRecipe = normalizeRecipe(recipe);
    const imageAsset = await collectRecipeImageAsset(
      normalizedRecipe,
      client,
      imageDownloadTimeoutMs
    );
    return {
      recipe: normalizedRecipe,
      imageAsset
    };
  });

  const finalEntries: RecipeBackupEntry[] = [];
  for (const entry of entries) {
    if (entry.imageAsset) {
      assets[entry.imageAsset.id] = entry.imageAsset;
    } else if (hasBackupImageReference(entry.recipe)) {
      skippedImageCount += 1;
    }

    finalEntries.push({
      recipe: entry.recipe,
      imageAssetId: entry.imageAsset?.id
    });
  }

  const backup: RecipeBackup = {
    app: RECIPE_BACKUP_APP_ID,
    schemaVersion: RECIPE_BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    source,
    recipes: finalEntries,
    customCategories: Array.from(new Set(customCategories.map((item) => item.trim()).filter(Boolean))).sort((left, right) =>
      left.localeCompare(right)
    ),
    assets
  };

  return {
    backup,
    recipeCount: backup.recipes.length,
    categoryCount: backup.customCategories.length,
    imageCount: Object.keys(assets).length,
    skippedImageCount
  };
}

export function serializeRecipeBackup(backup: RecipeBackup) {
  return JSON.stringify(backup, null, 2);
}

export function parseRecipeBackup(content: string): RecipeBackup {
  const parsed = JSON.parse(content) as Partial<RecipeBackup>;

  if (
    parsed.app !== RECIPE_BACKUP_APP_ID ||
    parsed.schemaVersion !== RECIPE_BACKUP_SCHEMA_VERSION ||
    !Array.isArray(parsed.recipes)
  ) {
    throw new Error("INVALID_RECIPE_BACKUP");
  }

  const assets =
    parsed.assets && typeof parsed.assets === "object" ? parsed.assets : {};

  return {
    app: RECIPE_BACKUP_APP_ID,
    schemaVersion: RECIPE_BACKUP_SCHEMA_VERSION,
    createdAt:
      typeof parsed.createdAt === "string"
        ? parsed.createdAt
        : new Date().toISOString(),
    source: isBackupSource(parsed.source) ? parsed.source : "mixed",
    recipes: parsed.recipes
      .filter((entry): entry is RecipeBackupEntry =>
        Boolean(entry && typeof entry === "object" && "recipe" in entry)
      )
      .map((entry) => ({
        recipe: normalizeRecipe(entry.recipe),
        imageAssetId:
          typeof entry.imageAssetId === "string" ? entry.imageAssetId : undefined
      })),
    customCategories: Array.isArray(parsed.customCategories)
      ? parsed.customCategories.filter(
          (category): category is string => typeof category === "string"
        )
      : [],
    assets: Object.fromEntries(
      Object.entries(assets).filter(
        (entry): entry is [string, RecipeBackupImageAsset] =>
          isRecipeBackupImageAsset(entry[1])
      )
    )
  };
}

export async function writeRecipeBackupToPickedDirectory(backup: RecipeBackup) {
  const directory = await Directory.pickDirectoryAsync();
  const file = directory.createFile(
    getRecipeBackupFilename(backup.createdAt),
    "application/json"
  );
  file.write(serializeRecipeBackup(backup));
  return file.uri;
}

export async function pickRecipeBackupFile() {
  const picked = await File.pickFileAsync(undefined, "application/json");
  const file = Array.isArray(picked) ? picked[0] : picked;
  if (!file) {
    throw new Error("NO_RECIPE_BACKUP_FILE");
  }

  return readRecipeBackupFile(file.uri);
}

export async function readRecipeBackupFile(uri: string) {
  return parseRecipeBackup(await new File(uri).text());
}

function getRecipeBackupFilename(createdAt: string) {
  const timestamp = createdAt.replace(/[:.]/g, "-");
  return `avocook-backup-${timestamp}.json`;
}

async function collectRecipeImageAsset(
  recipe: Recipe,
  client?: CookbookClient | null,
  imageDownloadTimeoutMs?: number
) {
  const localOrPublicUri =
    getCachedRecipeImage(recipe) ||
    recipe.image ||
    recipe.imageUrl ||
    recipe.imagePlaceholderUrl;
  const directAsset = localOrPublicUri
    ? await createImageAssetFromUri(localOrPublicUri, {
        timeoutMs: imageDownloadTimeoutMs
      }).catch(() => null)
    : null;

  if (directAsset) {
    return directAsset;
  }

  if (client && canUseRemoteRecipeImageFallback(recipe)) {
    return createImageAssetFromUri(client.getRecipeImageUrl(recipe.id, "full"), {
      headers: client.getImageHeaders(),
      timeoutMs: imageDownloadTimeoutMs
    }).catch(() => null);
  }

  return null;
}

async function createImageAssetFromUri(
  uri: string,
  options?: { headers?: Record<string, string>; timeoutMs?: number }
): Promise<RecipeBackupImageAsset | null> {
  if (!uri) {
    return null;
  }

  const dataUri = parseDataUri(uri);
  if (dataUri) {
    return createImageAsset(dataUri.base64, dataUri.extension, dataUri.mimeType, uri);
  }

  if (/^https?:\/\//i.test(uri)) {
    const tempDirectory = new Directory(Paths.cache, "avocook-backup-images");
    tempDirectory.create({ idempotent: true, intermediates: true });
    const extension = getImageExtension(uri);
    const tempFile = new File(tempDirectory, `${Crypto.randomUUID()}.${extension}`);
    const download = File.downloadFileAsync(uri, tempFile, {
      headers: options?.headers,
      idempotent: true
    });
    const downloaded = options?.timeoutMs
      ? await resolveWithTimeout(download, options.timeoutMs)
      : await download;
    if (!downloaded) {
      download
        .then((file) => {
          try {
            file.delete();
          } catch {
            // Best-effort cleanup after skipping a slow remote image.
          }
        })
        .catch(() => undefined);
      return null;
    }
    const base64 = await downloaded.base64();
    downloaded.delete();
    return createImageAsset(base64, extension, getImageMimeType(extension), uri);
  }

  const file = new File(uri);
  if (!file.exists) {
    return null;
  }

  const extension = getImageExtension(uri);
  return createImageAsset(
    await file.base64(),
    extension,
    getImageMimeType(extension),
    uri
  );
}

async function createImageAsset(
  base64: string,
  extension: string,
  mimeType: string,
  originalUri?: string
): Promise<RecipeBackupImageAsset> {
  const id = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    base64
  );
  return {
    id,
    data: base64,
    extension,
    mimeType,
    originalUri
  };
}

function parseDataUri(uri: string) {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(uri);
  if (!match) {
    return null;
  }

  const mimeType = match[1] ?? "image/jpeg";
  return {
    base64: match[2] ?? "",
    extension: getImageExtensionFromMimeType(mimeType),
    mimeType
  };
}

function hasBackupImageReference(recipe: Recipe) {
  return (
    Boolean(getCachedRecipeImage(recipe)) ||
    hasRecipeImageReference(recipe) ||
    (!hasRecipeImageRemovalIntent(recipe) &&
      Boolean(recipe.id && !recipe.id.startsWith("local-")))
  );
}

function getImageExtension(uri: string) {
  const withoutQuery = uri.split("?")[0] ?? uri;
  const extension = withoutQuery.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (extension && ["jpg", "jpeg", "png", "webp", "heic"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }
  return "jpg";
}

function getImageMimeType(extension: string) {
  switch (extension) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    default:
      return "image/jpeg";
  }
}

function getImageExtensionFromMimeType(mimeType: string) {
  if (/png/i.test(mimeType)) {
    return "png";
  }
  if (/webp/i.test(mimeType)) {
    return "webp";
  }
  if (/heic/i.test(mimeType)) {
    return "heic";
  }
  return "jpg";
}

function isBackupSource(source: unknown): source is RecipeBackupSource {
  return source === "local" || source === "nextcloud" || source === "mixed";
}

function isRecipeBackupImageAsset(
  asset: unknown
): asset is RecipeBackupImageAsset {
  if (!asset || typeof asset !== "object") {
    return false;
  }

  const candidate = asset as Partial<RecipeBackupImageAsset>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.data === "string" &&
    typeof candidate.extension === "string" &&
    typeof candidate.mimeType === "string"
  );
}

async function resolveWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T | null> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
