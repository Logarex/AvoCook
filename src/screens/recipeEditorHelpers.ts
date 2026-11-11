import { hasBlockMarkdown } from "../features/markdown/markdown";
import type { Nutrition, Recipe } from "../features/recipes/types";

export function mergeNutritionForSave(existing: Recipe["nutrition"], edited: Nutrition): Recipe["nutrition"] {
  const first = Array.isArray(existing) ? existing[0] : existing;
  const nutrition = { ...first, ...edited };
  return Array.isArray(existing) ? [nutrition, ...existing.slice(1)] : nutrition;
}

export function getKeywordSuggestions(
  keywords: string,
  recipes: Pick<Recipe, "keywords">[],
  limit = 6
) {
  const normalizedSearch = normalizeSuggestionSearch(getCurrentKeyword(keywords));
  const selectedKeywords = new Set(
    getCompletedKeywords(keywords).map(normalizeSuggestionSearch)
  );
  const existingKeywordByKey = new Map<string, string>();
  for (const keyword of recipes.flatMap((recipe) =>
    splitKeywords(recipe.keywords)
  )) {
    const normalizedKeyword = normalizeSuggestionSearch(keyword);
    if (!existingKeywordByKey.has(normalizedKeyword)) {
      existingKeywordByKey.set(normalizedKeyword, keyword);
    }
  }
  const existingKeywords = Array.from(existingKeywordByKey.values()).sort(
    (left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base" })
  );

  return existingKeywords
    .filter((keyword) => {
      const normalizedKeyword = normalizeSuggestionSearch(keyword);
      return (
        !selectedKeywords.has(normalizedKeyword) &&
        (!normalizedSearch || normalizedKeyword.includes(normalizedSearch))
      );
    })
    .slice(0, limit);
}

export function applyKeywordSuggestion(keywords: string, suggestion: string) {
  const separatorIndex = keywords.lastIndexOf(",");
  if (separatorIndex === -1) {
    return suggestion;
  }

  const prefix = keywords.slice(0, separatorIndex + 1);
  const spacer = /\s$/.test(prefix) ? "" : " ";
  return `${prefix}${spacer}${suggestion}`;
}

export function expandEditableListItem(
  values: string[],
  index: number,
  value: string
) {
  const lines = hasBlockMarkdown(value) ? [value] : splitNonEmptyLines(value);
  if (lines.length <= 1) {
    return values.map((item, itemIndex) => (itemIndex === index ? value : item));
  }

  return values.flatMap((item, itemIndex) =>
    itemIndex === index ? lines : [item]
  );
}

/**
 * Returns the text that was inserted between two successive values of a text
 * input, by trimming their common prefix and suffix.
 */
export function getInsertedText(previous: string, next: string) {
  let start = 0;
  const maxStart = Math.min(previous.length, next.length);
  while (start < maxStart && previous[start] === next[start]) start += 1;

  let previousEnd = previous.length;
  let nextEnd = next.length;
  while (
    previousEnd > start &&
    nextEnd > start &&
    previous[previousEnd - 1] === next[nextEnd - 1]
  ) {
    previousEnd -= 1;
    nextEnd -= 1;
  }

  return next.slice(start, nextEnd);
}

/**
 * Only a real multi-line paste should split an item into several items.
 * Typing Enter, or a keyboard suggestion inserted into an item that already
 * contains a line break, must keep the item intact (issue #129).
 */
export function isMultilinePaste(previous: string, next: string) {
  const inserted = getInsertedText(previous, next);
  return inserted.length > 1 && splitNonEmptyLines(inserted).length > 1;
}

export function normalizeSuggestionSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getCurrentKeyword(keywords: string) {
  return keywords.slice(keywords.lastIndexOf(",") + 1).trim();
}

function getCompletedKeywords(keywords: string) {
  const separatorIndex = keywords.lastIndexOf(",");
  if (separatorIndex === -1) {
    return [];
  }

  return splitKeywords(keywords.slice(0, separatorIndex));
}

function splitKeywords(keywords: string) {
  return keywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function splitNonEmptyLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
