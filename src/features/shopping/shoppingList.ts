export type ShoppingListItem = {
  id: string;
  label: string;
  checked: boolean;
  recipeId?: string;
  recipeName?: string;
  createdAt: string;
  updatedAt: string;
};

export type ShoppingListSource = {
  recipeId?: string | null;
  recipeName?: string;
};

export type ShoppingListAddResult = {
  added: ShoppingListItem[];
  items: ShoppingListItem[];
};

type AddOptions = {
  createId?: () => string;
  now?: string;
  allowDuplicates?: boolean;
};

export function normalizeShoppingListItems(value: unknown): ShoppingListItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeShoppingListItem)
    .filter((item): item is ShoppingListItem => Boolean(item));
}

export function addIngredientsToShoppingList(
  currentItems: ShoppingListItem[],
  ingredients: string[],
  source: ShoppingListSource = {},
  options: AddOptions = {}
): ShoppingListAddResult {
  const now = options.now ?? new Date().toISOString();
  const createId = options.createId ?? createDefaultId;
  const existingKeys = new Set(currentItems.map(getDuplicateKey));
  const added: ShoppingListItem[] = [];

  for (const ingredient of ingredients) {
    const label = normalizeShoppingText(ingredient);
    if (!label) {
      continue;
    }

    const item: ShoppingListItem = {
      id: createId(),
      label,
      checked: false,
      recipeId: source.recipeId ?? undefined,
      recipeName: normalizeShoppingText(source.recipeName ?? ""),
      createdAt: now,
      updatedAt: now
    };
    const duplicateKey = getDuplicateKey(item);
    if (!options.allowDuplicates && existingKeys.has(duplicateKey)) {
      continue;
    }

    existingKeys.add(duplicateKey);
    added.push(item);
  }

  return {
    added,
    items: [...currentItems, ...added]
  };
}

export function setShoppingListItemChecked(
  items: ShoppingListItem[],
  itemId: string,
  checked: boolean,
  now = new Date().toISOString()
) {
  return items.map((item) =>
    item.id === itemId ? { ...item, checked, updatedAt: now } : item
  );
}

export function updateShoppingListItemLabel(
  items: ShoppingListItem[],
  itemId: string,
  label: string,
  now = new Date().toISOString()
) {
  const normalizedLabel = normalizeShoppingText(label);
  if (!normalizedLabel) {
    return items;
  }

  return items.map((item) =>
    item.id === itemId
      ? { ...item, label: normalizedLabel, updatedAt: now }
      : item
  );
}

export function moveShoppingListItem(
  items: ShoppingListItem[],
  itemId: string,
  direction: -1 | 1
) {
  const currentIndex = items.findIndex((item) => item.id === itemId);
  const nextIndex = currentIndex + direction;
  if (
    currentIndex < 0 ||
    nextIndex < 0 ||
    nextIndex >= items.length
  ) {
    return items;
  }

  const nextItems = [...items];
  const [item] = nextItems.splice(currentIndex, 1);
  nextItems.splice(nextIndex, 0, item);
  return nextItems;
}

export function removeShoppingListItem(
  items: ShoppingListItem[],
  itemId: string
) {
  return items.filter((item) => item.id !== itemId);
}

export function clearCheckedShoppingListItems(items: ShoppingListItem[]) {
  return items.filter((item) => !item.checked);
}

function normalizeShoppingListItem(value: unknown): ShoppingListItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<ShoppingListItem>;
  const id = normalizeShoppingText(item.id);
  const label = normalizeShoppingText(item.label);
  if (!id || !label) {
    return null;
  }

  const createdAt = normalizeShoppingText(item.createdAt);
  const updatedAt = normalizeShoppingText(item.updatedAt);

  return {
    id,
    label,
    checked: Boolean(item.checked),
    recipeId: normalizeShoppingText(item.recipeId),
    recipeName: normalizeShoppingText(item.recipeName),
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: updatedAt || createdAt || new Date().toISOString()
  };
}

function getDuplicateKey(item: ShoppingListItem) {
  return [
    normalizeForDuplicate(item.recipeId ?? item.recipeName ?? ""),
    normalizeForDuplicate(item.label)
  ].join("\n");
}

function normalizeShoppingText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeForDuplicate(value: string) {
  return normalizeShoppingText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function createDefaultId() {
  return `shopping-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
