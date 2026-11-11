import { Platform } from "react-native";
import { getKitchenNative } from "./kitchenNative";
import type { Recipe } from "../recipes/types";
import { markdownToPlainText } from "../markdown/markdown";

const APP_GROUP = "group.org.epimac.avocook";
const SNAPSHOT_KEY = "todaySnapshot";
const MAX_INDEXED_RECIPES = 2000;

type ExtensionStorageModule = {
  ExtensionStorage: (new (group: string) => { set(key: string, value: string | undefined): void }) & {
    reloadWidget(name?: string): void;
  };
};

function extensionStorage(): ExtensionStorageModule["ExtensionStorage"] | null {
  if (Platform.OS !== "ios") return null;
  try {
    // Loaded lazily: the module only exists in iOS builds that include the widget extension.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("@bacons/apple-targets") as ExtensionStorageModule).ExtensionStorage;
  } catch {
    return null;
  }
}

let lastSnapshot = "";
export function publishTodayWidget(snapshot: unknown) {
  const serialized = JSON.stringify(snapshot);
  if (serialized === lastSnapshot) return;
  const Storage = extensionStorage();
  if (!Storage) return;
  try {
    new Storage(APP_GROUP).set(SNAPSHOT_KEY, serialized);
    Storage.reloadWidget("AvoCookToday");
    lastSnapshot = serialized;
  } catch (error) {
    console.warn("[Widgets] Could not update the Today widget", error);
  }
}

export function clearTodayWidget() {
  lastSnapshot = "";
  const Storage = extensionStorage();
  try {
    Storage && new Storage(APP_GROUP).set(SNAPSHOT_KEY, undefined);
    Storage?.reloadWidget("AvoCookToday");
  } catch {
  }
}

export function spotlightEntries(recipes: Recipe[]) {
  return recipes
    .filter((recipe): recipe is Recipe & { id: string } => Boolean(recipe.id))
    .slice(0, MAX_INDEXED_RECIPES)
    .map((recipe) => ({
      id: recipe.id,
      title: markdownToPlainText(recipe.name).slice(0, 200),
      summary: markdownToPlainText(recipe.description).slice(0, 300),
      keywords: [
        ...recipe.keywords.split(","),
        ...recipe.recipeCategory.split(","),
      ]
        .map((word) => word.trim())
        .filter(Boolean)
        .slice(0, 20),
    }));
}

let lastIndex = "";
export async function replaceSpotlightIndex(recipes: Recipe[]) {
  if (Platform.OS !== "ios") return false;
  const native = getKitchenNative();
  if (!native?.replaceRecipeIndex) return false;
  const serialized = JSON.stringify(spotlightEntries(recipes));
  if (serialized === lastIndex) return true;
  const ok = await native.replaceRecipeIndex(serialized);
  if (ok) lastIndex = serialized;
  return ok;
}

export async function clearSpotlightIndex() {
  lastIndex = "";
  if (Platform.OS !== "ios") return;
  await getKitchenNative()?.clearRecipeIndex?.();
}
