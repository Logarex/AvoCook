import { newKitchenId, normalizeFood, parseIngredient, type StockItem } from "../kitchen/kitchen";
import {
  PantryError,
  type PantryClient,
  type PantryInventory,
  type PantryInventoryItem,
  type PantryInventoryItemPatch,
} from "./pantryClient";

export type InventoryLocation = StockItem["location"];
export const inventoryLocations: InventoryLocation[] = ["fridge", "cupboard", "freezer"];
export type InventoryTarget = { id: number; name: string; canEdit: boolean };
/** Every AvoCook place maps to one Pantry inventory; several places may share the same inventory. */
export type InventoryConfig = {
  house: { id: number; name: string };
  locations: Record<InventoryLocation, InventoryTarget>;
};
/** The part of a Pantry item that AvoCook reads and writes, used as the common ancestor of three-way merges. */
export type InventorySnapshot = {
  listId: number;
  name: string;
  quantity: string;
  expires: string;
  barcode: string;
  /** "" for count items, the stock level for level items. */
  level: "" | "full" | "low";
  out: boolean;
};
export type InventoryBase = Record<string, InventorySnapshot>;
/** Pantry keeps used-up products so the household can restock them; AvoCook shows them apart from what is at home. */
export type OutOfStockItem = { itemId: number; listId: number; name: string; quantity: string; location: InventoryLocation; level: boolean };
export type InventorySyncApi = Pick<PantryClient, "inventoryItems" | "addInventoryItem" | "updateInventoryItem" | "deleteInventoryItem">;
export type InventorySyncResult = {
  stock: StockItem[];
  base: InventoryBase;
  out: OutOfStockItem[];
  pushed: number;
  pulled: number;
  /** Changes the server refused (read-only inventory, removed item…); the server version was kept. */
  rejected: number;
};

const BARCODE = /^\d{8,14}$/;
const DAY = 86_400;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** AvoCook dates are local calendar days; Pantry stores a midnight timestamp, rounded to whole days on the server. */
export function expiryToPantry(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 0;
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 1000;
}
export function expiryFromPantry(timestamp: number | null | undefined): string {
  if (!timestamp) return "";
  // Midnight in any server timezone lands within half a day of UTC midnight.
  return new Date(Math.round(timestamp / DAY) * DAY * 1000).toISOString().slice(0, 10);
}

export function isLevelItem(item: Pick<PantryInventoryItem, "stockMode">) {
  return item.stockMode === "level";
}

export function remoteSnapshot(item: PantryInventoryItem): InventorySnapshot {
  const level = isLevelItem(item);
  return {
    listId: item.listId,
    name: item.name.trim(),
    quantity: level ? "" : (item.quantity ?? "").trim(),
    expires: expiryFromPantry(item.expiresAt),
    barcode: (item.barcode ?? "").trim(),
    level: level ? (item.stockLevel === "low" ? "low" : "full") : "",
    out: level ? item.stockLevel === "out" : item.stockStatus === "out",
  };
}

function localSnapshot(item: StockItem, listId: number, remote?: InventorySnapshot, base?: InventorySnapshot): InventorySnapshot {
  const level = remote ? remote.level !== "" : false;
  // A barcode AvoCook cannot store (letters, short codes…) is never cleared from Pantry.
  const keptBarcode = remote && remote.barcode && !BARCODE.test(remote.barcode) ? remote.barcode : "";
  return {
    listId,
    name: item.name.trim(),
    quantity: level ? "" : item.quantity.trim(),
    expires: item.expires,
    barcode: item.barcode ?? keptBarcode,
    level: level ? (item.pantry?.level ?? (base?.level || remote?.level || "full")) : "",
    out: false,
  };
}

/** Keeps whichever side changed since the common version; this device wins real conflicts, as in My kitchen sync. */
function pick<T>(base: T | undefined, local: T, remote: T): T {
  if (same(local, remote)) return local;
  if (base !== undefined && same(local, base)) return remote;
  return local;
}
function mergeSnapshots(base: InventorySnapshot | undefined, local: InventorySnapshot, remote: InventorySnapshot): InventorySnapshot {
  const merged = { ...remote };
  for (const key of Object.keys(remote) as (keyof InventorySnapshot)[]) {
    (merged as Record<string, unknown>)[key] = pick(base?.[key], local[key], remote[key]);
  }
  return merged;
}

export function inventoryPatch(next: InventorySnapshot, remote: InventorySnapshot): PantryInventoryItemPatch | null {
  const level = remote.level !== "";
  const patch: PantryInventoryItemPatch = {};
  if (next.listId !== remote.listId) patch.targetListId = next.listId;
  if (next.out !== remote.out) {
    // Used up: Pantry keeps the product at zero so it can be restocked; restocking sends what is at home now.
    if (level) patch.stockLevel = next.out ? "out" : next.level || "full";
    else patch.quantity = next.out ? "0" : next.quantity === "0" ? "" : next.quantity;
    if (!next.out && next.expires) patch.expiresAt = expiryToPantry(next.expires);
  } else if (!next.out) {
    if (!level && next.quantity !== remote.quantity) patch.quantity = next.quantity;
    if (level && next.level !== remote.level) patch.stockLevel = next.level || "full";
  }
  if (!next.out) {
    if (next.name && next.name !== remote.name) patch.name = next.name;
    if (next.expires !== remote.expires) patch.expiresAt = expiryToPantry(next.expires);
    if (next.barcode !== remote.barcode) patch.barcode = next.barcode;
  }
  return Object.keys(patch).length ? patch : null;
}

export function locationForList(config: InventoryConfig, listId: number, preferred?: InventoryLocation): InventoryLocation | undefined {
  if (preferred && config.locations[preferred]?.id === listId) return preferred;
  return inventoryLocations.find((location) => config.locations[location]?.id === listId);
}

function toLocal(config: InventoryConfig, item: PantryInventoryItem, previous: StockItem | undefined, createId: () => string): StockItem {
  const snapshot = remoteSnapshot(item);
  const level = snapshot.level !== "";
  const { barcode: _barcode, pantry: _pantry, ...rest } = previous ?? ({} as Partial<StockItem>);
  const barcode = BARCODE.test(snapshot.barcode) ? snapshot.barcode : previous?.barcode;
  // A different product name means a different product: Open Food Facts details no longer apply.
  const sameProduct = previous && (barcode === previous.barcode || !previous.barcode) && previous.name.trim() === snapshot.name;
  const { nutrients, nutriScore, greenScore, ...kept } = rest;
  return {
    ...kept,
    ...(sameProduct ? { ...(nutrients ? { nutrients } : {}), ...(nutriScore ? { nutriScore } : {}), ...(greenScore ? { greenScore } : {}) } : {}),
    id: previous?.id ?? createId(),
    name: snapshot.name || previous?.name || "?",
    quantity: level ? (previous?.quantity ?? "") : snapshot.quantity,
    location: locationForList(config, item.listId, previous?.location) ?? "cupboard",
    expires: snapshot.expires,
    ...(barcode ? { barcode } : {}),
    pantry: {
      itemId: item.id,
      listId: item.listId,
      ...(level ? { level: snapshot.level as "full" | "low" } : {}),
      ...(item.stockStatus === "low" || snapshot.level === "low" ? { low: true } : {}),
    },
  };
}

const foodKey = (name: string) => parseIngredient(name).key || name.trim().toLowerCase();

/**
 * One round trip with the chosen Pantry inventories. AvoCook's stock stays the
 * list of what is at home; a product used up here is set to zero in Pantry
 * instead of being deleted, so the household can restock it.
 */
export async function syncInventory(
  api: InventorySyncApi,
  config: InventoryConfig,
  local: StockItem[],
  base: InventoryBase | null,
  createId: () => string = newKitchenId,
): Promise<InventorySyncResult> {
  const houseId = config.house.id;
  const targets = new Map<number, InventoryTarget>();
  for (const location of inventoryLocations) targets.set(config.locations[location].id, config.locations[location]);
  const remote = new Map<number, PantryInventoryItem>();
  for (const listId of targets.keys()) {
    for (const item of await api.inventoryItems(houseId, listId)) remote.set(item.id, item);
  }
  let prior = base ?? {};
  // A wiped or restored stock must not read as "everything was used up": start over and match by name instead.
  const known = Object.entries(prior).filter(([, state]) => !state.out).length;
  if (known >= 3 && !local.some((item) => item.pantry && prior[item.pantry.itemId])) prior = {};
  const final = new Map(remote);
  const editable = (listId: number) => targets.get(listId)?.canEdit !== false;
  let pushed = 0;
  let pulled = 0;
  let rejected = 0;
  const attempt = async <T,>(operation: () => Promise<T>): Promise<T | null> => {
    try {
      const value = await operation();
      pushed++;
      return value;
    } catch (error) {
      // Network and authentication failures stop the round; a refused change only keeps the server version.
      if (error instanceof PantryError && ["forbidden", "invalid", "unavailable"].includes(error.code)) {
        rejected++;
        return null;
      }
      throw error;
    }
  };

  const linked = new Set(local.flatMap((item) => (item.pantry && remote.has(item.pantry.itemId) ? [item.pantry.itemId] : [])));
  // Products without a link may already exist in Pantry: new there, or used up and waiting to be restocked.
  const candidates = [...remote.values()].filter((item) => !linked.has(item.id) && (!prior[item.id] || prior[item.id].out));
  const claimed = new Set<number>();
  const stock: StockItem[] = [];

  for (const item of local) {
    const listId = config.locations[item.location].id;
    const link = item.pantry;
    if (link && claimed.has(link.itemId)) continue; // Two rows for one Pantry product: keep the first.
    const current = link ? remote.get(link.itemId) : undefined;
    if (current) {
      claimed.add(current.id);
      const remoteState = remoteSnapshot(current);
      const merged = mergeSnapshots(prior[current.id], localSnapshot(item, listId, remoteState, prior[current.id]), remoteState);
      let result = current;
      const patch = inventoryPatch(merged, remoteState);
      if (patch) {
        if (editable(current.listId) && editable(merged.listId)) {
          result = (await attempt(() => api.updateInventoryItem(houseId, current.listId, current.id, patch))) ?? current;
        } else rejected++;
      }
      if (result !== current || !same(merged, remoteState)) final.set(result.id, result);
      if (!same(remoteSnapshot(result), localSnapshot(item, listId, remoteState, prior[current.id]))) pulled++;
      if (!remoteSnapshot(result).out) stock.push(toLocal(config, result, item, createId));
      continue;
    }
    if (link && prior[link.itemId]) {
      const previous = prior[link.itemId];
      // Removed from Pantry elsewhere: follow, unless this device edited the product in the meantime.
      if (same(localSnapshot(item, listId, previous, previous), previous)) {
        pulled++;
        continue;
      }
    }
    const { pantry: _stale, ...unlinked } = item;
    const key = foodKey(item.name);
    const match = candidates.find((candidate) => !claimed.has(candidate.id) && candidate.listId === listId &&
      (item.barcode && candidate.barcode ? item.barcode === candidate.barcode : foodKey(candidate.name) === key));
    if (match) {
      claimed.add(match.id);
      const remoteState = remoteSnapshot(match);
      const mine = localSnapshot(unlinked, listId, remoteState);
      const merged: InventorySnapshot = {
        ...mine,
        quantity: mine.quantity || (remoteState.out ? "" : remoteState.quantity),
        expires: mine.expires || (remoteState.out ? "" : remoteState.expires),
        barcode: mine.barcode || remoteState.barcode,
        level: remoteState.level ? (remoteState.out ? "full" : remoteState.level) : "",
      };
      const patch = editable(listId) ? inventoryPatch(merged, remoteState) : null;
      const result = patch ? (await attempt(() => api.updateInventoryItem(houseId, match.listId, match.id, patch))) ?? match : match;
      final.set(result.id, result);
      if (!remoteSnapshot(result).out) stock.push(toLocal(config, result, unlinked, createId));
      else stock.push(unlinked);
      continue;
    }
    if (!editable(listId)) {
      stock.push(unlinked); // Stays on this device until the inventory accepts changes.
      continue;
    }
    const created = await attempt(() => api.addInventoryItem(houseId, listId, {
      name: item.name.trim(),
      ...(item.quantity.trim() ? { quantity: item.quantity.trim() } : {}),
      ...(item.barcode ? { barcode: item.barcode } : {}),
      ...(item.expires ? { expiresAt: expiryToPantry(item.expires) } : {}),
    }));
    if (created) {
      final.set(created.id, created);
      claimed.add(created.id);
      stock.push(toLocal(config, created, unlinked, createId));
    } else stock.push(unlinked);
  }

  for (const item of remote.values()) {
    if (claimed.has(item.id)) continue;
    const state = remoteSnapshot(item);
    const previous = prior[item.id];
    if (state.out) {
      if (previous && !previous.out) pulled++;
      continue;
    }
    if (previous && !previous.out) {
      // Used up on this device since the last round.
      if (same(state, previous) && editable(item.listId)) {
        const patch = inventoryPatch({ ...state, out: true }, state);
        const result = patch ? await attempt(() => api.updateInventoryItem(houseId, item.listId, item.id, patch)) : null;
        if (result) {
          final.set(result.id, result);
          if (remoteSnapshot(result).out) continue;
        }
      }
      // Changed or restocked by someone else meanwhile, or the inventory is read-only: it is still at home.
    }
    pulled++;
    stock.push(toLocal(config, item, undefined, createId));
    claimed.add(item.id);
  }

  const nextBase: InventoryBase = {};
  const out: OutOfStockItem[] = [];
  for (const item of final.values()) {
    const state = remoteSnapshot(item);
    nextBase[item.id] = state;
    if (state.out) {
      out.push({
        itemId: item.id,
        listId: item.listId,
        name: state.name,
        quantity: state.level ? "" : (item.quantity ?? "").trim() === "0" ? "" : (item.quantity ?? "").trim(),
        location: locationForList(config, item.listId) ?? "cupboard",
        level: state.level !== "",
      });
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return { stock, base: nextBase, out, pushed, pulled, rejected };
}

/** Puts a finished round back into the stock, keeping edits made on this device while it ran. */
export function applyInventorySync(sent: StockItem[], current: StockItem[], result: StockItem[]): StockItem[] {
  const before = new Map(sent.map((item) => [item.id, item]));
  const after = new Map(result.map((item) => [item.id, item]));
  const next: StockItem[] = [];
  for (const item of current) {
    const original = before.get(item.id);
    if (!original) next.push(item);
    else if (same(original, item)) {
      const synced = after.get(item.id);
      if (synced) next.push(synced);
    } else {
      const synced = after.get(item.id);
      next.push(synced?.pantry ? { ...item, pantry: synced.pantry } : item);
    }
  }
  for (const item of result) if (!before.has(item.id)) next.push(item);
  return next;
}

/** Brings a used-up Pantry product back home; the next round restocks it in Pantry. */
export function restockedItem(item: OutOfStockItem, createId: () => string = newKitchenId): StockItem {
  return {
    id: createId(),
    name: item.name,
    quantity: item.quantity,
    location: item.location,
    expires: "",
    pantry: { itemId: item.itemId, listId: item.listId, ...(item.level ? { level: "full" as const } : {}) },
  };
}

/** Names households commonly give these places, to preselect an existing inventory. */
const placeNames: Record<InventoryLocation, string[]> = {
  fridge: ["frigo", "refrigerateur", "fridge", "refrigerator", "kuhlschrank", "nevera", "frigorifico", "frigorifero", "koleskab"],
  cupboard: ["placard", "garde-manger", "pantry", "cupboard", "larder", "vorrat", "vorratsschrank", "speisekammer", "despensa", "dispensa", "spisekammer", "skab"],
  freezer: ["congelateur", "freezer", "gefrierschrank", "gefriertruhe", "congelador", "congelatore", "fryser"],
};

/** The existing inventory named like this place, or "new" to create one. */
export function suggestInventory(location: InventoryLocation, inventories: Pick<PantryInventory, "id" | "name">[]): number | "new" {
  const names = placeNames[location];
  const found = inventories.find((inventory) => {
    const name = normalizeFood(inventory.name);
    return names.some((candidate) => name === candidate || name.split(" ").includes(candidate));
  });
  return found?.id ?? "new";
}
