import { parseKitchenData, type Journal, type KitchenData } from "./kitchen";

export const KITCHEN_SYNC_PATH = "AvoCook/kitchen.json";
export const KITCHEN_SYNC_SCHEMA = 1;

/** The part of My kitchen shared between devices; reminders, timers and shopping groups stay per device. */
export type SyncedKitchen = Pick<KitchenData, "meals" | "stock" | "journals"> &
  Pick<KitchenData, "menus" | "dietaryPreference" | "country" | "excludedWords">;

export type KitchenSyncDocument = {
  app: "AvoCook";
  schema: typeof KITCHEN_SYNC_SCHEMA;
  updatedAt: string;
  kitchen: SyncedKitchen;
};

type Remote = {
  getJsonWebDav(path: string): Promise<unknown>;
  putJsonWebDav(path: string, data: unknown): Promise<void>;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function stripJournal(journal: Journal): Journal {
  const { stepTimerStates: _timers, ...rest } = journal;
  return rest;
}

export function syncedPart(data: KitchenData): SyncedKitchen {
  return {
    meals: data.meals,
    stock: data.stock,
    journals: Object.fromEntries(
      Object.entries(data.journals).map(([id, journal]) => [id, stripJournal(journal)]),
    ),
    ...(data.menus ? { menus: data.menus } : {}),
    ...(data.dietaryPreference !== undefined ? { dietaryPreference: data.dietaryPreference } : {}),
    ...(data.country ? { country: data.country } : {}),
    ...(data.excludedWords !== undefined ? { excludedWords: data.excludedWords } : {}),
  };
}

/** Classic three-way choice: keep whichever side changed since the common base; local wins real conflicts. */
function pick<T>(base: T | undefined, local: T | undefined, remote: T | undefined): T | undefined {
  if (same(local, remote)) return local;
  if (same(local, base)) return remote;
  if (same(remote, base)) return local;
  return local;
}

function mergeFields<T extends object>(base: T | undefined, local: T | undefined, remote: T | undefined): T | undefined {
  if (!local || !remote) return pick(base, local, remote);
  const keys = new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(base ?? {})]);
  const merged: Record<string, unknown> = {};
  for (const key of keys) {
    const value = pick(
      (base as Record<string, unknown> | undefined)?.[key],
      (local as Record<string, unknown>)[key],
      (remote as Record<string, unknown>)[key],
    );
    if (value !== undefined) merged[key] = value;
  }
  return merged as T;
}

function mergeList<T extends { id: string }>(base: T[] = [], local: T[] = [], remote: T[] = []) {
  const index = (rows: T[]) => new Map(rows.map((row) => [row.id, row]));
  const b = index(base), l = index(local), r = index(remote);
  // Local order first, then rows created on another device.
  const ids = [...new Set([...l.keys(), ...r.keys(), ...b.keys()])];
  return ids.flatMap((id) => {
    const value = mergeFields(b.get(id), l.get(id), r.get(id));
    return value ? [value] : [];
  });
}

export function mergeSyncedKitchen(
  base: SyncedKitchen | null,
  local: SyncedKitchen,
  remote: SyncedKitchen,
): SyncedKitchen {
  const journalIds = new Set([
    ...Object.keys(local.journals),
    ...Object.keys(remote.journals),
    ...Object.keys(base?.journals ?? {}),
  ]);
  const journals: Record<string, Journal> = {};
  for (const id of journalIds) {
    const journal = mergeFields(base?.journals[id], local.journals[id], remote.journals[id]);
    if (journal) journals[id] = journal;
  }
  const menus = base?.menus || local.menus || remote.menus
    ? mergeList(base?.menus, local.menus, remote.menus)
    : undefined;
  const scalar = <K extends "dietaryPreference" | "country" | "excludedWords">(key: K) =>
    pick(base?.[key], local[key], remote[key]);
  const dietaryPreference = scalar("dietaryPreference");
  const country = scalar("country");
  const excludedWords = scalar("excludedWords");
  return {
    meals: mergeList(base?.meals, local.meals, remote.meals),
    stock: mergeList(base?.stock, local.stock, remote.stock),
    journals,
    ...(menus ? { menus } : {}),
    ...(dietaryPreference !== undefined ? { dietaryPreference } : {}),
    ...(country !== undefined ? { country } : {}),
    ...(excludedWords !== undefined ? { excludedWords } : {}),
  };
}

/** Puts synced content back into the device data, keeping per-device settings and running timers. */
export function applySyncedKitchen(data: KitchenData, synced: SyncedKitchen): KitchenData {
  const journals = Object.fromEntries(
    Object.entries(synced.journals).map(([id, journal]) => {
      const timers = data.journals[id]?.stepTimerStates;
      return [id, timers ? { ...journal, stepTimerStates: timers } : journal];
    }),
  );
  const { menus: _menus, dietaryPreference: _diet, country: _country, excludedWords: _words, ...device } = data;
  return parseKitchenData({ ...device, ...synced, journals });
}

export function parseKitchenSyncDocument(value: unknown): SyncedKitchen {
  if (!value || typeof value !== "object") throw new Error("Invalid kitchen sync document");
  const doc = value as Partial<KitchenSyncDocument>;
  if (doc.app !== "AvoCook" || doc.schema !== KITCHEN_SYNC_SCHEMA || !doc.kitchen)
    throw new Error("Unsupported kitchen sync document");
  // Reuse the strict local validator so a damaged remote file never reaches the device.
  return syncedPart(parseKitchenData({ version: 1, ...doc.kitchen }));
}

export type KitchenSyncResult = { merged: SyncedKitchen; uploaded: boolean; downloaded: boolean };

/**
 * One round trip: download, merge with the last common version, upload when
 * something changed. The returned `merged` becomes the next base.
 */
export async function syncKitchenWithRemote(
  remote: Remote,
  local: SyncedKitchen,
  base: SyncedKitchen | null,
  now = new Date(),
  path = KITCHEN_SYNC_PATH,
): Promise<KitchenSyncResult> {
  const raw = await remote.getJsonWebDav(path);
  const remoteKitchen = raw === null || raw === undefined ? null : parseKitchenSyncDocument(raw);
  const merged = remoteKitchen ? mergeSyncedKitchen(base, local, remoteKitchen) : local;
  const uploaded = !remoteKitchen || !same(merged, remoteKitchen);
  if (uploaded) {
    const document: KitchenSyncDocument = {
      app: "AvoCook",
      schema: KITCHEN_SYNC_SCHEMA,
      updatedAt: now.toISOString(),
      kitchen: merged,
    };
    await remote.putJsonWebDav(path, document);
  }
  return { merged, uploaded, downloaded: Boolean(remoteKitchen) && !same(merged, local) };
}
