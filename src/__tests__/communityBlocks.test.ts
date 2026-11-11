import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  blockAuthor,
  getBlockedAuthors,
  hydrateBlockedAuthors,
  isAuthorBlocked,
  parseBlockedAuthors,
  resetBlockedAuthorsForTests,
  unblockAuthor,
  withoutBlockedAuthors,
} from "../features/community/communityBlocks";

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
  },
}));

describe("blocked community authors", () => {
  beforeEach(() => {
    storage.clear();
    resetBlockedAuthorsForTests();
  });

  it("blocks once, persists and unblocks", async () => {
    await blockAuthor("u1", " Chef ", new Date("2026-11-01T00:00:00Z"));
    await blockAuthor("u1", "Chef again");
    expect(getBlockedAuthors()).toEqual([{ uid: "u1", name: "Chef", blockedAt: "2026-11-01T00:00:00.000Z" }]);
    expect(JSON.parse(storage.get("community.blockedAuthors.v1")!)).toHaveLength(1);
    resetBlockedAuthorsForTests();
    await hydrateBlockedAuthors();
    expect(isAuthorBlocked("u1")).toBe(true);
    await unblockAuthor("u1");
    expect(isAuthorBlocked("u1")).toBe(false);
    expect(JSON.parse(storage.get("community.blockedAuthors.v1")!)).toEqual([]);
  });

  it("hides only recipes from blocked authors", () => {
    const authors = [{ uid: "bad", name: "", blockedAt: "" }];
    const recipes = [{ id: "1", authorUid: "bad" }, { id: "2", authorUid: "good" }, { id: "3" }];
    expect(withoutBlockedAuthors(recipes, authors).map((recipe) => recipe.id)).toEqual(["2", "3"]);
    expect(withoutBlockedAuthors(recipes, [])).toBe(recipes);
  });

  it("ignores damaged stored entries", () => {
    expect(parseBlockedAuthors("nope")).toEqual([]);
    expect(parseBlockedAuthors([{ uid: "a", name: "A", blockedAt: "" }, { uid: "a", name: "dup", blockedAt: "" }, { uid: 3 }, null])).toEqual([
      { uid: "a", name: "A", blockedAt: "" },
    ]);
  });
});
