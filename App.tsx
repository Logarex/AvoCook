import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./src/i18n";
import { AppText } from "./src/components/AppText";
import { AuthProvider, useAuth } from "./src/features/auth/AuthProvider";
import { PreferencesProvider } from "./src/features/preferences/PreferencesProvider";
import { RecipesProvider } from "./src/features/recipes/RecipesProvider";
import type { RootStackParamList } from "./src/navigation/types";
import { ImportRecipeScreen } from "./src/screens/ImportRecipeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RecipeDetailScreen } from "./src/screens/RecipeDetailScreen";
import { RecipeEditorScreen } from "./src/screens/RecipeEditorScreen";
import { RecipeListScreen } from "./src/screens/RecipeListScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { AppThemeProvider, useAppTheme } from "./src/theme/ThemeProvider";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <PreferencesProvider>
            <AuthProvider>
              <RecipesProvider>
                <RootNavigator />
              </RecipesProvider>
            </AuthProvider>
          </PreferencesProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { credentials, hydrated } = useAuth();
  const { colors, isDark, navTheme } = useAppTheme();

  if (!hydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <AppText muted>Nextcloud Cookbook</AppText>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          screenOptions={{
            animation: "slide_from_right",
            headerShown: false
          }}
        >
          {credentials ? (
            <>
              <Stack.Screen name="Recipes" component={RecipeListScreen} />
              <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
              <Stack.Screen name="RecipeEditor" component={RecipeEditorScreen} />
              <Stack.Screen name="ImportRecipe" component={ImportRecipeScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  loading: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center"
  }
});
