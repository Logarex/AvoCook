import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  available: true,
  platform: "ios",
  permission: vi.fn(),
  native: {
    voiceAvailable: vi.fn(),
    startVoice: vi.fn(),
    replaceStockReminders: vi.fn(),
  },
}));
vi.mock("expo-modules-core", () => ({
  requireOptionalNativeModule: () => (mocks.available ? mocks.native : null),
}));
vi.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mocks.platform;
    },
  },
  PermissionsAndroid: {
    request: mocks.permission,
    PERMISSIONS: { RECORD_AUDIO: "microphone" },
    RESULTS: { GRANTED: "granted" },
  },
}));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.available = true;
  mocks.platform = "ios";
  mocks.native.voiceAvailable.mockResolvedValue(true);
  mocks.native.startVoice.mockResolvedValue(true);
  mocks.permission.mockResolvedValue("granted");
  mocks.native.replaceStockReminders.mockResolvedValue(true);
});
describe("optional on-device kitchen capabilities", () => {
  it("keeps unsupported devices usable and never starts speech when offline recognition is unavailable", async () => {
    const { startLocalVoice, replaceStockReminders } = await import(
      "../features/kitchen/kitchenNative"
    );
    mocks.native.voiceAvailable.mockResolvedValue(false);
    expect(await startLocalVoice("fr-FR")).toBe(false);
    expect(mocks.native.startVoice).not.toHaveBeenCalled();
    mocks.available = false;
    expect(await startLocalVoice("fr-FR")).toBe(false);
    expect(await replaceStockReminders([])).toBe(false);
  });
  it("requests microphone permission only after confirming local Android recognition is available", async () => {
    mocks.platform = "android";
    mocks.permission.mockResolvedValue("denied");
    const { startLocalVoice } = await import(
      "../features/kitchen/kitchenNative"
    );
    expect(await startLocalVoice("da-DK")).toBe(false);
    expect(mocks.permission).toHaveBeenCalledWith("microphone");
    expect(mocks.native.startVoice).not.toHaveBeenCalled();
    mocks.native.voiceAvailable.mockResolvedValue(false);
    mocks.permission.mockClear();
    expect(await startLocalVoice("da-DK")).toBe(false);
    expect(mocks.permission).not.toHaveBeenCalled();
  });
  it("serializes reminder replacement and continues after a failed native write", async () => {
    const { replaceStockReminders } = await import(
      "../features/kitchen/kitchenNative"
    );
    mocks.native.replaceStockReminders.mockRejectedValueOnce(
      new Error("native failure"),
    );
    const first = replaceStockReminders([]),
      second = replaceStockReminders([
        {
          id: "date",
          title: "Local",
          body: "Food",
          date: "2027-01-01T09:00:00Z",
        },
      ]);
    await expect(first).rejects.toThrow("native failure");
    await expect(second).resolves.toBe(true);
    expect(
      mocks.native.replaceStockReminders.mock.calls.map((call) =>
        JSON.parse(call[0]),
      ),
    ).toEqual([
      [],
      [
        {
          id: "date",
          title: "Local",
          body: "Food",
          date: "2027-01-01T09:00:00Z",
        },
      ],
    ]);
  });
});
