import type { Recipe } from "../features/recipes/types";

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
        normalizedKeyword !== normalizedSearch &&
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
  const lines = splitNonEmptyLines(value);
  if (lines.length <= 1) {
    return values.map((item, itemIndex) => (itemIndex === index ? value : item));
  }

  return values.flatMap((item, itemIndex) =>
    itemIndex === index ? lines : [item]
  );
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
