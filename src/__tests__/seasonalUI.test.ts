import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInstance, type i18n } from "i18next";
import { KitchenSeasonalSection } from "../screens/KitchenSeasonalSection";
import { emptyKitchen, type KitchenData } from "../features/kitchen/kitchen";
import { createEmptyRecipe } from "../features/recipes/types";
import { seasonalAreas } from "../features/kitchen/seasonalAreas";
import fr from "../i18n/locales/fr";
import en from "../i18n/locales/en";
import de from "../i18n/locales/de";
import es from "../i18n/locales/es";
import itLocale from "../i18n/locales/it";
import da from "../i18n/locales/da";
const resources = { fr, en, de, es, it: itLocale, da };
const mocks = vi.hoisted(() => ({
  data: {} as KitchenData,
  account: "local",
  ready: true,
  shoppingLoading: false,
  switching: false,
  day: "2026-10-21",
  i18n: null as i18n | null,
  update: vi.fn(),
  add: vi.fn(),
  link: vi.fn(),
  missing: new Set<string>(),
}));
function translate(key: string, options: Record<string, unknown> = {}) {
  if (!mocks.i18n!.exists(key)) mocks.missing.add(key);
  return mocks.i18n!.t(key, options);
}
vi.mock("react-native", () => ({
  View: "View",
  Pressable: "Pressable",
  StyleSheet: { create: (styles: unknown) => styles },
  Linking: { openURL: mocks.link },
}));
vi.mock("lucide-react-native", () => ({ Check: "Check" }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: translate, i18n: mocks.i18n }),
}));
vi.mock("../theme/ThemeProvider", () => ({
  useAppTheme: () => ({
    colors: {
      primary: "green",
      border: "gray",
      chip: "lightgreen",
      backgroundElevated: "white",
    },
  }),
}));
vi.mock("../features/kitchen/useLocalDay", () => ({
  useLocalDay: () => mocks.day,
}));
vi.mock("../features/kitchen/KitchenProvider", () => ({
  useKitchen: () => ({
    data: mocks.data,
    account: mocks.account,
    ready: mocks.ready,
    update: mocks.update,
  }),
}));
vi.mock("../features/recipes/RecipesProvider", () => ({
  useRecipes: () => ({
    recipes: [
      {
        ...createEmptyRecipe(),
        id: "apple",
        name: "Apple meal",
        recipeIngredient: ["2 pommes"],
      },
      {
        ...createEmptyRecipe(),
        id: "carrot",
        name: "Carrot meal",
        recipeIngredient: ["2 carottes"],
      },
    ],
  }),
}));
vi.mock("../features/shopping/ShoppingListProvider", () => ({
  useShoppingList: () => ({
    addIngredients: mocks.add,
    loading: mocks.shoppingLoading,
    switching: mocks.switching,
  }),
}));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/ChoiceField", () => ({ ChoiceField: "Choice" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../components/GlassPanel", () => ({ GlassPanel: "Panel" }));
let screen: ReactTestRenderer | undefined;
const openRecipe = vi.fn();
function nodes(type: string) {
  return screen!.root.findAll((node) => String(node.type) === type);
}
function button(key: string) {
  return nodes("Button").find((node) => node.props.label === translate(key))!;
}
function choice(key: string) {
  return nodes("Choice").find((node) => node.props.label === translate(key))!;
}
function checkbox(id: string) {
  return nodes("Pressable").find(
    (node) => node.props.accessibilityLabel === translate(`kitchen.food_${id}`),
  )!;
}
function text() {
  return JSON.stringify(screen!.toJSON());
}
async function render() {
  await act(async () => {
    screen = create(
      React.createElement(KitchenSeasonalSection, { openRecipe }),
    );
  });
}
async function refresh() {
  await act(async () =>
    screen!.update(React.createElement(KitchenSeasonalSection, { openRecipe })),
  );
}
async function change(key: string, value: string) {
  await act(async () => choice(key).props.onChange(value));
}
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  mocks.account = "local";
  mocks.data = { ...emptyKitchen(), country: "FR" };
  mocks.ready = true;
  mocks.shoppingLoading = false;
  mocks.switching = false;
  mocks.day = "2026-10-21";
  mocks.i18n = createInstance();
  await mocks.i18n.init({ lng: "fr", fallbackLng: false, resources });
  mocks.missing.clear();
  mocks.update.mockImplementation(
    async (update: (data: KitchenData) => KitchenData) => {
      mocks.data = update(mocks.data);
    },
  );
  mocks.add.mockResolvedValue({ added: [{ label: "Pomme" }], items: [] });
  mocks.link.mockResolvedValue(undefined);
});
afterEach(async () => {
  if (screen) await act(async () => screen!.unmount());
  screen = undefined;
  vi.unstubAllGlobals();
});
describe("seasonal everyday interface", () => {
  it.each(Object.keys(resources))(
    "browses every supported place in %s with no missing translated labels",
    async (language) => {
      await mocks.i18n!.changeLanguage(language);
      await render();
      await act(async () => button("kitchen.seasonAbout").props.onPress());
      for (const area of seasonalAreas) {
        await change("kitchen.seasonPlace", area.id);
        expect(mocks.data.country).toBe(area.id);
        expect(nodes("Pressable").length).toBeGreaterThan(0);
        expect(text()).toContain(area.source);
      }
      expect(mocks.missing.size).toBe(0);
      expect(mocks.add).not.toHaveBeenCalled();
      expect(mocks.link).not.toHaveBeenCalled();
    },
  );
  it("reports first-setup persistence failures instead of silently leaving the picker empty", async () => {
    mocks.data = emptyKitchen();
    mocks.update.mockRejectedValueOnce(new Error("Disk unavailable"));
    await render();
    await change("kitchen.seasonPlace", "FR");
    expect(text()).toContain(translate("kitchen.saveError"));
    expect(choice("kitchen.seasonPlace").props.disabled).toBe(false);
    expect(mocks.data.country).toBeUndefined();
  });
  it("keeps the selection available when shopping is still loading and reports duplicates", async () => {
    mocks.shoppingLoading = true;
    await render();
    await act(async () => checkbox("apple").props.onPress());
    expect(button("kitchen.seasonBuy").props.disabled).toBe(true);
    expect(mocks.add).not.toHaveBeenCalled();
    mocks.shoppingLoading = false;
    mocks.add.mockResolvedValueOnce({ added: [], items: [] });
    await refresh();
    await act(async () => button("kitchen.seasonBuy").props.onPress());
    expect(text()).toContain(translate("kitchen.seasonAlreadyAdded"));
  });
  it("requires an explicit area and explains unsupported places", async () => {
    mocks.data = emptyKitchen();
    await render();
    expect(nodes("Pressable")).toHaveLength(0);
    expect(text()).toContain(translate("kitchen.seasonChoosePlace"));
    await change("kitchen.seasonPlace", "US-NY");
    expect(nodes("Pressable").length).toBeGreaterThan(0);
    await change("kitchen.seasonPlace", "other");
    expect(nodes("Pressable")).toHaveLength(0);
    expect(text()).toContain(translate("kitchen.seasonChoosePlace"));
    expect(mocks.add).not.toHaveBeenCalled();
  });
  it("filters localized products while preserving an explicit selection, then adds only that selection", async () => {
    await render();
    await act(async () => checkbox("apple").props.onPress());
    expect(mocks.add).not.toHaveBeenCalled();
    expect(text()).not.toContain("Carrot meal");
    await act(async () =>
      button("kitchen.seasonFilter_vegetable").props.onPress(),
    );
    expect(checkbox("apple")).toBeUndefined();
    await act(async () => nodes("Input")[0].props.onChangeText("épin"));
    expect(nodes("Pressable")).toHaveLength(1);
    await act(async () => button("kitchen.seasonBuy").props.onPress());
    expect(mocks.add).toHaveBeenCalledWith([translate("kitchen.food_apple")]);
    expect(text()).toContain(translate("kitchen.seasonAdded", { count: 1 }));
  });
  it("clears selections on month and area changes, including returning to the previous month", async () => {
    await render();
    await act(async () => checkbox("apple").props.onPress());
    await change("kitchen.month", "1");
    expect(button("kitchen.seasonBuy")).toBeUndefined();
    await change("kitchen.month", "10");
    expect(checkbox("apple").props.accessibilityState.checked).toBe(false);
    await act(async () => checkbox("apple").props.onPress());
    await change("kitchen.seasonPlace", "DE");
    expect(button("kitchen.seasonBuy")).toBeUndefined();
  });
  it("returns to the real current month and follows a foreground month rollover", async () => {
    await render();
    await change("kitchen.month", "1");
    await act(async () => button("kitchen.seasonCurrentMonth").props.onPress());
    expect(choice("kitchen.month").props.value).toBe("10");
    mocks.day = "2026-11-01";
    await refresh();
    expect(choice("kitchen.month").props.value).toBe("11");
  });
  it("opens an existing recipe and sources only on request", async () => {
    await render();
    const recipeButton = nodes("Button").find((node) =>
      node.props.label.startsWith("Apple meal"),
    )!;
    await act(async () => recipeButton.props.onPress());
    expect(openRecipe).toHaveBeenCalledWith("apple");
    expect(mocks.link).not.toHaveBeenCalled();
    expect(text()).not.toContain(seasonalAreas[0].source);
    await act(async () => button("kitchen.seasonAbout").props.onPress());
    await act(async () =>
      nodes("Button")
        .find(
          (node) =>
            node.props.label ===
            translate("kitchen.seasonOpenSource", { index: 1 }),
        )!
        .props.onPress(),
    );
    expect(mocks.link).toHaveBeenCalledWith(seasonalAreas[0].sourceUrl);
  });
  it("locks duplicate shopping requests and keeps the selection when adding fails", async () => {
    let reject: (error: Error) => void = () => {};
    mocks.add.mockReturnValue(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    await render();
    await act(async () => checkbox("apple").props.onPress());
    const press = button("kitchen.seasonBuy").props.onPress;
    await act(async () => {
      press();
      press();
    });
    expect(mocks.add).toHaveBeenCalledTimes(1);
    expect(button("kitchen.seasonBuy").props.disabled).toBe(true);
    await act(async () => reject(new Error("Unavailable")));
    expect(checkbox("apple").props.accessibilityState.checked).toBe(true);
    expect(text()).toContain(translate("kitchen.saveError"));
  });
  it("resets private selections when the account changes", async () => {
    await render();
    await act(async () => checkbox("apple").props.onPress());
    mocks.account = "another-account";
    await refresh();
    expect(checkbox("apple").props.accessibilityState.checked).toBe(false);
  });
});
