import type { ShoppingListItem } from "../shopping/shoppingList";
import { PantryError, type PantryClient, type PantryItem } from "./pantryClient";
import { pantryItemLabel, pantryPermissions } from "./pantrySession";
import type { PantryCache, PantrySelection } from "./pantryStore";

export const shoppingLabelKey = (label: string) => label.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
export function pantryShoppingItems(cache: PantryCache): ShoppingListItem[] {
  return cache.items.map((item) => ({
    id: `pantry-${cache.selection.house.id}-${cache.selection.list.id}-${item.id}`,
    label: pantryItemLabel(item), checked: item.done, recipeName: item.description || undefined,
    createdAt: cache.refreshedAt, updatedAt: cache.refreshedAt
  }));
}

type Entry = { sourceId: string; label: string; checked: boolean; remoteId?: number; beforeIds: number[] };
type Journal = { houseId: number; listId: number; entries: Entry[] };
export type MigrationStorage = { load: () => Promise<string | null>; save: (raw: string) => Promise<void>; clear: () => Promise<void> };
function parseJournal(raw: string | null, selection: PantrySelection): Journal {
  try {
    const value = JSON.parse(raw || "null") as Journal | null;
    if (value?.houseId === selection.house.id && value.listId === selection.list.id && Array.isArray(value.entries) &&
      value.entries.every((entry) => typeof entry.sourceId === "string" && typeof entry.label === "string" && typeof entry.checked === "boolean" &&
        (entry.remoteId === undefined || Number.isSafeInteger(entry.remoteId)) && Array.isArray(entry.beforeIds) && entry.beforeIds.every(Number.isSafeInteger))) return value;
  } catch {   }
  return { houseId: selection.house.id, listId: selection.list.id, entries: [] };
}

export async function migrateShoppingToPantry(
  client: PantryClient, selection: PantrySelection, source: ShoppingListItem[], storage: MigrationStorage, isActive: () => boolean = () => true
): Promise<PantryCache> {
  const assertActive = () => { if (!isActive()) throw new PantryError("network"); };
  assertActive();
  const house = await client.house(selection.house.id);
  assertActive();
  const list = await client.list(house.id, selection.list.id);
  assertActive();
  const destination = { house, list };
  const permissions = pantryPermissions(destination);
  let items = await client.items(house.id, list.id);
  assertActive();
  const journal = parseJournal(await storage.load(), destination);
  const save = () => storage.save(JSON.stringify(journal));
  const consumed = new Set<number>();

  for (const sourceItem of source) {
    assertActive();
    const key = shoppingLabelKey(sourceItem.label);
    if (!key) continue;
    let entry = journal.entries.find((entry) => entry.sourceId === sourceItem.id && shoppingLabelKey(entry.label) === key && entry.checked === sourceItem.checked);
    let matched: PantryItem | undefined;
    if (entry) {
      matched = entry.remoteId ? items.find((item) => item.id === entry!.remoteId) : items.find((item) =>
        !consumed.has(item.id) && !entry!.beforeIds.includes(item.id) && shoppingLabelKey(pantryItemLabel(item)) === key);
      if (matched && entry.remoteId === undefined) { entry.remoteId = matched.id; await save(); }
    }
    if (!matched) {
      matched = items.find((item) => !consumed.has(item.id) && item.done === sourceItem.checked && shoppingLabelKey(pantryItemLabel(item)) === key);
      if (matched) { consumed.add(matched.id); continue; }
      if (!permissions.add || (sourceItem.checked && !permissions.check)) throw new PantryError("forbidden");
      entry = { sourceId: sourceItem.id, label: sourceItem.label, checked: sourceItem.checked, beforeIds: items.map((item) => item.id) };
      journal.entries = journal.entries.filter((current) => current.sourceId !== sourceItem.id);
      journal.entries.push(entry);
      await save();
      assertActive();
      matched = await client.addItem(house.id, list.id, sourceItem.label, sourceItem.recipeName);
      entry.remoteId = matched.id;
      await save();
      items = [...items, matched];
    }
    assertActive();
    if (matched.done !== sourceItem.checked) {
      if (!permissions.check) throw new PantryError("forbidden");
      matched = await client.toggleItem(house.id, list.id, matched.id);
      items = items.map((item) => item.id === matched!.id ? matched! : item);
    }
    consumed.add(matched.id);
  }
  assertActive();
  items = await client.items(house.id, list.id);
  assertActive();
  return { selection: destination, items, refreshedAt: new Date().toISOString() };
}
