import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { createInstance } from "i18next";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { KitchenMealEditor } from "../screens/KitchenMealEditor";
import type { Meal } from "../features/kitchen/kitchen";
import en from "../i18n/locales/en";
import fr from "../i18n/locales/fr";
import de from "../i18n/locales/de";
import es from "../i18n/locales/es";
import itLocale from "../i18n/locales/it";
import da from "../i18n/locales/da";
const mocks = vi.hoisted(() => ({ language: "fr", t: (key: string) => key }));
vi.mock("react-native", () => ({ View: "View", Switch: "Switch", Pressable: "Pressable", StyleSheet: { create: (styles: unknown) => styles } }));
vi.mock("lucide-react-native", () => ({ ChevronDown: "ChevronDown" }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: mocks.t, i18n: { language: mocks.language } }) }));
vi.mock("../theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: {} }) }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/SegmentedControl", () => ({ SegmentedControl: "Segments" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../screens/StockExpiryField", () => ({ StockExpiryField: "Date" }));
const resources = { en, fr, de, es, it: itLocale, da };
let screen: ReactTestRenderer;
beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterEach(async () => { await act(async () => screen?.unmount()); vi.unstubAllGlobals(); });
it.each(Object.keys(resources))("keeps meal options visible and the note optional in %s", async (language) => {
  mocks.language = language;
  const i18n = createInstance();
  await i18n.init({ lng: language, fallbackLng: false, resources, interpolation: { escapeValue: false } });
  mocks.t = (key: string) => String(i18n.t(key));
  const meal: Meal = { id: "draft", kind: "simple", title: "", recipeId: "", date: "2026-10-24", slot: "lunch", servings: 1, completed: true };
  await act(async () => { screen = create(React.createElement(KitchenMealEditor, { meal, onChange: vi.fn(), recipes: [], servings: "1", onServings: vi.fn(), ingredients: "", onIngredients: vi.fn(), history: true, today: "2026-10-24", busy: false, onChooseRecipe: vi.fn(), onSave: vi.fn() })); });
  expect(screen.root.findAll((node) => String(node.type) === "Input" && node.props.label === mocks.t("kitchen.servings"))).toHaveLength(0);
  expect(screen.root.findAllByType("Segments" as never)).toHaveLength(1);
  expect(screen.root.findAllByType("Switch" as never)).toHaveLength(1);
  const note = screen.root.findAll((node) => String(node.type) === "Button" && node.props.label === mocks.t("kitchen.addMealNote"))[0];
  expect(note.props.fillAvailableSpace).toBe(true);
  await act(async () => note.props.onPress());
  expect(screen.root.findAll((node) => String(node.type) === "Input" && node.props.label === mocks.t("kitchen.mealNotes"))).toHaveLength(1);
});

it.each(["out", "leftovers"] as const)("keeps %s meals focused on name, date and slot without recipe or portion controls", async (kind) => {
  mocks.t = (key: string) => key;
  const onSave = vi.fn();
  await act(async () => { screen = create(React.createElement(KitchenMealEditor, {
    meal: { id: "draft", kind, title: "Repas", recipeId: "", date: "2026-10-24", slot: "lunch", servings: 1 },
    onChange: vi.fn(), recipes: [], servings: "1", onServings: vi.fn(), ingredients: "", onIngredients: vi.fn(), history: false, today: "2026-10-24", busy: false, onChooseRecipe: vi.fn(), onSave,
  })); });
  expect(screen.root.findAllByType("Input" as never)).toHaveLength(1);
  expect(screen.root.findAllByType("Switch" as never)).toHaveLength(1);
  const buttons = screen.root.findAll((node) => String(node.type) === "Button");
  expect(buttons.map((node) => node.props.label)).toEqual(["kitchen.linkRecipe", "kitchen.addMealNote", "common.save"]);
  const save = buttons.find((node) => node.props.label === "common.save")!;
  expect(save.props.disabled).toBe(false);
  await act(async () => save.props.onPress());
  expect(onSave).toHaveBeenCalledOnce();
});

it("keeps every form action full width and allows removing a recipe without losing the meal name", async () => {
  mocks.t = (key: string) => key;
  const onChange = vi.fn();
  await act(async () => { screen = create(React.createElement(KitchenMealEditor, {
    meal: { id: "draft", kind: "recipe", title: "Soupe en famille", recipeId: "r", date: "2026-10-24", slot: "lunch", servings: 2 },
    onChange, recipes: [{ id: "r", name: "Soupe" } as never], servings: "2", onServings: vi.fn(), ingredients: "", onIngredients: vi.fn(), history: false, today: "2026-10-24", busy: false, onChooseRecipe: vi.fn(), onSave: vi.fn(), onDelete: vi.fn(),
  })); });
  const buttons = screen.root.findAll((node) => String(node.type) === "Button");
  for (const button of buttons) {
    expect(button.props.fillAvailableSpace).toBe(true);
    expect(button.props.numberOfLines).toBe(0);
  }
  await act(async () => buttons.find((node) => node.props.label === "kitchen.unlinkRecipe")!.props.onPress());
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ kind: "simple", title: "Soupe en famille", recipeId: "", linkedRecipeId: undefined }));
});
