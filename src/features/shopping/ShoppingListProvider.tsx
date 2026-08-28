import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  addIngredientsToShoppingList,
  clearCheckedShoppingListItems,
  moveShoppingListItem,
  removeShoppingListItem,
  setShoppingListItemChecked,
  updateShoppingListItemLabel,
  type ShoppingListAddResult,
  type ShoppingListItem,
  type ShoppingListSource
} from "./shoppingList";
import {
  createShoppingListItemId,
  loadShoppingListItems,
  saveShoppingListItems
} from "./shoppingStore";
import { useRemindersSync } from "./useRemindersSync";
import type { UseRemindersSyncReturn } from "./useRemindersSync";
import {
  createSharedList,
  fetchSharedList,
  mergeShoppingLists,
  schedulePush,
  subscribeToSharedList,
  cancelPush,
  leaveSharedList
} from "./sharedListClient";

const SHARED_CODE_STORAGE_KEY = "shopping.sharedListCode";

export type SharedListState = {
  active: boolean;
  code: string | null;
  syncing: boolean;
  error: string | null;
  createList: () => Promise<string>;
  joinList: (code: string) => Promise<boolean>;
  leaveList: () => Promise<void>;
};

type ShoppingListContextValue = {
  items: ShoppingListItem[];
  loading: boolean;
  addItem: (label: string, options?: { skipSync?: boolean }) => Promise<ShoppingListAddResult>;
  addIngredients: (
    ingredients: string[],
    source?: ShoppingListSource,
    options?: { allowDuplicates?: boolean; skipSync?: boolean }
  ) => Promise<ShoppingListAddResult>;
  clearAll: (options?: { skipSync?: boolean }) => Promise<void>;
  clearChecked: (options?: { skipSync?: boolean }) => Promise<number>;
  moveItem: (itemId: string, direction: -1 | 1, options?: { skipSync?: boolean }) => Promise<void>;
  removeItem: (itemId: string, options?: { skipSync?: boolean }) => Promise<void>;
  toggleItem: (itemId: string, options?: { skipSync?: boolean }) => Promise<void>;
  updateItem: (itemId: string, label: string, options?: { skipSync?: boolean }) => Promise<void>;
  refreshItems: () => Promise<void>;
  sync: UseRemindersSyncReturn;
  sharedList: SharedListState;
};

const ShoppingListContext = createContext<ShoppingListContextValue | undefined>(
  undefined
);

export function ShoppingListProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsRef = useRef(items);
  const sync = useRemindersSync();
  const syncRef = useRef(sync);
  
  // Shared list state
  const [sharedCode, setSharedCode] = useState<string | null>(null);
  const [sharedSyncing, setSharedSyncing] = useState(false);
  const [sharedError, setSharedError] = useState<string | null>(null);

  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

  const persistItems = useCallback(async (nextItems: ShoppingListItem[], skipSync?: boolean) => {
    itemsRef.current = nextItems;
    setItems(nextItems);
    await saveShoppingListItems(nextItems);
    if (!skipSync && syncRef.current.linked) {
      void syncRef.current.pushToSystem(nextItems);
    }
    if (!skipSync && sharedCode) {
      schedulePush(sharedCode, nextItems, (err) => {
        setSharedError(String(err));
      });
    }
  }, [sharedCode]);

  // Load local items + shared code on mount
  useEffect(() => {
    let active = true;
    void (async () => {
      const storedItems = await loadShoppingListItems();
      const code = await AsyncStorage.getItem(SHARED_CODE_STORAGE_KEY);
      if (!active) return;
      itemsRef.current = storedItems;
      setItems(storedItems);
      if (code) {
        setSharedCode(code);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  // Realtime subscription to Firebase shared list
  useEffect(() => {
    if (!sharedCode) return;
    setSharedSyncing(true);
    setSharedError(null);

    const unsub = subscribeToSharedList(
      sharedCode,
      (remoteItems) => {
        setSharedSyncing(false);
        const { merged, hasChanges } = mergeShoppingLists(itemsRef.current, remoteItems);
        if (hasChanges || itemsRef.current.length === 0) {
          itemsRef.current = merged;
          setItems(merged);
          void saveShoppingListItems(merged);
        }
      },
      (err) => {
        setSharedSyncing(false);
        setSharedError("Sync failed");
        console.warn("shopping", "Shared list error", err);
      }
    );

    return () => {
      unsub();
      cancelPush();
    };
  }, [sharedCode]);

  const createList = useCallback(async (): Promise<string> => {
    setSharedSyncing(true);
    setSharedError(null);
    try {
      const code = await createSharedList(itemsRef.current);
      await AsyncStorage.setItem(SHARED_CODE_STORAGE_KEY, code);
      setSharedCode(code);
      setSharedSyncing(false);
      return code;
    } catch (err) {
      setSharedSyncing(false);
      setSharedError("Could not create shared list");
      throw err;
    }
  }, []);

  const joinList = useCallback(async (code: string): Promise<boolean> => {
    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode) return false;
    setSharedSyncing(true);
    setSharedError(null);
    try {
      const remoteItems = await fetchSharedList(cleanCode);
      if (!remoteItems) {
        setSharedSyncing(false);
        setSharedError("List not found");
        return false;
      }
      const { merged } = mergeShoppingLists(itemsRef.current, remoteItems);
      itemsRef.current = merged;
      setItems(merged);
      await saveShoppingListItems(merged);
      await AsyncStorage.setItem(SHARED_CODE_STORAGE_KEY, cleanCode);
      setSharedCode(cleanCode);
      setSharedSyncing(false);
      return true;
    } catch {
      setSharedSyncing(false);
      setSharedError("Failed to join list");
      return false;
    }
  }, []);

  const leaveList = useCallback(async (): Promise<void> => {
    cancelPush();
    if (sharedCode) {
      await leaveSharedList(sharedCode).catch(console.warn);
    }
    await AsyncStorage.removeItem(SHARED_CODE_STORAGE_KEY);
    setSharedCode(null);
    setSharedError(null);
  }, [sharedCode]);

  const refreshItems = useCallback(async (): Promise<void> => {
    const fresh = await loadShoppingListItems();
    itemsRef.current = fresh;
    setItems(fresh);
  }, []);

  const addIngredients = useCallback(
    async (
      ingredients: string[], 
      source: ShoppingListSource = {},
      options: { allowDuplicates?: boolean; skipSync?: boolean } = {}
    ) => {
      const result = addIngredientsToShoppingList(
        itemsRef.current,
        ingredients,
        source,
        { createId: createShoppingListItemId, allowDuplicates: options.allowDuplicates }
      );
      if (result.added.length) {
        await persistItems(result.items, options.skipSync);
      }
      return result;
    },
    [persistItems]
  );

  const addItem = useCallback(
    (label: string, options?: { skipSync?: boolean }) => addIngredients([label], {}, options),
    [addIngredients]
  );

  const toggleItem = useCallback(
    async (itemId: string, options?: { skipSync?: boolean }) => {
      const item = itemsRef.current.find((currentItem) => currentItem.id === itemId);
      if (!item) {
        return;
      }
      await persistItems(
        setShoppingListItemChecked(itemsRef.current, itemId, !item.checked),
        options?.skipSync
      );
    },
    [persistItems]
  );

  const removeItem = useCallback(
    async (itemId: string, options?: { skipSync?: boolean }) => {
      await persistItems(removeShoppingListItem(itemsRef.current, itemId), options?.skipSync);
    },
    [persistItems]
  );

  const updateItem = useCallback(
    async (itemId: string, label: string, options?: { skipSync?: boolean }) => {
      await persistItems(
        updateShoppingListItemLabel(itemsRef.current, itemId, label),
        options?.skipSync
      );
    },
    [persistItems]
  );

  const moveItem = useCallback(
    async (itemId: string, direction: -1 | 1, options?: { skipSync?: boolean }) => {
      await persistItems(moveShoppingListItem(itemsRef.current, itemId, direction), options?.skipSync);
    },
    [persistItems]
  );

  const clearChecked = useCallback(async (options?: { skipSync?: boolean }) => {
    const checkedCount = itemsRef.current.filter((item) => item.checked).length;
    await persistItems(clearCheckedShoppingListItems(itemsRef.current), options?.skipSync);
    return checkedCount;
  }, [persistItems]);

  const clearAll = useCallback(async (options?: { skipSync?: boolean }) => {
    await persistItems([], options?.skipSync);
  }, [persistItems]);

  const sharedList: SharedListState = useMemo(
    () => ({
      active: Boolean(sharedCode),
      code: sharedCode,
      syncing: sharedSyncing,
      error: sharedError,
      createList,
      joinList,
      leaveList
    }),
    [sharedCode, sharedSyncing, sharedError, createList, joinList, leaveList]
  );

  const value = useMemo(
    () => ({
      items,
      loading,
      addItem,
      addIngredients,
      clearAll,
      clearChecked,
      moveItem,
      removeItem,
      toggleItem,
      updateItem,
      refreshItems,
      sync,
      sharedList
    }),
    [
      items,
      loading,
      addItem,
      addIngredients,
      clearAll,
      clearChecked,
      moveItem,
      removeItem,
      toggleItem,
      updateItem,
      refreshItems,
      sync,
      sharedList
    ]
  );

  return (
    <ShoppingListContext.Provider value={value}>
      {children}
    </ShoppingListContext.Provider>
  );
}

export function useShoppingList() {
  const value = useContext(ShoppingListContext);
  if (!value) {
    throw new Error("useShoppingList must be used inside ShoppingListProvider");
  }
  return value;
}
