import * as Localization from "expo-localization";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { resolveAppLanguage } from "./languages";

import fr from "./locales/fr";
import en from "./locales/en";
import de from "./locales/de";
import es from "./locales/es";
import it from "./locales/it";

export const resources = {
  fr,
  en,
  de,
  es,
  it,
} as const;

const deviceLanguage = Localization.getLocales()[0]?.languageCode;
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveAppLanguage(deviceLanguage),
  fallbackLng: "fr",
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: "v4",
});

export default i18n;
