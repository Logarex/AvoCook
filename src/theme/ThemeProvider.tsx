import { reinstallStorage } from "../features/storage/reinstallStorage";
import {
  DarkTheme,
  DefaultTheme,
  type Theme as NavigationTheme
} from "@react-navigation/native";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type AppColorScheme } from "./colors";

export type ThemeMode = "system" | "light" | "dark";

type AppThemeContextValue = {
  colors: AppColorScheme;
  isDark: boolean;
  mode: ThemeMode;
  navTheme: NavigationTheme;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const STORAGE_KEY = "preferences.theme";

const AppThemeContext = createContext<AppThemeContextValue | undefined>(
  undefined
);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const resolvedScheme = mode === "system" ? systemScheme ?? "light" : mode;
  const isDark = resolvedScheme === "dark";
  const colors = isDark ? darkColors : lightColors;

  useEffect(() => {
    void reinstallStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "system" || stored === "light" || stored === "dark") {
        setModeState(stored);
      }
    }).catch((error: unknown) => console.warn("preferences", "Could not restore theme", error));
  }, []);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    await reinstallStorage.setItem(STORAGE_KEY, nextMode);
  }, []);

  const navTheme = useMemo<NavigationTheme>(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.backgroundElevated,
        text: colors.text,
        border: colors.border,
        notification: colors.secondary
      }
    };
  }, [colors, isDark]);

  const value = useMemo(
    () => ({ colors, isDark, mode, navTheme, setMode }),
    [colors, isDark, mode, navTheme, setMode]
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const value = useContext(AppThemeContext);
  if (!value) {
    throw new Error("useAppTheme must be used inside AppThemeProvider");
  }
  return value;
}
