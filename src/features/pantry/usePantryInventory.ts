import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { useAuth } from "../auth/AuthProvider";
import type { KitchenData } from "../kitchen/kitchen";
import { PantryClient, PantryError, isPantryHouse, type PantryErrorCode } from "./pantryClient";
import {
  applyInventorySync,
  inventoryLocations,
  syncInventory,
  type InventoryBase,
  type InventoryConfig,
  type OutOfStockItem,
} from "./inventorySync";

const storageKey = (account: string) => `inventory.pantry.v1:${encodeURIComponent(account)}`;
const DEBOUNCE_MS = 1500;
const POLL_MS = 30_000;

type Saved = { config: InventoryConfig; base: InventoryBase | null; out: OutOfStockItem[]; lastSync: string | null };

export type PantryInventoryState = {
  account: string;
  /** Loaded from storage for the current account. */
  loaded: boolean;
  config: InventoryConfig | null;
  syncing: boolean;
  lastSync: string | null;
  error: PantryErrorCode | null;
  /** Changes Pantry refused during the last round (read-only inventory…). */
  rejected: number;
  out: OutOfStockItem[];
};

let state: PantryInventoryState = { account: "", loaded: false, config: null, syncing: false, lastSync: null, error: null, rejected: 0, out: [] };
const listeners = new Set<() => void>();
let requestSync: (() => Promise<void>) | null = null;
let focusCount = 0;
/** The stock a round just wrote, so writing it does not schedule another round. */
let syncedSignature = "";
const focusListeners = new Set<() => void>();

function publish(patch: Partial<PantryInventoryState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

function validTarget(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const target = value as Record<string, unknown>;
  return typeof target.id === "number" && Number.isSafeInteger(target.id) && target.id > 0 &&
    typeof target.name === "string" && typeof target.canEdit === "boolean";
}
export function parseSavedInventory(raw: string | null): Saved | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Saved;
    if (!value?.config || !isPantryHouse(value.config.house) ||
      !inventoryLocations.every((location) => validTarget(value.config.locations?.[location])) ||
      !Array.isArray(value.out) || (value.base !== null && typeof value.base !== "object")) return null;
    return { config: value.config, base: value.base, out: value.out, lastSync: typeof value.lastSync === "string" ? value.lastSync : null };
  } catch {
    return null;
  }
}
async function load(account: string) {
  return parseSavedInventory(await AsyncStorage.getItem(storageKey(account)));
}
async function save(account: string, saved: Saved) {
  await AsyncStorage.setItem(storageKey(account), JSON.stringify(saved));
}

export function usePantryInventoryState() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
export function isPantryInventoryActive(account: string) {
  return state.account === account && Boolean(state.config);
}

/** Turns on Pantry sync with the chosen inventories; the first round merges both sides by product name. */
export async function enablePantryInventory(account: string, config: InventoryConfig) {
  const previous = await load(account);
  // Changing house starts a fresh merge; changing inventories in the same house keeps the links.
  const sameHouse = previous?.config.house.id === config.house.id;
  await save(account, { config, base: sameHouse ? previous.base : null, out: sameHouse ? previous.out : [], lastSync: sameHouse ? previous.lastSync : null });
  if (state.account === account) publish({ config, error: null, rejected: 0, ...(sameHouse ? {} : { out: [], lastSync: null }) });
  await requestSync?.();
}

/** Stops the sync. Products stay on this device as a local inventory; nothing is removed from Pantry. */
export async function disablePantryInventory(account: string, update: (change: (data: KitchenData) => KitchenData) => Promise<void>) {
  await AsyncStorage.removeItem(storageKey(account));
  if (state.account === account) publish({ config: null, out: [], lastSync: null, error: null, rejected: 0, syncing: false });
  await update((data) => ({ ...data, stock: data.stock.map(({ pantry: _pantry, ...item }) => item) }));
}

export function syncInventoryNow() {
  return requestSync?.() ?? Promise.resolve();
}

/** Keeps the inventory fresh while it is on screen. */
export function useInventoryFocus(active: boolean) {
  useEffect(() => {
    if (!active) return;
    focusCount++;
    focusListeners.forEach((listener) => listener());
    return () => {
      focusCount--;
      focusListeners.forEach((listener) => listener());
    };
  }, [active]);
}

/** Removes a used-up product from Pantry for the whole household (it goes to the Pantry trash). */
export async function deleteOutOfStock(credentials: ConstructorParameters<typeof PantryClient>[0], account: string, item: OutOfStockItem) {
  const saved = await load(account);
  if (!saved) return;
  const client = new PantryClient(credentials);
  try {
    await client.deleteInventoryItem(saved.config.house.id, item.listId, item.itemId);
  } catch (error) {
    if (!(error instanceof PantryError && error.code === "unavailable")) throw error;
  } finally {
    client.dispose();
  }
  const base = { ...(saved.base ?? {}) };
  delete base[item.itemId];
  const out = saved.out.filter((entry) => entry.itemId !== item.itemId);
  await save(account, { ...saved, base, out });
  if (state.account === account) publish({ out });
}

type Store = {
  account: string;
  ready: boolean;
  data: KitchenData;
  update: (change: (data: KitchenData) => KitchenData) => Promise<void>;
};

/** Two-way sync between My kitchen's inventory and the chosen Nextcloud Pantry inventories. */
export function usePantryInventorySync(store: Store) {
  const { credentials, isLocalMode } = useAuth();
  const latest = useRef(store);
  latest.current = store;
  const { account, ready, data } = store;
  const config = usePantryInventoryState().config;
  const available = Boolean(credentials) && !isLocalMode && ready && !["loading", "signed-out", "local"].includes(account);

  useEffect(() => {
    let current = true;
    publish({ account, loaded: false, config: null, syncing: false, lastSync: null, error: null, rejected: 0, out: [] });
    void load(account)
      .then((saved) => {
        if (current) publish({ loaded: true, config: saved?.config ?? null, out: saved?.out ?? [], lastSync: saved?.lastSync ?? null });
      })
      .catch(() => {
        if (current) publish({ loaded: true });
      });
    return () => {
      current = false;
    };
  }, [account]);

  useEffect(() => {
    if (!available || !config || !credentials) {
      requestSync = null;
      return;
    }
    const client = new PantryClient(credentials);
    let running: Promise<void> | null = null;
    let again = false;
    let disposed = false;
    const run = (): Promise<void> => {
      if (running) {
        again = true;
        return running;
      }
      running = (async () => {
        publish({ syncing: true });
        try {
          const saved = await load(account);
          if (!saved || disposed) return;
          const sent = latest.current.data.stock;
          const result = await syncInventory(client, saved.config, sent, saved.base);
          // Stopped, or switched to another household, while the round ran: drop its result.
          const now = await load(account);
          if (disposed || !now || now.config.house.id !== saved.config.house.id) return;
          await latest.current.update((current) => {
            const stock = applyInventorySync(sent, current.stock, result.stock);
            syncedSignature = JSON.stringify(stock);
            return syncedSignature === JSON.stringify(current.stock) ? current : { ...current, stock };
          });
          const lastSync = new Date().toISOString();
          // Keep a configuration changed while the round ran.
          if (disposed || !(await load(account))) return;
          await save(account, { config: now.config, base: result.base, out: result.out, lastSync });
          publish({ lastSync, out: result.out, error: null, rejected: result.rejected });
        } catch (error) {
          if (disposed) return;
          console.warn("[PantryInventory] Sync failed", error instanceof PantryError ? error.code : error);
          publish({ error: error instanceof PantryError ? error.code : "server" });
        } finally {
          publish({ syncing: false });
          running = null;
        }
        if (again && !disposed) {
          again = false;
          await run();
        }
      })();
      return running;
    };
    requestSync = run;
    void run();
    let timer: ReturnType<typeof setInterval> | null = null;
    const schedule = () => {
      if (timer) clearInterval(timer);
      timer = focusCount > 0 && AppState.currentState === "active" ? setInterval(() => void run(), POLL_MS) : null;
    };
    focusListeners.add(schedule);
    schedule();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") void run();
      schedule();
    });
    return () => {
      disposed = true;
      subscription.remove();
      focusListeners.delete(schedule);
      if (timer) clearInterval(timer);
      client.dispose();
      requestSync = null;
    };
  }, [available, config, credentials, account]);

  // Local edits are sent shortly after they are made.
  const signature = available && config ? JSON.stringify(data.stock) : "";
  const first = useRef(true);
  useEffect(() => {
    if (!signature) {
      first.current = true;
      return;
    }
    if (first.current) {
      first.current = false;
      return;
    }
    if (signature === syncedSignature) return;
    const timer = setTimeout(() => void requestSync?.(), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [signature]);
}
