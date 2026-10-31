import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { createInstance } from "i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KitchenHistorySection } from "../screens/KitchenHistorySection";
import { filterKitchenHistory, parseHistorySearch } from "../features/kitchen/history";
import type { KitchenHistoryEntry } from "../features/kitchen/history";
import en from "../i18n/locales/en";
import fr from "../i18n/locales/fr";
import de from "../i18n/locales/de";
import es from "../i18n/locales/es";
import itLocale from "../i18n/locales/it";
import da from "../i18n/locales/da";

const mocks = vi.hoisted(() => ({ language: "fr", t: (key: string) => key }));
vi.mock("react-native", () => ({ View: "View", Pressable: "Pressable" }));
vi.mock("../components/DisclosureSection", () => ({ DisclosureSection: "Disclosure" }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: mocks.t, i18n: { language: mocks.language } }) }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/GlassPanel", () => ({ GlassPanel: "Panel" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/SegmentedControl", () => ({ SegmentedControl: "Segments" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../screens/StockExpiryField", () => ({ StockExpiryField: "Date" }));
const resources = { en, fr, de, es, it: itLocale, da };
const searches = [
  ["fr", "Déjeuner du 30/10/2025"],
  ["en", "Lunch on 30/10/2025"],
  ["de", "Mittagessen am 30.10.2025"],
  ["es", "Almuerzo del 30/10/2025"],
  ["it", "Pranzo del 30/10/2025"],
  ["da", "Frokost den 30.10.2025"],
] as const;
const entries: KitchenHistoryEntry[] = [
  ["target", "2025-10-30", "lunch"], ["dinner", "2025-10-30", "dinner"], ["other-day", "2025-10-31", "lunch"],
].map(([id, date, slot]) => ({ id, date, meal: { id, date, slot: slot as "lunch" | "dinner", kind: "simple", title: id, notes: id === "target" ? "Pique-nique au jardin" : "Autre souvenir", recipeId: "", servings: 1, completed: true } }));
let screen: ReactTestRenderer;
beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterEach(async () => { await act(async () => screen?.unmount()); vi.unstubAllGlobals(); });
const actions = { onAdd: vi.fn(), onEdit: vi.fn(), onRepeat: vi.fn(), onRecipe: vi.fn(), onJournal: vi.fn() };
function panels() { return screen.root.findAll((node) => String(node.type) === "Panel"); }
async function render(language = "fr") {
  mocks.language = language;
  const i18n = createInstance();
  await i18n.init({ lng: language, fallbackLng: false, resources, interpolation: { escapeValue: false } });
  mocks.t = (key: string) => String(i18n.t(key));
  await act(async () => { screen = create(React.createElement(KitchenHistorySection, { entries, ...actions })); });
}
describe("meal journal in all six languages", () => {
  it.each(searches)("finds the precise lunch by date in %s and shows its year and personal note", async (language, query) => {
    await render(language);
    const search = screen.root.findByType("Input" as never);
    expect(search.props.label).not.toContain("kitchen.");
    expect(search.props.placeholder).not.toContain("kitchen.");
    await act(async () => search.props.onChangeText(query));
    expect(panels()).toHaveLength(1);
    const texts = panels()[0].findAll((node) => String(node.type) === "Text").map((node) => String(node.props.children));
    expect(texts).toContain("target");
    expect(texts.join(" ")).toContain("2025");
    expect(texts).toContain("Pique-nique au jardin");
  });
  it.each(Object.keys(resources))("filters with visible date and meal controls, then clears them in %s", async (language) => {
    await render(language);
    await act(async () => screen.root.findByType("Date" as never).props.onChange("2025-10-30"));
    await act(async () => screen.root.findByType("Segments" as never).props.onChange("lunch"));
    expect(panels()).toHaveLength(1);
    const reset = screen.root.findAll((node) => String(node.type) === "Button" && node.props.label === mocks.t("kitchen.clearHistorySearch"))[0];
    await act(async () => reset.props.onPress());
    expect(panels()).toHaveLength(3);
    expect(screen.root.findByType("Date" as never).props.value).toBe("");
    expect(screen.root.findByType("Segments" as never).props.value).toBe("all");
  });
  it.each(Object.keys(resources))("reports invalid dates and recognizes localized lunch and dinner in %s", async (language) => {
    await render(language);
    await act(async () => screen.root.findByType("Input" as never).props.onChangeText(`${mocks.t("kitchen.lunch")} 31/02/2025`));
    expect(filterKitchenHistory(entries, `${mocks.t("kitchen.lunch")} 30/10/2025`)[0].id).toBe("target");
    expect(filterKitchenHistory(entries, `${mocks.t("kitchen.dinner")} 30/10/2025`)[0].id).toBe("dinner");
    expect(panels()).toHaveLength(0);
    expect(screen.root.findAll((node) => String(node.type) === "Text" && node.props.accessibilityRole === "alert")).toHaveLength(1);
    expect(parseHistorySearch("Dîner du 29/02/2024")).toMatchObject({ invalidDate: false, date: "2024-02-29", slots: ["dinner"], text: "" });
    expect(filterKitchenHistory(entries, "Déjeuner 2025-10-30")).toHaveLength(1);
    expect(filterKitchenHistory(entries, "pique nique")).toHaveLength(0);
    expect(filterKitchenHistory(entries, "JARDIN")).toHaveLength(1);
  });
});
