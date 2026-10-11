import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({
  listener: null as ((user: { uid: string } | null) => void) | null,
  signIn: vi.fn()
}));
vi.mock("firebase/app", () => ({ initializeApp: () => ({}), getApps: () => [] }));
vi.mock("firebase/firestore", () => ({ getFirestore: () => ({}) }));
vi.mock("firebase/storage", () => ({ getStorage: () => ({}) }));
vi.mock("../features/storage/reinstallStorage", () => ({ reinstallStorage: {} }));
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

describe("Firebase sign-in recovery", () => {
  it("retries a failed sign-in on the next community action", async () => {
    const auth = await import("../features/firebase/firebaseClient");
    authMock.signIn.mockRejectedValueOnce(new Error("Offline"));
    auth.initFirebaseAuth();
    authMock.listener!(null);
    expect(await auth.waitForAuth()).toBeNull();
    await Promise.resolve();
    authMock.signIn.mockResolvedValueOnce({ user: { uid: "restored-user" } });
    expect((await auth.waitForAuth())?.uid).toBe("restored-user");
    expect(authMock.signIn).toHaveBeenCalledTimes(2);
  });

  it("shares an in-flight sign-in across multiple community actions", async () => {
    const auth = await import("../features/firebase/firebaseClient");
    let finish!: (value: unknown) => void;
    authMock.signIn.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    auth.initFirebaseAuth();
    authMock.listener!(null);
    const first = auth.waitForAuth();
    const second = auth.waitForAuth();
    finish({ user: { uid: "one-author" } });
    expect((await first)?.uid).toBe("one-author");
    expect((await second)?.uid).toBe("one-author");
    expect(authMock.signIn).toHaveBeenCalledTimes(1);
  });
});
