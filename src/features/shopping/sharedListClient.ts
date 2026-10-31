import { notifySharedListChanged } from "./shoppingPushClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  increment,
  runTransaction,
  type Unsubscribe
} from "firebase/firestore";
import { getDb, waitForAuth } from "../firebase/firebaseClient";
import type { ShoppingListItem } from "./shoppingList";
import { mergeShoppingItemsForSwitch } from "./shoppingModes";
import { normalizeShoppingListItems } from "./shoppingList";

const DEVICE_ID_STORAGE_KEY = "shopping.deviceId";
let _cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (_cachedDeviceId) return _cachedDeviceId;
  let id = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
  }
  _cachedDeviceId = id;
  return id;
}

export type SharedListState = {
  active: boolean;
  code: string | null;
  syncing: boolean;
  error: string | null;
};

type RemoteList = {
  items: ShoppingListItem[];
  updatedAt: unknown;
  participantCount?: number;
  lastUpdatedBy?: string;
};

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  return Array.from(Crypto.getRandomBytes(6), (byte) => CHARS[byte % CHARS.length]).join("");
}

function listRef(code: string) {
  const normalized = code.toUpperCase().trim();
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(normalized)) {
    throw new Error("Invalid shared list code");
  }
  return doc(getDb(), "sharedLists", normalized);
}

export function mergeShoppingLists(
  local: ShoppingListItem[],
  remote: ShoppingListItem[]
): { merged: ShoppingListItem[]; hasChanges: boolean } {
  if (local.length !== remote.length) {
    return { merged: remote, hasChanges: true };
  }

  let hasChanges = false;
  for (let i = 0; i < local.length; i++) {
    if (
      local[i].id !== remote[i].id ||
      local[i].checked !== remote[i].checked ||
      local[i].label !== remote[i].label ||
      local[i].recipeId !== remote[i].recipeId
    ) {
      hasChanges = true;
      break;
    }
  }

  return { merged: hasChanges ? remote : local, hasChanges };
}

let _pushTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingPush: { code: string; items: ShoppingListItem[]; onError: (error: unknown) => void } | null = null;
let _activePush: Promise<void> = Promise.resolve();

async function doPush(code: string, items: ShoppingListItem[]): Promise<void> {
  await waitForAuth();
  const deviceId = await getDeviceId();
  await updateDoc(
    listRef(code),
    { items: normalizeShoppingListItems(items), updatedAt: serverTimestamp(), lastUpdatedBy: deviceId }
  );
  void notifySharedListChanged(code);
}

export function schedulePush(
  code: string,
  items: ShoppingListItem[],
  onError: (err: unknown) => void,
  debounceMs = 300
): void {
  if (_pushTimer) clearTimeout(_pushTimer);
  _pendingPush = { code, items, onError };
  _pushTimer = setTimeout(() => {
    const pending = _pendingPush;
    _pendingPush = null; _pushTimer = null;
    if (!pending) return;
    _activePush = _activePush.catch(() => undefined).then(() => doPush(pending.code, pending.items));
    void _activePush.catch(pending.onError);
  }, debounceMs);
}

export function cancelPush(): void {
  if (_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = null;
  _pendingPush = null;
}

export async function flushSharedListPush(code?: string, items?: ShoppingListItem[]): Promise<void> {
  const pending = _pendingPush;
  cancelPush();
  await _activePush.catch(() => undefined);
  if (code && items) await doPush(code, items);
  else if (pending) await doPush(pending.code, pending.items);
}

export async function joinSharedListWithItems(code: string, source: ShoppingListItem[]): Promise<ShoppingListItem[]> {
  await waitForAuth();
  const deviceId = await getDeviceId();
  const merged = await runTransaction(getDb(), async (transaction) => {
    const ref = listRef(code);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("List not found");
    const items = mergeShoppingItemsForSwitch(source, normalizeShoppingListItems(snap.data().items));
    transaction.update(ref, { items, participantCount: increment(1), updatedAt: serverTimestamp(), lastUpdatedBy: deviceId });
    return items;
  });
  void notifySharedListChanged(code);
  return merged;
}

export async function createSharedList(
  items: ShoppingListItem[]
): Promise<string> {
  await waitForAuth();
  const deviceId = await getDeviceId();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const ref = listRef(code);
    const created = await runTransaction(getDb(), async (transaction) => {
      const snap = await transaction.get(ref);
      if (snap.exists()) return false;
      transaction.set(ref, { items: normalizeShoppingListItems(items), updatedAt: serverTimestamp(), participantCount: 1, lastUpdatedBy: deviceId });
      return true;
    });
    if (created) return code;
  }
  throw new Error("Could not generate a unique list code. Please try again.");
}

export async function fetchSharedList(
  code: string
): Promise<ShoppingListItem[] | null> {
  await waitForAuth();
  const snap = await getDoc(listRef(code));
  if (!snap.exists()) return null;
  
  await updateDoc(listRef(code), { participantCount: increment(1) }).catch(() => {});
  
  const data = snap.data() as RemoteList;
  return normalizeShoppingListItems(data.items ?? []);
}

export async function leaveSharedList(code: string): Promise<void> {
  await waitForAuth();
  const ref = listRef(code);
  await runTransaction(getDb(), async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const count = typeof data.participantCount === "number" ? data.participantCount : 2;
    if (count <= 1) {
      transaction.delete(ref);
    } else {
      transaction.update(ref, { participantCount: increment(-1) });
    }
  });
}

export function subscribeToSharedList(
  code: string,
  onUpdate: (payload: { items: ShoppingListItem[]; participantCount?: number; lastUpdatedBy?: string }) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  return onSnapshot(
    listRef(code),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as RemoteList;
      const items = normalizeShoppingListItems(data.items ?? []);
      onUpdate({
        items,
        participantCount: typeof data.participantCount === "number" ? data.participantCount : undefined,
        lastUpdatedBy: typeof data.lastUpdatedBy === "string" ? data.lastUpdatedBy : undefined
      });
    },
    onError
  );
}
