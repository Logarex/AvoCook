import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";

export const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const AUTO_BACKUP_VERSIONS = 7;
const PREFIX = "avocook-auto-";
const ENABLED_KEY = "autoBackup.enabled.v1";
const statusKey = (account: string) => `autoBackup.status.v1:${encodeURIComponent(account)}`;

export type AutoBackupStatus = { lastSuccess: string | null; lastError: string | null };
export type AutoBackupVersion = { uri: string; name: string; createdAt: string; size: number };

export function autoBackupDue(lastSuccess: string | null, now = new Date(), interval = AUTO_BACKUP_INTERVAL_MS) {
  if (!lastSuccess) return true;
  const last = Date.parse(lastSuccess);
  // A clock moved backwards must not block backups forever.
  return !Number.isFinite(last) || now.getTime() - last >= interval || last > now.getTime();
}

export function autoBackupName(date: Date) {
  return `${PREFIX}${date.toISOString().replace(/[:.]/g, "-")}.json`;
}

export function autoBackupDate(name: string): string | null {
  const match = name.match(/^avocook-auto-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.json$/);
  if (!match) return null;
  const iso = `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`;
  return Number.isFinite(Date.parse(iso)) ? iso : null;
}

/** Names to delete so that only the newest `keep` versions remain. */
export function expiredAutoBackups(names: string[], keep = AUTO_BACKUP_VERSIONS) {
  return names
    .filter((name) => autoBackupDate(name))
    .sort()
    .reverse()
    .slice(Math.max(0, keep));
}

function accountDirectory(account: string) {
  const root = new Directory(Paths.document, "avocook-backups");
  const folder = account.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80) || "local";
  return new Directory(root, folder);
}

export async function loadAutoBackupStatus(account: string): Promise<AutoBackupStatus> {
  try {
    const raw = await AsyncStorage.getItem(statusKey(account));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") {
      const status = parsed as Partial<AutoBackupStatus>;
      return {
        lastSuccess: typeof status.lastSuccess === "string" ? status.lastSuccess : null,
        lastError: typeof status.lastError === "string" ? status.lastError : null,
      };
    }
  } catch {
  }
  return { lastSuccess: null, lastError: null };
}

async function saveStatus(account: string, status: AutoBackupStatus) {
  await AsyncStorage.setItem(statusKey(account), JSON.stringify(status));
}

export async function isAutoBackupEnabled() {
  return (await AsyncStorage.getItem(ENABLED_KEY).catch(() => null)) !== "false";
}

export async function setAutoBackupEnabled(enabled: boolean) {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? "true" : "false");
}

export function listAutoBackups(account: string): AutoBackupVersion[] {
  try {
    const directory = accountDirectory(account);
    if (!directory.exists) return [];
    return directory
      .list()
      .filter((entry): entry is File => entry instanceof File)
      .flatMap((file) => {
        const createdAt = autoBackupDate(file.name);
        return createdAt ? [{ uri: file.uri, name: file.name, createdAt, size: file.size ?? 0 }] : [];
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

/** Writes one version, prunes old ones and records the outcome for the backup screen. */
export async function writeAutoBackup(account: string, serialized: string, now = new Date()) {
  const previous = await loadAutoBackupStatus(account);
  try {
    const directory = accountDirectory(account);
    directory.create({ intermediates: true, idempotent: true });
    const file = new File(directory, autoBackupName(now));
    file.create({ overwrite: true });
    file.write(serialized);
    const names = directory.list().filter((entry) => entry instanceof File).map((entry) => entry.name);
    for (const name of expiredAutoBackups(names)) new File(directory, name).delete();
    const status = { lastSuccess: now.toISOString(), lastError: null };
    await saveStatus(account, status);
    return status;
  } catch (error) {
    const status = { lastSuccess: previous.lastSuccess, lastError: now.toISOString() };
    await saveStatus(account, status).catch(() => undefined);
    throw error;
  }
}
