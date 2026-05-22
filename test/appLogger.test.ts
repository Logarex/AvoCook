import { describe, expect, it, vi } from "vitest";
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
} from "../src/features/logging/appLogger";

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

  it("prioritizes error and warning logs when pruning in detailed mode", async () => {
    await setLogMode("all");
    await clearLogEntries();

    // Log an error first
    logError("app", "Initial Error");

    // Log 60 info logs
    for (let i = 0; i < 60; i++) {
      logInfo("app", `Info ${i}`);
    }

    // Flush the writeQueue by setting the mode
    await setLogMode("all");

    const entries = await loadLogEntries();
    
    // Total entries should be capped at 50
    expect(entries.length).toBe(50);
    
    // The "Initial Error" should still be present in the entries
    const hasError = entries.some((e) => e.message === "Initial Error");
    expect(hasError).toBe(true);
    
    // And some info logs must have been pruned (e.g. Info 0 should be pruned because we prioritized the error)
    const hasInfo0 = entries.some((e) => e.message === "Info 0");
    expect(hasInfo0).toBe(false);
  });
});
