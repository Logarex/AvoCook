import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { useAuth } from "../auth/AuthProvider";
import type { KitchenData } from "./kitchen";
import {
  applySyncedKitchen,
  mergeSyncedKitchen,
  syncedPart,
  syncKitchenWithRemote,
  type SyncedKitchen,
} from "./kitchenSync";

const enabledKey = (account: string) => `kitchen.sync.enabled.v1:${encodeURIComponent(account)}`;
const baseKey = (account: string) => `kitchen.sync.base.v1:${encodeURIComponent(account)}`;
const statusKey = (account: string) => `kitchen.sync.status.v1:${encodeURIComponent(account)}`;
const DEBOUNCE_MS = 4000;

export type KitchenSyncState = {
  account: string;
  enabled: boolean;
  syncing: boolean;
  lastSync: string | null;
  failed: boolean;
};

let state: KitchenSyncState = { account: "", enabled: false, syncing: false, lastSync: null, failed: false };
const listeners = new Set<() => void>();
let requestSync: (() => void) | null = null;
function publish(patch: Partial<KitchenSyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useKitchenSyncState() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export async function setKitchenSyncEnabled(account: string, enabled: boolean) {
  await AsyncStorage.setItem(enabledKey(account), enabled ? "true" : "false");
  if (!enabled) await AsyncStorage.removeItem(baseKey(account));
  if (state.account === account) publish({ enabled, failed: false });
  if (enabled) requestSync?.();
}

export function syncKitchenNow() {
  requestSync?.();
}

type Store = {
  account: string;
  ready: boolean;
  data: KitchenData;
  update: (change: (data: KitchenData) => KitchenData) => Promise<void>;
};

/** Keeps My kitchen in a JSON file next to the Nextcloud Cookbook recipes. */
export function useKitchenSync(store: Store) {
  const { getClient, isLocalMode } = useAuth();
  const client = isLocalMode ? null : getClient();
  const [enabled, setEnabled] = useState(false);
  const latest = useRef(store);
  latest.current = store;
  const running = useRef<Promise<void> | null>(null);
  const again = useRef(false);
  const { account, ready, data } = store;
  const available = Boolean(client) && ready && !["loading", "signed-out", "local"].includes(account);

  useEffect(() => {
    let current = true;
    publish({ account, enabled: false, syncing: false, failed: false, lastSync: null });
    void Promise.all([AsyncStorage.getItem(enabledKey(account)), AsyncStorage.getItem(statusKey(account))])
      .then(([flag, lastSync]) => {
        if (!current) return;
        setEnabled(flag === "true");
        publish({ enabled: flag === "true", lastSync });
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [account]);

  useEffect(() => {
    if (!available || !enabled || !client) {
      requestSync = null;
      return;
    }
    const run = (): Promise<void> => {
      if (running.current) {
        again.current = true;
        return running.current;
      }
      const operation = (async () => {
        publish({ syncing: true });
        try {
          const snapshot = latest.current.data;
          const rawBase = await AsyncStorage.getItem(baseKey(account));
          const base = rawBase ? (JSON.parse(rawBase) as SyncedKitchen) : null;
          const sent = syncedPart(snapshot);
          const { merged } = await syncKitchenWithRemote(client, sent, base);
          // Edits made while the request was running are merged on top instead of being lost.
          await latest.current.update((current) => {
            const next = mergeSyncedKitchen(sent, syncedPart(current), merged);
            return JSON.stringify(next) === JSON.stringify(syncedPart(current))
              ? current
              : applySyncedKitchen(current, next);
          });
          await AsyncStorage.setItem(baseKey(account), JSON.stringify(merged));
          const lastSync = new Date().toISOString();
          await AsyncStorage.setItem(statusKey(account), lastSync);
          publish({ lastSync, failed: false });
        } catch (error) {
          console.warn("[KitchenSync] Sync failed", error);
          publish({ failed: true });
        } finally {
          publish({ syncing: false });
          running.current = null;
        }
        if (again.current) {
          again.current = false;
          await run();
        }
      })();
      running.current = operation;
      return operation;
    };
    requestSync = () => void run();
    void run();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") void run();
    });
    return () => {
      subscription.remove();
      requestSync = null;
    };
  }, [available, enabled, client, account]);

  useEffect(() => {
    const listener = () => setEnabled(state.account === account && state.enabled);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [account]);

  const signature = available && enabled ? JSON.stringify(syncedPart(data)) : "";
  const first = useRef(true);
  useEffect(() => {
    if (!signature) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => requestSync?.(), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [signature]);
}
