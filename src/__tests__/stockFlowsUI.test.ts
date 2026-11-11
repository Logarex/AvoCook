import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StockArrivalSheet } from "../screens/StockArrivalSheet";
import { CookingStockSheet } from "../screens/CookingStockSheet";
import { emptyKitchen, type KitchenData } from "../features/kitchen/kitchen";
import { stockUsesForRecipe } from "../features/kitchen/stockFlows";

const mocks = vi.hoisted(() => ({ data: {} as KitchenData, update: vi.fn(), alert: vi.fn() }));
vi.mock("react-native", () => ({ View: "View", Pressable: "Pressable", Alert: { alert: mocks.alert }, StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("lucide-react-native", () => ({ Check: "Check" }));
vi.mock("../theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: {} }) }));
vi.mock("../components/AppSheet", () => ({ AppSheet: "Sheet" }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/SegmentedControl", () => ({ SegmentedControl: "Segments" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../screens/StockExpiryField", () => ({ StockExpiryField: "Expiry" }));
vi.mock("../features/kitchen/KitchenProvider", () => ({ useKitchen: () => ({ data: mocks.data, ready: true, update: mocks.update }) }));

let screen: ReactTestRenderer;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  mocks.data = emptyKitchen();
  mocks.update.mockImplementation(async (change: (data: KitchenData) => KitchenData) => { mocks.data = change(mocks.data); });
});
afterEach(async () => { await act(async () => screen?.unmount()); vi.unstubAllGlobals(); });
const buttons = () => screen.root.findAll((node) => String(node.type) === "Button");
const checkboxes = () => screen.root.findAll((node) => String(node.type) === "Pressable" && node.props.accessibilityRole === "checkbox");
const now = "2026-11-01T10:00:00.000Z";

it("stores checked groceries once, lets the cook skip rows and reports what changed", async () => {
  mocks.data.stock = [{ id: "milk", name: "Lait", quantity: "1 l", location: "fridge", expires: "" }];
  const onStored = vi.fn();
  const items = [
    { id: "a", label: "2 kg pommes de terre", checked: true, createdAt: now, updatedAt: now },
    { id: "b", label: "1 l lait", checked: true, createdAt: now, updatedAt: now },
    { id: "c", label: "Sel", checked: true, createdAt: now, updatedAt: now },
  ];
  await act(async () => { screen = create(React.createElement(StockArrivalSheet, { items, onClose: vi.fn(), onStored })); });
  await act(async () => checkboxes()[2].props.onPress());
  expect(checkboxes()[2].props.accessibilityState).toEqual({ checked: false });
  const save = buttons().at(-1)!;
  expect(save.props.label).toBe("kitchen.storeGroceriesAction");
  await act(async () => { save.props.onPress(); save.props.onPress(); });
  expect(mocks.update).toHaveBeenCalledTimes(1);
  expect(mocks.data.stock.map(({ name, quantity }) => [name, quantity])).toEqual([["Lait", "2 l"], ["pommes de terre", "2 kg"]]);
  expect(onStored).toHaveBeenCalledWith(["a", "b"], { added: 1, merged: 1 });
});

it("keeps the drafts and warns when the stock cannot be saved", async () => {
  mocks.update.mockRejectedValueOnce(new Error("Disk full"));
  const onStored = vi.fn();
  await act(async () => { screen = create(React.createElement(StockArrivalSheet, { items: [{ id: "a", label: "Beurre", checked: true, createdAt: now, updatedAt: now }], onClose: vi.fn(), onStored })); });
  await act(async () => buttons().at(-1)!.props.onPress());
  expect(onStored).not.toHaveBeenCalled();
  expect(mocks.alert).toHaveBeenCalledWith("common.error", "kitchen.saveError");
  expect(checkboxes()).toHaveLength(1);
});

it("only changes the stock rows confirmed after cooking", async () => {
  mocks.data.stock = [
    { id: "flour", name: "Farine", quantity: "1 kg", location: "cupboard", expires: "" },
    { id: "butter", name: "Beurre", quantity: "250 g", location: "fridge", expires: "" },
  ];
  const uses = stockUsesForRecipe({ recipeYield: 4, recipeIngredient: ["300 g farine", "Beurre"] }, 4, mocks.data.stock);
  const onDone = vi.fn();
  await act(async () => { screen = create(React.createElement(CookingStockSheet, { uses, onDone })); });
  expect(checkboxes().map((box) => box.props.accessibilityState.checked)).toEqual([true, false]);
  await act(async () => checkboxes()[1].props.onPress());
  await act(async () => buttons()[0].props.onPress());
  expect(mocks.data.stock).toEqual([{ id: "flour", name: "Farine", quantity: "700 g", location: "cupboard", expires: "" }]);
  expect(onDone).toHaveBeenCalledTimes(1);
});

it("leaves the stock untouched when the cook skips the review", async () => {
  mocks.data.stock = [{ id: "flour", name: "Farine", quantity: "1 kg", location: "cupboard", expires: "" }];
  const onDone = vi.fn();
  const uses = stockUsesForRecipe({ recipeYield: 1, recipeIngredient: ["100 g farine"] }, 1, mocks.data.stock);
  await act(async () => { screen = create(React.createElement(CookingStockSheet, { uses, onDone })); });
  await act(async () => buttons()[1].props.onPress());
  expect(mocks.update).not.toHaveBeenCalled();
  expect(onDone).toHaveBeenCalledTimes(1);
});
