import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { shoppingRelayUrl, requestShoppingRelay, notifySharedListChanged } from "../features/shopping/shoppingPushClient";
const mocks = vi.hoisted(() => ({
  url: "https://relay.workers.dev/", fetch: vi.fn(), getIdToken: vi.fn(async () => "firebase-token"), authenticated: true,
}));
vi.mock("expo-constants", () => ({ default: { get expoConfig() { return { extra: { shoppingPushRelayUrl: mocks.url } }; } } }));
vi.mock("../features/firebase/firebaseClient", () => ({ waitForAuth: async () => mocks.authenticated ? { getIdToken: mocks.getIdToken } : null }));
beforeEach(() => {
  vi.clearAllMocks(); mocks.authenticated = true; mocks.url = "https://relay.workers.dev/";
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ accepted: true }) });
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => vi.unstubAllGlobals());
it("sends the existing Firebase ID token without embedding server credentials", async () => {
  await requestShoppingRelay("/notify", { code: "ABC234" });
  expect(mocks.fetch).toHaveBeenCalledWith("https://relay.workers.dev/notify", expect.objectContaining({
    headers: { "Content-Type": "application/json", Authorization: "Bearer firebase-token" }, body: JSON.stringify({ code: "ABC234" }),
  }));
});
it("rejects insecure and credential-bearing relay addresses", () => {
  for (const url of ["http://relay.workers.dev", "https://user:secret@relay.workers.dev", "https://relay.workers.dev?token=secret", ""]) {
    mocks.url = url; expect(shoppingRelayUrl()).toBeNull();
  }
});
it("leaves shopping-list sync functional when no relay is configured", async () => {
  mocks.url = "";
  await notifySharedListChanged("ABC234");
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("does not turn notification outages or quota exhaustion into shopping-list write failures", async () => {
  mocks.fetch.mockResolvedValue({ ok: false, status: 429 });
  await expect(notifySharedListChanged("abc234")).resolves.toBeUndefined();
  expect(mocks.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: JSON.stringify({ code: "ABC234" }) }));
});
it("does not send unauthenticated notification requests", async () => {
  mocks.authenticated = false;
  await expect(requestShoppingRelay("/notify", { code: "ABC234" })).rejects.toThrow("sign-in unavailable");
  expect(mocks.fetch).not.toHaveBeenCalled();
});
