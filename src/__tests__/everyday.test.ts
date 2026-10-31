import { describe, expect, it } from "vitest";
import {
  reusableMeals,
  repeatMeal,
  stockedShoppingIndices,
  urgentStock,
  upcomingMeals,
} from "../features/kitchen/everyday";
import type { Meal, StockItem } from "../features/kitchen/kitchen";

const meal = (id: string, date: string, title: string): Meal => ({
  id,
  date,
  title,
  kind: "simple",
  recipeId: "",
  slot: "lunch",
  servings: 2,
  completed: true,
  ingredients: ["200 g pâtes"],
});
const stock = (id: string, name: string, expires = ""): StockItem => ({
  id,
  name,
  expires,
  quantity: "1",
  location: "fridge",
});
describe("everyday meals", () => {
  it("buys only for planned meals still to come, preserving the meal history", () => {
    const meals = [
      { ...meal("past", "2026-10-18", "Pâtes"), completed: false },
      meal("eaten", "2026-10-19", "Soupe"),
      { ...meal("next", "2026-10-20", "Salade"), completed: false },
    ];
    expect(upcomingMeals(meals, "2026-10-19").map((item) => item.id)).toEqual([
      "next",
    ]);
    expect(meals).toHaveLength(3);
  });
  it("offers recent distinct simple meals without filling the list with recipes or outings", () => {
    const meals = [
      meal("old", "2026-10-01", "Pâtes"),
      meal("new", "2026-10-19", "Pates"),
      meal("soup", "2026-10-18", "Soupe"),
      { ...meal("out", "2026-10-20", "Restaurant"), kind: "out" as const },
    ];
    expect(reusableMeals(meals).map((item) => item.id)).toEqual([
      "new",
      "soup",
    ]);
    expect(meals[0].id).toBe("old");
  });
  it("repeats a meal as an uncompleted editable draft and preserves whole-meal shopping quantities", () => {
    const source = meal("old", "2026-10-01", "Pâtes");
    const draft = repeatMeal(source, "2026-10-21", "dinner");
    expect(draft).toMatchObject({
      date: "2026-10-21",
      slot: "dinner",
      completed: false,
      servings: 2,
      ingredients: ["200 g pâtes"],
    });
    expect(draft.id).not.toBe(source.id);
    draft.ingredients!.push("Fromage");
    expect(source.ingredients).toEqual(["200 g pâtes"]);
    expect(source.completed).toBe(true);
  });
  it("shows dates from today through three days ahead, never expired stock as food to use", () => {
    expect(
      urgentStock(
        [
          stock("old", "Lait", "2026-10-18"),
          stock("soon", "Fromage", "2026-10-22"),
          stock("today", "Tomates", "2026-10-19"),
          stock("later", "Carottes", "2026-10-23"),
          stock("none", "Riz"),
        ],
        "2026-10-19",
      ).map((item) => item.id),
    ).toEqual(["today", "soon"]);
  });
  it("flags stock for shopping review without guessing quantities, preparations or freshness", () => {
    const lines = [
      "12 œufs",
      "1 kg pommes de terre",
      "100 ml lait",
      "200 g farine complète",
      "200 g beurre",
    ];
    expect(
      stockedShoppingIndices(
        lines,
        [
          stock("egg", "œufs"),
          stock("potato", "Pomme(s) de terre"),
          stock("milk", "Lait", "2026-10-18"),
          stock("flour", "Farine"),
          stock("oil", "Huile"),
        ],
        "2026-10-19",
      ),
    ).toEqual([0, 1]);
    expect(lines).toHaveLength(5);
  });
});
