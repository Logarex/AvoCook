import { Directory, File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as Crypto from "expo-crypto";
import type { CookbookClient } from "../nextcloud/cookbookClient";
import {
  createRecipeBackup,
  serializeRecipeBackup
} from "./recipeBackup";
import { getRecipeShareFilename } from "./recipeShareFilenames";
import { normalizeRecipe, type NutritionValue, type Recipe } from "./types";
import { humanDuration } from "../../utils/duration";
import {
  canUseRemoteRecipeImageFallback,
  getCachedRecipeImage,
  getLocalRecipeImage,
  getExternalRecipeImageSource,
  hasRecipeImageReference,
  hasRecipeImageRemovalIntent
} from "./recipeImageReferences";
import { getRecipeHealthProfile } from "./health";

export type RecipePrintLabels = {
  appName: string;
  calories: string;
  category: string;
  cookTime: string;
  carbs: string;
  fat: string;
  fiber: string;
  ingredients: string;
  instructions: string;
  keywords: string;
  nutrition: string;
  nutriScore: string;
  prepTime: string;
  protein: string;
  saturatedFat: string;
  servingSize: string;
  source: string;
  sodium: string;
  sugar: string;
  tools: string;
  totalTime: string;
  yield: string;
};

export type RecipeShareExportResult = {
  fileUri: string;
  imageCount: number;
  skippedImageCount: number;
};

const PDF_MIME_TYPE = "application/pdf";
const RECIPE_FILE_MIME_TYPE = "application/json";
const PRINT_IMAGE_DOWNLOAD_TIMEOUT_MS = 3000;
const SHARE_IMAGE_DOWNLOAD_TIMEOUT_MS = 4000;

export async function printRecipe(
  recipe: Recipe,
  labels: RecipePrintLabels,
  client: CookbookClient | null
): Promise<RecipeShareExportResult> {
  const document = await createRecipePrintDocument(recipe, labels, client);
  try {
    await Print.printAsync({ html: document.html });
  } finally {
    if (document.tempImageUri) {
      try {
        new File(document.tempImageUri).delete();
      } catch (err) {
        console.warn("Failed to delete temp print image:", err);
      }
    }
  }
  return {
    fileUri: "",
    imageCount: document.imageCount,
    skippedImageCount: document.skippedImageCount
  };
}

export async function shareRecipePdf(
  recipe: Recipe,
  labels: RecipePrintLabels,
  client: CookbookClient | null
): Promise<RecipeShareExportResult> {
  const document = await createRecipePrintDocument(recipe, labels, client);
  let namedFileUri = "";
  try {
    const result = await Print.printToFileAsync({ html: document.html });
    const file = new File(result.uri);
    const namedFile = createCacheFile(recipe, "pdf");
    if (namedFile.exists) {
      namedFile.delete();
    }
    file.copy(namedFile);
    namedFileUri = namedFile.uri;
    await shareFile(namedFile.uri, {
      UTI: "com.adobe.pdf",
      dialogTitle: recipe.name,
      mimeType: PDF_MIME_TYPE
    });
  } finally {
    if (document.tempImageUri) {
      try {
        new File(document.tempImageUri).delete();
      } catch (err) {
        console.warn("Failed to delete temp print image:", err);
      }
    }
  }
  return {
    fileUri: namedFileUri,
    imageCount: document.imageCount,
    skippedImageCount: document.skippedImageCount
  };
}

export async function shareRecipeFile(
  recipe: Recipe,
  client: CookbookClient | null
): Promise<RecipeShareExportResult> {
  const result = await createRecipeShareBackup(recipe, client);
  const file = createCacheFile(recipe, "json");
  if (file.exists) {
    file.delete();
  }
  file.create({ intermediates: true });
  file.write(serializeRecipeBackup(result.backup));
  await shareFile(file.uri, {
    UTI: "public.json",
    dialogTitle: recipe.name,
    mimeType: RECIPE_FILE_MIME_TYPE
  });
  return {
    fileUri: file.uri,
    imageCount: result.imageCount,
    skippedImageCount: result.skippedImageCount
  };
}

export async function createRecipeShareBackup(
  recipe: Recipe,
  client: CookbookClient | null
) {
  const normalizedRecipe = normalizeRecipe(recipe);
  const result = await createRecipeBackup({
    recipes: [normalizedRecipe],
    customCategories: normalizedRecipe.recipeCategory
      ? [normalizedRecipe.recipeCategory]
      : [],
    source: client ? "nextcloud" : "local",
    client,
    imageDownloadTimeoutMs: SHARE_IMAGE_DOWNLOAD_TIMEOUT_MS
  });

  return {
    ...result,
    backup: {
      ...result.backup,
      recipes: result.backup.recipes.map((entry) => ({
        ...entry,
        recipe: normalizeRecipe({
          ...entry.recipe,
          id: null,
          recipe_id: undefined
        })
      }))
    }
  };
}

export async function createRecipePrintHtml(
  recipe: Recipe,
  labels: RecipePrintLabels,
  client: CookbookClient | null
) {
  return (await createRecipePrintDocument(recipe, labels, client)).html;
}

function getImageExtension(uri: string) {
  const withoutQuery = uri.split("?")[0] ?? uri;
  const extension = withoutQuery.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (extension && ["jpg", "jpeg", "png", "webp", "heic"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }
  return "jpg";
}

async function getPrintImageUri(
  recipe: Recipe,
  client: CookbookClient | null
): Promise<{ uri: string; isTemp: boolean }> {
  const localImage = getCachedRecipeImage(recipe) || getLocalRecipeImage(recipe);
  if (localImage) {
    const file = new File(localImage);
    if (file.exists) {
      return { uri: file.uri, isTemp: false };
    }
  }

  const externalImage = getExternalRecipeImageSource(recipe);
  if (externalImage) {
    const downloaded = await downloadTempPrintImage(externalImage);
    if (downloaded) {
      return downloaded;
    }
  }

  if (client && canUseRemoteRecipeImageFallback(recipe)) {
    const imageUrl = client.getRecipeImageUrl(recipe.id, "full");
    const downloaded = await downloadTempPrintImage(imageUrl, {
      headers: client.getImageHeaders()
    });
    if (downloaded) {
      return downloaded;
    }
  }

  return { uri: "", isTemp: false };
}

async function downloadTempPrintImage(
  imageUrl: string,
  options?: { headers?: Record<string, string> }
) {
  const tempDirectory = new Directory(Paths.cache, "avocook-print-images");
  tempDirectory.create({ idempotent: true, intermediates: true });

  const extension = getImageExtension(imageUrl);
  const tempFile = new File(tempDirectory, `${Crypto.randomUUID()}.${extension}`);

  try {
    const download = File.downloadFileAsync(imageUrl, tempFile, {
      headers: options?.headers,
      idempotent: true
    });
    const downloaded = await resolveWithTimeout(
      download,
      PRINT_IMAGE_DOWNLOAD_TIMEOUT_MS
    );
    if (!downloaded) {
      download
        .then((file) => {
          try {
            file.delete();
          } catch {
            // Best-effort cleanup after a deliberately skipped slow image.
          }
        })
        .catch(() => undefined);
      return null;
    }

    return { uri: downloaded.uri, isTemp: true };
  } catch (error) {
    console.warn("Failed to download print image:", error);
    return null;
  }
}

async function createRecipePrintDocument(
  recipe: Recipe,
  labels: RecipePrintLabels,
  client: CookbookClient | null
) {
  const normalizedRecipe = normalizeRecipe(recipe);
  const { uri: imageUri, isTemp } = await getPrintImageUri(normalizedRecipe, client);

  let imageSrc = "";
  if (imageUri) {
    try {
      const file = new File(imageUri);
      const base64 = await file.base64();
      const ext = getImageExtension(imageUri);
      const mime = ext === "jpg" ? "jpeg" : ext;
      imageSrc = `data:image/${mime};base64,${base64}`;
    } catch (err) {
      console.warn("Failed to convert print image to base64:", err);
      imageSrc = imageUri;
    }
  }

  const nutritionEntries = getNutritionEntries(normalizedRecipe, labels);
  const healthProfile = getRecipeHealthProfile(normalizedRecipe);
  const keywords = normalizedRecipe.keywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(normalizedRecipe.name)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        color: #1f2a24;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 11.5px;
        line-height: 1.38;
        margin: 0;
        padding: 22px;
      }
      @page { margin: 12mm; size: A4; }
      h1, h2, p { margin: 0; }
      h1 { font-size: 24px; line-height: 1.08; margin-bottom: 6px; }
      h2 {
        border-bottom: 1px solid #d8ded4;
        color: #315948;
        font-size: 13px;
        margin: 14px 0 7px;
        padding-bottom: 4px;
      }
      .eyebrow {
        color: #5a6a60;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        margin-bottom: 6px;
        text-transform: uppercase;
      }
      .hero {
        display: grid;
        gap: 16px;
        grid-template-columns: ${imageUri ? "1.4fr 0.75fr" : "1fr"};
        margin-bottom: 12px;
      }
      .description { color: #4d5c53; font-size: 12px; margin-top: 7px; }
      .photo {
        border-radius: 10px;
        height: 142px;
        object-fit: cover;
        width: 100%;
      }
      .meta {
        display: grid;
        gap: 6px;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        margin: 10px 0;
      }
      .meta-item {
        background: #f5f2eb;
        border: 1px solid #e1ddd3;
        border-radius: 7px;
        padding: 6px 8px;
      }
      .meta-label {
        color: #667369;
        display: block;
        font-size: 8.5px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .meta-value { font-weight: 700; }
      .nutri-score .meta-value {
        background: var(--score-bg);
        border-radius: 999px;
        color: var(--score-color);
        display: inline-block;
        line-height: 1;
        min-width: 24px;
        padding: 5px 8px;
        text-align: center;
      }
      .content {
        align-items: start;
        display: grid;
        gap: 18px;
        grid-template-columns: 0.9fr 1.1fr;
      }
      .nutrition-grid {
        display: grid;
        gap: 6px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin: 0;
      }
      ul, ol { margin: 0; padding-left: 20px; }
      li { margin-bottom: 4px; }
      .tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
      .tag {
        border: 1px solid #d8ded4;
        border-radius: 999px;
        color: #315948;
        font-size: 10.5px;
        padding: 3px 7px;
      }
      .source {
        color: #315948;
        overflow-wrap: anywhere;
      }
      .footer {
        border-top: 1px solid #d8ded4;
        color: #68756b;
        font-size: 10px;
        margin-top: 16px;
        padding-top: 7px;
      }
      @media print {
        body { padding: 0; }
        h2 { break-after: avoid; }
        li, .meta-item { break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <section class="hero">
      <div>
        <p class="eyebrow">${escapeHtml(labels.appName)}</p>
        <h1>${escapeHtml(normalizedRecipe.name)}</h1>
        ${normalizedRecipe.description ? `<p class="description">${escapeHtml(normalizedRecipe.description)}</p>` : ""}
        ${renderTags(keywords)}
      </div>
      ${imageSrc ? `<img class="photo" alt="${escapeHtml(normalizedRecipe.name)}" src="${imageSrc.startsWith("data:") ? imageSrc : escapeHtml(imageSrc)}" />` : ""}
    </section>

    <section class="meta">
      ${renderNutriScoreMeta(labels.nutriScore, healthProfile)}
      ${renderMeta(labels.category, normalizedRecipe.recipeCategory)}
      ${renderMeta(labels.yield, normalizedRecipe.recipeYield ? String(normalizedRecipe.recipeYield) : "")}
      ${renderMeta(labels.prepTime, humanDuration(normalizedRecipe.prepTime) ?? "")}
      ${renderMeta(labels.cookTime, humanDuration(normalizedRecipe.cookTime) ?? "")}
      ${renderMeta(labels.totalTime, humanDuration(normalizedRecipe.totalTime) ?? "")}
    </section>

    <section class="content">
      <div>
        ${renderListSection(labels.ingredients, normalizedRecipe.recipeIngredient, false)}
        ${renderListSection(labels.tools, normalizedRecipe.tool, false)}
        ${renderNutritionSection(labels.nutrition, nutritionEntries)}
      </div>
      <div>
        ${renderListSection(labels.instructions, normalizedRecipe.recipeInstructions, true)}
        ${renderSourceSection(labels.source, normalizedRecipe)}
      </div>
    </section>

    <p class="footer">${escapeHtml(labels.appName)}</p>
  </body>
</html>`;

  const hasImage =
    hasRecipeImageReference(recipe) ||
    (!hasRecipeImageRemovalIntent(recipe) &&
      Boolean(recipe.id && !recipe.id.startsWith("local-")));

  return {
    html,
    tempImageUri: isTemp ? imageUri : "",
    imageCount: imageUri ? 1 : 0,
    skippedImageCount: hasImage && !imageUri ? 1 : 0
  };
}

function renderMeta(label: string, value: string) {
  if (!value) {
    return "";
  }
  return `<div class="meta-item"><span class="meta-label">${escapeHtml(label)}</span><span class="meta-value">${escapeHtml(value)}</span></div>`;
}

function renderNutriScoreMeta(
  label: string,
  profile: ReturnType<typeof getRecipeHealthProfile>
) {
  if (profile.grade === "?") {
    return "";
  }

  return `<div class="meta-item nutri-score" style="--score-bg: ${escapeHtml(profile.backgroundColor)}; --score-color: ${escapeHtml(profile.color)};"><span class="meta-label">${escapeHtml(label)}</span><span class="meta-value">${escapeHtml(profile.grade)}</span></div>`;
}

function renderTags(tags: string[]) {
  if (!tags.length) {
    return "";
  }
  return `<div class="tags">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function renderListSection(title: string, items: string[], ordered: boolean) {
  if (!items.length) {
    return "";
  }
  const tag = ordered ? "ol" : "ul";
  return `<h2>${escapeHtml(title)}</h2><${tag}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</${tag}>`;
}

function renderNutritionSection(
  title: string,
  entries: [string, string][]
) {
  if (!entries.length) {
    return "";
  }
  return `<h2>${escapeHtml(title)}</h2><section class="nutrition-grid">${entries
    .map(([label, value]) => renderMeta(label, value))
    .join("")}</section>`;
}

function renderSourceSection(title: string, recipe: Recipe) {
  const sourceName = recipe.sourceName.trim();
  const sourceUrl = recipe.url.trim();
  if (!sourceName && !sourceUrl) {
    return "";
  }

  const body = [sourceName, sourceUrl]
    .filter(Boolean)
    .map((item) => `<p class="source">${escapeHtml(item)}</p>`)
    .join("");

  return `<h2>${escapeHtml(title)}</h2>${body}`;
}

function getNutritionEntries(
  recipe: Recipe,
  labels: RecipePrintLabels
): [string, string][] {
  const nutrition = Array.isArray(recipe.nutrition)
    ? recipe.nutrition[0]
    : recipe.nutrition;
  if (!nutrition) {
    return [];
  }

  return [
    [labels.calories, normalizeNutritionValue(nutrition.calories)],
    [labels.carbs, normalizeNutritionValue(nutrition.carbohydrateContent)],
    [labels.sugar, normalizeNutritionValue(nutrition.sugarContent)],
    [labels.fat, normalizeNutritionValue(nutrition.fatContent)],
    [
      labels.saturatedFat,
      normalizeNutritionValue(nutrition.saturatedFatContent)
    ],
    [labels.fiber, normalizeNutritionValue(nutrition.fiberContent)],
    [labels.protein, normalizeNutritionValue(nutrition.proteinContent)],
    [labels.sodium, normalizeNutritionValue(nutrition.sodiumContent)],
    [labels.servingSize, normalizeNutritionValue(nutrition.servingSize)]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
}

function normalizeNutritionValue(value?: NutritionValue | null) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  return value.trim();
}

async function shareFile(
  uri: string,
  options: {
    UTI: string;
    dialogTitle: string;
    mimeType: string;
  }
) {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("SHARING_UNAVAILABLE");
  }

  await Sharing.shareAsync(uri, options);
}

function createCacheFile(recipe: Recipe, extension: "json" | "pdf") {
  return new File(Paths.cache, getRecipeShareFilename(recipe, extension));
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

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
