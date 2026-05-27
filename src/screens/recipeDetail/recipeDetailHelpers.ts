import type { ImageSource } from "expo-image";
import type { LucideIcon } from "lucide-react-native";
import {
  canUseRemoteRecipeImageFallback,
  getPreferredDisplayRecipeImage,
  isCookbookImageEndpoint,
} from "../../features/recipes/recipeImageReferences";
import type { RecipePrintLabels } from "../../features/recipes/recipeSharing";
import type { TimerPreset } from "../../features/timers/TimersProvider";
import { useRecipes } from "../../features/recipes/RecipesProvider";
import { useAuth } from "../../features/auth/AuthProvider";
import type { Nutrition } from "../../features/recipes/types";
import { spacing } from "../../theme/colors";
import { isoDurationToMinutes } from "../../utils/duration";

export type ToolbarAction = {
  id: string;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
};

export const TOOLBAR_ICON_SIZE = 44;
export const TOOLBAR_HORIZONTAL_PADDING = spacing.md * 2;
export const TOOLBAR_BACK_ACTION_GAP = spacing.sm;

export type DetailRecipe = ReturnType<typeof useRecipes>["recipes"][number];

export function getTimerPresets(
  recipe: DetailRecipe,
  t: (key: string) => string,
): TimerPreset[] {
  const presets: TimerPreset[] = [
    {
      id: "prep",
      label: t("recipes.timers.prep"),
      minutes: isoDurationToMinutes(recipe.prepTime) ?? 0,
    },
    {
      id: "cook",
      label: t("recipes.timers.cook"),
      minutes: isoDurationToMinutes(recipe.cookTime) ?? 0,
    },
    {
      id: "total",
      label: t("recipes.timers.total"),
      minutes: isoDurationToMinutes(recipe.totalTime) ?? 0,
    },
  ];

  return presets.filter((preset) => preset.minutes > 0);
}

export function formatTimerSeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  const paddedMinutes = String(minutes).padStart(hours > 0 ? 2 : 1, "0");
  const paddedSeconds = String(remainingSeconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${paddedMinutes}:${paddedSeconds}`;
}

export function getPrintLabels(t: (key: string) => string): RecipePrintLabels {
  return {
    appName: "AvoCook",
    calories: t("editor.caloriesKcal"),
    category: t("recipes.category"),
    cookTime: t("recipes.cookTime"),
    carbs: t("editor.carbsGrams"),
    fat: t("editor.fatGrams"),
    fiber: t("editor.fiberGrams"),
    ingredients: t("recipes.ingredients"),
    instructions: t("recipes.instructions"),
    keywords: t("recipes.share.keywords"),
    nutrition: t("recipes.nutrition"),
    nutriScore: "Nutri-Score",
    prepTime: t("recipes.prepTime"),
    protein: t("editor.proteinGrams"),
    saturatedFat: t("editor.saturatedFatGrams"),
    servingSize: t("recipes.share.servingSize"),
    source: t("recipes.source"),
    sodium: t("editor.sodiumMg"),
    sugar: t("editor.sugarGrams"),
    tools: t("recipes.tools"),
    totalTime: t("recipes.totalTime"),
    yield: t("recipes.yield"),
  };
}

export function normalizeNutrition(
  nutrition?: Nutrition | Nutrition[] | null,
): [string, string][] {
  const node = Array.isArray(nutrition) ? nutrition[0] : nutrition;
  if (!node || typeof node !== "object") {
    return [];
  }

  return Object.entries(node)
    .filter(([key, value]) => key !== "@type" && Boolean(value))
    .map(([key, value]) => [key.replace(/Content$/, ""), String(value)]);
}

export function isUserDismissedShareOrPrint(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /printing did not complete|cancel|dismiss|abort/i.test(error.message);
}

export function getImageSource(
  recipe: ReturnType<typeof useRecipes>["recipes"][number] | undefined,
  client: ReturnType<typeof useAuth>["getClient"] extends () => infer T
    ? T
    : never,
): ImageSource | null {
  if (!recipe) {
    return null;
  }

  const publicImage = getPreferredDisplayRecipeImage(recipe);
  if (publicImage) {
    return {
      uri: publicImage,
      headers:
        client && isCookbookImageEndpoint(publicImage)
          ? client.getImageHeaders()
          : undefined,
    };
  }

  if (client && canUseRemoteRecipeImageFallback(recipe)) {
    return {
      uri: client.getRecipeImageUrl(recipe.id, "full"),
      headers: client.getImageHeaders(),
    };
  }

  return null;
}

export function getToolbarColumnCount(
  actionCount: number,
  windowWidth: number,
) {
  const availableActionsWidth =
    windowWidth -
    TOOLBAR_HORIZONTAL_PADDING -
    TOOLBAR_ICON_SIZE -
    TOOLBAR_BACK_ACTION_GAP;

  if (getToolbarActionsWidth(actionCount) <= availableActionsWidth) {
    return actionCount;
  }

  return Math.max(1, Math.ceil(actionCount / 2));
}

export function getToolbarActionsWidth(columnCount: number) {
  return (
    columnCount * TOOLBAR_ICON_SIZE + Math.max(0, columnCount - 1) * spacing.xs
  );
}

export function chunkToolbarActions(
  actions: ToolbarAction[],
  columnCount: number,
) {
  const rows: ToolbarAction[][] = [];
  for (let index = 0; index < actions.length; index += columnCount) {
    rows.push(actions.slice(index, index + columnCount));
  }
  return rows;
}
