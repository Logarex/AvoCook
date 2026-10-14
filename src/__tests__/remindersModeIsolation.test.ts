import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Alert } from "react-native";
import { useRemindersSync } from "../features/shopping/useRemindersSync";
import type { PullResult } from "../features/shopping/remindersSync";
const mocks = vi.hoisted(() => ({
  push: vi.fn(async () => {}), pull: vi.fn(), rebind: vi.fn(async () => {}), available: true,
  linkedList: vi.fn(async () => "reminders-1"), permission: vi.fn(async () => "granted"), create: vi.fn(async () => "reminders-1")
}));
vi.mock("react-native", () => ({ Alert: { alert: vi.fn() }, Linking: { openSettings: vi.fn() } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: async (key: string) => key === "shopping.reminders.enabled.v1" ? "true" : null, setItem: vi.fn() } }));
vi.mock("../features/shopping/remindersSync", () => ({
  isRemindersAvailable: () => mocks.available, requestRemindersPermission: mocks.permission, getRemindersPermissionStatus: async () => "granted", findOrCreateAvoCookList: mocks.create,
  getLinkedListId: mocks.linkedList, pushItemsToReminders: mocks.push, pullItemsFromReminders: mocks.pull, rebindReminderMappings: mocks.rebind,
  clearLinkedListId: vi.fn(), clearItemMap: vi.fn(), deleteAllReminders: vi.fn(), waitForRemindersPush: vi.fn(async () => {})
}));
let screen: ReactTestRenderer;
let current!: ReturnType<typeof useRemindersSync>;
const items = [{ id: "pantry-1-2-3", label: "Fresh Pantry groceries", checked: true, createdAt: "2026-10-13", updatedAt: "2026-10-13" }];
function Harness({ enabled, backend, groceries = items }: { enabled: boolean; backend: string; groceries?: typeof items }) {
  const sync = useRemindersSync(enabled, backend, groceries);
  React.useEffect(() => { current = sync; }, [sync]); return null;
}
async function render(enabled = true, backend = "local", groceries = items) { await act(async () => { screen = create(React.createElement(Harness, { enabled, backend, groceries })); }); }
async function update(enabled: boolean, backend: string, groceries = items) { await act(async () => { screen.update(React.createElement(Harness, { enabled, backend, groceries })); }); }
const result: PullResult = { updatedItems: [], newReminderItems: [], deletedItemIds: [], hasChanges: false };
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.clearAllMocks(); mocks.available = true; mocks.pull.mockResolvedValue(result);
  mocks.linkedList.mockResolvedValue("reminders-1"); mocks.permission.mockResolvedValue("granted");
});
afterEach(async () => { if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); });
describe("Apple Reminders in every shopping mode", () => {
  it.each(["local", "firebase-AVQC42", "pantry-alice-1-2"])("supports push, pull and permission requests in %s", async (backend) => {
    await render(true, backend); expect(current.available).toBe(true); expect(current.linked).toBe(true);
    await current.pushToSystem(items); await current.pullFromSystem(items);
    await act(async () => { await current.enableSync(items); });
    expect(mocks.push).toHaveBeenCalled(); expect(mocks.pull).toHaveBeenCalled(); expect(mocks.permission).toHaveBeenCalled();
  });
  it("keeps Reminders unavailable on non-Apple platforms even when the preference was restored", async () => {
    mocks.available = false; await render(true, "pantry-alice-1-2");
    expect(current.available).toBe(false); expect(current.linked).toBe(false);
    await current.pushToSystem(items); await current.pullFromSystem(items); await current.enableSync(items);
    expect(mocks.push).not.toHaveBeenCalled(); expect(mocks.pull).not.toHaveBeenCalled(); expect(mocks.permission).not.toHaveBeenCalled();
  });
  it("pauses native writes while loading or switching without hiding the Apple setting", async () => {
    await render(false, "pantry-alice-1-2"); expect(current.available).toBe(true);
    await current.pushToSystem(items); expect(await current.pullFromSystem(items)).toBeNull();
    expect(mocks.push).not.toHaveBeenCalled(); expect(mocks.pull).not.toHaveBeenCalled();
  });
  it("discards a native pull result that finishes after selecting another Pantry list", async () => {
    await render(true, "pantry-alice-1-2"); let finish!: (result: PullResult) => void;
    mocks.pull.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = current.pullFromSystem(items); await vi.waitFor(() => expect(mocks.pull).toHaveBeenCalled());
    await update(true, "pantry-alice-1-4"); finish({ ...result, hasChanges: true }); expect(await pending).toBeNull();
  });
  it("does not finish enabling after a permission prompt spans a mode switch", async () => {
    await render(); let finish!: (value: string) => void;
    mocks.permission.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = current.enableSync(items); await vi.waitFor(() => expect(mocks.permission).toHaveBeenCalled());
    await update(true, "pantry-alice-1-2"); finish("granted"); await pending;
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.push).not.toHaveBeenCalled();
  });
  it("reuses the carried items' reminders before importing native edits instead of overwriting them", async () => {
    const local = [{ ...items[0], id: "local-1" }]; await render(true, "local", local);
    await update(true, "pantry-alice-1-2");
    mocks.pull.mockResolvedValueOnce({ ...result, hasChanges: true, updatedItems: [{ ...items[0], label: "Edited in Apple" }] });
    const imported = await current.pullFromSystem(items);
    expect(mocks.rebind).toHaveBeenCalledWith(local, items, expect.any(Function));
    expect(imported?.updatedItems[0].label).toBe("Edited in Apple"); expect(mocks.push).not.toHaveBeenCalled();
  });
  it("cancels a queued native push before issuing it when the backend changes", async () => {
    await render(); let finish!: (value: string) => void;
    mocks.linkedList.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = current.pushToSystem(items); await update(true, "pantry-alice-1-2"); finish("reminders-1"); await pending;
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it("invalidates native operations after unmount", async () => {
    await render(); let finish!: (value: string) => void;
    mocks.linkedList.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = current.pushToSystem(items); await act(async () => { screen.unmount(); }); finish("reminders-1"); await pending;
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it("stops in-flight native writes as soon as keeping reminders while disabling sync is confirmed", async () => {
    await render(); let finish!: () => void;
    mocks.push.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const pending = current.pushToSystem(items); await vi.waitFor(() => expect(mocks.push).toHaveBeenCalled());
    const guard = (mocks.push.mock.calls[0] as unknown as [unknown, unknown, () => boolean])[2];
    expect(guard()).toBe(true);
    await act(async () => { await current.disableSync(); vi.mocked(Alert.alert).mock.calls.at(-1)![2]![0].onPress!(); });
    expect(current.linked).toBe(false); expect(guard()).toBe(false);
    await act(async () => { finish(); await pending; });
    await current.pushToSystem(items); expect(mocks.push).toHaveBeenCalledOnce();
  });

});
