import { describe, expect, it, vi } from "vitest";
import {
  consolidateIngredients,
  convertKitchen,
  emptyJournal,
  emptyKitchen,
  localDate,
  mealIngredients,
  parseIngredient,
  parseKitchenData,
  rankRecipes,
  recipeMinutes,
  shiftDate,
  surpriseRecipe,
  validDate,
  weekDates,
  type StockItem,
} from "../features/kitchen/kitchen";
import {
  createKitchenStore,
  kitchenStorageKey,
} from "../features/kitchen/kitchenStore";
import { createEmptyRecipe } from "../features/recipes/types";
const recipe = (id: string, ingredients: string[]) => ({
  ...createEmptyRecipe(),
  id,
  name: id,
  recipeYield: 2,
  recipeIngredient: ingredients,
});
const stock = (name: string, expires = ""): StockItem => ({
  id: name,
  name,
  expires,
  quantity: "",
  location: "fridge",
});

describe("local kitchen", () => {
  it("builds Monday–Sunday weeks across DST, year boundaries and leap years", () => {
    expect(weekDates("2026-10-25")).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    expect(weekDates("2027-01-01")[0]).toBe("2026-12-28");
    expect(shiftDate("2024-02-28", 1)).toBe("2024-02-29");
    expect(localDate(new Date(2026, 0, 1, 0, 1))).toBe("2026-01-01");
  });
  it.each([
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-1-1",
    "foo",
    "2026-00-00",
  ])("rejects invalid date %s", (date) => expect(validDate(date)).toBe(false));
  it("parses decimals, fractions and French ingredient prefixes", () => {
    expect(parseIngredient("**250 g de farine**")).toMatchObject({
      amount: 250,
      unit: "g",
      key: "farine",
    });
    expect(parseIngredient("0,5 kg d’oignons")).toMatchObject({
      amount: 500,
      unit: "g",
      key: "oignon",
    });
    expect(parseIngredient("1 1/2 l lait")).toMatchObject({
      amount: 1500,
      unit: "ml",
      key: "lait",
    });
    expect(parseIngredient("½ l lait").amount).toBe(500);
    expect(parseIngredient("2 œufs").key).toBe("oeuf");
  });
  it("consolidates compatible units and counts repeated recipe occurrences", () => {
    expect(
      consolidateIngredients([
        { line: "250 g de farine" },
        { line: "0,5 kg farine" },
        { line: "2 œufs" },
        { line: "1 œuf" },
      ]),
    ).toEqual(["750 g farine", "3 œufs"]);
    expect(
      consolidateIngredients([{ line: "10 cl lait" }, { line: "200 ml lait" }]),
    ).toEqual(["300 ml lait"]);
  });
  it("keeps distinct foods, dimensions, opaque amounts and ranges separate", () => {
    expect(
      consolidateIngredients([
        { line: "100 g farine" },
        { line: "100 ml farine" },
        { line: "100 g farine complète" },
        { line: "1 cup flour" },
        { line: "20-30 g sucre" },
      ]),
    ).toHaveLength(5);
    expect(parseIngredient("20-30 g sucre").amount).toBeNull();
    expect(parseIngredient("1/0 l lait").amount).toBeNull();
    expect(consolidateIngredients([{ line: "sel" }, { line: "sel" }])).toEqual([
      "sel (×2)",
    ]);
    expect(
      consolidateIngredients([{ line: "1 cup flour", factor: 2 }]),
    ).toEqual(["2 × (1 cup flour)"]);
  });
  it("scales every meal occurrence independently and tolerates deleted recipes", () => {
    const meals = [1, 2].map((i) => ({
      id: String(i),
      date: "2026-10-18",
      slot: "dinner" as const,
      recipeId: "a",
      servings: 4,
    }));
    expect(mealIngredients(meals, [recipe("a", ["100 g farine"])])).toEqual([
      "400 g farine",
    ]);
    expect(mealIngredients(meals, [])).toEqual([]);
  });
  it("excludes past dates, ranks fewer missing ingredients first, then urgent foods", () => {
    const recipes = [
      recipe("a", ["2 œufs"]),
      recipe("b", ["1 courgette"]),
      recipe("c", ["1 courgette", "200 g fromage"]),
      recipe("empty", []),
    ];
    const results = rankRecipes(
      recipes,
      [
        stock("œufs"),
        stock("courgettes", "2026-10-19"),
        stock("fromage", "2026-10-17"),
      ],
      "2026-10-18",
    );
    expect(results.map((result) => result.recipe.id)).toEqual(["b", "a", "c"]);
    expect(results[2].missing).toEqual(["200 g fromage"]);
    expect(
      rankRecipes(
        [recipe("a", ["1 oeuf"])],
        [stock("oeuf", "2026-10-18")],
        "2026-10-18",
      )[0].missing,
    ).toEqual([]);
  });
  it("never matches ingredient substrings or silently equates different foods", () => {
    expect(
      rankRecipes(
        [recipe("a", ["100 g farine de blé", "20 g beurre salé"])],
        [stock("farine"), stock("beurre")],
        "2026-10-18",
      )[0].missing,
    ).toHaveLength(2);
  });
  it("converts within dimensions only and supports negative temperatures", () => {
    expect(convertKitchen(500, "g", "kg")).toBe(0.5);
    expect(convertKitchen(2, "tbsp", "ml")).toBe(30);
    expect(convertKitchen(-40, "°C", "°F")).toBe(-40);
    expect(convertKitchen(32, "°F", "°C")).toBe(0);
    expect(convertKitchen(100, "g", "ml")).toBeNull();
    expect(convertKitchen(Infinity, "g", "kg")).toBeNull();
    expect(convertKitchen(-1, "g", "kg")).toBeNull();
  });
  it("only uses known recipe durations and handles an empty surprise pool", () => {
    expect(recipeMinutes(recipe("a", []))).toBeNull();
    expect(
      recipeMinutes({
        ...recipe("a", []),
        prepTime: "PT10M",
        cookTime: "PT20M",
      }),
    ).toBe(30);
    expect(surpriseRecipe([])).toBeUndefined();
    expect(surpriseRecipe([recipe("a", [])])?.id).toBe("a");
  });
  it("validates persisted records rather than resetting corrupt data", () => {
    expect(parseKitchenData(emptyKitchen())).toEqual(emptyKitchen());
    expect(() => parseKitchenData({ ...emptyKitchen(), version: 2 })).toThrow();
    expect(() =>
      parseKitchenData({
        ...emptyKitchen(),
        stock: [stock("a", "2026-02-30")],
      }),
    ).toThrow();
    expect(() =>
      parseKitchenData({
        ...emptyKitchen(),
        journals: { a: { ...emptyJournal(), rating: 6 } },
      }),
    ).toThrow();
    expect(() =>
      parseKitchenData({
        ...emptyKitchen(),
        journals: {
          a: {
            ...emptyJournal(),
            stepTimers: [{ id: "step-2", step: 1, minutes: 1 }],
          },
        },
      }),
    ).toThrow();
  });
});

describe("kitchen persistence", () => {
  const storage = () => ({
    getItem: vi.fn(async (_key: string): Promise<string | null> => null),
    setItem: vi.fn(async (_key: string, _value: string) => {}),
  });
  it("queues rapid edits against the latest committed state", async () => {
    const disk = storage();
    const store = createKitchenStore(disk, "local");
    await store.load();
    await Promise.all(
      ["one", "two", "three"].map((name) =>
        store.update((data) => ({
          ...data,
          stock: [...data.stock, stock(name)],
        })),
      ),
    );
    expect(store.getSnapshot().data.stock.map((item) => item.name)).toEqual([
      "one",
      "two",
      "three",
    ]);
    expect(
      JSON.parse(disk.setItem.mock.calls[disk.setItem.mock.calls.length - 1][1])
        .stock,
    ).toHaveLength(3);
  });
  it("does not publish a failed write and permits retries", async () => {
    const disk = storage();
    const store = createKitchenStore(disk, "local");
    await store.load();
    disk.setItem.mockRejectedValueOnce(new Error("disk full"));
    await expect(
      store.update((data) => ({ ...data, stock: [stock("egg")] })),
    ).rejects.toThrow();
    expect(store.getSnapshot().data.stock).toEqual([]);
    await store.update((data) => ({ ...data, stock: [stock("milk")] }));
    expect(store.getSnapshot().data.stock[0].name).toBe("milk");
  });
  it("blocks writes after a failed read or corrupt JSON until a successful reload", async () => {
    const disk = storage();
    disk.getItem.mockResolvedValueOnce("{");
    const store = createKitchenStore(disk, "local");
    await expect(store.load()).rejects.toThrow();
    expect(store.getSnapshot()).toMatchObject({ ready: false, error: true });
    await expect(store.update(emptyKitchen)).rejects.toThrow();
    expect(disk.setItem).not.toHaveBeenCalled();
    await store.load();
    expect(store.getSnapshot().ready).toBe(true);
  });
  it("scopes keys by account and restores saved data", async () => {
    expect(kitchenStorageKey("a/b")).not.toBe(kitchenStorageKey("a%2Fb"));
    const disk = storage();
    disk.getItem.mockResolvedValue(
      JSON.stringify({ ...emptyKitchen(), stock: [stock("apple")] }),
    );
    const first = createKitchenStore(disk, "account-a"),
      second = createKitchenStore(disk, "account-b");
    await first.load();
    expect(first.getSnapshot().data.stock[0].name).toBe("apple");
    expect(second.getSnapshot().ready).toBe(false);
    await first.update((data) => data);
    expect(disk.setItem.mock.calls[0][0]).toBe(kitchenStorageKey("account-a"));
  });
});

describe("generated shopping identity", () => {
  it("persists a random namespace before exposing the kitchen, without publishing account identifiers", async () => {
    let stored: string | null = null;
    const disk = {
      getItem: async () => stored,
      setItem: async (_key: string, value: string) => {
        stored = value;
      },
    };
    const first = createKitchenStore(disk, "https://private.example/user");
    await first.load();
    const namespace = first.getSnapshot().data.shoppingGroupId;
    expect(namespace).toBeTruthy();
    expect(namespace).not.toContain("private.example");
    const reopened = createKitchenStore(disk, "https://private.example/user");
    await reopened.load();
    expect(reopened.getSnapshot().data.shoppingGroupId).toBe(namespace);
  });
});
