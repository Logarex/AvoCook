export const COMMUNITY_LANGUAGES = [
  { value: "fr", nativeName: "Français", shortLabel: "FR" },
  { value: "en", nativeName: "English", shortLabel: "EN" },
  { value: "de", nativeName: "Deutsch", shortLabel: "DE" },
  { value: "es", nativeName: "Español", shortLabel: "ES" },
  { value: "it", nativeName: "Italiano", shortLabel: "IT" },
  { value: "da", nativeName: "Dansk", shortLabel: "DA" },
  { value: "pt", nativeName: "Português", shortLabel: "PT" },
  { value: "nl", nativeName: "Nederlands", shortLabel: "NL" },
  { value: "zh", nativeName: "中文", shortLabel: "ZH" },
  { value: "ja", nativeName: "日本語", shortLabel: "JA" },
  { value: "ko", nativeName: "한국어", shortLabel: "KO" },
  { value: "ar", nativeName: "العربية", shortLabel: "AR" },
  { value: "ru", nativeName: "Русский", shortLabel: "RU" }
] as const;

export type RecipeLanguage = (typeof COMMUNITY_LANGUAGES)[number]["value"];

export function isRecipeLanguage(value: unknown): value is RecipeLanguage {
  return COMMUNITY_LANGUAGES.some((option) => option.value === value);
}

export function resolveCommunityLanguage(value: unknown): RecipeLanguage {
  const base = typeof value === "string" ? value.trim().toLowerCase().split(/[-_]/)[0] : undefined;
  return isRecipeLanguage(base) ? base : "en";
}
