import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NextcloudCredentials } from "../nextcloud/cookbookClient";
import { normalizeNextcloudUrl } from "../../utils/url";
import { isPantryHouse, isPantryItem, isPantryList, type PantryHouse, type PantryItem, type PantryList } from "./pantryClient";

export type PantrySelection = { house: PantryHouse; list: PantryList };
export type PantryCache = { selection: PantrySelection; items: PantryItem[]; refreshedAt: string };

export function pantryAccountKey(credentials: NextcloudCredentials) {
  // Passwords never enter AsyncStorage. Scope caches and opt-in to the server AND account.
  return `pantry.v1.${encodeURIComponent(JSON.stringify([
    normalizeNextcloudUrl(credentials.serverUrl), credentials.userId || credentials.username
  ]))}`;
}
export function parsePantryCache(raw: string | null): PantryCache | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as PantryCache;
    if (!value || !isPantryHouse(value.selection?.house) || !isPantryList(value.selection?.list) ||
      value.selection.list.houseId !== value.selection.house.id || !Array.isArray(value.items) ||
      !value.items.every((item) => isPantryItem(item) && item.listId === value.selection.list.id) ||
      typeof value.refreshedAt !== "string" || !Number.isFinite(Date.parse(value.refreshedAt))) return null;
    return value;
  } catch { return null; }
}
export function createPantryStorage(key: string) {
  return {
    load: async () => parsePantryCache(await AsyncStorage.getItem(key)),
    save: async (cache: PantryCache) => AsyncStorage.setItem(key, JSON.stringify(cache)),
    clear: async () => AsyncStorage.removeItem(key)
  };
}
