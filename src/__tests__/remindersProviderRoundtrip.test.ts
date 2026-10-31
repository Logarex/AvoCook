import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShoppingListProvider, useShoppingList } from "../features/shopping/ShoppingListProvider";
import { PantryClient, type PantryItem } from "../features/pantry/pantryClient";
import type { ShoppingListItem } from "../features/shopping/shoppingList";
const mocks = vi.hoisted(() => ({
  storage: new Map<string, string>(), local: [] as ShoppingListItem[], remote: [] as PantryItem[],
  native: [] as { id: string; title: string; completed: boolean }[], nextId: 10,
  fetch: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), firebasePush: vi.fn()
}));
vi.mock("react-native", () => ({ AppState: { addEventListener: () => ({ remove: vi.fn() }) }, Platform: { OS: "ios" }, Alert: { alert: vi.fn() }, Linking: { openSettings: vi.fn() } }));
vi.mock("expo-calendar/legacy", () => ({ getRemindersAsync: mocks.fetch, createReminderAsync: mocks.create, updateReminderAsync: mocks.update, deleteReminderAsync: mocks.remove }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("../i18n", () => ({ default: { t: (key: string) => key } }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {
  getItem: async (key: string) => mocks.storage.get(key) ?? null, setItem: async (key: string, value: string) => { mocks.storage.set(key, value); }, removeItem: async (key: string) => { mocks.storage.delete(key); }
} }));
vi.mock("../features/auth/AuthProvider", () => ({ useAuth: () => ({ credentials, hydrated: true }) }));
vi.mock("../features/preferences/PreferencesProvider", () => ({ usePreferences: () => ({ enableShoppingNotifications: false }) }));
vi.mock("../features/shopping/shoppingStore", () => ({ loadShoppingListItems: async () => mocks.local, saveShoppingListItems: async (items: ShoppingListItem[]) => { mocks.local = items; }, createShoppingListItemId: () => `new-${mocks.nextId++}` }));
vi.mock("../features/shopping/sharedListClient", () => ({ createSharedList: async () => "AVQC42", joinSharedListWithItems: vi.fn(), schedulePush: mocks.firebasePush, subscribeToSharedList: () => () => {}, cancelPush: vi.fn(), leaveSharedList: async () => {}, flushSharedListPush: async () => {}, getDeviceId: async () => "device" }));
vi.mock("../features/shopping/shoppingPushNotifications", () => ({ useShoppingPushNotifications: vi.fn() }));
const credentials = { serverUrl: "https://cloud.example", username: "alice", appPassword: "test-only" };
const house = { id: 1, name: "Home", isAdmin: true }; const list = { id: 2, houseId: 1, name: "Groceries" };
let screen: ReactTestRenderer;
let current!: ReturnType<typeof useShoppingList>;
function Consumer() { const value = useShoppingList(); React.useEffect(() => { current = value; }, [value]); return null; }
async function render() { await act(async () => { screen = create(React.createElement(ShoppingListProvider, null, React.createElement(Consumer))); }); }
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.clearAllMocks(); mocks.storage.clear(); mocks.nextId = 10; mocks.remote = [];
  mocks.local = [{ id: "local-1", label: "Milk", checked: false, createdAt: "2026-10-14", updatedAt: "2026-10-14" }];
  mocks.native = [{ id: "apple-1", title: "Milk", completed: false }];
  mocks.storage.set("shopping.reminders.enabled.v1", "true"); mocks.storage.set("shopping.reminders.listId.v1", "apple-list");
  mocks.storage.set("shopping.reminders.itemMap.v1", JSON.stringify({ "local-1": "apple-1" }));
  vi.spyOn(console, "info").mockImplementation(() => {});
  mocks.fetch.mockImplementation(async () => structuredClone(mocks.native));
  mocks.create.mockImplementation(async (_list: string, details: { title: string; completed: boolean }) => {
    const id = `apple-${mocks.nextId++}`; mocks.native.push({ id, title: details.title, completed: details.completed }); return id;
  });
  mocks.update.mockImplementation(async (id: string, details: object) => { Object.assign(mocks.native.find((item) => item.id === id)!, details); });
  mocks.remove.mockImplementation(async (id: string) => { mocks.native = mocks.native.filter((item) => item.id !== id); });
  vi.spyOn(PantryClient.prototype, "house").mockResolvedValue(house); vi.spyOn(PantryClient.prototype, "list").mockResolvedValue(list);
  vi.spyOn(PantryClient.prototype, "items").mockImplementation(async () => structuredClone(mocks.remote));
  vi.spyOn(PantryClient.prototype, "addItem").mockImplementation(async (_house, _list, name) => {
    const item = { id: mocks.nextId++, listId: 2, name, quantity: null, description: null, done: false }; mocks.remote.push(item); return { ...item };
  });
  vi.spyOn(PantryClient.prototype, "updateItem").mockImplementation(async (_house, _list, id, patch) => {
    const item = mocks.remote.find((item) => item.id === id)!; Object.assign(item, patch); return { ...item };
  });
  vi.spyOn(PantryClient.prototype, "toggleItem").mockImplementation(async (_house, _list, id) => { const item = mocks.remote.find((item) => item.id === id)!; item.done = !item.done; return { ...item }; });
  vi.spyOn(PantryClient.prototype, "deleteItem").mockImplementation(async (_house, _list, id) => { mocks.remote = mocks.remote.filter((item) => item.id !== id); });
});
afterEach(async () => { if (screen) await act(async () => screen.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("provider, real Reminders hook and native transport together", () => {
  it.each(["local", "firebase", "pantry"])("round-trips app and Apple edits in %s without recreating carried reminders", async (mode) => {
    await render();
    if (mode === "pantry") await act(async () => { await current.switchToPantry({ house, list }); });
    if (mode === "firebase") await act(async () => { await current.sharedList.createList(); });
    await act(async () => { await current.refreshItems(); });
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.native[0].id).toBe("apple-1");
    await act(async () => { await current.addItem("Eggs"); await current.refreshItems(); });
    expect(mocks.native.map((item) => item.title)).toEqual(["Milk", "Eggs"]);
    mocks.native[0].title = "Oat milk"; mocks.native[0].completed = true;
    mocks.native = [mocks.native[0], { id: "apple-bread", title: "Bread", completed: false }];
    await act(async () => { await current.refreshItems(); });
    expect(current.items.map((item) => [item.label, item.checked])).toEqual([["Oat milk", true], ["Bread", false]]);
    expect(mocks.native.map((item) => item.id)).toEqual(["apple-1", "apple-bread"]); expect(mocks.create).toHaveBeenCalledOnce();
    if (mode === "pantry") expect(mocks.remote.map((item) => [item.name, item.done])).toEqual([["Oat milk", true], ["Bread", false]]);
    if (mode === "firebase") expect(mocks.firebasePush).toHaveBeenCalled();
  });
  it("preserves a native edit made while switching to Pantry during a native read", async () => {
    await render(); let finish!: (reminders: typeof mocks.native) => void;
    mocks.fetch.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = current.refreshItems(); await vi.waitFor(() => expect(finish).toBeDefined());
    mocks.native[0].title = "Oat milk";
    await act(async () => { await current.switchToPantry({ house, list }); });
    await act(async () => { finish(structuredClone(mocks.native)); await pending; await current.refreshItems(); });
    expect(current.items[0].label).toBe("Oat milk"); expect(mocks.remote[0].name).toBe("Oat milk");
    expect(mocks.native).toHaveLength(1); expect(mocks.native[0].id).toBe("apple-1"); expect(mocks.create).not.toHaveBeenCalled();
  });
});
