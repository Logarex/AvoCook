import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as firestore from "firebase/firestore";
import { getAnonymousUid } from "../features/firebase/firebaseClient";
import {
  deleteCommunityRecipe, fetchCommunityRecipes, getCommunityRecipe,
  reservePseudonym, submitCommunityRecipe, updateCommunityRecipe, voteOnRecipe
} from "../features/community/communityClient";
import { cancelPush, createSharedList, fetchSharedList, leaveSharedList, schedulePush } from "../features/shopping/sharedListClient";

const transaction = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), update: vi.fn(), delete: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path: string[]) => ({ path: path.join("/") })),
  doc: vi.fn((_db, ...path: string[]) => ({ path: path.join("/"), id: path.at(-1) })),
  addDoc: vi.fn(), getDoc: vi.fn(), getDocs: vi.fn(), setDoc: vi.fn(),
  updateDoc: vi.fn(), deleteDoc: vi.fn(), onSnapshot: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
  where: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), startAfter: vi.fn(),
  increment: (value: number) => ({ increment: value }), serverTimestamp: () => "timestamp",
  runTransaction: vi.fn(async (_db, callback) => callback(transaction))
}));
vi.mock("../features/firebase/firebaseClient", () => ({
  getDb: () => ({}), waitForAuth: vi.fn(async () => null), getAnonymousUid: vi.fn(() => "user-123")
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(async () => "device-123"), setItem: vi.fn() }
}));
vi.mock("expo-crypto", () => ({ randomUUID: () => "uuid", getRandomBytes: (size: number) => new Uint8Array(size) }));

const snapshot = (id: string, data: Record<string, unknown>) => ({ id, exists: () => true, data: () => data });
const input = { title: "Cake", description: "", ingredients: ["Flour"], steps: ["Bake"], language: "en" as const, authorName: "Cook" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAnonymousUid).mockReturnValue("user-123");
  vi.mocked(firestore.getDoc).mockResolvedValue({ exists: () => false } as never);
  transaction.get.mockReset();
});
afterEach(() => { cancelPush(); vi.useRealTimers(); });

describe("Community database boundaries", () => {
  it("rejects anonymous publication when authentication failed", async () => {
    vi.mocked(getAnonymousUid).mockReturnValue(null);
    await expect(submitCommunityRecipe(input)).rejects.toThrow("Not authenticated");
    expect(firestore.addDoc).not.toHaveBeenCalled();
  });

  it("rejects another author's UID even when it is passed as an argument", async () => {
    await expect(updateCommunityRecipe("42", input, "other-user")).rejects.toThrow("Not authorized");
    await expect(deleteCommunityRecipe("42", "other-user")).rejects.toThrow("Not authorized");
    expect(firestore.updateDoc).not.toHaveBeenCalled();
    expect(firestore.deleteDoc).not.toHaveBeenCalled();
  });

  it("rejects mutation of an ownerless recipe", async () => {
    vi.mocked(firestore.getDoc).mockResolvedValue(snapshot("42", { authorUid: null }) as never);
    await expect(updateCommunityRecipe("42", input, "user-123")).rejects.toThrow("Not authorized");
    await expect(deleteCommunityRecipe("42", "user-123")).rejects.toThrow("Not authorized");
  });

  it("allows the authenticated author to update their recipe", async () => {
    vi.mocked(firestore.getDoc).mockResolvedValue(snapshot("42", { authorUid: "user-123" }) as never);
    await updateCommunityRecipe("42", input, "user-123");
    expect(firestore.updateDoc).toHaveBeenCalledOnce();
  });

  it("normalizes malformed cloud fields without crashing the recipe screen", async () => {
    vi.mocked(getAnonymousUid).mockReturnValue(null);
    vi.mocked(firestore.getDoc).mockResolvedValue(snapshot("42", {
      title: { bad: true }, description: 123, authorName: [], ingredients: ["Flour", {}],
      steps: null, language: "xx", prepTime: {}, avgRating: NaN,
      ratingCount: Infinity, servings: -2, createdAt: { toDate: "invalid" }, imageUrl: "javascript:bad"
    }) as never);
    expect(await getCommunityRecipe("42")).toMatchObject({
      title: "", description: "", ingredients: ["Flour"], steps: [], language: "en",
      prepTime: null, avgRating: 0, ratingCount: 0, servings: null, imageUrl: undefined
    });
  });

  it("keeps the cursor at the last returned recipe so later pages are not skipped", async () => {
    vi.mocked(getAnonymousUid).mockReturnValue(null);
    const docs = Array.from({ length: 30 }, (_, i) => snapshot(String(i), { ...input, approved: true }));
    vi.mocked(firestore.getDocs).mockResolvedValue({ docs } as never);
    const result = await fetchCommunityRecipes({ pageSize: 20 });
    expect(result.recipes.map((recipe) => recipe.id)).toEqual(docs.slice(0, 20).map((doc) => doc.id));
    expect(result.lastDoc).toBe(docs[19]);
    expect(result.hasMore).toBe(true);
  });

  it("continues scanning when a full batch contains no matching language", async () => {
    vi.mocked(getAnonymousUid).mockReturnValue(null);
    const docs = Array.from({ length: 300 }, (_, i) => snapshot(String(i), { ...input, language: "de" }));
    vi.mocked(firestore.getDocs).mockResolvedValue({ docs } as never);
    const result = await fetchCommunityRecipes({ language: "fr" });
    expect(result.recipes).toEqual([]);
    expect(result.lastDoc).toBe(docs[299]);
    expect(result.hasMore).toBe(true);
  });

  it.each([NaN, Infinity, 0, 6, 2.5])("rejects invalid votes: %s", async (stars) => {
    await expect(voteOnRecipe("42", stars)).rejects.toThrow("Stars must be");
    expect(firestore.runTransaction).not.toHaveBeenCalled();
  });

  it("updates the vote and aggregate together after reading both documents", async () => {
    transaction.get.mockResolvedValueOnce(snapshot("user-123", { stars: 3 }))
      .mockResolvedValueOnce(snapshot("42", { avgRating: 4, ratingCount: 2 }));
    await voteOnRecipe("42", 5);
    expect(transaction.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ stars: 5 }));
    expect(transaction.update).toHaveBeenCalledWith(expect.anything(), { avgRating: 5, ratingCount: 2 });
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  it("does not overwrite a pseudonym already owned by another user", async () => {
    transaction.get.mockResolvedValue(snapshot("cook", { uid: "other-user" }));
    await expect(reservePseudonym("Cook")).rejects.toThrow("PSEUDONYM_TAKEN");
    expect(transaction.set).not.toHaveBeenCalled();
  });
});

describe("Shared shopping lists", () => {
  it("rejects malformed invitation codes before querying Firestore", async () => {
    await expect(fetchSharedList("bad/code")).rejects.toThrow("Invalid shared list code");
    expect(firestore.getDoc).not.toHaveBeenCalled();
  });

  it("checks invitation collisions inside the creation transaction", async () => {
    transaction.get.mockResolvedValueOnce(snapshot("AAAAAA", {})).mockResolvedValueOnce({ exists: () => false });
    expect(await createSharedList([])).toBe("AAAAAA");
    expect(firestore.runTransaction).toHaveBeenCalledTimes(2);
    expect(transaction.set).toHaveBeenCalledOnce();
  });

  it("reads the participant count and deletes the last participant's list atomically", async () => {
    transaction.get.mockResolvedValue(snapshot("AAAAAA", { participantCount: 1 }));
    await leaveSharedList("AAAAAA");
    expect(transaction.delete).toHaveBeenCalledOnce();
    expect(firestore.deleteDoc).not.toHaveBeenCalled();
  });

  it("uses update rather than recreating a list that has been deleted", async () => {
    vi.useFakeTimers();
    schedulePush("AAAAAA", [], vi.fn());
    await vi.advanceTimersByTimeAsync(300);
    expect(firestore.updateDoc).toHaveBeenCalledOnce();
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });
});
