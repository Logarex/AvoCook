import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StockInventoryList } from "../screens/StockInventoryList";
import type { StockItem } from "../features/kitchen/kitchen";
vi.mock("react-native", () => ({ View: "View", ScrollView: "ScrollView", Pressable: "Pressable", StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 } }));
vi.mock("lucide-react-native", () => Object.fromEntries(["Archive", "Check", "ChevronDown", "Pencil", "Refrigerator", "Snowflake", "Utensils"].map((name) => [name, name])));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }) }));
vi.mock("../theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: {} }) }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../screens/StockProductScores", () => ({ StockProductScores: "Scores" }));
let screen: ReactTestRenderer;
beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterEach(async () => { await act(async () => screen?.unmount()); vi.unstubAllGlobals(); });
function rows() { return screen.root.findAll((node) => String(node.type) === "Pressable" && typeof node.props.accessibilityState?.expanded === "boolean"); }
it("limits large inventories while keeping every food searchable and its actions accessible", async () => {
  const items: StockItem[] = Array.from({ length: 500 }, (_, index) => ({ id: String(index), name: `Food ${String(index).padStart(3, "0")}`, quantity: "", expires: "", location: "cupboard" }));
  const onUse = vi.fn();
  await act(async () => { screen = create(React.createElement(StockInventoryList, { items, today: "2026-10-24", busy: false, onUse, onEdit: vi.fn(), onIdeas: vi.fn(), onLocationChange: vi.fn() })); });
  expect(rows()).toHaveLength(20);
  expect(screen.root.findAll((node) => String(node.type) === "Scores")).toHaveLength(0);
  await act(async () => screen.root.findAll((node) => String(node.type) === "Button" && node.props.label === "kitchen.moreFood")[0].props.onPress());
  expect(rows()).toHaveLength(40);
  await act(async () => screen.root.findAll((node) => String(node.type) === "Input")[0].props.onChangeText("food 499"));
  expect(rows()).toHaveLength(1);
  expect(rows()[0].props.accessibilityLabel).toContain("Food 499");
  await act(async () => rows()[0].props.onPress());
  await act(async () => screen.root.findAll((node) => String(node.type) === "Button" && node.props.label === "kitchen.usedUp")[0].props.onPress());
  expect(onUse).toHaveBeenCalledExactlyOnceWith(items[499]);
});

it("keeps shopping inventory inspection read-only while revealing product information", async () => {
  const item: StockItem = { id: "milk", name: "Lait", quantity: "1 l", expires: "2026-10-26", location: "fridge", barcode: "12345678" };
  const onUse = vi.fn();
  await act(async () => { screen = create(React.createElement(StockInventoryList, { items: [item], today: "2026-10-24", busy: false, readOnly: true, onUse, onEdit: vi.fn(), onIdeas: vi.fn(), onLocationChange: vi.fn() })); });
  await act(async () => rows()[0].props.onPress());
  expect(screen.root.findByType("Scores" as never).props.item).toEqual(item);
  expect(screen.root.findAll((node) => String(node.type) === "Button")).toHaveLength(0);
  expect(onUse).not.toHaveBeenCalled();
});
