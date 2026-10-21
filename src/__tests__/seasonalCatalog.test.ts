import { describe, expect, it } from "vitest";
import { createInstance } from "i18next";
import { emptyKitchen, parseKitchenData } from "../features/kitchen/kitchen";
import {
  foodsInSeason,
  seasonalFoods,
  seasonalIngredientId,
  seasonalRecipes,
} from "../features/kitchen/seasonal";
import {
  SEASONAL_AREA_IDS,
  seasonalAreas,
} from "../features/kitchen/seasonalAreas";
import { createEmptyRecipe } from "../features/recipes/types";
import fr from "../i18n/locales/fr";
import en from "../i18n/locales/en";
import de from "../i18n/locales/de";
import es from "../i18n/locales/es";
import itLocale from "../i18n/locales/it";
import da from "../i18n/locales/da";
const ids = (area: string, month: number) =>
  foodsInSeason(area, month).map((food) => food.id);
describe("sourced seasonal catalogs", () => {
  it("covers eleven explicitly named countries without inferring regions", () => {
    expect(new Set(seasonalAreas.map((area) => area.country)).size).toBe(11);
    expect(seasonalAreas.map((area) => area.id)).toEqual([
      ...SEASONAL_AREA_IDS,
    ]);
    for (const unsupported of [
      undefined,
      "other",
      "NZ",
      "CA",
      "US",
      "AU",
      "BE",
      "US-FL",
    ]) {
      expect(foodsInSeason(unsupported, 10)).toEqual([]);
    }
    for (const month of [0, 13, 1.5, NaN, Infinity])
      expect(foodsInSeason("FR", month)).toEqual([]);
  });
  it.each(seasonalAreas)(
    "has valid, unique entries and nonempty monthly choices in $id",
    (area) => {
      const foodIds = new Set(seasonalFoods.map((food) => food.id));
      expect(new Set(area.entries.map((entry) => entry.food)).size).toBe(
        area.entries.length,
      );
      expect(area.sourceUrl).toMatch(/^https:\/\//);
      expect(area.reviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const entry of area.entries) {
        expect(foodIds.has(entry.food)).toBe(true);
        expect(entry.months.length).toBeGreaterThan(0);
        expect(entry.months).toEqual(
          [...new Set(entry.months)].sort((a, b) => a - b),
        );
        expect(
          entry.months.every(
            (month) => Number.isInteger(month) && month >= 1 && month <= 12,
          ),
        ).toBe(true);
        expect(
          (entry.storageMonths ?? []).every((month) =>
            entry.months.includes(month),
          ),
        ).toBe(true);
      }
      for (let month = 1; month <= 12; month++) {
        const foods = foodsInSeason(area.id, month);
        expect(
          foods.some((food) => food.category === "fruit"),
          `${area.id}/${month}: fruit`,
        ).toBe(true);
        expect(
          foods.some((food) => food.category === "vegetable"),
          `${area.id}/${month}: vegetables`,
        ).toBe(true);
      }
      expect(
        parseKitchenData({ ...emptyKitchen(), country: area.id }).country,
      ).toBe(area.id);
    },
  );
  it("preserves legacy preferences and rejects unverified backup areas", () => {
    expect(
      parseKitchenData({ ...emptyKitchen(), country: "other" }).country,
    ).toBe("other");
    expect(parseKitchenData(emptyKitchen()).country).toBeUndefined();
    expect(() =>
      parseKitchenData({ ...emptyKitchen(), country: "US-FL" }),
    ).toThrow();
  });
  it("preserves meaningful differences between sources and hemispheres", () => {
    expect(ids("FR", 8)).toContain("apricot");
    expect(ids("BE-WAL", 8)).toContain("greenBeans");
    expect(ids("FR", 10)).not.toContain("tomato");
    expect(ids("IT", 10)).toContain("tomato");
    expect(ids("AU-SYD", 1)).toContain("peach");
    expect(ids("US-NY", 1)).not.toContain("peach");
    expect(ids("US-NY", 7)).toContain("peach");
    expect(ids("CA-ON", 1)).not.toContain("strawberry"); // Exclude greenhouse-only row.
    expect(ids("ES", 1)).toContain("tomato"); // Explicit commercial-availability basis.
    expect(
      foodsInSeason("BE-WAL", 1).find((food) => food.id === "apple")?.storage,
    ).toBe(true);
    expect(
      foodsInSeason("CH", 8).find((food) => food.id === "apple")?.storage,
    ).toBe(false);
    expect(ids("DE", 12)).not.toContain("strawberry"); // Small supply is not the main-season selection.
  });
  it.each([
    ["2 pommes de terre nouvelles", "potato"],
    ["2 pommes Golden", "apple"],
    ["250 g tomates fraîches", "tomato"],
    ["200 g green beans", "greenBeans"],
    ["1 red cabbage", "redCabbage"],
    ["200 g chou fleur", "cauliflower"],
    ["200 g choux-fleurs", "cauliflower"],
    ["200 g céleri rave", "celeriac"],
    ["200 g choux de Bruxelles", "brusselsSprouts"],
    ["2 fresh tomatoes", "tomato"],
    ["200 g Karotten", "carrot"],
    ["2 patatas", "potato"],
    ["200 g pomodori", "tomato"],
    ["2 gulerødder", "carrot"],
    ["20 g jus de pomme", undefined],
    ["tomato juice", undefined],
    ["400 g canned tomatoes", undefined],
    ["tomates surgelées", undefined],
    ["200 g sauce tomate", undefined],
    ["pommegrenade", undefined],
  ])("identifies fresh produce conservatively in %s", (line, id) => {
    expect(seasonalIngredientId(line)).toBe(id);
  });
  it("recognizes its own ingredient aliases without confusing longer produce names", () => {
    for (const food of seasonalFoods) {
      for (const name of food.names)
        expect(seasonalIngredientId(name), `${food.id}: ${name}`).toBe(food.id);
    }
  });
  it("matches ingredients, applies selection and never calls a whole recipe seasonal", () => {
    const recipe = (id: string, name: string, lines: string[]) => ({
      ...createEmptyRecipe(),
      id,
      name,
      recipeIngredient: lines,
    });
    const recipes = [
      recipe("a", "Tomato title", ["2 pommes"]),
      recipe("b", "Mash", ["2 pommes de terre nouvelles"]),
      recipe("c", "Apple pie", ["200 g farine"]),
      recipe("d", "Sauce", ["400 g canned tomatoes"]),
    ];
    expect(
      seasonalRecipes(recipes, "FR", 10, ["apple"]).map(
        (result) => result.recipe.id,
      ),
    ).toEqual(["a"]);
    expect(
      seasonalRecipes(recipes, "FR", 10, ["potato"]).map(
        (result) => result.recipe.id,
      ),
    ).toEqual([]); // Not listed in the French selection.
    expect(
      seasonalRecipes(recipes, "CH", 10, ["potato"]).map(
        (result) => result.recipe.id,
      ),
    ).toEqual(["b"]);
  });
  it.each(Object.entries({ fr, en, de, es, it: itLocale, da }))(
    "translates every food, area and source basis in %s",
    async (language, resource) => {
      const i18n = createInstance();
      await i18n.init({
        lng: language,
        fallbackLng: false,
        resources: { [language]: resource },
      });
      for (const key of [
        ...seasonalFoods.map((food) => `kitchen.food_${food.id}`),
        ...seasonalAreas.flatMap((area) => [
          `kitchen.area_${area.id}`,
          `kitchen.seasonBasis_${area.basis}`,
        ]),
      ]) {
        expect(i18n.exists(key), `${language}: ${key}`).toBe(true);
        expect(i18n.t(key).trim()).not.toBe("");
      }
    },
  );
});
