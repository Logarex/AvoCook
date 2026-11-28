import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StockInventoryList } from "../screens/StockInventoryList";
import type { StockItem } from "../features/kitchen/kitchen";
const confirm = vi.hoisted(() => vi.fn());
vi.mock("react-native", () => ({ Alert: { alert: confirm }, View: "View", ScrollView: "ScrollView", Pressable: "Pressable", StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 } }));
vi.mock("lucide-react-native", () => Object.fromEntries(["AlertTriangle", "Archive", "Check", "ChevronDown", "Lock", "PackageCheck", "Pencil", "Refrigerator", "ShoppingCart", "Snowflake", "Trash2", "Utensils"].map((name) => [name, name])));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }) }));
vi.mock("../theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: {} }) }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../components/IconButton", () => ({ IconButton: "IconButton" }));
vi.mock("../components/DisclosureSection", () => ({ DisclosureSection: ({ title, children }: { title: string; children: React.ReactNode }) => React.createElement("Disclosure", { title }, children) }));
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
  expect(onUse).not.toHaveBeenCalled();
  await act(async () => confirm.mock.calls.at(-1)![2][1].onPress());
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
it("filters foods to use soon, marks Pantry level items and running-low products", async () => {
  const items: StockItem[] = [
    { id: "a", name: "Yaourt", quantity: "4", expires: "2026-10-25", location: "fridge" },
    { id: "b", name: "Riz", quantity: "", expires: "", location: "cupboard", pantry: { itemId: 1, listId: 2, level: "low", low: true } },
    { id: "c", name: "Pâtes", quantity: "1", expires: "", location: "cupboard", pantry: { itemId: 3, listId: 2, low: true } },
  ];
  await act(async () => { screen = create(React.createElement(StockInventoryList, { items, today: "2026-10-24", busy: false, onUse: vi.fn(), onEdit: vi.fn(), onIdeas: vi.fn(), onLocationChange: vi.fn() })); });
  expect(rows().map((row) => row.props.accessibilityLabel)).toEqual([
    "Yaourt, 4, kitchen.soonShort · Oct 25",
    "Pâtes, 1, inventorySync.low, kitchen.noExpiry",
    "Riz, inventorySync.level_low, kitchen.noExpiry",
  ]);
  const soon = screen.root.find((node) => node.props.accessibilityRole === "switch");
  expect(soon.props.accessibilityLabel).toBe("inventorySync.soonFilter · 1");
  await act(async () => soon.props.onPress());
  expect(rows()).toHaveLength(1);
});

it("keeps read-only Pantry products viewable without actions", async () => {
  const item: StockItem = { id: "a", name: "Café", quantity: "1", expires: "", location: "cupboard", pantry: { itemId: 1, listId: 2 } };
  await act(async () => { screen = create(React.createElement(StockInventoryList, { items: [item], today: "2026-10-24", busy: false, isReadOnly: () => true, onUse: vi.fn(), onEdit: vi.fn(), onIdeas: vi.fn(), onLocationChange: vi.fn() })); });
  expect(rows()[0].props.accessibilityLabel).toContain("inventorySync.readOnly");
  await act(async () => rows()[0].props.onPress());
  expect(screen.root.findAll((node) => String(node.type) === "Button")).toHaveLength(0);
  expect(screen.root.findAll((node) => String(node.type) === "Text" && node.props.children === "inventorySync.readOnlyHelp")).toHaveLength(1);
});

it("lists used-up Pantry products with buy, restock and confirmed delete, even with nothing at home", async () => {
  const out = [{ itemId: 9, listId: 2, name: "Lait", quantity: "", location: "fridge" as const, level: false }];
  const onBuy = vi.fn(), onRestock = vi.fn(), onDeleteOut = vi.fn();
  confirm.mockClear();
  await act(async () => { screen = create(React.createElement(StockInventoryList, { items: [], out, onBuy, onRestock, onDeleteOut, today: "2026-10-24", busy: false, onUse: vi.fn(), onEdit: vi.fn(), onIdeas: vi.fn(), onLocationChange: vi.fn() })); });
  expect(screen.root.find((node) => String(node.type) === "Disclosure").props.title).toBe("inventorySync.outTitle · 1");
  const [buy, restock, remove] = screen.root.findAll((node) => String(node.type) === "IconButton");
  await act(async () => { buy.props.onPress(); restock.props.onPress(); remove.props.onPress(); });
  expect(onBuy).toHaveBeenCalledWith(out[0]);
  expect(onRestock).toHaveBeenCalledWith(out[0]);
  expect(onDeleteOut).not.toHaveBeenCalled();
  confirm.mock.calls[0][2][1].onPress();
  expect(onDeleteOut).toHaveBeenCalledWith(out[0]);
});
