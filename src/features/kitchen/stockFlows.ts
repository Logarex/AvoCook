import { newKitchenId, normalizeFood, parseIngredient, type StockItem } from "./kitchen";
import type { Recipe } from "../recipes/types";

/** A structured view of the free-text stock quantity ("500 g", "1,5 l", "3"). */
export type StockQuantity = { amount: number; unit: "" | "g" | "ml" };

export function parseStockQuantity(quantity: string): StockQuantity | null {
  const text = quantity.trim();
  if (!text) return null;
  // Reuse the ingredient parser so stock and recipes agree on units (kg → g, cl → ml…).
  const parsed = parseIngredient(`${text} x`);
  if (parsed.amount === null || parsed.name !== "x") return null;
  if (parsed.unit !== "" && parsed.unit !== "g" && parsed.unit !== "ml") return null;
  return { amount: parsed.amount, unit: parsed.unit };
}

const round = (value: number) => Number(value.toFixed(3));

export function formatStockQuantity({ amount, unit }: StockQuantity): string {
  if (unit === "g" && amount >= 1000) return `${round(amount / 1000)} kg`;
  if (unit === "ml" && amount >= 1000) return `${round(amount / 1000)} l`;
  return unit ? `${round(amount)} ${unit}` : String(round(amount));
}

export function addStockQuantities(current: string, added: string): string {
  if (!added.trim()) return current;
  if (!current.trim()) return added.trim();
  const left = parseStockQuantity(current);
  const right = parseStockQuantity(added);
  if (left && right && left.unit === right.unit)
    return formatStockQuantity({ amount: left.amount + right.amount, unit: left.unit });
  return `${current.trim()} + ${added.trim()}`;
}

function sameFood(name: string) {
  const key = parseIngredient(name).key;
  return (item: StockItem) => Boolean(key) && parseIngredient(item.name).key === key;
}

/* ----------------------------- Shopping → stock ---------------------------- */

export type StockArrival = {
  sourceId: string;
  selected: boolean;
  name: string;
  quantity: string;
  location: StockItem["location"];
  expires: string;
  /** Existing stock row the purchase will be merged into. */
  mergeWith?: string;
};

/** Turns checked shopping rows into editable stock drafts ("2 kg pommes" → pommes, 2 kg). */
export function stockArrivalsFromShopping(
  items: { id: string; label: string; checked: boolean }[],
  stock: StockItem[],
): StockArrival[] {
  return items
    .filter((item) => item.checked && item.label.trim())
    .map((item) => {
      const ingredient = parseIngredient(item.label);
      const name = ingredient.amount === null ? ingredient.original : ingredient.name;
      const quantity = ingredient.amount === null
        ? ""
        : formatStockQuantity({ amount: ingredient.amount, unit: ingredient.unit as StockQuantity["unit"] });
      const existing = stock.find(sameFood(name));
      return {
        sourceId: item.id,
        selected: true,
        name,
        quantity,
        location: existing?.location ?? "cupboard",
        expires: "",
        ...(existing ? { mergeWith: existing.id } : {}),
      };
    });
}

export function applyStockArrivals(
  stock: StockItem[],
  arrivals: StockArrival[],
  createId: () => string = newKitchenId,
): { stock: StockItem[]; added: number; merged: number } {
  let next = [...stock];
  let added = 0;
  let merged = 0;
  for (const arrival of arrivals) {
    const name = arrival.name.trim();
    if (!arrival.selected || !name) continue;
    const target = arrival.mergeWith ? next.find((item) => item.id === arrival.mergeWith) : undefined;
    if (target) {
      merged += 1;
      next = next.map((item) =>
        item.id === target.id
          ? {
              ...item,
              quantity: addStockQuantities(item.quantity, arrival.quantity),
              // Keep the earliest known date so expiry reminders stay conservative.
              expires: [item.expires, arrival.expires].filter(Boolean).sort()[0] ?? "",
            }
          : item,
      );
      continue;
    }
    added += 1;
    next.push({
      id: createId(),
      name,
      quantity: arrival.quantity.trim(),
      location: arrival.location,
      expires: arrival.expires,
    });
  }
  return { stock: next, added, merged };
}

/* ----------------------------- Cooking → stock ----------------------------- */

export type StockUse = {
  stockId: string;
  name: string;
  ingredient: string;
  before: string;
  /** Remaining quantity, or null when the item should leave the stock. */
  after: string | null;
  /** Pre-ticked only when the quantities could be compared. */
  selected: boolean;
};

export function stockUsesForRecipe(
  recipe: Pick<Recipe, "recipeIngredient" | "recipeYield">,
  servings: number,
  stock: StockItem[],
): StockUse[] {
  const factor = servings > 0 && recipe.recipeYield > 0 ? servings / recipe.recipeYield : 1;
  const used = new Set<string>();
  const uses: StockUse[] = [];
  for (const line of recipe.recipeIngredient) {
    if (!line.trim()) continue;
    const ingredient = parseIngredient(line);
    if (!ingredient.key) continue;
    const words = ` ${normalizeFood(line)} `;
    const matches = (candidate: StockItem) => {
      const key = parseIngredient(candidate.name).key;
      // "1 pincée de sel" has no parsable amount, so also look for the product name as a word.
      return key === ingredient.key || (ingredient.amount === null && key.length >= 3 && words.includes(` ${key} `));
    };
    const item = stock
      .filter((candidate) => !used.has(candidate.id) && matches(candidate))
      .sort((a, b) => (a.expires || "9999").localeCompare(b.expires || "9999"))[0];
    if (!item) continue;
    used.add(item.id);
    const available = parseStockQuantity(item.quantity);
    const needed = ingredient.amount === null ? null : ingredient.amount * factor;
    let after: string | null = null;
    let selected = false;
    if (available && needed !== null && available.unit === ingredient.unit) {
      const remaining = available.amount - needed;
      after = remaining > 0.0001 ? formatStockQuantity({ amount: remaining, unit: available.unit }) : null;
      selected = true;
    } else if (!item.quantity.trim() && needed !== null) {
      // No quantity tracked: the recipe probably used the whole item.
      selected = true;
    }
    uses.push({ stockId: item.id, name: item.name, ingredient: ingredient.original, before: item.quantity, after, selected });
  }
  return uses;
}

export function applyStockUses(stock: StockItem[], uses: StockUse[]): StockItem[] {
  const chosen = new Map(uses.filter((use) => use.selected).map((use) => [use.stockId, use]));
  return stock.flatMap((item) => {
    const use = chosen.get(item.id);
    if (!use) return [item];
    return use.after === null ? [] : [{ ...item, quantity: use.after }];
  });
}
