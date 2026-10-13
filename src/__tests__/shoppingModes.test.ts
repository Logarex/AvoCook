import { describe, expect, it, vi } from "vitest";
import { PantryClient, PantryError, type PantryItem } from "../features/pantry/pantryClient";
import { ShoppingModeController, type ShoppingModeDependencies } from "../features/shopping/shoppingModeController";
import { mergeShoppingItemsForSwitch, parseShoppingMode, type ShoppingMode } from "../features/shopping/shoppingModes";
import type { PantryCache } from "../features/pantry/pantryStore";
import { addIngredientsToShoppingList } from "../features/shopping/shoppingList";
import type { ShoppingListItem } from "../features/shopping/shoppingList";

const house = { id: 1, name: "Home", isAdmin: true };
const list = { id: 2, houseId: 1, name: "Groceries", canEdit: true };
const accountKey = "alice@cloud";
const selection = { house, list };
const credentials = { serverUrl: "https://cloud.example", username: "alice", appPassword: "test-only" };
function localItems(...labels: string[]) {
  let nextId = 0;
  return addIngredientsToShoppingList([], labels, { recipeId: "pasta", recipeName: "Pasta" }, { createId: () => `local-${++nextId}`, allowDuplicates: true }).items;
}
function fixture(initial: ShoppingListItem[] = localItems("Milk", "Bread"), initialMode: ShoppingMode | null = null) {
  let raw = initialMode ? JSON.stringify(initialMode) : null;
  let local = structuredClone(initial);
  let cache: PantryCache | null = null;
  let journal: string | null = null;
  let nextId = 10;
  let remote: PantryItem[] = [];
  const otherLists = new Map<number, PantryItem[]>();
  const remoteFor = (listId: number) => listId === 2 ? remote : otherLists.get(listId) ?? [];
  const callbacks: { update: Parameters<ShoppingModeDependencies["firebase"]["subscribe"]>[1]; unsubscribe: ReturnType<typeof vi.fn> }[] = [];
  const clients: PantryClient[] = [];
  const api = {
    house: vi.fn(async () => house), list: vi.fn(async (_house: number, id: number) => ({ ...list, id })),
    items: vi.fn(async (_house: number, listId: number) => structuredClone(remoteFor(listId))),
    add: vi.fn(async (_house: number, _list: number, name: string, description?: string) => {
      const item: PantryItem = { id: nextId++, listId: _list, name, quantity: null, description: description ?? null, done: false };
      if (_list === 2) remote.push(item); else otherLists.set(_list, [...remoteFor(_list), item]);
      return structuredClone(item);
    }),
    toggle: vi.fn(async (_house: number, _list: number, id: number) => {
      const item = remoteFor(_list).find((item) => item.id === id)!;
      item.done = !item.done; return structuredClone(item);
    }),
    update: vi.fn(async (_house: number, _list: number, id: number, patch: object) => {
      const item = remoteFor(_list).find((item) => item.id === id)!;
      Object.assign(item, patch); return structuredClone(item);
    }),
    delete: vi.fn(async (_house: number, _list: number, id: number) => { remote = remote.filter((item) => item.id !== id); }),
    reorder: vi.fn(async () => {})
  };
  const dependencies: ShoppingModeDependencies = {
    accountKey, loadMode: vi.fn(async () => raw), saveMode: vi.fn(async (mode) => { raw = JSON.stringify(mode); }),
    legacyCode: vi.fn(async () => null), clearLegacyCode: vi.fn(async () => {}),
    loadItems: vi.fn(async () => structuredClone(local)), saveItems: vi.fn(async (items) => { local = structuredClone(items); }), createId: () => `new-${nextId++}`,
    pantryClient: () => {
      const client = new PantryClient(credentials); clients.push(client);
      vi.spyOn(client, "house").mockImplementation(api.house); vi.spyOn(client, "list").mockImplementation(api.list);
      vi.spyOn(client, "items").mockImplementation(api.items); vi.spyOn(client, "addItem").mockImplementation(api.add);
      vi.spyOn(client, "toggleItem").mockImplementation(api.toggle); vi.spyOn(client, "updateItem").mockImplementation(api.update);
      vi.spyOn(client, "deleteItem").mockImplementation(api.delete); vi.spyOn(client, "reorderItems").mockImplementation(api.reorder);
      return client;
    },
    pantryStorage: { load: vi.fn(async () => cache), save: vi.fn(async (next) => { cache = structuredClone(next); }), clear: vi.fn(async () => { cache = null; }) },
    migrationStorage: () => ({ load: async () => journal, save: async (next) => { journal = next; }, clear: async () => { journal = null; } }),
    firebase: {
      create: vi.fn(async () => "AVQC42"), join: vi.fn(async (_code, items) => items),
      leave: vi.fn(async () => {}), flush: vi.fn(async () => {}), cancel: vi.fn(), push: vi.fn(),
      subscribe: vi.fn((_code, update) => { const unsubscribe = vi.fn(); callbacks.push({ update, unsubscribe }); return unsubscribe; })
    },
    onLocalItems: vi.fn(), onSharedUpdate: vi.fn()
  };
  const controller = new ShoppingModeController(dependencies);
  return { controller, dependencies, api, callbacks, clients,
    local: () => local, remote: () => remote, raw: () => raw, journal: () => journal,
    setRemote: (items: PantryItem[]) => { remote = structuredClone(items); },
    setCache: (next: PantryCache) => { cache = next; } };
}

describe("one shopping mode at a time", () => {
  it("defaults to local with exactly the existing add/check/edit/order/remove behavior", async () => {
    const f = fixture(); await f.controller.load();
    expect(f.controller.getSnapshot().mode.kind).toBe("local");
    const added = await f.controller.addIngredients([" Eggs ", "Eggs"], { recipeName: "Breakfast" });
    expect(added.added).toHaveLength(1);
    await f.controller.toggleItem(added.added[0].id);
    await f.controller.updateItem(added.added[0].id, "2 eggs");
    await f.controller.moveItem(added.added[0].id, -1);
    expect(f.controller.getSnapshot().items.map((item) => item.label)).toEqual(["Milk", "2 eggs", "Bread"]);
    expect(await f.controller.clearChecked()).toBe(1);
    await f.controller.removeItem("local-1");
    expect(f.local().map((item) => item.label)).toEqual(["Bread"]);
    expect(f.api.house).not.toHaveBeenCalled(); expect(f.dependencies.firebase.subscribe).not.toHaveBeenCalled();
    f.controller.dispose();
  });
  it("preserves the legacy Firebase connection on update", async () => {
    const f = fixture(); vi.mocked(f.dependencies.legacyCode).mockResolvedValue("AVQC42");
    await f.controller.load();
    expect(f.controller.getSnapshot().mode).toEqual({ kind: "firebase", code: "AVQC42" });
    await f.controller.addIngredients(["Eggs"]);
    expect(f.dependencies.firebase.push).toHaveBeenCalledWith("AVQC42", expect.any(Array), expect.any(Function));
    f.controller.dispose();
  });
  it("activates Firebase only after creation and preserves articles when leaving sharing", async () => {
    const f = fixture(); await f.controller.load();
    expect(await f.controller.switchToFirebase()).toBe("AVQC42");
    expect(f.dependencies.firebase.create).toHaveBeenCalledWith(f.local());
    expect(f.controller.getSnapshot().mode.kind).toBe("firebase");
    await f.controller.toggleItem("local-1"); await f.controller.switchToLocal();
    expect(f.controller.getSnapshot().mode.kind).toBe("local");
    expect(f.local()[0].checked).toBe(true);
    expect(f.dependencies.firebase.flush).toHaveBeenCalled(); expect(f.dependencies.firebase.leave).toHaveBeenCalledWith("AVQC42");
    await f.controller.addIngredients(["Eggs"]);
    expect(f.dependencies.firebase.push).toHaveBeenCalledTimes(1);
    f.controller.dispose();
  });
  it("switches to Pantry including checked items and sends subsequent recipe additions only to Pantry", async () => {
    const initial = localItems("Milk", "Bread"); initial[1].checked = true;
    const f = fixture(initial); await f.controller.load(); await f.controller.switchToPantry(selection);
    expect(f.remote().map((item) => [item.name, item.done])).toEqual([["Milk", false], ["Bread", true]]);
    expect(f.local()).toEqual(initial);
    expect(f.controller.getSnapshot().mode.kind).toBe("pantry");
    vi.mocked(f.dependencies.onLocalItems!).mockClear();
    await f.controller.addIngredients(["Tomatoes"], { recipeName: "Pasta" });
    expect(f.remote().at(-1)?.description).toBe("Pasta");
    expect(f.dependencies.firebase.push).not.toHaveBeenCalled(); expect(f.dependencies.onLocalItems).not.toHaveBeenCalled();
    expect(f.local()).toEqual(initial);
    expect(f.journal()).toBeNull(); f.controller.dispose();
  });
  it("stops Firebase and ignores delayed source callbacks after switching to Pantry", async () => {
    const f = fixture(undefined, { kind: "firebase", code: "AVQC42" }); await f.controller.load();
    const old = f.callbacks[0]; await f.controller.switchToPantry(selection);
    expect(old.unsubscribe).toHaveBeenCalled();
    const before = f.controller.getSnapshot().items;
    old.update({ items: [], lastUpdatedBy: "old-device" });
    expect(f.controller.getSnapshot().items).toEqual(before);
    expect(f.dependencies.onSharedUpdate).not.toHaveBeenCalled();
    await f.controller.addIngredients(["Apples"]); expect(f.dependencies.firebase.push).not.toHaveBeenCalled();
    f.controller.dispose();
  });
  it("reorders the active Pantry list through its native endpoint", async () => {
    const f = fixture(); await f.controller.load(); await f.controller.switchToPantry(selection);
    const first = f.controller.getSnapshot().items[0];
    await f.controller.moveItem(first.id, 1);
    expect(f.controller.getSnapshot().items.map((item) => item.label)).toEqual(["Bread", "Milk"]);
    expect(f.api.reorder).toHaveBeenCalledWith(1, 2, [11, 10]);
    expect(f.dependencies.firebase.push).not.toHaveBeenCalled(); f.controller.dispose();
  });
  it("returns from Pantry to local with the latest items and checked states", async () => {
    const f = fixture(); await f.controller.load(); await f.controller.switchToPantry(selection);
    await f.controller.toggleItem(f.controller.getSnapshot().items[0].id);
    await f.controller.addIngredients(["Eggs"]);
    await f.controller.switchToLocal();
    expect(f.local().map((item) => [item.label, item.checked])).toEqual([["Milk", true], ["Bread", false], ["Eggs", false]]);
    await f.controller.addIngredients(["Butter"]);
    expect(f.remote()).toHaveLength(3); expect(f.api.add).toHaveBeenCalledTimes(3); f.controller.dispose();
  });
  it("moves Pantry data into a Firebase share while preserving destination entries", async () => {
    const f = fixture(); await f.controller.load(); await f.controller.switchToPantry(selection);
    vi.mocked(f.dependencies.firebase.join).mockImplementation(async (_code, source) => mergeShoppingItemsForSwitch(source, localItems("Apples")));
    await f.controller.switchToFirebase(" avqc42 ");
    expect(f.controller.getSnapshot().items.map((item) => item.label)).toEqual(["Apples", "Milk", "Bread"]);
    const calls = f.api.add.mock.calls.length;
    await f.controller.addIngredients(["Eggs"]);
    expect(f.api.add).toHaveBeenCalledTimes(calls); expect(f.dependencies.firebase.push).toHaveBeenCalled(); f.controller.dispose();
  });
  it("retains the source mode and reconciles a POST accepted before its response was lost", async () => {
    const f = fixture(); await f.controller.load();
    const add = f.api.add.getMockImplementation()!;
    f.api.add.mockImplementationOnce(async (...args) => { await add(...args); throw new PantryError("network"); });
    await expect(f.controller.switchToPantry(selection)).rejects.toMatchObject({ code: "network" });
    expect(f.controller.getSnapshot().mode.kind).toBe("local"); expect(f.local()).toHaveLength(2); expect(f.remote()).toHaveLength(1);
    await f.controller.switchToPantry(selection);
    expect(f.remote().map((item) => item.name)).toEqual(["Milk", "Bread"]);
    expect(f.api.add).toHaveBeenCalledTimes(2); f.controller.dispose();
  });
  it("reconciles an accepted completion with lost response without unchecking or duplicating the item", async () => {
    const initial = localItems("Bread"); initial[0].checked = true;
    const f = fixture(initial); await f.controller.load();
    const toggle = f.api.toggle.getMockImplementation()!;
    f.api.toggle.mockImplementationOnce(async (...args) => { await toggle(...args); throw new PantryError("network"); });
    await expect(f.controller.switchToPantry(selection)).rejects.toMatchObject({ code: "network" });
    await f.controller.switchToPantry(selection);
    expect(f.remote()).toHaveLength(1); expect(f.remote()[0].done).toBe(true);
    expect(f.api.toggle).toHaveBeenCalledTimes(1); f.controller.dispose();
  });
  it("preserves duplicate multiplicity and existing destination metadata", async () => {
    const f = fixture(localItems("Milk", "Milk"));
    f.setRemote([{ id: 1, listId: 2, name: "Milk", quantity: null, description: "Household", done: false, categoryId: 8, rrule: "FREQ=WEEKLY" }]);
    await f.controller.load(); await f.controller.switchToPantry(selection);
    expect(f.remote()).toHaveLength(2); expect(f.api.add).toHaveBeenCalledTimes(1);
    expect(f.remote()[0]).toMatchObject({ description: "Household", categoryId: 8, rrule: "FREQ=WEEKLY" }); f.controller.dispose();
  });
  it("rolls back local storage and sharing membership when committing the mode fails", async () => {
    const f = fixture(); await f.controller.load();
    const original = f.local();
    vi.mocked(f.dependencies.firebase.join).mockResolvedValue([...original, ...localItems("Apples")]);
    vi.mocked(f.dependencies.saveMode).mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(f.controller.switchToFirebase("AVQC42")).rejects.toThrow("storage unavailable");
    expect(f.controller.getSnapshot().mode.kind).toBe("local"); expect(f.local()).toEqual(original);
    expect(f.dependencies.firebase.leave).toHaveBeenCalledWith("AVQC42"); f.controller.dispose();
  });
  it("restores the source Pantry cache if committing a different destination fails", async () => {
    const f = fixture(); await f.controller.load(); await f.controller.switchToPantry(selection);
    const original = f.controller.getSnapshot();
    vi.mocked(f.dependencies.saveMode).mockRejectedValueOnce(new Error("disk full"));
    await expect(f.controller.switchToPantry({ house, list: { ...list, id: 5 } })).rejects.toThrow();
    expect(f.controller.getSnapshot().mode).toEqual(original.mode);
    expect((await f.dependencies.pantryStorage.load())?.selection.list.id).toBe(2); f.controller.dispose();
  });
  it("shows cached Pantry data offline and allows a return to local without remote writes", async () => {
    const mode: ShoppingMode = { kind: "pantry", accountKey, selection };
    const f = fixture(localItems("Original local"), mode);
    f.setCache({ selection, items: [{ id: 1, listId: 2, name: "Cached milk", done: true, quantity: null, description: null }], refreshedAt: "2026-10-13T00:00:00Z" });
    f.api.house.mockRejectedValue(new PantryError("network"));
    await f.controller.load();
    expect(f.controller.getSnapshot().items[0].label).toBe("Cached milk");
    await expect(f.controller.addIngredients(["Eggs"])).rejects.toMatchObject({ code: "network" });
    await f.controller.switchToLocal(); expect(f.local()[0]).toMatchObject({ label: "Cached milk", checked: true });
    expect(f.api.add).not.toHaveBeenCalled(); f.controller.dispose();
  });
  it("isolates a stored Pantry mode from another account without copying private items into local", async () => {
    const f = fixture(localItems("Local only"), { kind: "pantry", accountKey: "someone-else", selection }); await f.controller.load();
    expect(f.controller.getSnapshot().mode.kind).toBe("local"); expect(f.controller.getSnapshot().items[0].label).toBe("Local only");
    expect(f.api.house).not.toHaveBeenCalled(); f.controller.dispose();
  });
  it("does not replace unsent source edits with a stale Firebase snapshot after a failed switch", async () => {
    const f = fixture(undefined, { kind: "firebase", code: "AVQC42" }); await f.controller.load();
    vi.mocked(f.dependencies.firebase.flush).mockRejectedValue(new Error("offline"));
    f.api.house.mockRejectedValue(new PantryError("network"));
    const previous = f.controller.getSnapshot().items;
    await expect(f.controller.switchToPantry(selection)).rejects.toThrow();
    const resumed = f.callbacks.at(-1)!;
    resumed.update({ items: [] });
    expect(f.controller.getSnapshot().items).toEqual(previous);
    resumed.update({ items: previous });
    expect(f.controller.getSnapshot().sharedSyncing).toBe(false);
    f.controller.dispose();
  });
  it("can leave an unavailable Firebase share in local mode with its cached data intact", async () => {
    const f = fixture(undefined, { kind: "firebase", code: "AVQC42" }); await f.controller.load();
    vi.mocked(f.dependencies.firebase.flush).mockRejectedValue(new Error("offline"));
    vi.mocked(f.dependencies.firebase.leave).mockRejectedValue(new Error("offline"));
    await f.controller.switchToLocal();
    expect(f.controller.getSnapshot().mode.kind).toBe("local"); expect(f.local()).toHaveLength(2); f.controller.dispose();
  });
  it("can change Pantry lists while retaining the previous household list", async () => {
    const f = fixture(); await f.controller.load(); await f.controller.switchToPantry(selection);
    await f.controller.switchToPantry({ house, list: { ...list, id: 5 } });
    expect(f.controller.getSnapshot().mode).toMatchObject({ kind: "pantry", selection: { list: { id: 5 } } });
    expect(f.controller.getSnapshot().items.map((item) => item.label)).toEqual(["Milk", "Bread"]);
    expect(f.remote()).toHaveLength(2); f.controller.dispose();
  });
  it("serializes rapid edits and rejects a simultaneous mode switch", async () => {
    const f = fixture(); await f.controller.load();
    const first = f.controller.addIngredients(["Eggs"]); const second = f.controller.addIngredients(["Butter"]);
    await expect(f.controller.switchToPantry(selection)).rejects.toThrow("busy");
    await Promise.all([first, second]); expect(f.local().map((item) => item.label)).toEqual(["Milk", "Bread", "Eggs", "Butter"]);
    f.controller.dispose();
  });
  it("prevents a disposed/account-changed migration from activating its destination", async () => {
    const f = fixture(); await f.controller.load();
    let finish!: (items: PantryItem[]) => void;
    f.api.items.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const switchPromise = f.controller.switchToPantry(selection);
    await vi.waitFor(() => expect(f.api.items).toHaveBeenCalled());
    f.controller.dispose(); finish([]);
    await expect(switchPromise).rejects.toThrow();
    expect(f.dependencies.saveMode).not.toHaveBeenCalled(); expect(f.controller.getSnapshot().mode.kind).toBe("local");
    expect(f.api.add).not.toHaveBeenCalled();
  });
});

describe("mode parsing and transfers", () => {
  it("does not let an obsolete share code override an explicit local selection", () => {
    expect(parseShoppingMode('{"kind":"local"}', accountKey, "AVQC42")).toEqual({ kind: "local" });
    expect(parseShoppingMode('{"kind":"pantry","accountKey":"other"}', accountKey, "AVQC42")).toEqual({ kind: "local" });
    expect(parseShoppingMode("invalid", accountKey, "AVQC42")).toEqual({ kind: "local" });
  });
  it("preserves completed articles and repeated labels when joining an existing list", () => {
    const source = localItems("Milk", "Milk", "Bread"); source[2].checked = true;
    const destination = localItems("Milk", "Bread", "Apples");
    const merged = mergeShoppingItemsForSwitch(source, destination);
    expect(merged.map((item) => [item.label, item.checked])).toEqual([["Milk", false], ["Bread", false], ["Apples", false], ["Milk", false], ["Bread", true]]);
    expect(new Set(merged.map((item) => item.id)).size).toBe(merged.length);
  });
});
