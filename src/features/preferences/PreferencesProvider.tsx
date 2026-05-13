import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import i18n from "../../i18n";

type PreferencesContextValue = {
  keepScreenAwake: boolean;
  keepRecipesLocal: boolean;
  language: "fr" | "en";
  setKeepScreenAwake: (enabled: boolean) => Promise<void>;
  setKeepRecipesLocal: (enabled: boolean) => Promise<void>;
  setLanguage: (language: "fr" | "en") => Promise<void>;
};

const KEEP_AWAKE_KEY = "preferences.keepScreenAwake";
const KEEP_RECIPES_LOCAL_KEY = "preferences.keepRecipesLocal";
const LANGUAGE_KEY = "preferences.language";

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined
);

export function PreferencesProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [keepScreenAwake, setKeepScreenAwakeState] = useState(false);
  const [keepRecipesLocal, setKeepRecipesLocalState] = useState(true);
  const [language, setLanguageState] = useState<"fr" | "en">(
    i18n.language === "en" ? "en" : "fr"
  );

  useEffect(() => {
    void Promise.all([
      AsyncStorage.getItem(KEEP_AWAKE_KEY),
      AsyncStorage.getItem(KEEP_RECIPES_LOCAL_KEY),
      AsyncStorage.getItem(LANGUAGE_KEY)
    ]).then(([storedKeepAwake, storedKeepRecipesLocal, storedLanguage]) => {
      if (storedKeepAwake === "true" || storedKeepAwake === "false") {
        setKeepScreenAwakeState(storedKeepAwake === "true");
      }
      if (
        storedKeepRecipesLocal === "true" ||
        storedKeepRecipesLocal === "false"
      ) {
        setKeepRecipesLocalState(storedKeepRecipesLocal === "true");
      }
      if (storedLanguage === "fr" || storedLanguage === "en") {
        setLanguageState(storedLanguage);
        void i18n.changeLanguage(storedLanguage);
      }
    });
  }, []);

  const setKeepScreenAwake = useCallback(async (enabled: boolean) => {
    setKeepScreenAwakeState(enabled);
    await AsyncStorage.setItem(KEEP_AWAKE_KEY, String(enabled));
  }, []);

  const setKeepRecipesLocal = useCallback(async (enabled: boolean) => {
    setKeepRecipesLocalState(enabled);
    await AsyncStorage.setItem(KEEP_RECIPES_LOCAL_KEY, String(enabled));
  }, []);

  const setLanguage = useCallback(async (nextLanguage: "fr" | "en") => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage);
    await i18n.changeLanguage(nextLanguage);
  }, []);

  const value = useMemo(
    () => ({
      keepScreenAwake,
      keepRecipesLocal,
      language,
      setKeepScreenAwake,
      setKeepRecipesLocal,
      setLanguage
    }),
    [
      keepScreenAwake,
      keepRecipesLocal,
      language,
      setKeepScreenAwake,
      setKeepRecipesLocal,
      setLanguage
    ]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }
  return value;
}
