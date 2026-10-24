import { describe, expect, it } from "vitest";
import { createEmptyRecipe } from "../features/recipes/types";
import { emptyKitchen, mealIngredients, parseKitchenData, type Meal } from "../features/kitchen/kitchen";
import { kitchenHistory } from "../features/kitchen/history";
import { repeatMeal } from "../features/kitchen/everyday";
import { remapKitchenBackup } from "../features/kitchen/kitchenBackup";
import { stockDuplicates } from "../features/kitchen/stockInventory";
import { parseFoodProduct } from "../features/kitchen/foodProducts";

const recipe = { ...createEmptyRecipe(), id: "recipe", name: "Soupe", recipeYield: 2, recipeIngredient: ["200 g carottes"] };
const meal: Meal = { id: "meal", kind: "simple", title: "Soupe du dimanche", date: "2026-10-18", slot: "dinner", recipeId: "", linkedRecipeId: "recipe", notes: "Avec les enfants. Plus de cumin la prochaine fois.", servings: 2, completed: true, ingredients: ["Pain"] };

describe("everyday kitchen data integrity", () => {
  it("keeps each meal's memory and optional recipe link through persistence and backup remapping", () => {
    const data = parseKitchenData(JSON.parse(JSON.stringify({ ...emptyKitchen(), meals: [meal] })));
    expect(data.meals[0]).toEqual(meal);
    const restored = remapKitchenBackup(data, [recipe], [{ ...recipe, id: "new-recipe" }]);
    expect(restored.unresolved).toBe(0);
    expect(restored.data.meals[0]).toMatchObject({ notes: meal.notes, recipeId: "", linkedRecipeId: "new-recipe" });
    expect(kitchenHistory(data, [recipe])[0]).toMatchObject({ recipe, meal });
  });
  it("never turns an optional recipe link into additional shopping or an ignored legacy recipe ID into a link", () => {
    expect(mealIngredients([meal], [recipe])).toEqual(["Pain"]);
    expect(mealIngredients([{ ...meal, kind: "leftovers" }, { ...meal, kind: "out" }], [recipe])).toEqual([]);
    const legacy = { ...meal, linkedRecipeId: undefined, recipeId: "recipe" };
    expect(kitchenHistory({ ...emptyKitchen(), meals: [legacy] }, [recipe])[0].recipe).toBeUndefined();
    expect(remapKitchenBackup({ ...emptyKitchen(), meals: [legacy] }, [], []).unresolved).toBe(0);
  });
  it("preserves the original memory when repeating a meal, with a fresh uncompleted draft", () => {
    const repeated = repeatMeal(meal, "2026-10-24");
    expect(repeated).toMatchObject({ linkedRecipeId: "recipe", completed: false, notes: undefined });
    expect(repeated.id).not.toBe(meal.id);
    expect(meal.notes).toContain("enfants");
    expect(kitchenHistory({ ...emptyKitchen(), meals: [meal, repeated] }, [recipe])).toHaveLength(1);
    expect(() => parseKitchenData({ ...emptyKitchen(), meals: [{ ...meal, notes: 123 }] })).toThrow();
  });
  it("signals exact product duplicates across locations and dates without mutating or merging batches", () => {
    const stock = [
      { id: "first", name: "Œufs", quantity: "6", location: "fridge" as const, expires: "2026-10-22" },
      { id: "second", name: "Eggs", quantity: "12", location: "cupboard" as const, expires: "2026-11-04", barcode: "12345678" },
    ];
    expect(stockDuplicates(stock, { name: "œuf" })).toEqual(stock);
    expect(stockDuplicates(stock, { ...stock[0] })).toEqual([stock[1]]);
    expect(stockDuplicates(stock, { name: "Eggs", barcode: "87654321" })).toEqual([stock[0]]);
    expect(stockDuplicates(stock, { name: "Farine" })).toEqual([]);
    expect(stock.map((item) => item.expires)).toEqual(["2026-10-22", "2026-11-04"]);
  });
  it("reads only finite, nonnegative nutrition values per 100 g/ml and preserves zero", () => {
    const product = parseFoodProduct("12345678", { product: { product_name: "Soupe", nutriments: { "energy-kcal_100g": 25, sugars_100g: 0, salt_100g: 0.6, fat_100g: -1, proteins_100g: "2", fiber_100g: Infinity, carbohydrates_serving: 25 } } }, "fr")!;
    expect(product.nutrients).toEqual({ energy: 25, sugars: 0, salt: 0.6 });
    const data = { ...emptyKitchen(), stock: [{ ...product, id: "stock", location: "fridge", expires: "" }] };
    expect(parseKitchenData(JSON.parse(JSON.stringify(data))).stock[0].nutrients).toEqual(product.nutrients);
    expect(() => parseKitchenData({ ...data, stock: [{ ...data.stock[0], nutrients: { salt: -1 } }] })).toThrow();
    expect(() => parseKitchenData({ ...data, stock: [{ ...data.stock[0], nutrients: { arbitrary: 1 } }] })).toThrow();
  });
});
