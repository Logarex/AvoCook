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

type ShoppingListContextValue = {
  items: ShoppingListItem[];
  loading: boolean;
  addItem: (label: string) => Promise<ShoppingListAddResult>;
  addIngredients: (
    ingredients: string[],
    source?: ShoppingListSource,
    options?: { allowDuplicates?: boolean }
  ) => Promise<ShoppingListAddResult>;
  clearAll: () => Promise<void>;
  clearChecked: () => Promise<number>;
  moveItem: (itemId: string, direction: -1 | 1) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  toggleItem: (itemId: string) => Promise<void>;
  updateItem: (itemId: string, label: string) => Promise<void>;
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

  const persistItems = useCallback(async (nextItems: ShoppingListItem[]) => {
    itemsRef.current = nextItems;
    setItems(nextItems);
    await saveShoppingListItems(nextItems);
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
      options: { allowDuplicates?: boolean } = {}
    ) => {
      const result = addIngredientsToShoppingList(
        itemsRef.current,
        ingredients,
        source,
        { createId: createShoppingListItemId, allowDuplicates: options.allowDuplicates }
      );
      if (result.added.length) {
        await persistItems(result.items);
      }
      return result;
    },
    [persistItems]
  );

  const addItem = useCallback(
    (label: string) => addIngredients([label]),
    [addIngredients]
  );

  const toggleItem = useCallback(
    async (itemId: string) => {
      const item = itemsRef.current.find((currentItem) => currentItem.id === itemId);
      if (!item) {
        return;
      }
      await persistItems(
        setShoppingListItemChecked(itemsRef.current, itemId, !item.checked)
      );
    },
    [persistItems]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      await persistItems(removeShoppingListItem(itemsRef.current, itemId));
    },
    [persistItems]
  );

  const updateItem = useCallback(
    async (itemId: string, label: string) => {
      await persistItems(
        updateShoppingListItemLabel(itemsRef.current, itemId, label)
      );
    },
    [persistItems]
  );

  const moveItem = useCallback(
    async (itemId: string, direction: -1 | 1) => {
      await persistItems(moveShoppingListItem(itemsRef.current, itemId, direction));
    },
    [persistItems]
  );

  const clearChecked = useCallback(async () => {
    const checkedCount = itemsRef.current.filter((item) => item.checked).length;
    await persistItems(clearCheckedShoppingListItems(itemsRef.current));
    return checkedCount;
  }, [persistItems]);

  const clearAll = useCallback(async () => {
    await persistItems([]);
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
      updateItem
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
      updateItem
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
