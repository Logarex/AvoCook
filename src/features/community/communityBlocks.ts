import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import type { CommunityRecipe } from "./communityClient";

const BLOCKS_KEY = "community.blockedAuthors.v1";
const MAX_BLOCKS = 500;

export type BlockedAuthor = { uid: string; name: string; blockedAt: string };

let blocked: BlockedAuthor[] = [];
let hydration: Promise<void> | undefined;
let writes = Promise.resolve();
const listeners = new Set<() => void>();

function publish(next: BlockedAuthor[]) {
  blocked = next;
  listeners.forEach((listener) => listener());
  writes = writes
    .then(() => AsyncStorage.setItem(BLOCKS_KEY, JSON.stringify(next)))
    .catch((error: unknown) => console.warn("community", "Could not save blocked authors", error));
  return writes;
}

export function parseBlockedAuthors(value: unknown): BlockedAuthor[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((entry): entry is BlockedAuthor => {
    if (!entry || typeof entry !== "object") return false;
    const author = entry as BlockedAuthor;
    if (typeof author.uid !== "string" || !author.uid.trim() || seen.has(author.uid)) return false;
    seen.add(author.uid);
    return typeof author.name === "string" && typeof author.blockedAt === "string";
  }).slice(-MAX_BLOCKS);
}

export function hydrateBlockedAuthors(): Promise<void> {
  hydration ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(BLOCKS_KEY);
      const stored = parseBlockedAuthors(raw ? JSON.parse(raw) : []);
      const current = new Set(blocked.map((author) => author.uid));
      blocked = [...stored.filter((author) => !current.has(author.uid)), ...blocked];
      listeners.forEach((listener) => listener());
    } catch {
    }
  })();
  return hydration;
}

export function getBlockedAuthors(): BlockedAuthor[] {
  return blocked;
}

export function isAuthorBlocked(uid: string | null | undefined): boolean {
  return Boolean(uid) && blocked.some((author) => author.uid === uid);
}

export async function blockAuthor(uid: string, name: string, now = new Date()): Promise<void> {
  await hydrateBlockedAuthors();
  if (!uid.trim() || isAuthorBlocked(uid)) return;
  await publish([...blocked, { uid, name: name.trim(), blockedAt: now.toISOString() }].slice(-MAX_BLOCKS));
}

export async function unblockAuthor(uid: string): Promise<void> {
  await hydrateBlockedAuthors();
  if (!isAuthorBlocked(uid)) return;
  await publish(blocked.filter((author) => author.uid !== uid));
}

export async function clearBlockedAuthors(): Promise<void> {
  await hydrateBlockedAuthors();
  await publish([]);
}

/** Hides every recipe whose author the viewer blocked on this device. */
export function withoutBlockedAuthors<T extends Pick<CommunityRecipe, "authorUid">>(
  recipes: T[],
  authors: BlockedAuthor[] = blocked,
): T[] {
  if (!authors.length) return recipes;
  const uids = new Set(authors.map((author) => author.uid));
  return recipes.filter((recipe) => !recipe.authorUid || !uids.has(recipe.authorUid));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void hydrateBlockedAuthors();
  return () => {
    listeners.delete(listener);
  };
}

export function useBlockedAuthors(): BlockedAuthor[] {
  return useSyncExternalStore(subscribe, getBlockedAuthors, getBlockedAuthors);
}

export function resetBlockedAuthorsForTests() {
  blocked = [];
  hydration = undefined;
  writes = Promise.resolve();
}
