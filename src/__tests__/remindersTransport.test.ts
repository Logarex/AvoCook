import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isRemindersAvailable, pullItemsFromReminders, pushItemsToReminders, rebindReminderMappings, registerReminderMappings, requestRemindersPermission } from "../features/shopping/remindersSync";
import type { ShoppingListItem } from "../features/shopping/shoppingList";
const mocks = vi.hoisted(() => ({
  platform: { OS: "ios" }, storage: new Map<string, string>(), reminders: [] as { id: string; title: string; completed: boolean }[],
  fetch: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), permission: vi.fn()
}));
vi.mock("react-native", () => ({ Platform: mocks.platform }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {
  getItem: async (key: string) => mocks.storage.get(key) ?? null,
  setItem: async (key: string, value: string) => { mocks.storage.set(key, value); }, removeItem: async (key: string) => { mocks.storage.delete(key); }
} }));
vi.mock("expo-calendar/legacy", () => ({ getRemindersAsync: mocks.fetch, createReminderAsync: mocks.create, updateReminderAsync: mocks.update, deleteReminderAsync: mocks.remove, requestRemindersPermissionsAsync: mocks.permission }));
const mapKey = "shopping.reminders.itemMap.v1";
function item(id: string, label = "Milk", checked = false): ShoppingListItem { return { id, label, checked, createdAt: "2026-10-14", updatedAt: "2026-10-14" }; }
function map() { return JSON.parse(mocks.storage.get(mapKey) ?? "{}"); }
beforeEach(() => {
  vi.clearAllMocks(); mocks.storage.clear(); mocks.reminders = []; mocks.platform.OS = "ios";
  vi.spyOn(console, "info").mockImplementation(() => {});
  mocks.fetch.mockImplementation(async () => structuredClone(mocks.reminders));
  mocks.create.mockImplementation(async (_list: string, details: { title: string; completed: boolean }) => {
    const id = `apple-${mocks.reminders.length + 1}`; mocks.reminders.push({ id, ...details }); return id;
  });
  mocks.update.mockImplementation(async (id: string, details: object) => { Object.assign(mocks.reminders.find((reminder) => reminder.id === id)!, details); });
  mocks.remove.mockImplementation(async (id: string) => { mocks.reminders = mocks.reminders.filter((reminder) => reminder.id !== id); });
});
afterEach(() => { vi.restoreAllMocks(); });
describe("Apple reminder transport and backend ID changes", () => {
  it("is gated to Apple platforms", async () => {
    mocks.platform.OS = "android";
    expect(isRemindersAvailable()).toBe(false); expect(await requestRemindersPermission()).toBe("denied"); expect(mocks.permission).not.toHaveBeenCalled();
  });
  it("reuses reminder IDs after local to Pantry migration and preserves a native rename/check", async () => {
    const local = [item("local-1")]; await pushItemsToReminders(local, "apple-list");
    mocks.reminders[0].title = "Oat milk"; mocks.reminders[0].completed = true;
    const pantry = [item("pantry-1-2-3")]; await rebindReminderMappings(local, pantry);
    const incoming = await pullItemsFromReminders(pantry, "apple-list");
    expect(incoming.updatedItems[0]).toMatchObject({ id: "pantry-1-2-3", label: "Oat milk", checked: true });
    await pushItemsToReminders(incoming.updatedItems, "apple-list");
    expect(mocks.create).toHaveBeenCalledOnce(); expect(mocks.remove).not.toHaveBeenCalled(); expect(map()).toEqual({ "pantry-1-2-3": "apple-1" });
  });
  it("preserves identical repeated articles as distinct reminders across mode switches", async () => {
    const before = [item("a"), item("b")]; await pushItemsToReminders(before, "apple-list");
    const after = [item("pantry-a"), item("pantry-b")]; await rebindReminderMappings(before, after); await pushItemsToReminders(after, "apple-list");
    expect(mocks.reminders).toHaveLength(2); expect(mocks.create).toHaveBeenCalledTimes(2); expect(new Set(Object.values(map())).size).toBe(2);
  });
  it("does not import reminders belonging to dropped source articles during reconciliation", async () => {
    const before = [item("a", "Milk"), item("b", "Bread")]; await pushItemsToReminders(before, "apple-list");
    const after = [item("new-a", "Milk")]; await rebindReminderMappings(before, after);
    const incoming = await pullItemsFromReminders(after, "apple-list"); expect(incoming.newReminderItems).toEqual([]);
    await pushItemsToReminders(after, "apple-list"); expect(mocks.reminders.map((reminder) => reminder.title)).toEqual(["Milk"]);
  });
  it("recovers an accepted Pantry import with a missing mapping instead of importing it twice", async () => {
    mocks.reminders = [{ id: "external-1", title: "Eggs", completed: false }];
    const result = await pullItemsFromReminders([item("pantry-eggs", "Eggs")], "apple-list");
    expect(result.newReminderItems).toEqual([]); expect(map()).toEqual({ "pantry-eggs": "external-1" });
  });
  it("registers a native addition before the next push so it does not create a duplicate", async () => {
    mocks.reminders = [{ id: "external-1", title: "Eggs", completed: true }];
    const incoming = await pullItemsFromReminders([], "apple-list"); expect(incoming.newReminderItems).toHaveLength(1);
    await registerReminderMappings([{ avocookId: "pantry-eggs", reminderId: "external-1" }]);
    await pushItemsToReminders([item("pantry-eggs", "Eggs", true)], "apple-list");
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.reminders).toHaveLength(1);
  });
  it("detects deletions made in Apple without deleting unrelated native reminders", async () => {
    await pushItemsToReminders([item("a")], "apple-list"); mocks.reminders = [{ id: "unrelated", title: "Bread", completed: false }];
    const result = await pullItemsFromReminders([item("a")], "apple-list");
    expect(result.deletedItemIds).toEqual(["a"]); expect(result.newReminderItems[0].reminderId).toBe("unrelated"); expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("stops a stale push between native writes but saves the accepted ID for reconciliation", async () => {
    let active = true; let finish!: (id: string) => void;
    mocks.create.mockImplementationOnce(async (_list: string, details: { title: string; completed: boolean }) => {
      const id = await new Promise<string>((resolve) => { finish = resolve; }); mocks.reminders.push({ id, ...details }); return id;
    });
    const pending = pushItemsToReminders([item("old-a"), item("old-b", "Bread")], "apple-list", () => active);
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalled()); active = false; finish("accepted-1"); await pending;
    expect(mocks.create).toHaveBeenCalledOnce(); expect(map()).toEqual({ "old-a": "accepted-1" });
    await rebindReminderMappings([item("old-a")], [item("new-a")]); await pushItemsToReminders([item("new-a")], "apple-list");
    expect(mocks.create).toHaveBeenCalledOnce(); expect(map()).toEqual({ "new-a": "accepted-1" });
  });
  it("ignores late native pulls after changing lists without modifying mappings", async () => {
    await registerReminderMappings([{ avocookId: "a", reminderId: "apple-a" }]);
    let active = true; let finish!: (reminders: typeof mocks.reminders) => void;
    mocks.fetch.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = pullItemsFromReminders([item("a")], "apple-list", () => active);
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalled()); active = false; finish([]);
    expect((await pending).hasChanges).toBe(false); expect(map()).toEqual({ a: "apple-a" });
  });
  it("restores reminder links after restarting during a mode switch", async () => {
    await pushItemsToReminders([item("local-1")], "apple-list"); mocks.reminders[0].title = "Oat milk";
    const pantry = [item("pantry-1-2-3")]; await rebindReminderMappings([], pantry);
    const result = await pullItemsFromReminders(pantry, "apple-list");
    expect(result.updatedItems[0].label).toBe("Oat milk"); expect(result.newReminderItems).toEqual([]);
    expect(mocks.create).toHaveBeenCalledOnce();
  });

});
