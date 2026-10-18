import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  NavigationContainer,
  useNavigation,
  useNavigationContainerRef,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import { registerRootComponent } from "expo";
import { useShareIntent } from "expo-share-intent";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppLogo } from "./components/AppLogo";
import "./i18n";
// Initialize logging before components can issue requests.
import { useTranslation } from "react-i18next";
import packageInfo from "../package.json";
import { AppText } from "./components/AppText";
import {
  BottomNavigation,
  type BottomNavigationTab,
} from "./components/BottomNavigation";
import { LongActionToastProvider } from "./components/LongActionToast";
import { useReducedMotion } from "./features/accessibility/useReducedMotion";
import { AuthProvider, useAuth } from "./features/auth/AuthProvider";
import { initFirebaseAuth } from "./features/firebase/firebaseClient";
import { logService } from "./features/logging/logService";
import { useOnboarding } from "./features/onboarding/useOnboarding";
import { PreferencesProvider } from "./features/preferences/PreferencesProvider";
import { RecipesProvider } from "./features/recipes/RecipesProvider";
import {
  ShoppingListProvider,
  useShoppingList,
} from "./features/shopping/ShoppingListProvider";
import { TimersProvider } from "./features/timers/TimersProvider";
import type { RootStackParamList } from "./navigation/types";
import { CommunityDetailScreen } from "./screens/CommunityDetailScreen";
import { CommunityScreen } from "./screens/CommunityScreen";
import { ImportRecipeScreen } from "./screens/ImportRecipeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { PrivacyScreen } from "./screens/PrivacyScreen";
import { RecipeDetailScreen } from "./screens/RecipeDetailScreen";
import { RecipeEditorScreen } from "./screens/RecipeEditorScreen";
import { RecipeListScreen } from "./screens/RecipeListScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ShoppingListScreen } from "./screens/ShoppingListScreen";
import { SubmitCommunityRecipeScreen } from "./screens/SubmitCommunityRecipeScreen";
import { TourScreen } from "./screens/TourScreen";
import { UpdateScreen } from "./screens/UpdateScreen";
import { GlassProvider } from "./theme/GlassProvider";
import { AppThemeProvider, useAppTheme } from "./theme/ThemeProvider";

const Stack = createNativeStackNavigator<RootStackParamList>();

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  React.useEffect(() => {
    logService.info("app", "App started", {
      version: packageInfo.version,
      startedAt: new Date().toISOString(),
    });
    initFirebaseAuth();
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <GlassProvider>
            <PreferencesProvider>
              <AuthProvider>
                <LongActionToastProvider>
                  <RecipesProvider>
                    <ShoppingListProvider>
                      <TimersProvider>
                        <RootNavigator />
                      </TimersProvider>
                    </ShoppingListProvider>
                  </RecipesProvider>
                </LongActionToastProvider>
              </AuthProvider>
            </PreferencesProvider>
          </GlassProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { credentials, hydrated, isLocalMode } = useAuth();
  const { colors, isDark, navTheme } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const { tourDone, showUpdateScreen, onboardingHydrated } = useOnboarding();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [currentRoute, setCurrentRoute] = useState<string>();

  if (!hydrated || !onboardingHydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <AppLogo style={styles.loadingLogo} />
        <ActivityIndicator color={colors.primary} />
        <AppText muted>AvoCook</AppText>
      </View>
    );
  }

  const isAuthenticated = Boolean(credentials || isLocalMode);
  const initialRoute: keyof RootStackParamList = !isAuthenticated
    ? "Login"
    : !tourDone
      ? "Tour"
      : showUpdateScreen
        ? "Update"
        : "Recipes";
  const route = currentRoute ?? initialRoute;
  const currentTab: BottomNavigationTab | undefined =
    route === "Recipes"
      ? "recipes"
      : route === "Community"
        ? "community"
        : route === "ShoppingList"
          ? "shoppingList"
          : undefined;
  const syncCurrentRoute = () =>
    setCurrentRoute(navigationRef.getCurrentRoute()?.name);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <NavigationContainer
        theme={navTheme}
        ref={navigationRef}
        onReady={syncCurrentRoute}
        onStateChange={syncCurrentRoute}
      >
        {isAuthenticated ? <ShareIntentHandler /> : null}
        {isAuthenticated ? <RemindersOnboardingPrompt /> : null}
        <View style={styles.flex}>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={({ route }) => ({
              animation: getStackAnimation(route.name, reducedMotion),
              headerShown: false,
            })}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Tour" component={TourScreen} />
            <Stack.Screen name="Update" component={UpdateScreen} />
            <Stack.Screen name="Recipes" component={RecipeListScreen} />
            <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
            <Stack.Screen name="RecipeEditor" component={RecipeEditorScreen} />
            <Stack.Screen name="ImportRecipe" component={ImportRecipeScreen} />
            <Stack.Screen name="ShoppingList" component={ShoppingListScreen} />
            <Stack.Screen name="Community" component={CommunityScreen} />
            <Stack.Screen
              name="CommunityDetail"
              component={CommunityDetailScreen}
            />
            <Stack.Screen
              name="SubmitCommunityRecipe"
              component={SubmitCommunityRecipeScreen}
            />
            <Stack.Screen name="Settings" component={SettingsScreen} />

            <Stack.Screen name="Privacy" component={PrivacyScreen} />
          </Stack.Navigator>
          {currentTab ? (
            <BottomNavigation
              current={currentTab}
              onNavigate={(tab) => {
                if (tab === currentTab) return;
                if (tab === "recipes") navigationRef.navigate("Recipes");
                else if (tab === "community")
                  navigationRef.navigate("Community");
                else navigationRef.navigate("ShoppingList");
              }}
            />
          ) : null}
        </View>
      </NavigationContainer>
    </>
  );
}

function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  React.useEffect(() => {
    if (!hasShareIntent || !shareIntent.type) {
      return;
    }

    // Allow the navigator to mount before handling a share.
    const timer = setTimeout(() => {
      try {
        if (shareIntent.type === "weburl" && shareIntent.webUrl) {
          const rawUrl = shareIntent.webUrl.trim();
          if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
            navigation.navigate("ImportRecipe", { url: rawUrl });
          }
        } else if (shareIntent.type === "text" && shareIntent.text) {
          // Shared text may contain a page title before the URL.
          const rawText = shareIntent.text.trim();
          const urlMatch = rawText.match(/https?:\/\/[^\s]+/);
          if (urlMatch && urlMatch[0]) {
            navigation.navigate("ImportRecipe", { url: urlMatch[0] });
          }
        } else if (
          shareIntent.type === "file" &&
          shareIntent.files?.[0]?.path
        ) {
          const filePath = shareIntent.files[0].path;
          navigation.navigate("ImportRecipe", { fileUri: filePath });
        }
      } catch {}
      resetShareIntent();
    }, 150);

    return () => clearTimeout(timer);
  }, [hasShareIntent, shareIntent, navigation, resetShareIntent]);

  return null;
}

function RemindersOnboardingPrompt() {
  const { sync, items } = useShoppingList();
  const { t } = useTranslation();
  const [prompted, setPrompted] = useState(true);

  useEffect(() => {
    async function checkPrompt() {
      if (!sync.available) return;
      const done = await AsyncStorage.getItem("remindersPromptDone");
      if (!done && !sync.linked) {
        setPrompted(false);
      }
    }
    void checkPrompt();
  }, [sync.available, sync.linked]);

  useEffect(() => {
    if (!prompted && sync.available) {
      setPrompted(true);
      void AsyncStorage.setItem("remindersPromptDone", "true");
      Alert.alert(
        t("shoppingList.syncBannerTitle"),
        t("shoppingList.syncBannerBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("shoppingList.syncEnable"),
            onPress: () => void sync.enableSync(items),
          },
        ],
      );
    }
  }, [prompted, sync, items, t]);

  return null;
}

function getStackAnimation(
  routeName: keyof RootStackParamList,
  reducedMotion: boolean,
) {
  if (
    reducedMotion ||
    routeName === "Recipes" ||
    routeName === "Community" ||
    routeName === "ShoppingList"
  ) {
    return "none";
  }
  return "slide_from_right";
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center",
  },
  loadingLogo: {
    height: 96,
    width: 96,
  },
});

registerRootComponent(App);
