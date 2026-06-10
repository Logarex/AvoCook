import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatLogEntry,
  getLogMode,
  setLogMode,
  isLogLevelEnabled,
  logError,
  logInfo,
  clearLogEntries,
  loadLogEntries,
  type AppLogEntry
} from "../features/logging/appLogger";

const mockStorage: Record<string, string> = {};

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => mockStorage[key] || null),
    setItem: vi.fn(async (key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete mockStorage[key];
    })
  }
}));

beforeEach(async () => {
  for (const key of Object.keys(mockStorage)) {
    delete mockStorage[key];
  }
  await clearLogEntries();
  await setLogMode("errors");
});

describe("appLogger diagnostics anonymization", () => {
  it("redacts Nextcloud profile fields without mangling HTTP dates", () => {
    const entry: AppLogEntry = {
      id: "1",
      timestamp: "2026-05-22T16:16:35.459Z",
      level: "info",
      category: "network",
      message: "HTTP response",
      context: {
        url: "https://cloud.secret.example/remote.php/dav/files/logarex/AvoCook%20Images/photo.jpg",
        responseHeaders: {
          date: "Fri, 22 May 2026 16:14:53 GMT",
          "x-user-id": "logarex"
        },
        responseBodyPreview: {
          ocs: {
            data: {
              id: "logarex",
              displayname: "Louis CHABERT",
              email: "louis@example.com",
              phone: "+33614488907",
              address: "Toulouse",
              storageLocation: "/var/www/html/data/logarex",
              groups: ["admin"],
              timezone: "Europe/Paris"
            }
          }
        },
        legacyPreview:
          '{"displayname":"Louis CHABERT","phone":"+33614488907","groups":["admin"]}'
      }
    };

    const report = formatLogEntry(entry, { anonymize: true });

    expect(report).toContain("Fri, 22 May 2026 16:14:53 GMT");
    expect(report).toContain("https://nextcloud.example/remote.php/dav/files/[user]/[path]");
    expect(report).not.toContain("Louis");
    expect(report).not.toContain("logarex");
    expect(report).not.toContain("+33614488907");
    expect(report).not.toContain("Toulouse");
    expect(report).not.toContain("louis@example.com");
    expect(report).not.toContain("/var/www/html/data");
    expect(report).not.toContain("admin");
  });
});

describe("appLogger modes", () => {
  it("defaults to errors log mode", async () => {
    const mode = await getLogMode();
    expect(mode).toBe("errors");
  });

  it("returns enabled log levels correctly based on mode", async () => {
    await setLogMode("errors");
    expect(isLogLevelEnabled("debug")).toBe(false);
    expect(isLogLevelEnabled("info")).toBe(false);
    expect(isLogLevelEnabled("warn")).toBe(true);
    expect(isLogLevelEnabled("error")).toBe(true);

    await setLogMode("all");
    expect(isLogLevelEnabled("debug")).toBe(true);
    expect(isLogLevelEnabled("info")).toBe(true);
    expect(isLogLevelEnabled("warn")).toBe(true);
    expect(isLogLevelEnabled("error")).toBe(true);
  });

  it("keeps warning/error logs when detailed logs overflow", async () => {
    await setLogMode("all");
    await clearLogEntries();

    logError("app", "Initial Error");

    for (let i = 0; i < 60; i++) {
      logInfo("app", `Info ${i}`);
    }

    await setLogMode("all");

    const entries = await loadLogEntries();

    expect(entries.length).toBe(26);

    const hasError = entries.some((e) => e.message === "Initial Error");
    expect(hasError).toBe(true);

    const hasInfo0 = entries.some((e) => e.message === "Info 0");
    expect(hasInfo0).toBe(false);
  });

  it("stores detailed logs even when detailed mode is disabled", async () => {
    await setLogMode("errors");

    logInfo("app", "Background info");

    await setLogMode("errors");

    const entries = await loadLogEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.message).toBe("Background info");
  });

  it("caps warning/error and detailed logs independently", async () => {
    await clearLogEntries();

    for (let i = 0; i < 30; i++) {
      logError("app", `Error ${i}`);
      logInfo("app", `Info ${i}`);
    }

    await setLogMode("all");

    const entries = await loadLogEntries();
    const errorEntries = entries.filter((entry) => entry.level === "error");
    const infoEntries = entries.filter((entry) => entry.level === "info");

    expect(entries).toHaveLength(50);
    expect(errorEntries).toHaveLength(25);
    expect(infoEntries).toHaveLength(25);
    expect(entries.some((entry) => entry.message === "Error 0")).toBe(false);
    expect(entries.some((entry) => entry.message === "Info 0")).toBe(false);
    expect(entries.some((entry) => entry.message === "Error 29")).toBe(true);
    expect(entries.some((entry) => entry.message === "Info 29")).toBe(true);
  });
});
