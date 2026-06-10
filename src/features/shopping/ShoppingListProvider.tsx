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
  sync: UseRemindersSyncReturn;
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
  }, []);

  useEffect(() => {
    let active = true;
    void loadShoppingListItems()
      .then((storedItems) => {
        if (!active) {
          return;
        }
        itemsRef.current = storedItems;
        setItems(storedItems);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
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
      sync
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
      sync
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
