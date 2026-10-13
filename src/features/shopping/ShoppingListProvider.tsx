import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useAuth } from "../auth/AuthProvider";
import { usePreferences } from "../preferences/PreferencesProvider";
import { PantryClient, type PantryItem, type PantryItemPatch } from "../pantry/pantryClient";
import { createPantryStorage, pantryAccountKey, type PantrySelection } from "../pantry/pantryStore";
import { loadShoppingListItems, saveShoppingListItems, createShoppingListItemId } from "./shoppingStore";
import { useRemindersSync, type UseRemindersSyncReturn } from "./useRemindersSync";
import { ShoppingModeController, type ShoppingModeState } from "./shoppingModeController";
import { SHOPPING_MODE_KEY, LEGACY_SHARED_CODE_KEY, type ShoppingMode } from "./shoppingModes";
import { createSharedList, joinSharedListWithItems, schedulePush, subscribeToSharedList, cancelPush, leaveSharedList, flushSharedListPush, getDeviceId } from "./sharedListClient";
import type { ShoppingListAddResult, ShoppingListItem, ShoppingListSource } from "./shoppingList";
import { scheduleTimerNotification } from "../timers/timerNotifications";
import i18n from "../../i18n";

export type SharedListState = {
  active: boolean; code: string | null; syncing: boolean; error: string | null; participantCount: number | null;
  createList: () => Promise<string>; joinList: (code: string) => Promise<boolean>; leaveList: () => Promise<void>;
};
type ShoppingListContextValue = {
  items: ShoppingListItem[]; loading: boolean; mode: ShoppingMode; switching: boolean;
  addItem: (label: string, options?: { skipSync?: boolean }) => Promise<ShoppingListAddResult>;
  addIngredients: (ingredients: string[], source?: ShoppingListSource, options?: { allowDuplicates?: boolean; skipSync?: boolean }) => Promise<ShoppingListAddResult>;
  clearAll: (options?: { skipSync?: boolean }) => Promise<void>;
  clearChecked: (options?: { skipSync?: boolean }) => Promise<number>;
  moveItem: (id: string, direction: -1 | 1, options?: { skipSync?: boolean }) => Promise<void>;
  removeItem: (id: string, options?: { skipSync?: boolean }) => Promise<void>;
  toggleItem: (id: string, options?: { skipSync?: boolean }) => Promise<void>;
  updateItem: (id: string, label: string, options?: { skipSync?: boolean }) => Promise<void>;
  refreshItems: () => Promise<void>; sync: UseRemindersSyncReturn; sharedList: SharedListState;
  pantry: ShoppingModeState["pantry"];
  switchToLocal: () => Promise<void>;
  switchToPantry: (selection: PantrySelection) => Promise<void>;
  updatePantryItem: (item: PantryItem, patch: PantryItemPatch) => Promise<void>;
};
const ShoppingListContext = createContext<ShoppingListContextValue | undefined>(undefined);
const EMPTY: ShoppingModeState = { mode: { kind: "local" }, items: [], loading: true, switching: false, sharedSyncing: false, sharedError: null, participantCount: null, pantry: null };
const emptySnapshot = () => EMPTY;
const emptySubscribe = () => () => {};

export function ShoppingListProvider({ children }: { children: React.ReactNode }) {
  const { credentials, hydrated } = useAuth();
  const accountKey = credentials ? pantryAccountKey(credentials) : null;
  const [controller, setController] = useState<ShoppingModeController | null>(null);
  // Do not render a previous account's Pantry contents while effects are being replaced.
  const active = controller?.accountKey === accountKey ? controller : null;
  const state = useSyncExternalStore(active?.subscribe ?? emptySubscribe, active?.getSnapshot ?? emptySnapshot, emptySnapshot);
  const sync = useRemindersSync(!state.loading && state.mode.kind !== "pantry" && !state.switching, state.mode.kind === "pantry");
  const syncRef = useRef(sync);
  syncRef.current = sync;
  const { enableShoppingNotifications } = usePreferences();
  const notificationsRef = useRef(enableShoppingNotifications);
  notificationsRef.current = enableShoppingNotifications;

  useEffect(() => {
    if (!hydrated) return;
    const pantryStorage = createPantryStorage(accountKey ?? "pantry.unconnected");
    const next = new ShoppingModeController({
      accountKey,
      loadMode: () => AsyncStorage.getItem(SHOPPING_MODE_KEY),
      saveMode: (mode) => AsyncStorage.setItem(SHOPPING_MODE_KEY, JSON.stringify(mode)),
      legacyCode: () => AsyncStorage.getItem(LEGACY_SHARED_CODE_KEY),
      clearLegacyCode: () => AsyncStorage.removeItem(LEGACY_SHARED_CODE_KEY),
      loadItems: loadShoppingListItems, saveItems: saveShoppingListItems, createId: createShoppingListItemId,
      pantryClient: () => { if (!credentials) throw new Error("Nextcloud required"); return new PantryClient(credentials); },
      pantryStorage,
      migrationStorage: (selection) => {
        const key = `shopping.migration.${accountKey}.${selection.house.id}.${selection.list.id}`;
        return { load: () => AsyncStorage.getItem(key), save: (raw) => AsyncStorage.setItem(key, raw), clear: () => AsyncStorage.removeItem(key) };
      },
      firebase: { create: createSharedList, join: joinSharedListWithItems, leave: leaveSharedList, flush: flushSharedListPush, cancel: cancelPush, push: schedulePush, subscribe: subscribeToSharedList },
      onLocalItems: (items) => { if (syncRef.current.linked) void syncRef.current.pushToSystem(items); },
      onSharedUpdate: (previous, payload) => {
        void (async () => {
          const id = await getDeviceId();
          if (!next.isCurrent() || next.getSnapshot().mode.kind !== "firebase" || next.getSnapshot().switching) return;
          if (!notificationsRef.current || !previous.length || !payload.lastUpdatedBy || payload.lastUpdatedBy === id) return;
          const prevIds = new Set(previous.map((item) => item.id));
          const newIds = new Set(payload.items.map((item) => item.id));
          const added = payload.items.filter((item) => !prevIds.has(item.id)).length;
          const removed = previous.filter((item) => !newIds.has(item.id)).length;
          if (!added && !removed) return;
          const key = added && removed ? "notificationAddedAndRemoved" : removed ? "notificationRemoved" : "notificationAdded";
          await scheduleTimerNotification({ title: i18n.t("shoppingList.notificationTitle"), body: i18n.t(`shoppingList.${key}`, { added, removed, count: added || removed }), recipeId: "shopping", timerId: `shopping_${Date.now()}`, seconds: 1 });
        })().catch(() => undefined);
      }
    });
    setController(next);
    void next.load().catch(() => undefined);
    return () => next.dispose();
  }, [accountKey, credentials, hydrated]);

  const requireController = useCallback(() => { if (!active) throw new Error("Shopping list loading"); return active; }, [active]);
  const operations = useMemo<Pick<ShoppingListContextValue, "addIngredients" | "addItem" | "clearAll" | "clearChecked" | "moveItem" | "removeItem" | "toggleItem" | "updateItem" | "refreshItems" | "switchToLocal" | "switchToPantry" | "updatePantryItem">>(() => ({
    addIngredients: (...args) => requireController().addIngredients(...args),
    addItem: (label, options) => requireController().addIngredients([label], {}, options),
    clearAll: (...args) => requireController().clearAll(...args),
    clearChecked: (...args) => requireController().clearChecked(...args),
    moveItem: (...args) => requireController().moveItem(...args),
    removeItem: (...args) => requireController().removeItem(...args),
    toggleItem: (...args) => requireController().toggleItem(...args),
    updateItem: (...args) => requireController().updateItem(...args),
    refreshItems: () => requireController().refreshItems(),
    switchToLocal: () => requireController().switchToLocal(),
    switchToPantry: (selection) => requireController().switchToPantry(selection),
    updatePantryItem: (item, patch) => requireController().updatePantryItem(item, patch),
  }), [requireController]);
  const value = useMemo<ShoppingListContextValue>(() => ({
    items: state.items, loading: state.loading, mode: state.mode, switching: state.switching, pantry: state.pantry, sync,
    ...operations,
    sharedList: {
      active: state.mode.kind === "firebase", code: state.mode.kind === "firebase" ? state.mode.code : null,
      syncing: state.switching || state.sharedSyncing, error: state.sharedError, participantCount: state.participantCount,
      createList: () => requireController().switchToFirebase(),
      joinList: async (code) => { try { await requireController().switchToFirebase(code); return true; } catch { return false; } },
      leaveList: () => requireController().switchToLocal()
    }
  }), [state, sync, requireController, operations]);
  return <ShoppingListContext.Provider value={value}>{children}</ShoppingListContext.Provider>;
}
export function useShoppingList() {
  const value = useContext(ShoppingListContext);
  if (!value) throw new Error("useShoppingList must be used inside ShoppingListProvider");
  return value;
}
