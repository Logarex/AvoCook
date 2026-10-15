import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimersProvider, useRecipeTimers, type TimerPreset } from "../features/timers/TimersProvider";

const mocks = vi.hoisted(() => ({
  schedule: vi.fn(), cancel: vi.fn(async () => {}), vibrate: vi.fn(),
  stop: null as null | ((event: { recipeId: string; timerId: string; notificationId: string }) => void)
}));
vi.mock("react-native", () => ({ Vibration: { vibrate: mocks.vibrate } }));
vi.mock("../features/timers/timerNotifications", () => ({
  scheduleTimerNotification: mocks.schedule,
  cancelTimerNotification: mocks.cancel,
  getTimerNotificationState: async () => "ready",
  addTimerStopListener: async (listener: typeof mocks.stop) => { mocks.stop = listener; return { remove: vi.fn() }; }
}));
let screen: ReactTestRenderer;
let timers: ReturnType<typeof useRecipeTimers>;
const initialPresets: TimerPreset[] = [{ id: "cook", label: "Cooking", minutes: 2 }];
const options = { title: "Timer done", body: "Soup" };
function Probe({ presets = initialPresets }: { presets?: TimerPreset[] }) {
  const current = useRecipeTimers("recipe", presets);
  React.useEffect(() => { timers = current; });
  return null;
}
async function render(presets = initialPresets) {
  await act(async () => { screen = create(React.createElement(TimersProvider, null, React.createElement(Probe, { presets }))); });
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
  vi.clearAllMocks();
  mocks.schedule.mockResolvedValue({ state: "ready", notificationId: "alarm-1" });
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("recipe timers", () => {
  it("counts down and finishes once at the deadline", async () => {
    await render();
    await act(async () => { await timers.toggleTimer("cook", options); });
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(timers.timers.cook.remainingSeconds).toBe(119);
    await act(async () => { vi.advanceTimersByTime(119000); });
    expect(timers.timers.cook).toMatchObject({ remainingSeconds: 0, running: false });
    expect(mocks.vibrate).toHaveBeenCalledOnce();
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(mocks.vibrate).toHaveBeenCalledOnce();
  });

  it("schedules only one alarm for rapid taps while permission is pending", async () => {
    let finish!: (result: { state: string; notificationId: string }) => void;
    mocks.schedule.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await render();
    await act(async () => {
      const first = timers.toggleTimer("cook", options);
      const second = timers.toggleTimer("cook", options);
      finish({ state: "ready", notificationId: "alarm-1" });
      await Promise.all([first, second]);
    });
    expect(mocks.schedule).toHaveBeenCalledOnce();
    expect(timers.timers.cook.running).toBe(true);
  });

  it("cancels an alarm that finishes scheduling after the timer was reset", async () => {
    let finish!: (result: { state: string; notificationId: string }) => void;
    mocks.schedule.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await render();
    await act(async () => {
      const pending = timers.toggleTimer("cook", options);
      timers.resetTimer("cook");
      finish({ state: "ready", notificationId: "late-alarm" });
      await pending;
    });
    expect(mocks.cancel).toHaveBeenCalledWith("late-alarm");
    expect(timers.timers.cook).toMatchObject({ running: false, remainingSeconds: 120 });
  });

  it("pauses using the actual deadline and resumes with the remaining time", async () => {
    await render();
    await act(async () => { await timers.toggleTimer("cook", options); });
    await act(async () => { vi.advanceTimersByTime(15000); });
    await act(async () => { await timers.toggleTimer("cook", options); });
    expect(timers.timers.cook).toMatchObject({ running: false, remainingSeconds: 105 });
    await act(async () => { await timers.toggleTimer("cook", options); });
    expect(mocks.schedule).toHaveBeenLastCalledWith(expect.objectContaining({ seconds: 105 }));
  });

  it("ignores the stop action of an older alarm after a restart", async () => {
    await render();
    await act(async () => { await timers.toggleTimer("cook", options); });
    await act(async () => { timers.resetTimer("cook"); });
    mocks.schedule.mockResolvedValueOnce({ state: "ready", notificationId: "alarm-2" });
    await act(async () => { await timers.toggleTimer("cook", options); });
    await act(async () => { mocks.stop?.({ recipeId: "recipe", timerId: "cook", notificationId: "alarm-1" }); });
    expect(timers.timers.cook).toMatchObject({ running: true, notificationId: "alarm-2" });
    await act(async () => { mocks.stop?.({ recipeId: "recipe", timerId: "cook", notificationId: "alarm-2" }); });
    expect(timers.timers.cook.running).toBe(false);
  });

  it("cancels the previous alarm when a recipe duration changes", async () => {
    await render();
    await act(async () => { await timers.toggleTimer("cook", options); });
    const presets: TimerPreset[] = [{ id: "cook", label: "Cooking", minutes: 3 }];
    await act(async () => { screen.update(React.createElement(TimersProvider, null, React.createElement(Probe, { presets }))); });
    expect(mocks.cancel).toHaveBeenCalledWith("alarm-1");
    expect(timers.timers.cook).toMatchObject({ durationSeconds: 180, remainingSeconds: 180, running: false });
  });

  it("does not run when notification permission is denied", async () => {
    mocks.schedule.mockResolvedValueOnce({ state: "denied", notificationId: null });
    await render();
    await act(async () => { expect(await timers.toggleTimer("cook", options)).toBe("denied"); });
    expect(timers.timers.cook.running).toBe(false);
    expect(timers.notificationStatus).toBe("denied");
  });
});
