/**
 * Store screenshot helper. Inert unless the app is built with
 * EXPO_PUBLIC_SCREENSHOT_HOST (see tools/screenshots/README.md).
 *
 * - First launch: switches to local mode, imports the demo kitchen served by
 *   the screenshot host (recipes, photos, planning, stock, shopping list) and
 *   silences first-run prompts.
 * - avocook://shot/<Screen>?recipe=<key>&<param>=<value> opens a screen.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { File, Paths } from "expo-file-system";
import { useEffect, useRef } from "react";
import { Linking } from "react-native";
import i18n from "../../i18n";
import type { RootStackParamList } from "../../navigation/types";
import { APP_VERSION } from "../../version";
import { useAuth } from "../auth/AuthProvider";
import { localDate, shiftDate, type KitchenData } from "../kitchen/kitchen";
import { useKitchen } from "../kitchen/KitchenProvider";
import { remapKitchenBackup } from "../kitchen/kitchenBackup";
import { useRecipes } from "../recipes/RecipesProvider";
import type { RecipeBackup } from "../recipes/recipeBackup";
import { useShoppingList } from "../shopping/ShoppingListProvider";

export const SCREENSHOT_HOST = process.env.EXPO_PUBLIC_SCREENSHOT_HOST?.trim() || "";

const SEEDED_KEY = "screenshots.seeded";
const KEYS_KEY = "screenshots.recipeKeys";

type Seed = {
  backup: RecipeBackup;
  /** Recipe key -> recipe name, used by links such as ?recipe=ratatouille. */
  keys: Record<string, string>;
  /** Meal dates and stock expiry dates are day offsets from today. */
  kitchen: Omit<KitchenData, "meals" | "stock"> & {
    meals: (Omit<KitchenData["meals"][number], "date"> & { day: number })[];
    stock: (Omit<KitchenData["stock"][number], "expires"> & { expiresIn?: number })[];
  };
  shopping: { label: string; checked?: boolean; recipeKey?: string }[];
};

export function ScreenshotHarness() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const auth = useAuth();
  const recipes = useRecipes();
  const kitchen = useKitchen();
  const shopping = useShoppingList();
  const started = useRef(false);
  const state = useRef({ recipes, navigation });
  state.current = { recipes, navigation };

  useEffect(() => {
    if (!auth.hydrated || auth.isLocalMode) return;
    void AsyncStorage.getItem(SEEDED_KEY).then((done) => {
      if (!done) void auth.startLocalMode();
    });
  }, [auth]);

  useEffect(() => {
    if (started.current || !auth.isLocalMode || recipes.loading || !kitchen.ready || shopping.loading) return;
    started.current = true;
    void (async () => {
      if (await AsyncStorage.getItem(SEEDED_KEY)) return;
      const lang = i18n.language;
      const response = await fetch(`${SCREENSHOT_HOST}/seed-${lang}.json`);
      if (!response.ok) throw new Error(`Seed ${lang}: HTTP ${response.status}`);
      const text = await response.text();
      const seed = JSON.parse(text) as Seed;
      const file = new File(Paths.cache, `screenshot-seed-${lang}.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(seed.backup));
      const result = await recipes.importBackupFile(file.uri);
      const today = localDate();
      const data = {
        ...seed.kitchen,
        meals: seed.kitchen.meals.map(({ day, ...meal }) => ({ ...meal, date: shiftDate(today, day) })),
        stock: seed.kitchen.stock.map(({ expiresIn, ...item }) => ({
          ...item,
          expires: expiresIn === undefined ? "" : shiftDate(today, expiresIn),
        })),
      } as KitchenData;
      const mapped = remapKitchenBackup(
        data,
        seed.backup.recipes.map((entry) => entry.recipe),
        result.recipes,
      );
      await kitchen.update(() => ({ ...mapped.data, shoppingGroupId: kitchen.data.shoppingGroupId }));
      for (const item of seed.shopping) {
        const recipe = item.recipeKey
          ? result.recipes.find((candidate) => candidate.name === seed.keys[item.recipeKey!])
          : undefined;
        const added = await shopping.addIngredients(
          [item.label],
          recipe ? { recipeId: recipe.id, recipeName: recipe.name } : {},
          { allowDuplicates: true },
        );
        if (item.checked) for (const entry of added.added) await shopping.toggleItem(entry.id);
      }
      await AsyncStorage.multiSet([
        [KEYS_KEY, JSON.stringify(seed.keys)],
        ["onboarding.tourDone", "true"],
        ["onboarding.lastSeenVersion", APP_VERSION],
        ["remindersPromptDone", "true"],
        ["milestones.lastStoreReviewCount", "100000"],
        ["milestones.lastBackupReminderCount", "100000"],
        [SEEDED_KEY, lang],
      ]);
      console.info("screenshots", `Seeded ${result.recipes.length} recipes (${lang})`);
    })().catch((error: unknown) => console.warn("screenshots", "Seed failed", error));
    // Runs once, when every store is ready.
  }, [auth.isLocalMode, recipes.loading, kitchen.ready, shopping.loading, recipes, kitchen, shopping]);

  useEffect(() => {
    const handle = async (url: string | null) => {
      const match = url?.match(/^avocook:\/\/shot\/([A-Za-z]+)(?:\?(.*))?$/);
      if (!match) return;
      const screen = match[1] as keyof RootStackParamList;
      const query = new URLSearchParams(match[2] ?? "");
      const params: Record<string, unknown> = {};
      const keys = JSON.parse((await AsyncStorage.getItem(KEYS_KEY)) ?? "{}") as Record<string, string>;
      for (const [name, value] of query) {
        if (name === "recipe") {
          const recipe = state.current.recipes.recipes.find((candidate) => candidate.name === keys[value]);
          if (recipe?.id) params.id = recipe.id;
          if (recipe?.id) params.recipeId = recipe.id;
        } else params[name] = /^\d+$/.test(value) ? Number(value) : value;
      }
      const tabs = ["Recipes", "Kitchen", "Planning", "Community", "ShoppingList"];
      const routes = tabs.includes(screen)
        ? [{ name: screen, params }]
        : [{ name: "Recipes" }, { name: screen, params }];
      state.current.navigation.reset({ index: routes.length - 1, routes } as never);
    };
    const subscription = Linking.addEventListener("url", ({ url }) => void handle(url));
    return () => subscription.remove();
  }, []);

  return null;
}
