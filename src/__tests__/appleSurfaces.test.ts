import { describe, expect, it, vi } from "vitest";
import { parseAppLink } from "../features/linking/appLinks";
import { todayWidgetSnapshot } from "../features/kitchen/widgetSnapshot";
import { emptyKitchen } from "../features/kitchen/kitchen";
import { normalizeRecipe } from "../features/recipes/types";

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("../features/kitchen/kitchenNative", () => ({ getKitchenNative: () => null }));

describe("avocook:// links", () => {
  it("opens recipes, today, stock and community screens", () => {
    expect(parseAppLink("avocook://recipe/12")).toEqual({ kind: "recipe", id: "12" });
    expect(parseAppLink("avocook://recipe/local%3Aabc")).toEqual({ kind: "recipe", id: "local:abc" });
    expect(parseAppLink("avocook://community/xyz")).toEqual({ kind: "community", id: "xyz" });
    expect(parseAppLink("AVOCOOK://today")).toEqual({ kind: "today" });
    expect(parseAppLink("avocook://stock/123")).toEqual({ kind: "stock" });
  });

  it("adds a trimmed, bounded item from Siri and ignores unrelated links", () => {
    expect(parseAppLink("avocook://shopping?add=%20%20Lait%20%20demi-%C3%A9cr%C3%A9m%C3%A9%20")).toEqual({ kind: "shopping", add: "Lait demi-écrémé" });
    expect(parseAppLink(`avocook://shopping?add=${"a".repeat(500)}`)).toEqual({ kind: "shopping", add: "a".repeat(200) });
    expect(parseAppLink("avocook://shopping?add=%20")).toEqual({ kind: "shopping" });
    expect(parseAppLink("avocook://dataUrl=avocookShareKey")).toBeNull();
    expect(parseAppLink("avocook://recipe/")).toBeNull();
    expect(parseAppLink("avocook://recipe/%E0%A4%A")).toBeNull();
    expect(parseAppLink("https://example.com/recipe/1")).toBeNull();
    expect(parseAppLink(null)).toBeNull();
  });
});

describe("Today widget snapshot", () => {
  const labels = { title: "Today", noMeal: "-", expiring: "Soon:", shopping: "to buy", lunch: "Lunch", dinner: "Dinner", empty: "", simple: "Simple meal", leftovers: "Leftovers", out: "Eating out" };
  const now = new Date("2026-11-01T09:00:00");

  it("lists today's meals in order with readable titles and only near expiry dates", () => {
    const data = {
      ...emptyKitchen(),
      meals: [
        { id: "d", date: "2026-11-01", slot: "dinner" as const, recipeId: "r1", servings: 2 },
        { id: "l", date: "2026-11-01", slot: "lunch" as const, recipeId: "", servings: 1, kind: "leftovers" as const },
        { id: "x", date: "2026-11-02", slot: "lunch" as const, recipeId: "r1", servings: 2 },
      ],
      stock: [
        { id: "a", name: "Yaourt", quantity: "", location: "fridge" as const, expires: "2026-11-03" },
        { id: "b", name: "Riz", quantity: "", location: "cupboard" as const, expires: "2027-01-01" },
        { id: "c", name: "Lait", quantity: "", location: "fridge" as const, expires: "2026-10-30" },
      ],
    };
    const snapshot = todayWidgetSnapshot(data, [{ id: "r1", name: "**Gratin** dauphinois" }], 4, labels, now);
    expect(snapshot.meals).toEqual([
      { slot: "lunch", title: "Leftovers", recipeId: null },
      { slot: "dinner", title: "Gratin dauphinois", recipeId: "r1" },
    ]);
    expect(snapshot.expiring).toEqual([{ name: "Yaourt", days: 2 }]);
    expect(snapshot).toMatchObject({ date: "2026-11-01", shopping: 4 });
    expect(snapshot.labels).not.toHaveProperty("simple");
  });
});

describe("Spotlight entries", () => {
  it("indexes only saved recipes with plain text and bounded keywords", async () => {
    const { spotlightEntries } = await import("../features/kitchen/appleIntegrations");
    const recipes = [
      normalizeRecipe({ id: "1", name: "*Tarte* aux pommes", description: "Dessert **facile**", keywords: "dessert, fruit", recipeCategory: "Desserts" }),
      normalizeRecipe({ id: null, name: "Brouillon" }),
    ];
    expect(spotlightEntries(recipes)).toEqual([
      { id: "1", title: "Tarte aux pommes", summary: "Dessert facile", keywords: ["dessert", "fruit", "Desserts"] },
    ]);
  });
});
