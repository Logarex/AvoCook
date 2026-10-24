import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StockQuickAdd } from "../screens/StockQuickAdd";
import { emptyKitchen, type KitchenData } from "../features/kitchen/kitchen";
const mocks = vi.hoisted(() => ({ data: {} as KitchenData, update: vi.fn(), alert: vi.fn() }));
vi.mock("react-native", () => ({ View: "View", Alert: { alert: mocks.alert } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("../components/AppSheet", () => ({ AppSheet: "Sheet" }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/SegmentedControl", () => ({ SegmentedControl: "Segments" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../features/kitchen/KitchenProvider", () => ({ useKitchen: () => ({ data: mocks.data, ready: true, update: mocks.update }) }));
let screen: ReactTestRenderer;
const onClose = vi.fn();
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.clearAllMocks(); mocks.data = emptyKitchen(); mocks.update.mockImplementation(async (change: (data: KitchenData) => KitchenData) => { mocks.data = change(mocks.data); }); });
afterEach(async () => { await act(async () => screen?.unmount()); vi.unstubAllGlobals(); });
async function render(text: string) {
  await act(async () => { screen = create(React.createElement(StockQuickAdd, { location: "fridge", onClose })); });
  await act(async () => screen.root.findByType("Input" as never).props.onChangeText(text));
}
it("saves a whole list in one operation, preserves existing batches and does not invent quantities or dates", async () => {
  mocks.data.stock = [{ id: "old", name: "Œufs", quantity: "6", expires: "2026-10-22", location: "fridge" }];
  await render("Eggs\nTomates, Yaourts");
  expect(screen.root.findAll((node) => String(node.type) === "Text" && node.props.accessibilityLiveRegion === "polite")).toHaveLength(1);
  await act(async () => screen.root.findByType("Segments" as never).props.onChange("cupboard"));
  const save = screen.root.findByType("Button" as never).props.onPress;
  await act(async () => { save(); save(); });
  expect(mocks.update).toHaveBeenCalledTimes(1);
  expect(mocks.data.stock[0]).toMatchObject({ id: "old", expires: "2026-10-22", quantity: "6" });
  expect(mocks.data.stock.slice(1).map(({ name, quantity, expires, location }) => ({ name, quantity, expires, location }))).toEqual(["Eggs", "Tomates", "Yaourts"].map((name) => ({ name, quantity: "", expires: "", location: "cupboard" })));
  expect(new Set(mocks.data.stock.map(({ id }) => id)).size).toBe(4);
  expect(onClose).toHaveBeenCalledTimes(1);
});
it("preserves the typed list and keeps the sheet open after a failed write", async () => {
  mocks.update.mockRejectedValueOnce(new Error("Disk full"));
  await render("Pain\nLait");
  await act(async () => screen.root.findByType("Button" as never).props.onPress());
  expect(onClose).not.toHaveBeenCalled();
  expect(mocks.data.stock).toEqual([]);
  expect(screen.root.findByType("Input" as never).props.value).toBe("Pain\nLait");
  expect(mocks.alert).toHaveBeenCalledWith("common.error", "kitchen.saveError");
});
it("rejects empty and oversized lists before saving", async () => {
  await render(" , \n");
  expect(screen.root.findByType("Button" as never).props.disabled).toBe(true);
  await act(async () => screen.root.findByType("Input" as never).props.onChangeText(Array.from({ length: 101 }, (_, i) => `Food ${i}`).join("\n")));
  expect(screen.root.findByType("Button" as never).props.disabled).toBe(true);
  expect(mocks.update).not.toHaveBeenCalled();
});
