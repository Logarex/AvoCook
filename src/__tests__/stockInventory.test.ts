import { describe, expect, it } from "vitest";
import { stockGroups } from "../features/kitchen/stockInventory";
import type { StockItem } from "../features/kitchen/kitchen";
const items: StockItem[] = [
  { id: "milk", name: "Lait", quantity: "1 l", location: "fridge", expires: "2026-10-28" },
  { id: "rice", name: "Riz", quantity: "1 kg", location: "cupboard", expires: "" },
  { id: "cream", name: "Crème", quantity: "", location: "fridge", expires: "2026-10-25" },
  { id: "peas", name: "Petits pois", quantity: "", location: "freezer", expires: "2027-01-01" },
  { id: "apple", name: "Pommes", quantity: "", location: "fridge", expires: "" },
];
describe("organized food inventory", () => {
  it("separates storage locations and puts dated products first without modifying the inventory", () => {
    const before = JSON.stringify(items);
    const groups = stockGroups(items, "", "all", "fr");
    expect(groups.map((group) => group.location)).toEqual(["fridge", "cupboard", "freezer"]);
    expect(groups[0].items.map((item) => item.id)).toEqual(["cream", "milk", "apple"]);
    expect(JSON.stringify(items)).toBe(before);
  });
  it("combines location and accent-insensitive search and never leaks products from another location", () => {
    expect(stockGroups(items, " CREME ", "fridge", "fr")[0].items.map((item) => item.id)).toEqual(["cream"]);
    expect(stockGroups(items, "creme", "cupboard", "fr")).toEqual([]);
    expect(stockGroups(items, "", "freezer", "fr")[0].items.map((item) => item.id)).toEqual(["peas"]);
    expect(stockGroups([], "", "all", "fr")).toEqual([]);
  });
});
