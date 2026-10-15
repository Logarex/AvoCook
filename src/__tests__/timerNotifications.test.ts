import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  language: "en", configure: vi.fn(), permission: vi.fn(), schedule: vi.fn(), available: true
}));
vi.mock("expo-modules-core", () => ({ requireOptionalNativeModule: () => mocks.available ? {
  configureTimerNotifications: mocks.configure,
  requestTimerNotificationPermission: mocks.permission,
  scheduleTimerNotification: mocks.schedule
} : null }));
vi.mock("../i18n", () => ({ default: { t: (key: string) => {
  if (key.endsWith("stopAction")) return mocks.language === "fr" ? "Arrêter" : "Stop";
  return mocks.language === "fr" ? "Minuteurs" : "Timers";
} } }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); mocks.language = "en"; mocks.available = true;
  mocks.configure.mockResolvedValue(true); mocks.permission.mockResolvedValue("ready"); mocks.schedule.mockResolvedValue("alarm");
});

describe("native timer notifications", () => {
  it("updates the notification action and channel after changing app language", async () => {
    const { configureTimerNotifications } = await import("../features/timers/timerNotifications");
    await configureTimerNotifications();
    mocks.language = "fr";
    await configureTimerNotifications();
    expect(mocks.configure.mock.calls).toEqual([["Stop", "Timers"], ["Arrêter", "Minuteurs"]]);
  });

  it("configures concurrent requests only once for the same language", async () => {
    const { configureTimerNotifications } = await import("../features/timers/timerNotifications");
    expect(await Promise.all([configureTimerNotifications(), configureTimerNotifications()])).toEqual([true, true]);
    expect(mocks.configure).toHaveBeenCalledOnce();
  });

  it("retries a native configuration failure instead of caching it as a success", async () => {
    const { configureTimerNotifications } = await import("../features/timers/timerNotifications");
    mocks.configure.mockResolvedValueOnce(false);
    expect(await configureTimerNotifications()).toBe(false);
    expect(await configureTimerNotifications()).toBe(true);
    expect(mocks.configure).toHaveBeenCalledTimes(2);
  });

  it("does not schedule an alert when notifications are denied or unavailable", async () => {
    const { scheduleTimerNotification } = await import("../features/timers/timerNotifications");
    mocks.permission.mockResolvedValueOnce("denied");
    const options = { title: "Done", body: "Soup", recipeId: "recipe", timerId: "cook", seconds: 60 };
    expect(await scheduleTimerNotification(options)).toEqual({ state: "denied", notificationId: null });
    mocks.available = false;
    expect(await scheduleTimerNotification(options)).toEqual({ state: "unavailable", notificationId: null });
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
});
