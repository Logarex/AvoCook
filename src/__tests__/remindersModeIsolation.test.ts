import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRemindersSync } from "../features/shopping/useRemindersSync";
import type { PullResult } from "../features/shopping/remindersSync";
const mocks = vi.hoisted(() => ({
  push: vi.fn(async () => {}), pull: vi.fn(), linkedList: vi.fn(async () => "reminders-1"), permission: vi.fn(async () => "granted"), create: vi.fn(async () => "reminders-1")
}));
vi.mock("react-native", () => ({ Alert: { alert: vi.fn() }, Linking: { openSettings: vi.fn() } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: async (key: string) => key === "shopping.reminders.enabled.v1" ? "true" : null, setItem: vi.fn() } }));
vi.mock("../features/shopping/remindersSync", () => ({
  isRemindersAvailable: () => true, requestRemindersPermission: mocks.permission, getRemindersPermissionStatus: async () => "granted", findOrCreateAvoCookList: mocks.create,
  getLinkedListId: mocks.linkedList, pushItemsToReminders: mocks.push, pullItemsFromReminders: mocks.pull, clearLinkedListId: vi.fn(), clearItemMap: vi.fn(), deleteAllReminders: vi.fn()
}));
let screen: ReactTestRenderer;
let current!: ReturnType<typeof useRemindersSync>;
function Harness({ enabled, pantry }: { enabled: boolean; pantry: boolean }) {
  const sync = useRemindersSync(enabled, pantry);
  React.useEffect(() => { current = sync; }, [sync]); return null;
}
async function render(enabled: boolean, pantry: boolean) { await act(async () => { screen = create(React.createElement(Harness, { enabled, pantry })); }); }
async function update(enabled: boolean, pantry: boolean) { await act(async () => { screen.update(React.createElement(Harness, { enabled, pantry })); }); }
const items = [{ id: "pantry-1-2-3", label: "Fresh Pantry groceries", checked: true, createdAt: "2026-10-13", updatedAt: "2026-10-13" }];
const result: PullResult = { updatedItems: [], newReminderItems: [], deletedItemIds: [], hasChanges: false };
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.clearAllMocks(); mocks.pull.mockResolvedValue(result);
  mocks.linkedList.mockResolvedValue("reminders-1"); mocks.permission.mockResolvedValue("granted");
});
afterEach(async () => { if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); });
describe("Reminders stay isolated from Pantry", () => {
  it("does not pull, push or request permissions in Pantry mode", async () => {
    await render(false, true); expect(current.available).toBe(false); expect(current.linked).toBe(false);
    await current.pushToSystem(items); expect(await current.pullFromSystem(items)).toBeNull(); await current.enableSync(items);
    expect(mocks.push).not.toHaveBeenCalled(); expect(mocks.pull).not.toHaveBeenCalled(); expect(mocks.permission).not.toHaveBeenCalled();
  });
  it("discards a native pull result that finishes after switching to Pantry", async () => {
    await render(true, false); let finish!: (result: PullResult) => void;
    mocks.pull.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = current.pullFromSystem(items); await vi.waitFor(() => expect(mocks.pull).toHaveBeenCalled());
    await update(false, true); finish({ ...result, hasChanges: true }); expect(await pending).toBeNull();
  });
  it("does not finish enabling Reminders after a permission prompt spans a mode switch", async () => {
    await render(true, false); let finish!: (value: string) => void;
    mocks.permission.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = current.enableSync(items); await vi.waitFor(() => expect(mocks.permission).toHaveBeenCalled());
    await update(false, true); finish("granted"); await pending;
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.push).not.toHaveBeenCalled();
  });
  it("aligns the carried list before importing old Reminders data on return to local", async () => {
    await render(false, true); await update(true, false);
    expect(await current.pullFromSystem(items)).toBeNull(); expect(mocks.push).toHaveBeenCalledWith(items, "reminders-1"); expect(mocks.pull).not.toHaveBeenCalled();
    await current.pullFromSystem(items); expect(mocks.pull).toHaveBeenCalledOnce();
  });
  it("cancels a queued native push before issuing it if the mode has changed", async () => {
    await render(true, false); let finish!: (value: string) => void;
    mocks.linkedList.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = current.pushToSystem(items); await update(false, true); finish("reminders-1"); await pending;
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
