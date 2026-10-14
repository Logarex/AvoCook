import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShoppingListProvider, useShoppingList } from "../features/shopping/ShoppingListProvider";
import { PantryClient } from "../features/pantry/pantryClient";
const mocks = vi.hoisted(() => ({
  auth: { credentials: { serverUrl: "https://cloud.example", username: "alice", appPassword: "test-only" }, hydrated: true },
  storage: new Map<string, string>(), local: [] as unknown[], push: vi.fn(), subscribe: vi.fn(() => vi.fn()), reminders: vi.fn(async () => {}), pull: vi.fn(async () => null as import("../features/shopping/remindersSync").PullResult | null), mappings: vi.fn(async () => {}), enabled: [] as boolean[]
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
  return { available: enabled, linked: enabled, syncing: false, dismissed: true, pushToSystem: mocks.reminders, pullFromSystem: mocks.pull, enableSync: vi.fn(), disableSync: vi.fn(), dismissSyncBanner: vi.fn() };
} }));
vi.mock("../features/shopping/remindersSync", () => ({ registerReminderMappings: mocks.mappings }));
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
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); mocks.storage.clear(); mocks.local = []; mocks.push.mockClear(); mocks.subscribe.mockClear(); mocks.reminders.mockClear(); mocks.pull.mockReset().mockResolvedValue(null); mocks.mappings.mockClear(); mocks.enabled = []; remote = [];
  mocks.auth = { credentials: { serverUrl: "https://cloud.example", username: "alice", appPassword: "test-only" }, hydrated: true };
  vi.spyOn(PantryClient.prototype, "house").mockResolvedValue(house); vi.spyOn(PantryClient.prototype, "list").mockResolvedValue(list);
  vi.spyOn(PantryClient.prototype, "items").mockImplementation(async () => [...remote]);
  vi.spyOn(PantryClient.prototype, "updateItem").mockImplementation(async (_house, _list, id, patch) => {
    const item = remote.find((item) => item.id === id)!; Object.assign(item, patch); return { ...item };
  });
  vi.spyOn(PantryClient.prototype, "toggleItem").mockImplementation(async (_house, _list, id) => {
    const item = remote.find((item) => item.id === id)!; item.done = !item.done; return { ...item };
  });
  vi.spyOn(PantryClient.prototype, "deleteItem").mockImplementation(async (_house, _list, id) => { remote = remote.filter((item) => item.id !== id); });
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
  it("routes recipes to Pantry and mirrors it in Apple Reminders without activating Firebase", async () => {
    await render(); await act(async () => { await current.addItem("Milk"); });
    await act(async () => { await current.switchToPantry({ house, list }); });
    mocks.reminders.mockClear();
    expect(current.mode.kind).toBe("pantry"); expect(current.sharedList.active).toBe(false); expect(current.sync.available).toBe(true);
    await act(async () => { await current.addIngredients(["Eggs"], { recipeName: "Pancakes" }); });
    expect(remote.map((item) => item.name)).toEqual(["Milk", "Eggs"]);
    expect(mocks.reminders).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ label: "Eggs" })]), expect.any(Function)); expect(mocks.push).not.toHaveBeenCalled(); expect(mocks.local).toHaveLength(1);
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
  it.each(["local", "firebase", "pantry"])("imports Apple changes and exports the final %s list without intermediate echoes", async (mode) => {
    await render(); await act(async () => { await current.addItem("Milk"); });
    if (mode === "pantry") await act(async () => { await current.switchToPantry({ house, list }); });
    if (mode === "firebase") await act(async () => { await current.sharedList.createList(); });
    const before = current.items;
    mocks.pull.mockResolvedValueOnce({ updatedItems: [{ ...before[0], label: "Oat milk", checked: true }], newReminderItems: [{ reminderId: "apple-eggs", label: "Eggs", checked: false }], deletedItemIds: [], hasChanges: true });
    mocks.reminders.mockClear(); mocks.push.mockClear();
    await act(async () => { await current.refreshItems(); });
    expect(current.items.map((item) => [item.label, item.checked])).toEqual([["Oat milk", true], ["Eggs", false]]);
    expect(mocks.mappings).toHaveBeenCalledWith([{ avocookId: expect.any(String), reminderId: "apple-eggs" }], expect.any(Function));
    expect(mocks.reminders).toHaveBeenCalledOnce(); expect(mocks.reminders).toHaveBeenLastCalledWith(current.items, expect.any(Function));
    if (mode === "pantry") expect(remote.map((item) => [item.name, item.done])).toEqual([["Oat milk", true], ["Eggs", false]]);
    if (mode === "firebase") expect(mocks.push).toHaveBeenCalled(); else expect(mocks.push).not.toHaveBeenCalled();
  });
  it("mirrors remote Pantry additions in Apple Reminders after refreshing", async () => {
    await render(); await act(async () => { await current.switchToPantry({ house, list }); });
    remote.push({ id: 9, listId: 2, name: "Household eggs", quantity: null, description: null, done: false });
    mocks.reminders.mockClear(); await act(async () => { await current.refreshItems(); });
    expect(mocks.reminders).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ label: "Household eggs" })]), expect.any(Function));
  });
  it("ignores a native result from the previous account after logout/account changes", async () => {
    await render(); await act(async () => { await current.addItem("Milk"); });
    let finish!: (result: import("../features/shopping/remindersSync").PullResult) => void;
    mocks.pull.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = current.refreshItems(); await vi.waitFor(() => expect(mocks.pull).toHaveBeenCalled());
    mocks.auth.credentials = { ...mocks.auth.credentials, username: "bob" };
    await act(async () => { screen.update(React.createElement(ShoppingListProvider, null, React.createElement(Consumer))); });
    await act(async () => { finish({ updatedItems: [], newReminderItems: [{ label: "Private old result", reminderId: "old", checked: false }], deletedItemIds: [], hasChanges: true }); await pending; });
    expect(current.items.map((item) => item.label)).toEqual(["Milk"]);
  });

  it("resumes synchronization in the new backend after a pull finishing during a mode switch", async () => {
    await render(); await act(async () => { await current.addItem("Milk"); });
    let finish!: (result: import("../features/shopping/remindersSync").PullResult | null) => void;
    mocks.pull.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = current.refreshItems();
    await act(async () => { await current.switchToPantry({ house, list }); });
    mocks.reminders.mockClear();
    await act(async () => { finish(null); await pending; });
    expect(current.mode.kind).toBe("pantry");
    expect(mocks.pull).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ id: expect.stringContaining("pantry-"), label: "Milk" })]), expect.any(Function));
    expect(mocks.reminders).toHaveBeenLastCalledWith(current.items, expect.any(Function));
  });

});
