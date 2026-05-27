import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./src/i18n";
import { AppText } from "./src/components/AppText";
import { LongActionToastProvider } from "./src/components/LongActionToast";
import { AuthProvider, useAuth } from "./src/features/auth/AuthProvider";
import { logInfo } from "./src/features/logging/appLogger";
import { installNetworkLogger } from "./src/features/logging/networkLogger";
import { PreferencesProvider } from "./src/features/preferences/PreferencesProvider";
import { RecipesProvider } from "./src/features/recipes/RecipesProvider";
import { ShoppingListProvider } from "./src/features/shopping/ShoppingListProvider";
import { TimersProvider } from "./src/features/timers/TimersProvider";
import { useReducedMotion } from "./src/features/accessibility/useReducedMotion";
import type { RootStackParamList } from "./src/navigation/types";
import { DiagnosticsLogsScreen } from "./src/screens/DiagnosticsLogsScreen";
import { ImportRecipeScreen } from "./src/screens/ImportRecipeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RecipeDetailScreen } from "./src/screens/RecipeDetailScreen";
import { RecipeEditorScreen } from "./src/screens/RecipeEditorScreen";
import { RecipeListScreen } from "./src/screens/RecipeListScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { ShoppingListScreen } from "./src/screens/ShoppingListScreen";
import { PrivacyScreen } from "./src/screens/PrivacyScreen";
import { AppThemeProvider, useAppTheme } from "./src/theme/ThemeProvider";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  React.useEffect(() => {
    installNetworkLogger();
    logInfo("app", "AvoCook mounted");
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
  const loadingLogo = isDark
    ? require("./assets/logo-dark.png")
    : require("./assets/logo.png");

  if (!hydrated) {
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

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          screenOptions={({ route }) => ({
            animation: getStackAnimation(
              route.name,
              route.params,
              reducedMotion
            ),
            headerShown: false
          })}
        >
          {credentials || isLocalMode ? (
            <>
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
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
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
