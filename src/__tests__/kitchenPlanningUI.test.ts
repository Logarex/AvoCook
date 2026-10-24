import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KitchenScreen } from "../screens/KitchenScreen";
import { emptyKitchen, type KitchenData } from "../features/kitchen/kitchen";
import { createEmptyRecipe } from "../features/recipes/types";

const mocks = vi.hoisted(() => ({ data: {} as KitchenData, update: vi.fn(), alert: vi.fn(), navigate: vi.fn(), setParams: vi.fn(), loading: false }));
vi.mock("react-native", () => ({ Platform: { OS: "ios" }, View: "View", Pressable: "Pressable", ScrollView: "Scroll", Switch: "Switch", ActivityIndicator: "Spinner", Alert: { alert: mocks.alert }, StyleSheet: { create: (s: unknown) => s }, useWindowDimensions: () => ({ fontScale: 1 }) }));
vi.mock("react-native-reanimated", () => ({ default: { View: "AnimatedView" }, useSharedValue: (value: unknown) => ({ value }), useAnimatedStyle: () => ({}) }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "fr" } }) }));
vi.mock("lucide-react-native", () => Object.fromEntries(["ArrowLeft", "ArrowRight", "Wrench", "Pencil", "ScanBarcode", "ChevronDown", "Check"].map((key) => [key, key])));
vi.mock("../theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: {} }) }));
vi.mock("../features/kitchen/KitchenProvider", () => ({ useKitchen: () => ({ data: mocks.data, update: mocks.update, ready: true, account: "local" }) }));
vi.mock("../features/recipes/RecipesProvider", () => ({ useRecipes: () => ({ recipes: [{ ...createEmptyRecipe(), id: "r", name: "Soupe", recipeIngredient: ["200 g carottes"] }], loading: mocks.loading }) }));
vi.mock("../features/shopping/ShoppingListProvider", () => ({ useShoppingList: () => ({ mode: { kind: "local" }, items: [] }) }));
vi.mock("../features/kitchen/useLocalDay", () => ({ useLocalDay: () => "2026-10-24" }));
vi.mock("../features/kitchen/kitchenNative", () => ({ getKitchenNative: () => null, replaceStockReminders: vi.fn() }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/AppSheet", () => ({ AppSheet: ({ visible, children, ...props }: { visible: boolean; children: React.ReactNode }) => visible ? React.createElement("Sheet", props, children) : null }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/IconButton", () => ({ IconButton: "IconButton" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../components/SegmentedControl", () => ({ SegmentedControl: "Segments" }));
vi.mock("../components/GlassPanel", () => ({ GlassPanel: "Panel" }));
vi.mock("../components/Screen", () => ({ Screen: "Screen" }));
vi.mock("../components/ScreenHeader", () => ({ ScreenHeader: "Header" }));
vi.mock("../components/PageSwipeGesture", () => ({ PageSwipeGesture: "Swipe" }));
vi.mock("../components/KitchenRecipeList", () => ({ KitchenRecipeList: ({ recipes, children }: { recipes: unknown[]; children: (recipe: unknown) => React.ReactNode }) => recipes.map(children) }));
vi.mock("../components/KitchenDraggable", () => ({ KitchenDraggable: "Draggable" }));
vi.mock("../screens/KitchenDailyScreen", () => ({ KitchenDailyScreen: "Daily" }));
vi.mock("../screens/KitchenBackupScreen", () => ({ KitchenBackupScreen: "Backup" }));
vi.mock("../screens/KitchenMenusScreen", () => ({ KitchenMenusScreen: "Menus" }));
vi.mock("../screens/KitchenToolsScreen", () => ({ KitchenToolsScreen: "Tools" }));
vi.mock("../screens/StockInventoryList", () => ({ StockInventoryList: "Inventory" }));
vi.mock("../screens/StockExpiryField", () => ({ StockExpiryField: "Date" }));
vi.mock("../screens/StockProductLookup", () => ({ StockProductLookup: "Lookup" }));
vi.mock("../screens/StockProductScores", () => ({ StockProductScores: "Scores" }));
vi.mock("../screens/StockQuickAdd", () => ({ StockQuickAdd: "QuickAdd" }));
let screen: ReactTestRenderer;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  mocks.data = emptyKitchen();
  mocks.loading = false;
  mocks.update.mockImplementation(async (change: (data: KitchenData) => KitchenData) => { mocks.data = change(mocks.data); });
});
afterEach(async () => { await act(async () => screen?.unmount()); vi.unstubAllGlobals(); });
async function render(section = "history", name = "Planning") {
  await act(async () => { screen = create(React.createElement(KitchenScreen, { navigation: { navigate: mocks.navigate, setParams: mocks.setParams }, route: { name, params: { section } } } as never)); });
}
function button(label: string) { return screen.root.findAll((node) => (String(node.type) === "Button" && node.props.label === label) || (String(node.type) === "Pressable" && node.props.accessibilityLabel === label))[0]; }
async function options() {
  const disclosure = screen.root.findAll((node) => String(node.type) === "Pressable" && node.props.accessibilityState?.expanded === false).find((node) => node.findAll((child) => String(child.type) === "Text" && child.props.children === "kitchen.moreOptions").length > 0)!;
  await act(async () => disclosure.props.onPress());
}
function input(label: string) { return screen.root.findAll((node) => String(node.type) === "Input" && node.props.label === label)[0]; }

describe("planning and kitchen journeys", () => {
  it("records a simple meal with a private memory and optional recipe link", async () => {
    await render();
    expect(screen.root.findByType("Segments" as never).props.options.map((option: { value: string }) => option.value)).toEqual(["today", "planner", "history"]);
    await act(async () => button("kitchen.recordMeal").props.onPress());
    await act(async () => input("kitchen.mealEatenName").props.onChangeText("Soupe en famille"));
    expect(screen.root.findAll((node) => String(node.type) === "Input")).toHaveLength(1);
    expect(button("kitchen.linkRecipe")).toBeUndefined();
    await act(async () => button("kitchen.addMealNote").props.onPress());
    await act(async () => input("kitchen.mealNotes").props.onChangeText("Plus de cumin la prochaine fois"));
    await options();
    await act(async () => button("kitchen.linkRecipe").props.onPress());
    await act(async () => button("Soupe").props.onPress());
    await act(async () => button("common.save").props.onPress());
    expect(mocks.data.meals[0]).toMatchObject({ kind: "simple", recipeId: "", linkedRecipeId: "r", completed: true, notes: "Plus de cumin la prochaine fois", title: "Soupe en famille" });
  });
  it("keeps an edited memory until save and guards closing the sheet", async () => {
    mocks.data.meals = [{ id: "m", recipeId: "r", date: "2026-10-20", slot: "lunch", servings: 1, completed: true, notes: "Original" }];
    await render();
    await act(async () => button("kitchen.editMemory").props.onPress());
    await act(async () => input("kitchen.mealNotes").props.onChangeText("Changed"));
    const sheet = screen.root.findByType("Sheet" as never);
    expect(sheet.props.preventDismiss).toBe(true);
    await act(async () => sheet.props.onClose());
    expect(mocks.alert).toHaveBeenCalledWith("kitchen.unsaved", "kitchen.unsavedBody", expect.any(Array));
    expect(mocks.data.meals[0].notes).toBe("Original");
    await act(async () => button("common.save").props.onPress());
    expect(mocks.data.meals[0].notes).toBe("Changed");
  });
  it("prevents recording a future meal as eaten and keeps a failed save editable", async () => {
    await render();
    await act(async () => button("kitchen.recordMeal").props.onPress());
    await act(async () => input("kitchen.mealEatenName").props.onChangeText("Sandwich"));
    await act(async () => screen.root.findByType("Date" as never).props.onChange("2026-10-25"));
    expect(button("common.save").props.disabled).toBe(true);
    await act(async () => screen.root.findByType("Date" as never).props.onChange("2026-10-23"));
    mocks.update.mockRejectedValueOnce(new Error("Disk full"));
    await act(async () => button("common.save").props.onPress());
    expect(mocks.data.meals).toEqual([]);
    expect(input("kitchen.mealEatenName").props.value).toBe("Sandwich");
    expect(mocks.alert).toHaveBeenCalledWith("common.error", "kitchen.saveError");
  });
  it("lets food inventory load independently and saves successive scans with fresh dates", async () => {
    mocks.loading = true;
    await render("stock", "Kitchen");
    const manual = screen.root.findAll((node) => String(node.type) === "Pressable" && node.props.accessibilityLabel === "kitchen.addStock")[0];
    await act(async () => manual.props.onPress());
    await act(async () => screen.root.findByType("Lookup" as never).props.onProduct({ barcode: "12345678", name: "Lait", quantity: "1 l", nutrients: { salt: 0 } }));
    await act(async () => screen.root.findByType("Date" as never).props.onChange("2026-11-01"));
    await act(async () => button("kitchen.saveAndNext").props.onPress());
    expect(mocks.data.stock[0]).toMatchObject({ name: "Lait", expires: "2026-11-01", nutrients: { salt: 0 } });
    expect(input("kitchen.foodName").props.value).toBe("");
    expect(screen.root.findByType("Date" as never).props.value).toBe("");
    expect(mocks.data.stock).toHaveLength(1);
  });
});
