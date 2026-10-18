import { describe, expect, it } from "vitest";
import {
  addIngredientsToShoppingList,
  clearCheckedShoppingListItems,
  moveShoppingListItem,
  normalizeShoppingListItems,
  setShoppingListItemChecked,
  updateShoppingListItemLabel
} from "../features/shopping/shoppingList";

describe("shopping list helpers", () => {
  it("adds clean recipe ingredients and skips duplicates from the same recipe", () => {
    let nextId = 0;
    const result = addIngredientsToShoppingList(
      [],
      ["  200 g flour ", "", "200 g flour"],
      { recipeId: "recipe-1", recipeName: "Cake" },
      {
        createId: () => `item-${++nextId}`,
        now: "2026-05-19T00:00:00.000Z"
      }
    );

    expect(result.added).toHaveLength(1);
    expect(result.items).toEqual([
      {
        id: "item-1",
        label: "200 g flour",
        checked: false,
        recipeId: "recipe-1",
        recipeName: "Cake",
        createdAt: "2026-05-19T00:00:00.000Z",
        updatedAt: "2026-05-19T00:00:00.000Z"
      }
    ]);
  });

  it("tracks checked items without deleting unchecked ones", () => {
    const { items } = addIngredientsToShoppingList(
      [],
      ["flour", "milk"],
      {},
      {
        createId: (() => {
          let nextId = 0;
          return () => `item-${++nextId}`;
        })(),
        now: "2026-05-19T00:00:00.000Z"
      }
    );

    const checkedItems = setShoppingListItemChecked(
      items,
      "item-1",
      true,
      "2026-05-19T01:00:00.000Z"
    );

    expect(clearCheckedShoppingListItems(checkedItems).map((item) => item.label))
      .toEqual(["milk"]);
  });

  it("normalizes stored shopping list payloads defensively", () => {
    expect(
      normalizeShoppingListItems([
        { id: " item-1 ", label: "  eggs  ", checked: 1 },
        { id: "", label: "missing id" },
        { id: "item-2", label: "" },
        null
      ]).map((item) => ({
        id: item.id,
        label: item.label,
        checked: item.checked
      }))
    ).toEqual([{ id: "item-1", label: "eggs", checked: true }]);
  });

  it("updates item labels and preserves blank edits defensively", () => {
    const { items } = addIngredientsToShoppingList(
      [],
      ["flour"],
      {},
      {
        createId: () => "item-1",
        now: "2026-05-19T00:00:00.000Z"
      }
    );

    expect(
      updateShoppingListItemLabel(
        items,
        "item-1",
        "  bread flour  ",
        "2026-05-19T01:00:00.000Z"
      )[0]
    ).toMatchObject({
      label: "bread flour",
      updatedAt: "2026-05-19T01:00:00.000Z"
    });
    expect(updateShoppingListItemLabel(items, "item-1", "   ")).toBe(items);
  });

  it("moves items within the persisted array order", () => {
    const { items } = addIngredientsToShoppingList(
      [],
      ["flour", "milk", "eggs"],
      {},
      {
        createId: (() => {
          let nextId = 0;
          return () => `item-${++nextId}`;
        })(),
        now: "2026-05-19T00:00:00.000Z"
      }
    );

    expect(moveShoppingListItem(items, "item-2", -1).map((item) => item.label))
      .toEqual(["milk", "flour", "eggs"]);
    expect(moveShoppingListItem(items, "item-3", 1)).toBe(items);
  });
});

describe("generated weekly shopping", () => {
  it("replaces only its own week, preserving manual items, other weeks and checked rows", async () => {
    const { replaceGeneratedShoppingItems } = await import("../features/shopping/shoppingList");
    const source = { recipeId: "kitchen-week:private:2026-10-19", recipeName: "Week" };
    const generated = addIngredientsToShoppingList([], ["2 eggs", "100 g flour"], source, { createId: (() => { let id = 0; return () => `week-${id++}`; })() }).items;
    generated[0].checked = true;
    const manual = addIngredientsToShoppingList([], ["Coffee"], {}, { createId: () => "manual" }).items;
    const other = addIngredientsToShoppingList([], ["Rice"], { recipeId: "other-week" }, { createId: () => "other" }).items;
    const current = [...manual, ...generated, ...other];
    let id = 0;
    const next = replaceGeneratedShoppingItems(current, ["2 eggs", "250 g flour"], source, { createId: () => `new-${id++}` });
    expect(next.items.map(item => item.label)).toEqual(["Coffee", "Rice", "2 eggs", "250 g flour"]);
    expect(next.items.find(item => item.label === "2 eggs")).toMatchObject({ id: "week-0", checked: true });
    expect(next.added.map(item => item.label)).toEqual(["250 g flour"]);
    expect(current.find(item => item.label === "100 g flour")).toBeDefined();
    expect(replaceGeneratedShoppingItems(next.items, [], source).items.map(item => item.label)).toEqual(["Coffee", "Rice"]);
  });
});
