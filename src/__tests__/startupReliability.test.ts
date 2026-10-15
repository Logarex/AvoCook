import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOnboarding } from "../features/onboarding/useOnboarding";
import { checkForUpdates } from "../features/updates/updateService";

const mocks = vi.hoisted(() => ({
  getItem: vi.fn(), setItem: vi.fn(async () => {}),
  platform: { OS: "android" }, installer: vi.fn(), fetch: vi.fn()
}));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: mocks.getItem, setItem: mocks.setItem } }));
vi.mock("expo-constants", () => ({ default: { expoConfig: { version: "4.0.1" } } }));
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
  mocks.getItem.mockResolvedValue(null);
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
    expect(state.introDone).toBe(false);
  });

  it("does not block the first launch when the version marker cannot be saved", async () => {
    mocks.setItem.mockRejectedValueOnce(new Error("Storage full"));
    await act(async () => { screen = create(React.createElement(Probe)); });
    expect(state.onboardingHydrated).toBe(true);
    expect(state.showUpdateScreen).toBe(false);
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
      tag_name: "v4.0.2", html_url: "https://github.com/Logarex/AvoCook/releases/tag/v4.0.2",
      assets: [{ name: "avocook.apk", browser_download_url: "https://github.com/Logarex/AvoCook/releases/download/v4.0.2/avocook.apk" }]
    }) });
    expect(await checkForUpdates()).toMatchObject({ updateAvailable: true, latestVersion: "v4.0.2", apkUrl: expect.stringContaining("avocook.apk") });
  });
});
