import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  increment,
  type Unsubscribe
} from "firebase/firestore";
import { getDb, waitForAuth } from "../firebase/firebaseClient";
import type { ShoppingListItem } from "./shoppingList";
import { normalizeShoppingListItems } from "./shoppingList";

const DEVICE_ID_STORAGE_KEY = "shopping.deviceId";
let _cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (_cachedDeviceId) return _cachedDeviceId;
  let id = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!id) {
    id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

function listRef(code: string) {
  return doc(getDb(), "sharedLists", code.toUpperCase().trim());
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

async function doPush(code: string, items: ShoppingListItem[]): Promise<void> {
  await waitForAuth();
  const deviceId = await getDeviceId();
  await setDoc(
    listRef(code),
    { items, updatedAt: serverTimestamp(), lastUpdatedBy: deviceId },
    { merge: true }
  );
}

export function schedulePush(
  code: string,
  items: ShoppingListItem[],
  onError: (err: unknown) => void,
  debounceMs = 300
): void {
  if (_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = setTimeout(() => {
    void doPush(code, items).catch(onError);
  }, debounceMs);
}

export function cancelPush(): void {
  if (_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = null;
}

export async function createSharedList(
  items: ShoppingListItem[]
): Promise<string> {
  await waitForAuth();
  const deviceId = await getDeviceId();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const ref = listRef(code);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { items, updatedAt: serverTimestamp(), participantCount: 1, lastUpdatedBy: deviceId });
      return code;
    }
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
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  
  const data = snap.data();
  const count = typeof data.participantCount === "number" ? data.participantCount : 2;
  
  if (count <= 1) {
    await deleteDoc(ref);
  } else {
    await updateDoc(ref, { participantCount: increment(-1) }).catch(() => {});
  }
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
