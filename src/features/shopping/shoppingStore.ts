import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import {
  normalizeShoppingListItems,
  type ShoppingListItem
} from "./shoppingList";

const SHOPPING_LIST_KEY = "shopping.list.items.v1";

export async function loadShoppingListItems() {
  const stored = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
  if (!stored) {
    return [];
  }

  try {
    return normalizeShoppingListItems(JSON.parse(stored));
  } catch {
    return [];
  }
}

export async function saveShoppingListItems(items: ShoppingListItem[]) {
  await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(items));
}

export function createShoppingListItemId() {
  return `shopping-${Crypto.randomUUID()}`;
}
