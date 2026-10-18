import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useAuth } from "../auth/AuthProvider";
import { usePreferences } from "../preferences/PreferencesProvider";
import { PantryClient, type PantryItem, type PantryItemPatch } from "../pantry/pantryClient";
import { createPantryStorage, pantryAccountKey, type PantrySelection } from "../pantry/pantryStore";
import { loadShoppingListItems, saveShoppingListItems, createShoppingListItemId } from "./shoppingStore";
import { registerReminderMappings } from "./remindersSync";
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
  replaceGeneratedIngredients: (ingredients: string[], source: ShoppingListSource & { recipeId: string }) => Promise<ShoppingListAddResult>;
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
  const backendKey = `${accountKey ?? "local"}:${state.mode.kind === "pantry" ? `pantry-${state.mode.selection.house.id}-${state.mode.selection.list.id}` : state.mode.kind === "firebase" ? `firebase-${state.mode.code}` : "local"}`;
  const sync = useRemindersSync(!state.loading && !state.switching, backendKey, state.items);
  const refreshing = useRef(new WeakMap<ShoppingModeController, { mode: ShoppingMode; revision: number; promise: Promise<void> }>());
  const importing = useRef(new Set<ShoppingModeController>());
  const syncRef = useRef(sync);
  syncRef.current = sync;
  const renderedMode = useRef(state.mode);
  renderedMode.current = state.mode;
  const { enableShoppingNotifications } = usePreferences();
  const notificationsRef = useRef(enableShoppingNotifications);
  notificationsRef.current = enableShoppingNotifications;

  const refresh = useCallback(function refreshController(controller: ShoppingModeController): Promise<void> {
    const mode = controller.getSnapshot().mode;
    const revision = controller.getRevision();
    const pending = refreshing.current.get(controller);
    if (pending) {
      if (pending.mode === mode && pending.revision === revision) return pending.promise;
      return pending.promise.catch(() => undefined).then(() => refreshController(controller));
    }
    const current = () => controller.isCurrent() && controller.getRevision() === revision && controller.getSnapshot().mode === mode && !controller.getSnapshot().loading && !controller.getSnapshot().switching;
    if (!current()) return Promise.resolve();
    importing.current.add(controller);
    const operation = (async () => {
      try {
        // An offline Pantry cache must not overwrite newer Apple reminders.
        if (mode.kind === "pantry" && !controller.getSnapshot().pantry?.fresh) await controller.refreshItems();
        if (!current() || (mode.kind === "pantry" && !controller.getSnapshot().pantry?.fresh)) return;
        const baseline = controller.getSnapshot().items;
        const result = await syncRef.current.pullFromSystem(baseline, current);
        if (!current()) return;
        if (result) await controller.applyRemindersChanges(result, baseline, (mappings) => registerReminderMappings(mappings, current));
        if (!current()) return;
        if (mode.kind === "pantry") await controller.refreshItems();
        if (current() && (mode.kind !== "pantry" || controller.getSnapshot().pantry?.fresh)) await syncRef.current.pushToSystem(controller.getSnapshot().items, current);
      } finally {
        importing.current.delete(controller);
        refreshing.current.delete(controller);
      }
    })();
    refreshing.current.set(controller, { mode, revision, promise: operation });
    return operation;
  }, []);

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
      onItems: (items) => { if (!importing.current.has(next) && renderedMode.current === next.getSnapshot().mode && syncRef.current.linked) {
        const revision = next.getRevision();
        void syncRef.current.pushToSystem(items, () => next.isCurrent() && next.getRevision() === revision && !next.getSnapshot().switching);
      } },
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
  const operations = useMemo<Pick<ShoppingListContextValue, "replaceGeneratedIngredients" | "addIngredients" | "addItem" | "clearAll" | "clearChecked" | "moveItem" | "removeItem" | "toggleItem" | "updateItem" | "refreshItems" | "switchToLocal" | "switchToPantry" | "updatePantryItem">>(() => ({
    addIngredients: (...args) => requireController().addIngredients(...args),
    replaceGeneratedIngredients: (...args) => requireController().replaceGeneratedIngredients(...args),
    addItem: (label, options) => requireController().addIngredients([label], {}, options),
    clearAll: (...args) => requireController().clearAll(...args),
    clearChecked: (...args) => requireController().clearChecked(...args),
    moveItem: (...args) => requireController().moveItem(...args),
    removeItem: (...args) => requireController().removeItem(...args),
    toggleItem: (...args) => requireController().toggleItem(...args),
    updateItem: (...args) => requireController().updateItem(...args),
    refreshItems: () => refresh(requireController()),
    switchToLocal: () => requireController().switchToLocal(),
    switchToPantry: (selection) => requireController().switchToPantry(selection),
    updatePantryItem: (item, patch) => requireController().updatePantryItem(item, patch),
  }), [requireController, refresh]);
  useEffect(() => {
    if (active && !state.loading && !state.switching && sync.linked) void refresh(active).catch(() => undefined);
  }, [active, backendKey, state.loading, state.switching, sync.linked, refresh]);

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
