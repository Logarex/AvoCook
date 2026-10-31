import React from "react";
import { useShoppingPushNotifications } from "../features/shopping/shoppingPushNotifications";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  register: vi.fn(async (_data: unknown) => ({})),
  permission: vi.fn(), token: vi.fn(), channel: vi.fn(),
  listeners: new Set<(state: string) => void>(),
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" }, AppState: { addEventListener: (_event: string, callback: (state: string) => void) => {
  mocks.listeners.add(callback); return { remove: () => mocks.listeners.delete(callback) };
} } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "fr" } }) }));
vi.mock("expo-constants", () => ({ default: { easConfig: { projectId: "project" } } }));
vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(), setNotificationChannelAsync: vi.fn(), AndroidImportance: { DEFAULT: 3, NONE: 0 }, getNotificationChannelAsync: mocks.channel,
  getPermissionsAsync: mocks.permission, requestPermissionsAsync: mocks.permission,
  getExpoPushTokenAsync: mocks.token, addPushTokenListener: () => ({ remove: vi.fn() }),
}));
vi.mock("../features/shopping/shoppingPushClient", () => ({ shoppingRelayUrl: () => "https://relay.workers.dev", requestShoppingRelay: (_path: string, data: unknown) => mocks.register(data) }));
vi.mock("../features/firebase/firebaseClient", () => ({ getDb: () => ({ app: {} }), waitForAuth: async () => ({ uid: "user" }) }));
vi.mock("../features/shopping/sharedListClient", () => ({ getDeviceId: async () => "device" }));
vi.mock("../i18n", () => ({ default: { t: (key: string) => key } }));
let screen: ReactTestRenderer;
function Probe({ code = "ABC234", enabled = true }: { code?: string | null; enabled?: boolean }) {
  useShoppingPushNotifications(code, enabled); return null;
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks(); mocks.listeners.clear();
  mocks.permission.mockResolvedValue({ granted: true, canAskAgain: true });
  mocks.channel.mockResolvedValue({ importance: 3 });
  mocks.token.mockResolvedValue({ data: "ExpoPushToken[token]" });
});
afterEach(async () => { if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); });
it("registers the device for server notifications and refreshes after returning from settings", async () => {
  await act(async () => { screen = create(React.createElement(Probe)); });
  expect(mocks.register).toHaveBeenLastCalledWith(expect.objectContaining({ code: "ABC234", token: "ExpoPushToken[token]", deviceId: "device" }));
  await act(async () => { mocks.listeners.forEach((callback) => callback("active")); });
  expect(mocks.register).toHaveBeenCalledTimes(2);
});
it("removes the subscription when the user disables notifications or leaves the list", async () => {
  await act(async () => { screen = create(React.createElement(Probe)); });
  await act(async () => { screen.update(React.createElement(Probe, { enabled: false })); });
  expect(mocks.register).toHaveBeenLastCalledWith(expect.objectContaining({ code: null, token: null }));
  await act(async () => { screen.update(React.createElement(Probe, { code: null })); });
  expect(mocks.register).toHaveBeenLastCalledWith(expect.objectContaining({ code: null, token: null }));
});
it("does not register for pushes when OS notifications are denied", async () => {
  mocks.permission.mockResolvedValue({ granted: false, canAskAgain: false });
  await act(async () => { screen = create(React.createElement(Probe)); });
  expect(mocks.token).not.toHaveBeenCalled();
  expect(mocks.register).toHaveBeenLastCalledWith(expect.objectContaining({ code: null, token: null }));
});
it("ignores a token that arrives after switching lists", async () => {
  let finish!: (value: { data: string }) => void;
  mocks.token.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  await act(async () => { screen = create(React.createElement(Probe)); });
  await act(async () => { screen.update(React.createElement(Probe, { code: "DEF567" })); });
  await act(async () => { finish({ data: "ExpoPushToken[old]" }); });
  expect(mocks.register).toHaveBeenCalledOnce();
  expect(mocks.register).toHaveBeenCalledWith(expect.objectContaining({ code: "DEF567", token: "ExpoPushToken[token]" }));
});

it("detects a blocked shopping channel even when app permission is granted", async () => {
  mocks.channel.mockResolvedValue({ importance: 0 });
  await act(async () => { screen = create(React.createElement(Probe)); });
  expect(mocks.token).not.toHaveBeenCalled();
  expect(mocks.register).toHaveBeenLastCalledWith(expect.objectContaining({ code: null, token: null }));
});
