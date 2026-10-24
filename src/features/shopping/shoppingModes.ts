import { normalizeShoppingListItems, type ShoppingListItem } from "./shoppingList";
import { isPantryHouse, isPantryList } from "../pantry/pantryClient";
import type { PantrySelection } from "../pantry/pantryStore";

export type ShoppingMode =
  | { kind: "local" }
  | { kind: "firebase"; code: string }
  | { kind: "pantry"; accountKey: string; selection: PantrySelection };
export const SHOPPING_MODE_KEY = "shopping.mode.v2";
export const LEGACY_SHARED_CODE_KEY = "shopping.sharedListCode";
export function parseShoppingMode(raw: string | null, accountKey: string | null, legacyCode?: string | null): ShoppingMode {
  if (!raw) return legacyCode && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(legacyCode) ? { kind: "firebase", code: legacyCode } : { kind: "local" };
  try {
    const mode = JSON.parse(raw) as ShoppingMode;
    if (mode.kind === "local") return mode;
    if (mode.kind === "firebase" && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(mode.code)) return mode;
    if (mode.kind === "pantry" && mode.accountKey === accountKey && isPantryHouse(mode.selection?.house) && isPantryList(mode.selection?.list) && mode.selection.list.houseId === mode.selection.house.id) return mode;
  } catch {   }
  return { kind: "local" };
}
function key(item: ShoppingListItem) {
  return `${item.label.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase()}\n${item.checked}`;
}
export function mergeShoppingItemsForSwitch(source: ShoppingListItem[], destination: ShoppingListItem[]): ShoppingListItem[] {
  const result = normalizeShoppingListItems(destination);
  const available = new Map<string, number>();
  for (const item of result) available.set(key(item), (available.get(key(item)) ?? 0) + 1);
  for (const item of normalizeShoppingListItems(source)) {
    const itemKey = key(item);
    const count = available.get(itemKey) ?? 0;
    if (count > 0) { available.set(itemKey, count - 1); continue; }
    const id = result.some((current) => current.id === item.id) ? `switch-${item.id}-${result.length}` : item.id;
    result.push({ ...item, id });
  }
  return result;
}
