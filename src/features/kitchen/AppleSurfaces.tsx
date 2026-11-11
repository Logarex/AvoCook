import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import { useRecipes } from "../recipes/RecipesProvider";
import { useShoppingList } from "../shopping/ShoppingListProvider";
import {
  clearSpotlightIndex,
  clearTodayWidget,
  publishTodayWidget,
  replaceSpotlightIndex,
} from "./appleIntegrations";
import type { KitchenData } from "./kitchen";
import { useLocalDay } from "./useLocalDay";
import { todayWidgetSnapshot } from "./widgetSnapshot";

/** Keeps the iOS Today widget and the Spotlight recipe index in step with the app. */
export function AppleSurfaces({ account, ready, data }: { account: string; ready: boolean; data: KitchenData }) {
  if (Platform.OS !== "ios") return null;
  return <AppleSurfacesSync account={account} ready={ready} data={data} />;
}

function AppleSurfacesSync({ account, ready, data }: { account: string; ready: boolean; data: KitchenData }) {
  const { t } = useTranslation();
  const { recipes, loading } = useRecipes();
  const shopping = useShoppingList();
  const today = useLocalDay();
  const signedOut = account === "signed-out";
  const remaining = shopping.items.filter((item) => !item.checked).length;

  useEffect(() => {
    if (signedOut) {
      clearTodayWidget();
      return;
    }
    if (!ready || loading) return;
    const timer = setTimeout(() => {
      publishTodayWidget(
        todayWidgetSnapshot(data, recipes, remaining, {
          title: t("widgets.title"),
          noMeal: t("widgets.noMeal"),
          expiring: t("widgets.expiring"),
          shopping: t("widgets.shopping", { count: remaining }),
          lunch: t("kitchen.lunch"),
          dinner: t("kitchen.dinner"),
          empty: t("widgets.empty"),
          simple: t("kitchen.simple"),
          leftovers: t("kitchen.leftovers"),
          out: t("kitchen.out"),
        }),
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [signedOut, ready, loading, data, recipes, remaining, t, today]);

  useEffect(() => {
    if (signedOut) {
      void clearSpotlightIndex().catch(() => undefined);
      return;
    }
    if (loading) return;
    const timer = setTimeout(() => {
      void replaceSpotlightIndex(recipes).catch((error: unknown) =>
        console.warn("[Spotlight] Could not index recipes", error),
      );
    }, 3000);
    return () => clearTimeout(timer);
  }, [signedOut, loading, recipes]);
  return null;
}
