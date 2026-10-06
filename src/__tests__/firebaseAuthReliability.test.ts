import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({
  listener: null as ((user: { uid: string } | null) => void) | null,
  signIn: vi.fn()
}));
vi.mock("firebase/app", () => ({ initializeApp: () => ({}), getApps: () => [] }));
vi.mock("firebase/firestore", () => ({ getFirestore: () => ({}) }));
vi.mock("firebase/storage", () => ({ getStorage: () => ({}) }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("firebase/auth", () => ({
  initializeAuth: () => ({}), getAuth: () => ({}), getReactNativePersistence: () => ({}),
  signInAnonymously: authMock.signIn,
  onAuthStateChanged: (_auth: unknown, callback: typeof authMock.listener) => { authMock.listener = callback; return () => {}; }
}));

beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); authMock.listener = null; });
afterEach(() => { vi.useRealTimers(); });

describe("Firebase authentication reliability", () => {
  it("bounds the wait when the SDK does not provide an initial auth state", async () => {
    vi.useFakeTimers();
    const auth = await import("../features/firebase/firebaseClient");
    const pending = auth.waitForAuth(1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toBeNull();
    authMock.listener!({ uid: "new-user" });
    expect((await auth.waitForAuth())?.uid).toBe("new-user");
  });

  it("clears an old UID when reauthentication fails", async () => {
    const auth = await import("../features/firebase/firebaseClient");
    auth.initFirebaseAuth();
    authMock.listener!({ uid: "old-user" });
    expect(auth.getAnonymousUid()).toBe("old-user");
    authMock.signIn.mockRejectedValue(new Error("Offline"));
    authMock.listener!(null);
    expect(auth.getAnonymousUid()).toBeNull();
    expect(await auth.waitForAuth()).toBeNull();
    expect(auth.getCurrentUser()).toBeNull();
  });
});
