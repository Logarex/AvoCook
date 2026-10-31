import type { ShoppingListItem } from "../shopping/shoppingList";
import {
  PantryError, type PantryClient, type PantryErrorCode,
  type PantryHouse, type PantryItem, type PantryList, type PantryItemPatch
} from "./pantryClient";
import type { PantryCache, PantrySelection } from "./pantryStore";

type Storage = {
  load: () => Promise<PantryCache | null>;
  save: (cache: PantryCache) => Promise<void>;
  clear: () => Promise<void>;
};
export type PantryState = {
  ready: boolean;
  busy: boolean;
  view: "welcome" | "houses" | "lists" | "items";
  houses: PantryHouse[];
  house: PantryHouse | null;
  lists: PantryList[];
  selection: PantrySelection | null;
  items: PantryItem[];
  refreshedAt: string | null;
  fresh: boolean;
  error: PantryErrorCode | null;
  cacheWarning: boolean;
  transfer: { added: number; skipped: number } | null;
};

function labelKey(label: string) {
  return label.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
}
export function pantryItemLabel(item: PantryItem) {
  return [item.quantity?.trim(), item.name.trim()].filter(Boolean).join(" ");
}

export function pantryPermissions(selection: PantrySelection | null) {
  const allowed = (capability: string) => {
    if (!selection) return false;
    const { house, list } = selection;
    if (house.isAdmin) return true;
    if (list.sharedOnly && !list.canEdit) return false;
    return house.permissions ? house.permissions[capability] === true : list.canEdit !== false;
  };
  return { add: allowed("canAddItems"), check: allowed("canCheckItems"), edit: allowed("canEditLists"), delete: allowed("canDeleteItems") };
}

export class PantrySession {
  private state: PantryState = {
    ready: false, busy: false, view: "welcome", houses: [], house: null, lists: [],
    selection: null, items: [], refreshedAt: null, fresh: false, error: null,
    cacheWarning: false, transfer: null
  };
  private listeners = new Set<() => void>();
  private disposed = false;
  constructor(private client: PantryClient, private storage: Storage) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  dispose() {
    this.disposed = true;
    this.client.dispose();
    this.listeners.clear();
  }
  private patch(patch: Partial<PantryState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private async run(action: () => Promise<void>, clearTransfer = true): Promise<boolean> {
    if (this.disposed || this.state.busy) return false;
    this.patch({ busy: true, error: null, ...(clearTransfer ? { transfer: null } : {}) });
    try {
      await action();
      return !this.disposed;
    } catch (error) {
      this.patch({ error: error instanceof PantryError ? error.code : "network", fresh: false });
      return false;
    } finally {
      this.patch({ busy: false });
    }
  }
  private async cache() {
    if (this.disposed || !this.state.selection || !this.state.refreshedAt) return;
    try {
      await this.storage.save({ selection: this.state.selection, items: this.state.items, refreshedAt: this.state.refreshedAt });
      this.patch({ cacheWarning: false });
    } catch {
      this.patch({ cacheWarning: true });
    }
  }
  private async fetchSelection(selection: PantrySelection) {
    const house = await this.client.house(selection.house.id);
    const list = await this.client.list(house.id, selection.list.id);
    const items = await this.client.items(selection.house.id, list.id);
    if (this.disposed) return;
    this.patch({ selection: { house, list }, items, fresh: true, refreshedAt: new Date().toISOString() });
    await this.cache();
  }
  usePrepared(cache: PantryCache) {
    this.patch({ ...cache, ready: true, fresh: true, view: "items", error: null });
  }
  async load(selection?: PantrySelection) {
    await this.run(async () => {
      let cache: PantryCache | null = null;
      try { cache = await this.storage.load(); } catch { this.patch({ cacheWarning: true }); }
      if (this.disposed) return;
      const matching = cache && (!selection || (cache.selection.house.id === selection.house.id && cache.selection.list.id === selection.list.id)) ? cache : null;
      this.patch({ ready: true, ...(matching ? { ...matching, view: "items" as const } : selection ? { selection, view: "items" as const } : {}) });
      if (selection || matching) await this.fetchSelection(selection ?? matching!.selection);
    });
  }
  discover = () => this.run(async () => {
    const houses = await this.client.houses();
    this.patch({ houses, view: "houses", house: null, lists: [] });
  });
  chooseHouse = (house: PantryHouse) => this.run(async () => {
    const lists = await this.client.lists(house.id);
    if (lists.some((list) => list.houseId !== house.id)) throw new PantryError("invalid");
    this.patch({ house, lists, view: "lists" });
  });
  link = (list: PantryList) => this.run(async () => {
    const house = this.state.house;
    if (!house || list.houseId !== house.id) throw new PantryError("invalid");
    await this.fetchSelection({ house, list });
    this.patch({ view: "items", transfer: null });
  });
  createList = (name: string) => this.run(async () => {
    const house = this.state.house;
    if (!house || !name.trim()) return;
    const list = await this.client.createList(house.id, name);
    if (this.disposed) return;
    this.patch({ lists: [...this.state.lists, list] });
    await this.fetchSelection({ house, list });
    this.patch({ view: "items" });
  });
  refresh = () => this.run(async () => {
    if (this.state.selection) await this.fetchSelection(this.state.selection);
  }, false);
  back() {
    if (this.state.busy) return;
    this.patch({ error: null, view: this.state.view === "lists" ? "houses" : this.state.selection ? "items" : "welcome" });
  }
  disconnect = () => this.run(async () => {
    await this.storage.clear();
    this.patch({ selection: null, items: [], refreshedAt: null, fresh: false, view: "welcome", cacheWarning: false });
  });
  private writableSelection(action: keyof ReturnType<typeof pantryPermissions>) {
    const selection = this.state.selection;
    if (!selection || !this.state.fresh) throw new PantryError("network");
    if (!pantryPermissions(selection)[action]) throw new PantryError("forbidden");
    return selection;
  }
  private async replaceItem(item: PantryItem) {
    if (this.disposed) return;
    const remaining = this.state.items.filter((existing) => existing.id !== item.id);
    const index = this.state.items.findIndex((existing) => existing.id === item.id);
    if (!item.deletedAt && !item.archivedAt) remaining.splice(index < 0 ? remaining.length : index, 0, item);
    this.patch({ items: remaining, refreshedAt: new Date().toISOString() });
    await this.cache();
  }
  addItem = (name: string, description?: string) => this.run(async () => {
    if (!name.trim()) return;
    const { house, list } = this.writableSelection("add");
    await this.replaceItem(await this.client.addItem(house.id, list.id, name, description));
  });
  updateItem = (item: PantryItem, patch: PantryItemPatch) => this.run(async () => {
    const { house, list } = this.writableSelection("edit");
    await this.replaceItem(await this.client.updateItem(house.id, list.id, item.id, patch));
  });
  moveItem = (item: PantryItem, direction: -1 | 1) => this.run(async () => {
    const { house, list } = this.writableSelection("edit");
    const ordered = [...this.state.items];
    const index = ordered.findIndex((current) => current.id === item.id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ordered.length) return;
    ordered.splice(next, 0, ordered.splice(index, 1)[0]);
    await this.client.reorderItems(house.id, list.id, ordered.map((current) => current.id));
    this.patch({ items: ordered, refreshedAt: new Date().toISOString() });
    await this.cache();
  });
  renameItem = (item: PantryItem, name: string) => this.run(async () => {
    if (!name.trim()) return;
    const { house, list } = this.writableSelection("edit");
    await this.replaceItem(await this.client.renameItem(house.id, list.id, item.id, name));
  });
  toggleItem = (item: PantryItem) => this.run(async () => {
    const { house, list } = this.writableSelection("check");
    await this.replaceItem(await this.client.toggleItem(house.id, list.id, item.id));
  });
  deleteItem = (item: PantryItem) => this.run(async () => {
    const { house, list } = this.writableSelection("delete");
    await this.client.deleteItem(house.id, list.id, item.id);
    this.patch({ items: this.state.items.filter((existing) => existing.id !== item.id), refreshedAt: new Date().toISOString() });
    await this.cache();
  });
  transfer = (localItems: ShoppingListItem[]) => this.run(async () => {
    const selection = this.writableSelection("add");
    await this.fetchSelection(selection);
    const { house, list } = this.writableSelection("add");
    const existing = new Set(this.state.items.filter((item) => !item.done).map((item) => labelKey(pantryItemLabel(item))));
    let added = 0;
    let skipped = 0;
    this.patch({ transfer: { added, skipped } });
    for (const item of localItems) {
      if (this.disposed) return;
      if (item.checked || !item.label.trim()) continue;
      const key = labelKey(item.label);
      if (existing.has(key)) { skipped++; }
      else {
        const created = await this.client.addItem(house.id, list.id, item.label, item.recipeName);
        await this.replaceItem(created);
        existing.add(key);
        added++;
      }
      this.patch({ transfer: { added, skipped } });
    }
  });
}
