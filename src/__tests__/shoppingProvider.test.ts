import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShoppingListProvider, useShoppingList } from "../features/shopping/ShoppingListProvider";
import { PantryClient } from "../features/pantry/pantryClient";
const mocks = vi.hoisted(() => ({
  auth: { credentials: { serverUrl: "https://cloud.example", username: "alice", appPassword: "test-only" }, hydrated: true },
  storage: new Map<string, string>(), local: [] as unknown[], push: vi.fn(), subscribe: vi.fn(() => vi.fn()), reminders: vi.fn(), enabled: [] as boolean[]
}));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {
  getItem: async (key: string) => mocks.storage.get(key) ?? null,
  setItem: async (key: string, value: string) => { mocks.storage.set(key, value); }, removeItem: async (key: string) => { mocks.storage.delete(key); }
} }));
vi.mock("../features/auth/AuthProvider", () => ({ useAuth: () => mocks.auth }));
vi.mock("../features/preferences/PreferencesProvider", () => ({ usePreferences: () => ({ enableShoppingNotifications: false }) }));
vi.mock("../features/shopping/shoppingStore", () => ({ loadShoppingListItems: async () => mocks.local, saveShoppingListItems: async (items: unknown[]) => { mocks.local = items; }, createShoppingListItemId: () => `id-${mocks.local.length}` }));
vi.mock("../features/shopping/useRemindersSync", () => ({ useRemindersSync: (enabled: boolean) => {
  mocks.enabled.push(enabled);
  return { available: enabled, linked: enabled, syncing: false, dismissed: true, pushToSystem: mocks.reminders, pullFromSystem: vi.fn(async () => null), enableSync: vi.fn(), disableSync: vi.fn(), dismissSyncBanner: vi.fn() };
} }));
vi.mock("../features/shopping/sharedListClient", () => ({ createSharedList: vi.fn(async () => "AVQC42"), joinSharedListWithItems: vi.fn(), schedulePush: mocks.push, subscribeToSharedList: mocks.subscribe, cancelPush: vi.fn(), leaveSharedList: vi.fn(async () => {}), flushSharedListPush: vi.fn(async () => {}), getDeviceId: vi.fn() }));
vi.mock("../features/timers/timerNotifications", () => ({ scheduleTimerNotification: vi.fn() }));
vi.mock("../i18n", () => ({ default: { t: (key: string) => key } }));
let screen: ReactTestRenderer;
let current!: ReturnType<typeof useShoppingList>;
function Consumer() { const value = useShoppingList(); React.useEffect(() => { current = value; }, [value]); return React.createElement("list", { count: value.items.length, mode: value.mode.kind }); }
async function render() { await act(async () => { screen = create(React.createElement(ShoppingListProvider, null, React.createElement(Consumer))); }); }
const house = { id: 1, name: "Home", isAdmin: true }; const list = { id: 2, houseId: 1, name: "Groceries", canEdit: true };
let remote: { id: number; listId: number; name: string; quantity: null; description: null; done: boolean }[];
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); mocks.storage.clear(); mocks.local = []; mocks.push.mockClear(); mocks.subscribe.mockClear(); mocks.reminders.mockClear(); mocks.enabled = []; remote = [];
  mocks.auth = { credentials: { serverUrl: "https://cloud.example", username: "alice", appPassword: "test-only" }, hydrated: true };
  vi.spyOn(PantryClient.prototype, "house").mockResolvedValue(house); vi.spyOn(PantryClient.prototype, "list").mockResolvedValue(list);
  vi.spyOn(PantryClient.prototype, "items").mockImplementation(async () => [...remote]);
  vi.spyOn(PantryClient.prototype, "addItem").mockImplementation(async (_house, _list, name) => { const item = { id: remote.length + 1, listId: 2, name, quantity: null, description: null, done: false }; remote.push(item); return item; });
});
afterEach(async () => { if (screen) await act(async () => screen.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("shopping provider integration", () => {
  it("keeps local operations and callbacks stable across updates", async () => {
    await render(); const refresh = current.refreshItems; const add = current.addIngredients; const toggle = current.toggleItem;
    await act(async () => { await current.addItem("Milk"); });
    expect(current.items[0].label).toBe("Milk"); expect(mocks.reminders).toHaveBeenCalled(); expect(mocks.push).not.toHaveBeenCalled();
    expect(current.refreshItems).toBe(refresh); expect(current.addIngredients).toBe(add); expect(current.toggleItem).toBe(toggle);
  });
  it("routes recipes to the sole Pantry backend and suspends Reminders and Firebase", async () => {
    await render(); await act(async () => { await current.addItem("Milk"); });
    await act(async () => { await current.switchToPantry({ house, list }); });
    mocks.reminders.mockClear();
    expect(current.mode.kind).toBe("pantry"); expect(current.sharedList.active).toBe(false); expect(current.sync.available).toBe(false);
    await act(async () => { await current.addIngredients(["Eggs"], { recipeName: "Pancakes" }); });
    expect(remote.map((item) => item.name)).toEqual(["Milk", "Eggs"]);
    expect(mocks.reminders).not.toHaveBeenCalled(); expect(mocks.push).not.toHaveBeenCalled(); expect(mocks.local).toHaveLength(1);
  });
  it("restores local items on account change without showing the previous account's Pantry data", async () => {
    await render(); await act(async () => { await current.addItem("Local milk"); await current.switchToPantry({ house, list }); });
    await act(async () => { await current.addItem("Private Pantry eggs"); });
    mocks.auth.credentials = { ...mocks.auth.credentials, username: "bob" };
    await act(async () => { screen.update(React.createElement(ShoppingListProvider, null, React.createElement(Consumer))); });
    expect(current.mode.kind).toBe("local"); expect(current.items.map((item) => item.label)).toEqual(["Local milk"]);
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });
  it("retains code sharing as a selectable exclusive mode", async () => {
    await render(); await act(async () => { await current.addItem("Milk"); });
    await act(async () => { await current.sharedList.createList(); });
    expect(current.mode.kind).toBe("firebase"); expect(current.sharedList.code).toBe("AVQC42"); expect(mocks.subscribe).toHaveBeenCalledOnce();
    await act(async () => { await current.addItem("Eggs"); }); expect(mocks.push).toHaveBeenCalledOnce();
    await act(async () => { await current.sharedList.leaveList(); }); expect(current.mode.kind).toBe("local"); expect(current.items).toHaveLength(2);
  });
});
