import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import i18n from "../../i18n";
import {
  isAppLanguage,
  resolveAppLanguage,
  type AppLanguage
} from "../../i18n/languages";
import {
  LLM_PROVIDERS,
  type LlmProviderId
} from "../import/photoRecipeImport";

export type { AppLanguage };

export type LlmSettings = {
  providerId: LlmProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
};

type PreferencesContextValue = {
  keepScreenAwake: boolean;
  keepRecipesLocal: boolean;
  enableBackupReminders: boolean;
  language: AppLanguage;
  llmSettings: LlmSettings;
  showDefaultCategories: boolean | null;
  setKeepScreenAwake: (enabled: boolean) => Promise<void>;
  setKeepRecipesLocal: (enabled: boolean) => Promise<void>;
  setEnableBackupReminders: (enabled: boolean) => Promise<void>;
  setShowDefaultCategories: (enabled: boolean | null) => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setLlmSettings: (settings: LlmSettings) => Promise<void>;
};

const KEEP_AWAKE_KEY = "preferences.keepScreenAwake";
const KEEP_RECIPES_LOCAL_KEY = "preferences.keepRecipesLocal";
const ENABLE_BACKUP_REMINDERS_KEY = "preferences.enableBackupReminders";
const SHOW_DEFAULT_CATEGORIES_KEY = "preferences.showDefaultCategories";
const LANGUAGE_KEY = "preferences.language";
const LANGUAGE_USER_SET_KEY = "preferences.language.userSet";
const LLM_PROVIDER_KEY = "preferences.llm.provider";
const LLM_BASE_URL_KEY = "preferences.llm.baseUrl";
const LLM_MODEL_KEY = "preferences.llm.model";
const LLM_API_KEY_SECURE = "preferences.llm.apiKey";

const DEFAULT_PROVIDER = LLM_PROVIDERS[0];
const DEFAULT_LLM_SETTINGS: LlmSettings = {
  providerId: DEFAULT_PROVIDER.id,
  apiKey: "",
  baseUrl: DEFAULT_PROVIDER.baseUrl,
  model: DEFAULT_PROVIDER.defaultModel
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined
);

export function PreferencesProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [keepScreenAwake, setKeepScreenAwakeState] = useState(true);
  const [keepRecipesLocal, setKeepRecipesLocalState] = useState(true);
  const [enableBackupReminders, setEnableBackupRemindersState] = useState(true);
  const [showDefaultCategories, setShowDefaultCategoriesState] = useState<boolean | null>(null);
  const [language, setLanguageState] = useState<AppLanguage>(
    resolveAppLanguage(i18n.language)
  );
  const [llmSettings, setLlmSettingsState] = useState<LlmSettings>(
    DEFAULT_LLM_SETTINGS
  );

  useEffect(() => {
    void Promise.all([
      AsyncStorage.getItem(KEEP_AWAKE_KEY),
      AsyncStorage.getItem(KEEP_RECIPES_LOCAL_KEY),
      AsyncStorage.getItem(ENABLE_BACKUP_REMINDERS_KEY),
      AsyncStorage.getItem(SHOW_DEFAULT_CATEGORIES_KEY),
      AsyncStorage.getItem(LANGUAGE_KEY),
      AsyncStorage.getItem(LANGUAGE_USER_SET_KEY),
      AsyncStorage.getItem(LLM_PROVIDER_KEY),
      AsyncStorage.getItem(LLM_BASE_URL_KEY),
      AsyncStorage.getItem(LLM_MODEL_KEY),
      SecureStore.getItemAsync(LLM_API_KEY_SECURE)
    ]).then(
      ([
        storedKeepAwake,
        storedKeepRecipesLocal,
        storedEnableBackupReminders,
        storedShowDefaultCategories,
        storedLanguage,
        storedUserSet,
        storedProviderId,
        storedBaseUrl,
        storedModel,
        storedApiKey
      ]) => {
        if (storedKeepAwake === "true" || storedKeepAwake === "false") {
          setKeepScreenAwakeState(storedKeepAwake === "true");
        }
        if (
          storedKeepRecipesLocal === "true" ||
          storedKeepRecipesLocal === "false"
        ) {
          setKeepRecipesLocalState(storedKeepRecipesLocal === "true");
        }
        if (
          storedEnableBackupReminders === "true" ||
          storedEnableBackupReminders === "false"
        ) {
          setEnableBackupRemindersState(storedEnableBackupReminders === "true");
        }
        if (
          storedShowDefaultCategories === "true" ||
          storedShowDefaultCategories === "false"
        ) {
          setShowDefaultCategoriesState(storedShowDefaultCategories === "true");
        }
        if (storedUserSet === "true" && isAppLanguage(storedLanguage)) {
          setLanguageState(storedLanguage);
          void i18n.changeLanguage(storedLanguage);
        }
        const providerId = (storedProviderId as LlmSettings["providerId"]) ||
          DEFAULT_LLM_SETTINGS.providerId;
        const preset =
          LLM_PROVIDERS.find((p) => p.id === providerId) ??
          LLM_PROVIDERS[0];
        setLlmSettingsState({
          providerId,
          apiKey: storedApiKey ?? "",
          baseUrl: storedBaseUrl ?? preset.baseUrl,
          model: storedModel ?? preset.defaultModel
        });
      }
    );
  }, []);

  const setKeepScreenAwake = useCallback(async (enabled: boolean) => {
    setKeepScreenAwakeState(enabled);
    await AsyncStorage.setItem(KEEP_AWAKE_KEY, String(enabled));
  }, []);

  const setKeepRecipesLocal = useCallback(async (enabled: boolean) => {
    setKeepRecipesLocalState(enabled);
    await AsyncStorage.setItem(KEEP_RECIPES_LOCAL_KEY, String(enabled));
  }, []);

  const setEnableBackupReminders = useCallback(async (enabled: boolean) => {
    setEnableBackupRemindersState(enabled);
    await AsyncStorage.setItem(ENABLE_BACKUP_REMINDERS_KEY, String(enabled));
  }, []);

  const setShowDefaultCategories = useCallback(async (enabled: boolean | null) => {
    setShowDefaultCategoriesState(enabled);
    if (enabled === null) {
      await AsyncStorage.removeItem(SHOW_DEFAULT_CATEGORIES_KEY);
    } else {
      await AsyncStorage.setItem(SHOW_DEFAULT_CATEGORIES_KEY, String(enabled));
    }
  }, []);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_USER_SET_KEY, "true");
    await i18n.changeLanguage(nextLanguage);
  }, []);

  const setLlmSettings = useCallback(async (next: LlmSettings) => {
    setLlmSettingsState(next);
    await AsyncStorage.setItem(LLM_PROVIDER_KEY, next.providerId);
    await AsyncStorage.setItem(LLM_BASE_URL_KEY, next.baseUrl);
    await AsyncStorage.setItem(LLM_MODEL_KEY, next.model);
    if (next.apiKey) {
      await SecureStore.setItemAsync(LLM_API_KEY_SECURE, next.apiKey);
    } else {
      await SecureStore.deleteItemAsync(LLM_API_KEY_SECURE);
    }
  }, []);

  const value = useMemo(
    () => ({
      keepScreenAwake,
      keepRecipesLocal,
      enableBackupReminders,
      showDefaultCategories,
      language,
      llmSettings,
      setKeepScreenAwake,
      setKeepRecipesLocal,
      setEnableBackupReminders,
      setShowDefaultCategories,
      setLanguage,
      setLlmSettings
    }),
    [
      keepScreenAwake,
      keepRecipesLocal,
      enableBackupReminders,
      showDefaultCategories,
      language,
      llmSettings,
      setKeepScreenAwake,
      setKeepRecipesLocal,
      setEnableBackupReminders,
      setShowDefaultCategories,
      setLanguage,
      setLlmSettings
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
