import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOnboarding } from "../features/onboarding/useOnboarding";
import { APP_VERSION } from "../version";
import { checkForUpdates } from "../features/updates/updateService";

const mocks = vi.hoisted(() => ({
  getItem: vi.fn(), setItem: vi.fn(async () => {}), removeItem: vi.fn(async () => {}),
  platform: { OS: "android" }, installer: vi.fn(), fetch: vi.fn()
}));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: mocks.getItem, setItem: mocks.setItem, removeItem: mocks.removeItem } }));
vi.mock("react-native", () => ({ Platform: mocks.platform }));
vi.mock("react-native-device-info", () => ({ default: { getInstallerPackageName: mocks.installer } }));
let screen: ReactTestRenderer | undefined;
let state: ReturnType<typeof useOnboarding>;
function Probe() {
  const current = useOnboarding();
  React.useEffect(() => { state = current; });
  return null;
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", mocks.fetch);
  vi.clearAllMocks();
  mocks.getItem.mockReset().mockResolvedValue(null);
  mocks.setItem.mockResolvedValue(undefined);
  mocks.platform.OS = "android";
  mocks.installer.mockResolvedValue("");
});
afterEach(async () => {
  if (screen) await act(async () => screen?.unmount());
  screen = undefined;
  vi.unstubAllGlobals();
});

describe("startup reliability", () => {
  it("finishes loading even when onboarding storage cannot be read", async () => {
    mocks.getItem.mockRejectedValueOnce(new Error("Storage unavailable"));
    await act(async () => { screen = create(React.createElement(Probe)); });
    expect(state.onboardingHydrated).toBe(true);
    expect(state.tourDone).toBe(false);
  });

  it("does not block the first launch when the version marker cannot be saved", async () => {
    mocks.setItem.mockRejectedValueOnce(new Error("Storage full"));
    await act(async () => { screen = create(React.createElement(Probe)); });
    expect(state.onboardingHydrated).toBe(true);
    expect(state.showUpdateScreen).toBe(false);
  });

  it("starts fresh with only the guided tour pending", async () => {
    await act(async () => { screen = create(React.createElement(Probe)); });
    expect(state.tourDone).toBe(false);
    expect(state.showUpdateScreen).toBe(false);
    expect(mocks.getItem.mock.calls.map(([key]) => key)).not.toContain("onboarding.introDone");
  });

  it("preserves a completed tour and offers updates without the old introduction marker", async () => {
    mocks.getItem.mockImplementation(async (key: string) => key === "onboarding.tourDone" ? "true" : "4.0.0");
    await act(async () => { screen = create(React.createElement(Probe)); });
    expect(state.tourDone).toBe(true);
    expect(state.showUpdateScreen).toBe(true);
  });

  it("replays only the tour while retaining the current version marker", async () => {
    mocks.getItem.mockImplementation(async (key: string) => key === "onboarding.tourDone" ? "true" : "4.0.0");
    await act(async () => { screen = create(React.createElement(Probe)); });
    await act(async () => { await state.resetOnboarding(); });
    expect(state.tourDone).toBe(false);
    expect(state.showUpdateScreen).toBe(false);
    expect(mocks.removeItem).toHaveBeenCalledWith("onboarding.tourDone");
    expect(mocks.setItem).toHaveBeenCalledWith("onboarding.lastSeenVersion", APP_VERSION);
    await act(async () => { await state.markTourDone(); });
    expect(state.tourDone).toBe(true);
    expect(mocks.setItem).toHaveBeenCalledWith("onboarding.tourDone", "true");
  });

  it("does not offer an Android APK update on iOS", async () => {
    mocks.platform.OS = "ios";
    expect(await checkForUpdates()).toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.installer).not.toHaveBeenCalled();
  });

  it("leaves Google Play updates to the store", async () => {
    mocks.installer.mockResolvedValueOnce("com.android.vending");
    expect(await checkForUpdates()).toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("offers release APKs for a sideloaded Android installation", async () => {
    mocks.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({
      tag_name: "v4.3.2", html_url: "https://github.com/Logarex/AvoCook/releases/tag/v4.3.2",
      assets: [{ name: "avocook.apk", browser_download_url: "https://github.com/Logarex/AvoCook/releases/download/v4.3.2/avocook.apk" }]
    }) });
    expect(await checkForUpdates()).toMatchObject({ updateAvailable: true, latestVersion: "v4.3.2", apkUrl: expect.stringContaining("avocook.apk") });
  });

  it("does not offer the previous published APK as an update to this release", async () => {
    mocks.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({
      tag_name: "v4.0.2", html_url: "https://github.com/Logarex/AvoCook/releases/tag/v4.0.2", assets: []
    }) });
    expect(await checkForUpdates()).toMatchObject({ updateAvailable: false });
  });
});
