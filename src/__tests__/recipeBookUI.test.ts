import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { KitchenToolsScreen } from "../screens/KitchenToolsScreen";
import { normalizeRecipe } from "../features/recipes/types";
const mocks = vi.hoisted(() => ({ html: vi.fn(), print: vi.fn(), client: {} }));
const longName = "Blanquette de veau aux lardons et champignons avec des légumes de saison et du riz";
vi.mock("react-native", () => ({ View: "View", Pressable: "Pressable", Alert: { alert: vi.fn() }, Linking: {}, StyleSheet: { create: (s: unknown) => s } }));
vi.mock("lucide-react-native", () => ({ Check: "Check" }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("../theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: { primary: "green", border: "gray", chip: "tint", backgroundElevated: "white" } }) }));
vi.mock("../features/auth/AuthProvider", () => ({ useAuth: () => ({ getClient: () => mocks.client }) }));
vi.mock("../features/kitchen/KitchenProvider", () => ({ useKitchen: () => ({ data: {}, update: vi.fn() }) }));
vi.mock("../features/recipes/RecipesProvider", () => ({ useRecipes: () => ({ recipes: [normalizeRecipe({ id: "long", name: longName }), normalizeRecipe({ id: "short", name: "Soupe" })] }) }));
vi.mock("expo-print", () => ({ printAsync: mocks.print }));
vi.mock("expo-sharing", () => ({ isAvailableAsync: async () => false }));
vi.mock("../features/kitchen/recipeBookExport", () => ({ createIllustratedRecipeBookHtml: mocks.html }));
vi.mock("../screens/KitchenSeasonalSection", () => ({ KitchenSeasonalSection: "Seasonal" }));
vi.mock("../components/AppSheet", () => ({ AppSheet: ({ visible, children, headerAction }: { visible: boolean; children: React.ReactNode; headerAction: React.ReactNode }) => visible ? React.createElement("Sheet", {}, React.createElement("Header", {}, headerAction), children) : null }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/ChoiceField", () => ({ ChoiceField: "Choice" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../components/GlassPanel", () => ({ GlassPanel: "Panel" }));
let screen: ReactTestRenderer;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.clearAllMocks(); mocks.html.mockResolvedValue("<html>Illustrated book</html>"); });
afterEach(async () => { await act(async () => screen?.unmount()); vi.unstubAllGlobals(); });
function buttons() { return screen.root.findAll((node) => String(node.type) === "Button"); }
it("uses wrapping checkbox rows for recipe selection and exports only selected recipes with the active account's photos", async () => {
  await act(async () => { screen = create(React.createElement(KitchenToolsScreen, { section: "book", openRecipe: vi.fn() })); });
  await act(async () => buttons().find((node) => node.props.label.startsWith("kitchen.chooseRecipes"))!.props.onPress());
  const rows = () => screen.root.findAll((node) => String(node.type) === "Pressable" && node.props.accessibilityRole === "checkbox");
  expect(rows()).toHaveLength(2);
  expect(rows()[0].props.accessibilityLabel).toBe(longName);
  expect(rows()[0].props.style({ pressed: false })[0]).toMatchObject({ width: "100%", minWidth: 0 });
  const title = rows()[0].findAll((node) => String(node.type) === "Text")[0];
  expect(title.props.style).toMatchObject({ flex: 1, minWidth: 0 });
  expect(title.props.numberOfLines).toBeUndefined();
  await act(async () => rows()[0].props.onPress());
  expect(rows()[0].props.accessibilityState.checked).toBe(true);
  const header = screen.root.findByType("Header" as never);
  const done = header.findAll((node) => String(node.type) === "Button" && node.props.label === "kitchen.done")[0];
  await act(async () => done.props.onPress());
  expect(screen.root.findAllByType("Sheet" as never)).toHaveLength(0);
  await act(async () => buttons().find((node) => node.props.label === "kitchen.exportBook")!.props.onPress());
  expect(mocks.html).toHaveBeenCalledWith([expect.objectContaining({ id: "long" })], expect.objectContaining({ contents: "kitchen.bookContents" }), mocks.client);
  expect(mocks.print).toHaveBeenCalledWith({
    html: "<html>Illustrated book</html>", width: 595, height: 842,
    margins: { top: 62, bottom: 68, left: 62, right: 62 },
  });
});
