import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StockProductLookup } from "../screens/StockProductLookup";
const mocks = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("react-native", () => ({ View: "View", ActivityIndicator: "Spinner", StyleSheet: { create: (s: unknown) => s } }));
vi.mock("expo-modules-core", () => ({ requireOptionalNativeModule: () => null }));
vi.mock("lucide-react-native", () => ({ ScanBarcode: "Scan" }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: "fr" } }) }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: {} }) }));
vi.mock("../features/kitchen/foodProducts", () => ({ lookupFoodProduct: mocks.lookup }));
let screen: ReactTestRenderer;
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); });
afterEach(async () => { await act(async () => screen?.unmount()); vi.unstubAllGlobals(); });
function button(label: string) { return screen.root.findAll((n) => String(n.type) === "Button" && n.props.label === label)[0]; }
describe("stock product lookup", () => {
  it("keeps barcode entry available without native camera support and returns only a found product", async () => {
    const onProduct = vi.fn();
    const product = { barcode: "12345678", name: "Lait", quantity: "1 l" };
    mocks.lookup.mockResolvedValue(product);
    await act(async () => { screen = create(React.createElement(StockProductLookup, { onProduct })); });
    await act(async () => button("kitchen.scanProduct").props.onPress());
    await act(async () => screen.root.findByType("Input" as never).props.onChangeText("12345678"));
    await act(async () => button("kitchen.findProduct").props.onPress());
    expect(onProduct).toHaveBeenCalledExactlyOnceWith(product);
    expect(mocks.lookup).toHaveBeenCalledWith("12345678", "fr", expect.any(AbortSignal));
  });
  it("leaves the manual form untouched for an unknown product", async () => {
    const onProduct = vi.fn();
    mocks.lookup.mockResolvedValue(null);
    await act(async () => { screen = create(React.createElement(StockProductLookup, { onProduct, initiallyOpen: true })); });
    await act(async () => screen.root.findByType("Input" as never).props.onChangeText("12345678"));
    await act(async () => button("kitchen.findProduct").props.onPress());
    expect(onProduct).not.toHaveBeenCalled();
    expect(screen.root.findAll((n) => String(n.type) === "Text" && n.props.children === "kitchen.productNotFound")).toHaveLength(1);
  });
  it("aborts a lookup when leaving the form and ignores a late result", async () => {
    let complete!: (product: unknown) => void;
    mocks.lookup.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    const onProduct = vi.fn();
    await act(async () => { screen = create(React.createElement(StockProductLookup, { onProduct, initiallyOpen: true })); });
    await act(async () => screen.root.findByType("Input" as never).props.onChangeText("12345678"));
    act(() => { button("kitchen.findProduct").props.onPress(); });
    const signal = mocks.lookup.mock.calls[0][2] as AbortSignal;
    await act(async () => screen.unmount());
    expect(signal.aborted).toBe(true);
    await act(async () => complete({ name: "Lait" }));
    expect(onProduct).not.toHaveBeenCalled();
  });
});
