import { reinstallStorage } from "../features/storage/reinstallStorage";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  local: new Map<string, string>(),
  secure: new Map<string, string>(),
  available: true,
  generation: 0,
  failChunk: false,
  failLocal: false
}));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {
  getItem: async (key: string) => storage.local.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    if (storage.failLocal) throw new Error("Disk unavailable");
    storage.local.set(key, value);
  },
  removeItem: async (key: string) => { storage.local.delete(key); }
} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => `generation-${++storage.generation}` }));
vi.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  isAvailableAsync: async () => storage.available,
  getItemAsync: async (key: string) => storage.secure.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    if (storage.failChunk && key.endsWith(".1")) throw new Error("Interrupted keychain write");
    expect(Buffer.byteLength(value, "utf8")).toBeLessThanOrEqual(2048);
    expect(key).toMatch(/^[\w.-]+$/);
    storage.secure.set(key, value);
  },
  deleteItemAsync: async (key: string) => { storage.secure.delete(key); }
}));

beforeEach(() => {
  storage.local.clear(); storage.secure.clear(); storage.available = true;
  storage.failChunk = false; storage.failLocal = false;
});

describe("settings and community identity across reinstallations", () => {
  it("migrates existing settings without changing their values", async () => {
    storage.local.set("preferences.language", "de");
    storage.local.set("preferences.keepRecipesLocal", "false");
    expect(await reinstallStorage.getItem("preferences.language")).toBe("de");
    expect(await reinstallStorage.getItem("preferences.keepRecipesLocal")).toBe("false");
    storage.local.clear();
    expect(await reinstallStorage.getItem("preferences.language")).toBe("de");
    expect(await reinstallStorage.getItem("preferences.keepRecipesLocal")).toBe("false");
  });

  it("restores the complete Firebase session, preserving the author UID and tokens", async () => {
    const key = "firebase:authUser:public-key:[DEFAULT]";
    const session = JSON.stringify({ uid: "original-author", stsTokenManager: { refreshToken: "token".repeat(700) } });
    storage.local.set(key, session);
    expect(await reinstallStorage.getItem(key)).toBe(session);
    storage.local.clear();
    expect(JSON.parse((await reinstallStorage.getItem(key))!).uid).toBe("original-author");
    expect(await reinstallStorage.getItem(key)).toBe(session);
  });

  it("retains a refreshed token when the unencrypted cache cannot be written", async () => {
    await reinstallStorage.setItem("auth", "previous-token");
    storage.failLocal = true;
    await reinstallStorage.setItem("auth", "fresh-token");
    expect(await reinstallStorage.getItem("auth")).toBe("fresh-token");
  });

  it("preserves the previous value when a chunk write is interrupted", async () => {
    await reinstallStorage.setItem("auth", "existing-session");
    storage.failChunk = true;
    await expect(reinstallStorage.setItem("auth", "x".repeat(1500))).rejects.toThrow("Interrupted");
    storage.local.clear();
    expect(await reinstallStorage.getItem("auth")).toBe("existing-session");
  });

  it("keeps Unicode settings within SecureStore's size limit", async () => {
    const value = "🥑漢字".repeat(600);
    await reinstallStorage.setItem("preferences.communityPseudonym", value);
    storage.local.clear();
    expect(await reinstallStorage.getItem("preferences.communityPseudonym")).toBe(value);
  });

  it("does not resurrect a deleted setting from a stale legacy cache", async () => {
    await reinstallStorage.setItem("preferences.communityPseudonym", "Lukas");
    await reinstallStorage.removeItem("preferences.communityPseudonym");
    storage.local.set("preferences.communityPseudonym", "Lukas");
    expect(await reinstallStorage.getItem("preferences.communityPseudonym")).toBeNull();
  });

  it("serializes concurrent session refreshes and removes obsolete chunks", async () => {
    await Promise.all([
      reinstallStorage.setItem("auth", "a".repeat(2000)),
      reinstallStorage.setItem("auth", "b".repeat(1000)),
      reinstallStorage.setItem("auth", "latest")
    ]);
    expect(await reinstallStorage.getItem("auth")).toBe("latest");
    expect(storage.secure.size).toBe(2);
  });

  it("falls back to AsyncStorage on platforms without SecureStore", async () => {
    storage.available = false;
    await reinstallStorage.setItem("preferences.theme", "dark");
    expect(await reinstallStorage.getItem("preferences.theme")).toBe("dark");
    expect(storage.secure.size).toBe(0);
    await reinstallStorage.removeItem("preferences.theme");
    expect(await reinstallStorage.getItem("preferences.theme")).toBeNull();
  });
});
