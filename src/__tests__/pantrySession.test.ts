import { describe, expect, it, vi } from "vitest";
import { PantryClient, PantryError, type PantryItem } from "../features/pantry/pantryClient";
import { PantrySession, pantryPermissions } from "../features/pantry/pantrySession";
import { createPantryStorage, pantryAccountKey, parsePantryCache, type PantryCache } from "../features/pantry/pantryStore";
import { addIngredientsToShoppingList } from "../features/shopping/shoppingList";

const stored = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {
  getItem: vi.fn(async (key: string) => stored.get(key) ?? null),
  setItem: vi.fn(async (key: string, value: string) => { stored.set(key, value); }),
  removeItem: vi.fn(async (key: string) => { stored.delete(key); })
} }));
const credentials = { serverUrl: "https://cloud.example/nextcloud", username: "alice", appPassword: "secret" };
const house = { id: 1, name: "Home" };
const list = { id: 2, houseId: 1, name: "Groceries", canEdit: true };
const item: PantryItem = { id: 3, listId: 2, name: "Tomatoes", quantity: "500 g", description: "Pasta", done: false };
const cache: PantryCache = { selection: { house, list }, items: [item], refreshedAt: "2026-10-12T10:00:00.000Z" };
function fixture(initial: PantryCache | null = null) {
  const client = new PantryClient(credentials);
  const api = {
    houses: vi.spyOn(client, "houses").mockResolvedValue([house]),
    house: vi.spyOn(client, "house").mockResolvedValue(house),
    lists: vi.spyOn(client, "lists").mockResolvedValue([list]),
    list: vi.spyOn(client, "list").mockResolvedValue(initial?.selection.list ?? list),
    items: vi.spyOn(client, "items").mockResolvedValue(initial?.items ?? [item]),
    create: vi.spyOn(client, "createList").mockResolvedValue(list),
    add: vi.spyOn(client, "addItem").mockImplementation(async (_house, _list, name, description) => ({ ...item, id: 20, name, quantity: null, description: description ?? null })),
    rename: vi.spyOn(client, "renameItem").mockImplementation(async (_house, _list, _id, name) => ({ ...item, name })),
    toggle: vi.spyOn(client, "toggleItem").mockResolvedValue({ ...item, done: true }),
    delete: vi.spyOn(client, "deleteItem").mockResolvedValue()
  };
  const storage = { load: vi.fn(async () => initial), save: vi.fn(async (_cache: PantryCache) => {}), clear: vi.fn(async () => {}) };
  const session = new PantrySession(client, storage);
  return { session, api, storage };
}

describe("optional Pantry session", () => {
  it("makes no network requests before explicit opt-in", async () => {
    const { session, api, storage } = fixture();
    await session.load();
    expect(session.getSnapshot()).toMatchObject({ ready: true, view: "welcome", selection: null });
    for (const method of Object.values(api)) expect(method).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
  });
  it("discovers houses, chooses a list and remembers it only after a successful read", async () => {
    const { session, api, storage } = fixture();
    await session.load(); await session.discover(); await session.chooseHouse(house);
    expect(storage.save).not.toHaveBeenCalled();
    api.items.mockRejectedValueOnce(new PantryError("network"));
    expect(await session.link(list)).toBe(false);
    expect(session.getSnapshot()).toMatchObject({ view: "lists", selection: null });
    expect(storage.save).not.toHaveBeenCalled();
    expect(await session.link(list)).toBe(true);
    expect(session.getSnapshot()).toMatchObject({ view: "items", fresh: true, items: [item] });
    expect(storage.save).toHaveBeenCalledOnce();
  });
  it("restores cached items when offline without enabling writes or losing the link", async () => {
    const { session, api, storage } = fixture(cache);
    api.house.mockRejectedValueOnce(new PantryError("network"));
    await session.load();
    expect(session.getSnapshot()).toMatchObject({ view: "items", items: [item], fresh: false, error: "network", selection: cache.selection });
    expect(await session.addItem("Milk")).toBe(false);
    expect(api.add).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
    await session.refresh();
    expect(session.getSnapshot()).toMatchObject({ fresh: true, error: null });
  });
  it("refreshes remote additions, edits and removals", async () => {
    const { session, api } = fixture(cache);
    await session.load();
    api.items.mockResolvedValueOnce([{ ...item, id: 5, name: "Bread", done: true }]);
    await session.refresh();
    expect(session.getSnapshot().items).toEqual([{ ...item, id: 5, name: "Bread", done: true }]);
  });
  it("copies unchecked ingredients once without modifying local items or Pantry metadata", async () => {
    const { session, api } = fixture(cache);
    await session.load();
    const { items } = addIngredientsToShoppingList([], ["500 g Tomatoes", "Milk", " milk ", "Bread"], { recipeId: "recipe-1", recipeName: "Pancakes" }, { allowDuplicates: true });
    items.at(-1)!.checked = true;
    const before = structuredClone(items);
    await session.transfer(items);
    expect(api.add).toHaveBeenCalledExactlyOnceWith(1, 2, "Milk", "Pancakes");
    expect(session.getSnapshot().transfer).toEqual({ added: 1, skipped: 2 });
    expect(session.getSnapshot().items[0]).toEqual(item);
    expect(items).toEqual(before);
  });
  it("recovers a partially accepted transfer without duplicates on retry", async () => {
    const { session, api } = fixture(cache);
    await session.load();
    const { items } = addIngredientsToShoppingList([], ["Milk", "Bread"]);
    const remote = [item];
    api.items.mockImplementation(async () => [...remote]);
    api.add.mockImplementationOnce(async (_house, _list, name) => {
      const created = { ...item, id: 4, name, quantity: null };
      remote.push(created); return created;
    }).mockImplementationOnce(async (_house, _list, name) => {
      remote.push({ ...item, id: 5, name, quantity: null });
      throw new PantryError("network");
    });
    expect(await session.transfer(items)).toBe(false);
    expect(session.getSnapshot()).toMatchObject({ transfer: { added: 1, skipped: 0 }, fresh: false });
    await session.refresh();
    expect(await session.transfer(items)).toBe(true);
    expect(session.getSnapshot().transfer).toEqual({ added: 0, skipped: 2 });
    expect(api.add).toHaveBeenCalledTimes(2);
  });
  it("never overwrites items on a failed read or failed mutation", async () => {
    const { session, api } = fixture(cache);
    await session.load();
    api.toggle.mockRejectedValueOnce(new PantryError("server"));
    await session.toggleItem(item);
    expect(session.getSnapshot().items).toEqual([item]);
    api.items.mockRejectedValueOnce(new PantryError("server"));
    await session.refresh();
    expect(session.getSnapshot().items).toEqual([item]);
  });
  it("honors Pantry deletion-on-completion and only edits the requested name", async () => {
    const { session, api } = fixture(cache);
    await session.load();
    await session.renameItem(item, "Cherry tomatoes");
    expect(session.getSnapshot().items[0]).toEqual({ ...item, name: "Cherry tomatoes" });
    api.toggle.mockResolvedValueOnce({ ...item, done: true, deletedAt: 123 });
    await session.toggleItem(item);
    expect(session.getSnapshot().items).toEqual([]);
  });
  it("blocks read-only shares but preserves granular check-only access", async () => {
    const selection = { house: { ...house, permissions: { canCheckItems: true, canAddItems: false, canEditLists: false, canDeleteItems: false } }, list: { ...list, canEdit: false, sharedOnly: false } };
    expect(pantryPermissions(selection)).toEqual({ add: false, check: true, edit: false, delete: false });
    expect(pantryPermissions({ ...selection, list: { ...selection.list, sharedOnly: true } })).toEqual({ add: false, check: false, edit: false, delete: false });
    const { session, api } = fixture({ ...cache, selection });
    api.house.mockResolvedValue(selection.house);
    await session.load();
    expect(await session.toggleItem(item)).toBe(true);
    expect(await session.addItem("Milk")).toBe(false);
    expect(api.add).not.toHaveBeenCalled();
  });
  it("rechecks changed permissions before transferring anything", async () => {
    const { session, api } = fixture(cache);
    await session.load();
    api.house.mockResolvedValue({ ...house, permissions: { canAddItems: false } });
    await session.transfer(addIngredientsToShoppingList([], ["Milk"]).items);
    expect(api.add).not.toHaveBeenCalled();
    expect(session.getSnapshot().error).toBe("forbidden");
  });
  it("serializes double taps and stops applying responses after disposal", async () => {
    const { session, api, storage } = fixture(cache);
    await session.load(); storage.save.mockClear();
    let finish!: (item: PantryItem) => void;
    api.add.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const first = session.addItem("Milk");
    expect(await session.addItem("Milk")).toBe(false);
    session.dispose(); finish({ ...item, name: "Milk" });
    expect(await first).toBe(false);
    expect(api.add).toHaveBeenCalledOnce();
    expect(storage.save).not.toHaveBeenCalled();
    expect(session.getSnapshot().items).toEqual([item]);
  });
  it("disconnects locally without deleting server data", async () => {
    const { session, api, storage } = fixture(cache);
    await session.load(); await session.disconnect();
    expect(storage.clear).toHaveBeenCalledOnce();
    expect(session.getSnapshot()).toMatchObject({ selection: null, items: [], view: "welcome" });
    expect(api.delete).not.toHaveBeenCalled();
  });
  it("reports a cache failure without inviting a duplicate server mutation", async () => {
    const { session, api, storage } = fixture(cache);
    await session.load();
    storage.save.mockRejectedValueOnce(new Error("disk full"));
    expect(await session.addItem("Milk")).toBe(true);
    expect(session.getSnapshot()).toMatchObject({ cacheWarning: true, error: null });
    expect(session.getSnapshot().items.at(-1)?.name).toBe("Milk");
    expect(api.add).toHaveBeenCalledOnce();
  });
  it("creates a Pantry list and selects it", async () => {
    const { session, api } = fixture();
    await session.load(); await session.discover(); await session.chooseHouse(house);
    expect(await session.createList("Weekend")).toBe(true);
    expect(api.create).toHaveBeenCalledWith(1, "Weekend");
    expect(session.getSnapshot()).toMatchObject({ view: "items", selection: { house, list } });
  });
});

describe("Pantry account storage", () => {
  it("isolates accounts and servers without storing the app password", async () => {
    stored.clear();
    const key = pantryAccountKey(credentials);
    const alice = createPantryStorage(key);
    const bob = createPantryStorage(pantryAccountKey({ ...credentials, username: "bob" }));
    const otherServer = createPantryStorage(pantryAccountKey({ ...credentials, serverUrl: "https://other.example" }));
    await alice.save(cache);
    expect(await bob.load()).toBeNull(); expect(await otherServer.load()).toBeNull();
    expect(await alice.load()).toEqual(cache);
    expect(JSON.stringify([...stored])).not.toContain(credentials.appPassword);
    expect(pantryAccountKey({ ...credentials, appPassword: "rotated" })).toBe(key);
    expect(pantryAccountKey({ ...credentials, serverUrl: `${credentials.serverUrl}/index.php/` })).toBe(key);
    await bob.clear(); expect(await alice.load()).toEqual(cache);
  });
  it.each([null, "bad json", "null", "{}", JSON.stringify({ ...cache, items: [{ ...item, listId: 99 }] }), JSON.stringify({ ...cache, refreshedAt: "invalid" }), JSON.stringify({ ...cache, selection: { house, list: { ...list, houseId: 99 } } })])("ignores invalid caches", (raw) => {
    expect(parsePantryCache(raw)).toBeNull();
  });
});
