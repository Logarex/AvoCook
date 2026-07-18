import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useShareIntent } from "expo-share-intent";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { registerRootComponent } from "expo";
import * as SplashScreen from "expo-splash-screen";
import "./i18n";
import { AppText } from "./components/AppText";
import { LongActionToastProvider } from "./components/LongActionToast";
import { AuthProvider, useAuth } from "./features/auth/AuthProvider";
import { logInfo } from "./features/logging/appLogger";
import { installNetworkLogger } from "./features/logging/networkLogger";
import { PreferencesProvider } from "./features/preferences/PreferencesProvider";
import { RecipesProvider } from "./features/recipes/RecipesProvider";
import { ShoppingListProvider } from "./features/shopping/ShoppingListProvider";
import { TimersProvider } from "./features/timers/TimersProvider";
import { useReducedMotion } from "./features/accessibility/useReducedMotion";
import type { RootStackParamList } from "./navigation/types";
import { DiagnosticsLogsScreen } from "./screens/DiagnosticsLogsScreen";
import { ImportRecipeScreen } from "./screens/ImportRecipeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { TourScreen } from "./screens/TourScreen";
import { RecipeDetailScreen } from "./screens/RecipeDetailScreen";
import { RecipeEditorScreen } from "./screens/RecipeEditorScreen";
import { RecipeListScreen } from "./screens/RecipeListScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ShoppingListScreen } from "./screens/ShoppingListScreen";
import { PrivacyScreen } from "./screens/PrivacyScreen";
import { useOnboarding } from "./features/onboarding/useOnboarding";
import { AppThemeProvider, useAppTheme } from "./theme/ThemeProvider";

const Stack = createNativeStackNavigator<RootStackParamList>();

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore error if it's already prevented
});

export default function App() {
  React.useEffect(() => {
    installNetworkLogger();
    logInfo("app", "AvoCook mounted");
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    // Warning: all those providers are probably making the app slower
    // but I didn't find a better way to structure this without Redux
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <AppThemeProvider>
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
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { credentials, hydrated, isLocalMode } = useAuth();
  const { colors, isDark, navTheme } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const { introDone, tourDone, onboardingHydrated } = useOnboarding();
  const loadingLogo = isDark
    ? require("../assets/logo-dark.png")
    : require("../assets/logo.png");

  if (!hydrated || !onboardingHydrated) {
    // simple splash screen while we load the db and stuff
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Image
          accessible={false}
          source={loadingLogo}
          style={styles.loadingLogo}
          contentFit="contain"
        />
        <ActivityIndicator color={colors.primary} />
        <AppText muted>AvoCook</AppText>
      </View>
    );
  }

  // Determine initial route based on onboarding state
  const isAuthenticated = Boolean(credentials || isLocalMode);
  const initialRoute: keyof RootStackParamList = !introDone
    ? "Onboarding"
    : isAuthenticated && !tourDone
      ? "Tour"
      : isAuthenticated
        ? "Recipes"
        : "Login";

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <NavigationContainer theme={navTheme}>
        {isAuthenticated ? <ShareIntentHandler /> : null}
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={({ route }) => ({
            animation: getStackAnimation(
              route.name,
              route.params,
              reducedMotion
            ),
            headerShown: false
          })}
        >
          {/* Always register all screens – visibility is controlled by
              which screen appears first via initialRouteName */}
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Tour" component={TourScreen} />
          <Stack.Screen name="Recipes" component={RecipeListScreen} />
          <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
          <Stack.Screen name="RecipeEditor" component={RecipeEditorScreen} />
          <Stack.Screen name="ImportRecipe" component={ImportRecipeScreen} />
          <Stack.Screen name="ShoppingList" component={ShoppingListScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen
            name="DiagnosticsLogs"
            component={DiagnosticsLogsScreen}
          />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  React.useEffect(() => {
    if (hasShareIntent && shareIntent.type) {
      if (shareIntent.type === "weburl" && shareIntent.webUrl) {
        navigation.navigate("ImportRecipe", { url: shareIntent.webUrl });
      } else if (shareIntent.type === "text" && shareIntent.text) {
        // sometimes URLs are shared as plain text
        navigation.navigate("ImportRecipe", { url: shareIntent.text });
      }
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent, navigation, resetShareIntent]);

  return null;
}

function getStackAnimation(
  routeName: keyof RootStackParamList,
  routeParams: RootStackParamList[keyof RootStackParamList],
  reducedMotion: boolean
) {
  if (reducedMotion) {
    return "none";
  }

  const tabTransition = getTabTransition(routeParams);

  if (routeName === "ShoppingList" && tabTransition === "fromRecipes") {
    return "slide_from_right";
  }

  if (routeName === "Recipes" && tabTransition === "fromShopping") {
    return "slide_from_left";
  }

  return "slide_from_right";
}

function getTabTransition(
  routeParams: RootStackParamList[keyof RootStackParamList]
) {
  if (
    routeParams &&
    "tabTransition" in routeParams &&
    typeof routeParams.tabTransition === "string"
  ) {
    return routeParams.tabTransition;
  }

  return undefined;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  loading: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center"
  },
  loadingLogo: {
    height: 96,
    width: 96
  }
});

registerRootComponent(App);

