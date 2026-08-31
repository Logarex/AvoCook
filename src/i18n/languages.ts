export const SUPPORTED_LANGUAGES = [
  { value: "fr", nativeName: "Français", shortLabel: "FR" },
  { value: "en", nativeName: "English", shortLabel: "EN" },
  { value: "de", nativeName: "Deutsch", shortLabel: "DE" },
  { value: "es", nativeName: "Español", shortLabel: "ES" },
  { value: "it", nativeName: "Italiano", shortLabel: "IT" },
  { value: "da", nativeName: "Dansk", shortLabel: "DA" }
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]["value"];

export function isAppLanguage(
  language: string | null | undefined
): language is AppLanguage {
  return SUPPORTED_LANGUAGES.some((option) => option.value === language);
}

export function resolveAppLanguage(language: string | null | undefined): AppLanguage {
  if (!language) return "en";
  const baseCode = language.trim().toLowerCase().slice(0, 2);
  return isAppLanguage(baseCode) ? baseCode : "en";
}

