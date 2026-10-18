import {
  replaceGeneratedShoppingItems, addIngredientsToShoppingList, clearCheckedShoppingListItems, moveShoppingListItem,
  removeShoppingListItem, setShoppingListItemChecked, updateShoppingListItemLabel,
  type ShoppingListItem, type ShoppingListSource, type ShoppingListAddResult
} from "./shoppingList";
import { parseShoppingMode, type ShoppingMode } from "./shoppingModes";
import { PantryError, type PantryClient, type PantryItem, type PantryItemPatch } from "../pantry/pantryClient";
import { PantrySession, type PantryState } from "../pantry/pantrySession";
import { migrateShoppingToPantry, pantryShoppingItems, shoppingLabelKey, type MigrationStorage } from "../pantry/pantryMigration";
import type { PantryCache, PantrySelection } from "../pantry/pantryStore";
import type { PullResult } from "./remindersSync";
import { pantryPermissions } from "../pantry/pantrySession";

export type ShoppingModeState = {
  mode: ShoppingMode;
  items: ShoppingListItem[];
  loading: boolean;
  switching: boolean;
  sharedSyncing: boolean;
  sharedError: string | null;
  participantCount: number | null;
  pantry: PantryState | null;
};
type Payload = { items: ShoppingListItem[]; participantCount?: number; lastUpdatedBy?: string };
export type ShoppingModeDependencies = {
  accountKey: string | null;
  loadMode: () => Promise<string | null>;
  saveMode: (mode: ShoppingMode) => Promise<void>;
  legacyCode: () => Promise<string | null>;
  clearLegacyCode: () => Promise<void>;
  loadItems: () => Promise<ShoppingListItem[]>;
  saveItems: (items: ShoppingListItem[]) => Promise<void>;
  createId: () => string;
  pantryClient: () => PantryClient;
  pantryStorage: { load: () => Promise<PantryCache | null>; save: (cache: PantryCache) => Promise<void>; clear: () => Promise<void> };
  migrationStorage: (selection: PantrySelection) => MigrationStorage;
  firebase: {
    create: (items: ShoppingListItem[]) => Promise<string>;
    join: (code: string, items: ShoppingListItem[]) => Promise<ShoppingListItem[]>;
    leave: (code: string) => Promise<void>;
    flush: (code: string, items: ShoppingListItem[]) => Promise<void>;
    cancel: () => void;
    push: (code: string, items: ShoppingListItem[], onError: (error: unknown) => void) => void;
    subscribe: (code: string, update: (payload: Payload) => void, error: (error: unknown) => void) => () => void;
  };
  onLocalItems?: (items: ShoppingListItem[]) => void;
  onItems?: (items: ShoppingListItem[]) => void;
  onSharedUpdate?: (previous: ShoppingListItem[], payload: Payload) => void;
};

// One persisted authority and one active transport. The source remains recoverable
// until the destination data and mode have both been written successfully.
export class ShoppingModeController {
  readonly accountKey: string | null;
  private state: ShoppingModeState = { mode: { kind: "local" }, items: [], loading: true, switching: false, sharedSyncing: false, sharedError: null, participantCount: null, pantry: null };
  private listeners = new Set<() => void>();
  private unsubscribe: (() => void) | null = null;
  private pantryUnsubscribe: (() => void) | null = null;
  private session: PantrySession | null = null;
  private migrationClient: PantryClient | null = null;
  private disposed = false;
  private generation = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private queued = 0;
  private sharedWrites: Promise<void> = Promise.resolve();
  constructor(private dependencies: ShoppingModeDependencies) { this.accountKey = dependencies.accountKey; }
  getSnapshot = () => this.state;
  isCurrent = () => !this.disposed;
  getRevision = () => this.generation;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private patch(patch: Partial<ShoppingModeState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private assertActive() { if (this.disposed) throw new Error("Shopping session changed"); }
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state.loading || this.state.switching || this.disposed) return Promise.reject(new Error("Shopping list busy"));
    const generation = this.generation;
    this.queued++;
    const next = this.queue.catch(() => undefined).then(async () => {
      this.assertActive();
      if (generation !== this.generation) throw new Error("Shopping mode changed");
      return operation();
    });
    this.queue = next.finally(() => { this.queued--; });
    void this.queue.catch(() => undefined);
    return next;
  }
  async load() {
    try {
      const [raw, legacyCode, items] = await Promise.all([this.dependencies.loadMode(), this.dependencies.legacyCode(), this.dependencies.loadItems()]);
      this.assertActive();
      const mode = parseShoppingMode(raw, this.accountKey, legacyCode);
      this.patch({ mode, items: mode.kind === "pantry" ? [] : items });
      if (mode.kind === "pantry") {
        this.startPantry();
        await this.session!.load(mode.selection);
      } else if (mode.kind === "firebase") this.startFirebase(mode.code);
    } finally { this.patch({ loading: false }); }
  }
  private stopFirebase() {
    this.generation++;
    this.unsubscribe?.(); this.unsubscribe = null;
    this.dependencies.firebase.cancel();
  }
  private startFirebase(code: string, protectPendingItems = false) {
    const generation = this.generation;
    this.patch({ sharedSyncing: true });
    this.unsubscribe = this.dependencies.firebase.subscribe(code, (payload) => {
      if (this.disposed || this.state.switching || generation !== this.generation || this.state.mode.kind !== "firebase") return;
      if (protectPendingItems) {
        const current = this.state.items;
        const acknowledged = payload.items.length === current.length && payload.items.every((item, index) =>
          item.id === current[index].id && item.label === current[index].label && item.checked === current[index].checked);
        if (!acknowledged) return;
        protectPendingItems = false;
      }
      const previous = this.state.items;
      this.patch({ items: payload.items, sharedSyncing: false, participantCount: payload.participantCount ?? null });
      this.dependencies.onItems?.(payload.items);
      this.sharedWrites = this.sharedWrites.catch(() => undefined).then(async () => {
        if (this.disposed || generation !== this.generation) return;
        await this.dependencies.saveItems(payload.items);
      });
      void this.sharedWrites.catch(() => this.patch({ sharedError: "storage" }));
      this.dependencies.onSharedUpdate?.(previous, payload);
    }, () => { if (generation === this.generation) this.patch({ sharedSyncing: false, sharedError: "sync" }); });
    if (protectPendingItems) this.dependencies.firebase.push(code, this.state.items, () => { if (generation === this.generation) this.patch({ sharedError: "sync" }); });
  }
  private stopPantry() {
    this.pantryUnsubscribe?.(); this.pantryUnsubscribe = null;
    this.session?.dispose(); this.session = null;
  }
  private startPantry(cache?: PantryCache) {
    this.stopPantry();
    const session = new PantrySession(this.dependencies.pantryClient(), this.dependencies.pantryStorage);
    this.session = session;
    const update = () => {
      if (this.disposed || this.state.mode.kind !== "pantry" || this.state.switching) return;
      const pantry = session.getSnapshot();
      const items = pantry.selection && pantry.refreshedAt ? pantryShoppingItems({ selection: pantry.selection, items: pantry.items, refreshedAt: pantry.refreshedAt }) : [];
      this.patch({ pantry, items });
      if (pantry.fresh && !pantry.busy && !this.state.loading) this.dependencies.onItems?.(items);
    };
    this.pantryUnsubscribe = session.subscribe(update);
    if (cache) session.usePrepared(cache);
    update();
  }
  private async commit(mode: ShoppingMode, items: ShoppingListItem[], cache?: PantryCache) {
    this.assertActive();
    // Never overwrite the old local list with another account's Pantry cache on logout.
    if (cache) await this.dependencies.pantryStorage.save(cache);
    this.assertActive();
    if (mode.kind !== "pantry") await this.dependencies.saveItems(items);
    this.assertActive();
    await this.dependencies.saveMode(mode); // the single authoritative commit point
    this.assertActive();
    this.stopFirebase(); this.stopPantry();
    this.patch({ mode, items, pantry: null, sharedSyncing: false, sharedError: null, participantCount: null, switching: false });
    if (mode.kind === "pantry") this.startPantry(cache);
    else if (mode.kind === "firebase") this.startFirebase(mode.code);
    // Legacy keys cannot reactivate an old Firebase connection after a restart.
    await this.dependencies.clearLegacyCode().catch(() => undefined);
  }
  private async transition(prepare: (source: ShoppingListItem[]) => Promise<{ mode: ShoppingMode; items: ShoppingListItem[]; cache?: PantryCache }>) {
    if (this.state.loading || this.state.switching || this.queued) throw new Error("Shopping list busy");
    const oldMode = this.state.mode;
    this.patch({ switching: true, sharedError: null });
    // Invalidate already queued snapshot callbacks before the first await.
    this.stopFirebase();
    let previousLocal: ShoppingListItem[] | null = null;
    let previousPantry: PantryCache | null = null;
    let preparedDone = false;
    let committed = false;
    let flushFailed = false;
    try {
      await this.sharedWrites.catch(() => undefined);
      this.assertActive();
      previousLocal = await this.dependencies.loadItems();
      previousPantry = await this.dependencies.pantryStorage.load();
      if (oldMode.kind === "pantry" && this.session) {
        await this.session.refresh();
        const pantry = this.session.getSnapshot();
        if (pantry.selection && pantry.refreshedAt) this.patch({ pantry, items: pantryShoppingItems({ selection: pantry.selection, items: pantry.items, refreshedAt: pantry.refreshedAt }) });
      }
      if (oldMode.kind === "firebase") {
        // The current list is already saved on-device. Leaving an offline share
        // must still allow local mode, just as before; carry these items forward.
        await this.dependencies.firebase.flush(oldMode.code, this.state.items).catch(() => { flushFailed = true; });
      }
      const source = this.state.items.map((item) => ({ ...item }));
      const prepared = await prepare(source);
      preparedDone = true;
      this.assertActive();
      await this.commit(prepared.mode, prepared.items, prepared.cache);
      committed = true;
      if (oldMode.kind === "firebase" && (prepared.mode.kind !== "firebase" || prepared.mode.code !== oldMode.code)) {
        await this.dependencies.firebase.leave(oldMode.code).catch(() => undefined);
      }
    } catch (error) {
      if (committed) return;
      if (preparedDone && !committed && !this.disposed) {
        if (previousLocal) await this.dependencies.saveItems(previousLocal).catch(() => undefined);
        if (previousPantry) await this.dependencies.pantryStorage.save(previousPantry).catch(() => undefined);
        else await this.dependencies.pantryStorage.clear().catch(() => undefined);
      }
      this.patch({ switching: false });
      if (!this.disposed && oldMode.kind === "firebase") this.startFirebase(oldMode.code, flushFailed);
      throw error;
    }
  }
  switchToLocal = () => this.state.mode.kind === "local" ? Promise.resolve() : this.transition(async (source) => ({ mode: { kind: "local" }, items: source }));
  switchToFirebase = async (code?: string): Promise<string> => {
    if (this.state.mode.kind === "firebase" && (!code || code.trim().toUpperCase() === this.state.mode.code)) return this.state.mode.code;
    let joinedCode: string | null = null;
    try {
      await this.transition(async (source) => {
        const normalized = code?.trim().toUpperCase();
        const items = normalized ? await this.dependencies.firebase.join(normalized, source) : source;
        joinedCode = normalized || await this.dependencies.firebase.create(items);
        return { mode: { kind: "firebase", code: joinedCode }, items };
      });
      return joinedCode!;
    } catch (error) {
      if (joinedCode) await this.dependencies.firebase.leave(joinedCode).catch(() => undefined);
      throw error;
    }
  };
  switchToPantry = async (selection: PantrySelection) => {
    if (!this.accountKey) throw new PantryError("auth");
    if (this.state.mode.kind === "pantry" && this.state.mode.selection.house.id === selection.house.id && this.state.mode.selection.list.id === selection.list.id) return;
    await this.transition(async (source) => {
      const client = this.dependencies.pantryClient();
      this.migrationClient = client;
      const journal = this.dependencies.migrationStorage(selection);
      try {
        const cache = await migrateShoppingToPantry(client, selection, source, journal, () => !this.disposed);
        this.assertActive();
        return { mode: { kind: "pantry", accountKey: this.accountKey!, selection: cache.selection }, items: pantryShoppingItems(cache), cache };
      } finally { client.dispose(); this.migrationClient = null; }
    });
    await this.dependencies.migrationStorage(selection).clear().catch(() => undefined);
  };
  private async persist(items: ShoppingListItem[], skipSync?: boolean) {
    await this.dependencies.saveItems(items);
    this.assertActive(); this.patch({ items });
    if (!skipSync) {
      this.dependencies.onLocalItems?.(items);
      this.dependencies.onItems?.(items);
    }
    // skipSync suppresses the echo to Apple, never the active shared backend.
    if (this.state.mode.kind === "firebase") {
      const generation = this.generation;
      this.dependencies.firebase.push(this.state.mode.code, items, () => { if (generation === this.generation) this.patch({ sharedError: "sync" }); });
    }
  }

  applyRemindersChanges = (result: PullResult, baseline: ShoppingListItem[], register: (mappings: { avocookId: string; reminderId: string }[]) => Promise<void>) => this.enqueue(async () => {
    const permissions = this.state.mode.kind === "pantry" ? pantryPermissions(this.session!.getSnapshot().selection) : { add: true, check: true, edit: true, delete: true };
    for (const incoming of result.updatedItems) {
      const before = baseline.find((item) => item.id === incoming.id);
      const current = this.state.items.find((item) => item.id === incoming.id);
      if (!before || !current) continue;
      if (permissions.edit && incoming.label !== before.label && current.label === before.label) {
        if (this.state.mode.kind === "pantry") {
          const item = this.pantryItem(current.id);
          const quantity = item.quantity?.trim();
          // The reminder title includes quantity. Preserve the separate quantity
          // when its prefix is unchanged; never prepend it twice after a rename.
          const retainsQuantity = quantity && incoming.label.startsWith(`${quantity} `);
          await this.requirePantry(this.session!.updateItem(item, {
            name: retainsQuantity ? incoming.label.slice(quantity.length + 1).trim() : incoming.label.trim(),
            ...(!retainsQuantity && quantity ? { quantity: "" } : {})
          }));
        } else await this.persist(updateShoppingListItemLabel(this.state.items, current.id, incoming.label), true);
      }
      if (permissions.check && incoming.checked !== before.checked && current.checked === before.checked) {
        // Pantry's completion endpoint may repeat or delete the article.
        if (this.state.mode.kind === "pantry") await this.requirePantry(this.session!.toggleItem(this.pantryItem(current.id)));
        else await this.persist(setShoppingListItemChecked(this.state.items, current.id, incoming.checked), true);
      }
    }
    const claimed = new Set<string>();
    if (permissions.add) for (const reminder of result.newReminderItems) {
      if (!reminder.label.trim()) continue;
      let added = this.state.items.find((item) => !claimed.has(item.id) && !baseline.some((before) => before.id === item.id) && item.label === reminder.label && item.checked === reminder.checked);
      if (!added && this.state.mode.kind === "pantry") {
        const beforeIds = new Set(this.state.items.map((item) => item.id));
        await this.requirePantry(this.session!.addItem(reminder.label));
        added = this.state.items.find((item) => !beforeIds.has(item.id));
      } else if (!added) {
        const next = addIngredientsToShoppingList(this.state.items, [reminder.label], {}, { createId: this.dependencies.createId, allowDuplicates: true });
        added = next.added[0];
        await this.persist(next.items, true);
      }
      if (!added) continue;
      claimed.add(added.id);
      await register([{ avocookId: added.id, reminderId: reminder.reminderId }]);
      if (reminder.checked && !added.checked && permissions.check) {
        if (this.state.mode.kind === "pantry") await this.requirePantry(this.session!.toggleItem(this.pantryItem(added.id)));
        else await this.persist(setShoppingListItemChecked(this.state.items, added.id, true), true);
      }
    }
    if (permissions.delete) for (const id of result.deletedItemIds) {
      const before = baseline.find((item) => item.id === id);
      const current = this.state.items.find((item) => item.id === id);
      if (!before || !current || current.label !== before.label || current.checked !== before.checked) continue;
      if (this.state.mode.kind === "pantry") await this.requirePantry(this.session!.deleteItem(this.pantryItem(id)));
      else await this.persist(removeShoppingListItem(this.state.items, id), true);
    }
  });
  private pantryItem(id: string) {
    const item = this.session?.getSnapshot().items.find((item) => id === `pantry-${this.state.mode.kind === "pantry" ? this.state.mode.selection.house.id : 0}-${item.listId}-${item.id}`);
    if (!item) throw new PantryError("invalid");
    return item;
  }
  private async requirePantry(ok: Promise<boolean>) {
    if (!(await ok)) throw new PantryError(this.session?.getSnapshot().error ?? "network");
  }
  addIngredients = (ingredients: string[], source: ShoppingListSource = {}, options: { allowDuplicates?: boolean; skipSync?: boolean } = {}): Promise<ShoppingListAddResult> => this.enqueue(async () => {
    if (this.state.mode.kind !== "pantry") {
      const result = addIngredientsToShoppingList(this.state.items, ingredients, source, { createId: this.dependencies.createId, allowDuplicates: options.allowDuplicates });
      if (result.added.length) await this.persist(result.items, options.skipSync);
      return result;
    }
    const added: ShoppingListItem[] = [];
    for (const label of ingredients) {
      if (!label.trim()) continue;
      if (!options.allowDuplicates && this.state.items.some((item) => !item.checked && shoppingLabelKey(item.label) === shoppingLabelKey(label))) continue;
      const before = new Set(this.state.items.map((item) => item.id));
      await this.requirePantry(this.session!.addItem(label, source.recipeName));
      added.push(...this.state.items.filter((item) => !before.has(item.id)));
    }
    return { added, items: this.state.items };
  });
  replaceGeneratedIngredients = (ingredients: string[], source: ShoppingListSource & { recipeId: string }): Promise<ShoppingListAddResult> => this.enqueue(async () => {
    // Remote backends do not expose an atomic group replacement operation.
    if (this.state.mode.kind !== "local") throw new Error("Generated list replacement requires local shopping mode");
    const result = replaceGeneratedShoppingItems(this.state.items, ingredients, source, { createId: this.dependencies.createId });
    await this.persist(result.items);
    return result;
  });
  toggleItem = (id: string, options?: { skipSync?: boolean }) => this.enqueue(async () => {
    if (this.state.mode.kind === "pantry") return this.requirePantry(this.session!.toggleItem(this.pantryItem(id)));
    const item = this.state.items.find((item) => item.id === id);
    if (item) await this.persist(setShoppingListItemChecked(this.state.items, id, !item.checked), options?.skipSync);
  });
  removeItem = (id: string, options?: { skipSync?: boolean }) => this.enqueue(async () => {
    if (this.state.mode.kind === "pantry") return this.requirePantry(this.session!.deleteItem(this.pantryItem(id)));
    await this.persist(removeShoppingListItem(this.state.items, id), options?.skipSync);
  });
  updateItem = (id: string, label: string, options?: { skipSync?: boolean }) => this.enqueue(async () => {
    if (this.state.mode.kind === "pantry") return this.requirePantry(this.session!.renameItem(this.pantryItem(id), label));
    await this.persist(updateShoppingListItemLabel(this.state.items, id, label), options?.skipSync);
  });
  updatePantryItem = (item: PantryItem, patch: PantryItemPatch) => this.enqueue(async () => {
    if (this.state.mode.kind !== "pantry") throw new PantryError("invalid");
    await this.requirePantry(this.session!.updateItem(item, patch));
  });
  moveItem = (id: string, direction: -1 | 1, options?: { skipSync?: boolean }) => this.enqueue(async () => {
    if (this.state.mode.kind === "pantry") return this.requirePantry(this.session!.moveItem(this.pantryItem(id), direction));
    await this.persist(moveShoppingListItem(this.state.items, id, direction), options?.skipSync);
  });
  clearChecked = (options?: { skipSync?: boolean }) => this.enqueue(async () => {
    const checked = this.state.items.filter((item) => item.checked);
    if (this.state.mode.kind === "pantry") {
      for (const item of checked) await this.requirePantry(this.session!.deleteItem(this.pantryItem(item.id)));
    } else await this.persist(clearCheckedShoppingListItems(this.state.items), options?.skipSync);
    return checked.length;
  });
  clearAll = (options?: { skipSync?: boolean }) => this.enqueue(async () => {
    if (this.state.mode.kind === "pantry") {
      for (const item of [...this.state.items]) await this.requirePantry(this.session!.deleteItem(this.pantryItem(item.id)));
    } else await this.persist([], options?.skipSync);
  });
  refreshItems = async () => {
    if (this.state.switching || this.queued || this.disposed) return;
    if (this.state.mode.kind === "pantry") await this.session?.refresh();
    else this.patch({ items: await this.dependencies.loadItems() });
  };
  dispose() {
    this.disposed = true;
    this.stopFirebase(); this.stopPantry(); this.migrationClient?.dispose(); this.listeners.clear();
  }
}
