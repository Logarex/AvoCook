import { describe, expect, it, vi } from "vitest";
import { autoBackupDate, autoBackupDue, autoBackupName, expiredAutoBackups } from "../features/kitchen/autoBackup";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: vi.fn(), setItem: vi.fn() } }));
vi.mock("expo-file-system", () => ({ Directory: class {}, File: class {}, Paths: {} }));

describe("automatic versioned backups", () => {
  const now = new Date("2026-11-01T12:00:00.000Z");

  it("runs at most once a day and recovers from a clock moved backwards", () => {
    expect(autoBackupDue(null, now)).toBe(true);
    expect(autoBackupDue("2026-11-01T01:00:00.000Z", now)).toBe(false);
    expect(autoBackupDue("2026-10-31T11:59:59.000Z", now)).toBe(true);
    expect(autoBackupDue("2027-01-01T00:00:00.000Z", now)).toBe(true);
    expect(autoBackupDue("garbage", now)).toBe(true);
  });

  it("names versions so they sort chronologically and parse back", () => {
    const name = autoBackupName(now);
    expect(name).toBe("avocook-auto-2026-11-01T12-00-00-000Z.json");
    expect(autoBackupDate(name)).toBe(now.toISOString());
    expect(autoBackupDate("avocook-kitchen-123.json")).toBeNull();
  });

  it("keeps only the newest versions and ignores foreign files", () => {
    const names = Array.from({ length: 9 }, (_, day) => autoBackupName(new Date(Date.UTC(2026, 9, day + 1))));
    const expired = expiredAutoBackups([...names, "notes.txt"], 7);
    expect(expired).toEqual([names[1], names[0]]);
    expect(expiredAutoBackups(names.slice(0, 3), 7)).toEqual([]);
  });
});
