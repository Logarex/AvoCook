import { describe, expect, it } from "vitest";
import type { StockItem } from "../features/kitchen/kitchen";
import {
  addStockQuantities,
  applyStockArrivals,
  applyStockUses,
  formatStockQuantity,
  parseStockQuantity,
  stockArrivalsFromShopping,
  stockUsesForRecipe,
} from "../features/kitchen/stockFlows";

const item = (patch: Partial<StockItem> & Pick<StockItem, "id" | "name">): StockItem => ({
  quantity: "", location: "cupboard", expires: "", ...patch,
});

describe("structured stock quantities", () => {
  it("reads common amounts and units like the ingredient parser", () => {
    expect(parseStockQuantity("500 g")).toEqual({ amount: 500, unit: "g" });
    expect(parseStockQuantity("1,5 kg")).toEqual({ amount: 1500, unit: "g" });
    expect(parseStockQuantity("25 cl")).toEqual({ amount: 250, unit: "ml" });
    expect(parseStockQuantity("6")).toEqual({ amount: 6, unit: "" });
    expect(parseStockQuantity("½")).toEqual({ amount: 0.5, unit: "" });
  });

  it("keeps free text untouched when it cannot be compared", () => {
    expect(parseStockQuantity("")).toBeNull();
    expect(parseStockQuantity("2 boîtes")).toBeNull();
    expect(parseStockQuantity("un peu")).toBeNull();
    expect(addStockQuantities("2 boîtes", "1 boîte")).toBe("2 boîtes + 1 boîte");
  });

  it("formats large values with readable units and adds compatible quantities", () => {
    expect(formatStockQuantity({ amount: 1500, unit: "g" })).toBe("1.5 kg");
    expect(formatStockQuantity({ amount: 330, unit: "ml" })).toBe("330 ml");
    expect(addStockQuantities("500 g", "1 kg")).toBe("1.5 kg");
    expect(addStockQuantities("", "2")).toBe("2");
    expect(addStockQuantities("3", "")).toBe("3");
  });
});

describe("shopping → stock", () => {
  const stock = [item({ id: "milk", name: "Lait", quantity: "1 l", location: "fridge", expires: "2026-11-10" })];

  it("drafts only checked rows and proposes merging into an existing product", () => {
    const drafts = stockArrivalsFromShopping([
      { id: "a", label: "2 kg pommes de terre", checked: true },
      { id: "b", label: "1 l lait", checked: true },
      { id: "c", label: "Beurre", checked: false },
    ], stock);
    expect(drafts).toEqual([
      expect.objectContaining({ sourceId: "a", name: "pommes de terre", quantity: "2 kg", location: "cupboard", selected: true }),
      expect.objectContaining({ sourceId: "b", name: "lait", quantity: "1 l", location: "fridge", mergeWith: "milk" }),
    ]);
  });

  it("adds new rows, merges quantities and keeps the earliest expiry", () => {
    const drafts = stockArrivalsFromShopping([
      { id: "a", label: "Yaourts", checked: true },
      { id: "b", label: "50 cl lait", checked: true },
      { id: "c", label: "Sel", checked: true },
    ], stock);
    drafts[0].expires = "2026-11-05";
    drafts[1].expires = "2026-11-20";
    drafts[2].selected = false;
    const result = applyStockArrivals(stock, drafts, () => "new");
    expect(result).toMatchObject({ added: 1, merged: 1 });
    expect(result.stock).toEqual([
      { ...stock[0], quantity: "1.5 l", expires: "2026-11-10" },
      { id: "new", name: "Yaourts", quantity: "", location: "cupboard", expires: "2026-11-05" },
    ]);
  });
});

describe("cooking → stock", () => {
  const recipe = { recipeYield: 4, recipeIngredient: ["200 g de farine", "4 oeufs", "1 pincée de sel", "Beurre", "Chocolat"] };
  const stock = [
    item({ id: "flour", name: "Farine", quantity: "1 kg" }),
    item({ id: "eggs-late", name: "Œufs", quantity: "6", expires: "2026-12-01", location: "fridge" }),
    item({ id: "eggs-soon", name: "oeufs", quantity: "2", expires: "2026-11-03", location: "fridge" }),
    item({ id: "salt", name: "Sel", quantity: "" }),
    item({ id: "butter", name: "Beurre", quantity: "250 g", location: "fridge" }),
  ];

  it("scales the recipe and uses the product that expires first", () => {
    const uses = stockUsesForRecipe(recipe, 2, stock);
    expect(uses.map(({ stockId, after, selected }) => ({ stockId, after, selected }))).toEqual([
      { stockId: "flour", after: "900 g", selected: true },
      { stockId: "eggs-soon", after: null, selected: true },
      { stockId: "salt", after: null, selected: false },
      { stockId: "butter", after: null, selected: false },
    ]);
  });

  it("only changes the rows the cook confirmed", () => {
    const uses = stockUsesForRecipe(recipe, 4, stock);
    const next = applyStockUses(stock, uses);
    expect(next.map((entry) => [entry.id, entry.quantity])).toEqual([
      ["flour", "800 g"],
      ["eggs-late", "6"],
      ["salt", ""],
      ["butter", "250 g"],
    ]);
  });
});
