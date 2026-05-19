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
  getLocalRecipeImage,
  getExternalRecipeImageSource
} from "./recipeImageReferences";

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
    client
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
  // 1. If local cached/persisted image is present, use its file:/// URI directly
  const localImage = getLocalRecipeImage(recipe);
  if (localImage) {
    const file = new File(localImage);
    if (file.exists) {
      return { uri: file.uri, isTemp: false };
    }
  }

  // 2. If it's a standard remote image (non-Nextcloud), the WebView can render it directly
  const externalImage = getExternalRecipeImageSource(recipe);
  if (externalImage) {
    return { uri: externalImage, isTemp: false };
  }

  // 3. If it's a Nextcloud endpoint, we download it to a temp file once using auth headers
  if (recipe.id && client && !recipe.id.startsWith("local-")) {
    const imageUrl = client.getRecipeImageUrl(recipe.id, "full");
    const tempDirectory = new Directory(Paths.cache, "avocook-print-images");
    tempDirectory.create({ idempotent: true, intermediates: true });

    const extension = getImageExtension(imageUrl);
    const tempFile = new File(tempDirectory, `${Crypto.randomUUID()}.${extension}`);

    try {
      const downloaded = await File.downloadFileAsync(imageUrl, tempFile, {
        headers: client.getImageHeaders(),
        idempotent: true
      });
      return { uri: downloaded.uri, isTemp: true };
    } catch (error) {
      console.warn("Failed to download Nextcloud print image:", error);
    }
  }

  return { uri: "", isTemp: false };
}

async function createRecipePrintDocument(
  recipe: Recipe,
  labels: RecipePrintLabels,
  client: CookbookClient | null
) {
  const normalizedRecipe = normalizeRecipe(recipe);
  const { uri: imageUri, isTemp } = await getPrintImageUri(normalizedRecipe, client);
  const nutritionEntries = getNutritionEntries(normalizedRecipe, labels);
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
        font-size: 13px;
        line-height: 1.5;
        margin: 0;
        padding: 34px;
      }
      h1, h2, p { margin: 0; }
      h1 { font-size: 30px; line-height: 1.08; margin-bottom: 8px; }
      h2 {
        border-bottom: 1px solid #d8ded4;
        color: #315948;
        font-size: 16px;
        margin: 24px 0 10px;
        padding-bottom: 5px;
      }
      .eyebrow {
        color: #5a6a60;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        margin-bottom: 8px;
        text-transform: uppercase;
      }
      .hero {
        display: grid;
        gap: 22px;
        grid-template-columns: ${imageUri ? "1.25fr 0.85fr" : "1fr"};
        margin-bottom: 18px;
      }
      .description { color: #4d5c53; font-size: 14px; margin-top: 10px; }
      .photo {
        border-radius: 12px;
        height: 235px;
        object-fit: cover;
        width: 100%;
      }
      .meta {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin: 18px 0;
      }
      .meta-item {
        background: #f5f2eb;
        border: 1px solid #e1ddd3;
        border-radius: 10px;
        padding: 10px 12px;
      }
      .meta-label {
        color: #667369;
        display: block;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .meta-value { font-weight: 700; }
      ul, ol { margin: 0; padding-left: 20px; }
      li { margin-bottom: 7px; }
      .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
      .tag {
        border: 1px solid #d8ded4;
        border-radius: 999px;
        color: #315948;
        padding: 4px 9px;
      }
      .source {
        color: #315948;
        overflow-wrap: anywhere;
      }
      .footer {
        border-top: 1px solid #d8ded4;
        color: #68756b;
        font-size: 11px;
        margin-top: 26px;
        padding-top: 10px;
      }
      @media print {
        body { padding: 24px; }
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
      ${imageUri ? `<img class="photo" alt="${escapeHtml(normalizedRecipe.name)}" src="${imageUri}" />` : ""}
    </section>

    <section class="meta">
      ${renderMeta(labels.category, normalizedRecipe.recipeCategory)}
      ${renderMeta(labels.yield, normalizedRecipe.recipeYield ? String(normalizedRecipe.recipeYield) : "")}
      ${renderMeta(labels.prepTime, humanDuration(normalizedRecipe.prepTime) ?? "")}
      ${renderMeta(labels.cookTime, humanDuration(normalizedRecipe.cookTime) ?? "")}
      ${renderMeta(labels.totalTime, humanDuration(normalizedRecipe.totalTime) ?? "")}
    </section>

    ${renderListSection(labels.ingredients, normalizedRecipe.recipeIngredient, false)}
    ${renderListSection(labels.instructions, normalizedRecipe.recipeInstructions, true)}
    ${renderListSection(labels.tools, normalizedRecipe.tool, false)}
    ${renderNutritionSection(labels.nutrition, nutritionEntries)}
    ${normalizedRecipe.url ? `<h2>${escapeHtml(labels.source)}</h2><p class="source">${escapeHtml(normalizedRecipe.url)}</p>` : ""}

    <p class="footer">${escapeHtml(labels.appName)}</p>
  </body>
</html>`;

  const hasImage = Boolean(recipe.image || recipe.imageUrl || recipe.imagePlaceholderUrl);

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
  return `<h2>${escapeHtml(title)}</h2><section class="meta">${entries
    .map(([label, value]) => renderMeta(label, value))
    .join("")}</section>`;
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

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
