import {
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

// ─── Types ────────────────────────────────────────────────────────────────────

export type SharedListState = {
  active: boolean;
  code: string | null;
  syncing: boolean;
  error: string | null;
};

type RemoteList = {
  items: ShoppingListItem[];
  updatedAt: unknown;
};

// ─── Code generation ──────────────────────────────────────────────────────────

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 (confusing)

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

// ─── Merge ────────────────────────────────────────────────────────────────────

/**
 * Merges two item arrays. Last-updatedAt-wins per item id.
 * Returns merged list and whether there were changes vs local.
 */
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

// ─── Push debounce ────────────────────────────────────────────────────────────

let _pushTimer: ReturnType<typeof setTimeout> | null = null;

import { deleteDoc } from "firebase/firestore";

async function doPush(code: string, items: ShoppingListItem[]): Promise<void> {
  await waitForAuth();
  await setDoc(
    listRef(code),
    { items, updatedAt: serverTimestamp() },
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

// ─── Create shared list ───────────────────────────────────────────────────────

export async function createSharedList(
  items: ShoppingListItem[]
): Promise<string> {
  await waitForAuth();
  // Try up to 5 codes to avoid rare collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const ref = listRef(code);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { items, updatedAt: serverTimestamp(), participantCount: 1 });
      return code;
    }
  }
  throw new Error("Could not generate a unique list code. Please try again.");
}

// ─── Join shared list ─────────────────────────────────────────────────────────

export async function fetchSharedList(
  code: string
): Promise<ShoppingListItem[] | null> {
  await waitForAuth();
  const snap = await getDoc(listRef(code));
  if (!snap.exists()) return null;
  
  // Increment participant count when joining
  await updateDoc(listRef(code), { participantCount: increment(1) }).catch(() => {});
  
  const data = snap.data() as RemoteList;
  return normalizeShoppingListItems(data.items ?? []);
}

// ─── Leave shared list ────────────────────────────────────────────────────────

export async function leaveSharedList(code: string): Promise<void> {
  await waitForAuth();
  const ref = listRef(code);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  
  const data = snap.data();
  // Default to 2 if missing to be safe and avoid accidental deletion of old active lists
  const count = typeof data.participantCount === "number" ? data.participantCount : 2;
  
  if (count <= 1) {
    await deleteDoc(ref);
  } else {
    await updateDoc(ref, { participantCount: increment(-1) }).catch(() => {});
  }
}

// ─── Realtime subscription ────────────────────────────────────────────────────

export function subscribeToSharedList(
  code: string,
  onUpdate: (items: ShoppingListItem[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  return onSnapshot(
    listRef(code),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as RemoteList;
      const items = normalizeShoppingListItems(data.items ?? []);
      onUpdate(items);
    },
    onError
  );
}
