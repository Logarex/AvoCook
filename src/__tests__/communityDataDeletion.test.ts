import { beforeEach, describe, expect, it, vi } from "vitest";
import * as firestore from "firebase/firestore";
import * as storage from "firebase/storage";
import { deleteMyCommunityData, reportCommunityRecipe } from "../features/community/communityClient";
import { deleteAnonymousIdentity } from "../features/firebase/firebaseClient";

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual<typeof import("firebase/firestore")>("firebase/firestore");
  return {
    ...actual,
    collection: vi.fn((_db: unknown, name: string) => name),
    query: vi.fn((name: string) => name),
    where: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    addDoc: vi.fn(),
    deleteDoc: vi.fn(async () => {}),
    increment: vi.fn(),
    serverTimestamp: vi.fn(),
  };
});
vi.mock("firebase/storage", () => ({ ref: vi.fn((_s: unknown, url: string) => url), deleteObject: vi.fn(async () => {}), uploadBytes: vi.fn(), getDownloadURL: vi.fn() }));
vi.mock("../features/community/communityCache", () => ({ invalidateCommunityCache: vi.fn(async () => {}), updateCachedCommunityRecipe: vi.fn() }));
vi.mock("../features/firebase/firebaseClient", () => ({
  getDb: vi.fn(() => ({})),
  getFirebaseStorage: vi.fn(() => ({})),
  waitForAuth: vi.fn(async () => {}),
  getAnonymousUid: vi.fn(() => "me"),
  deleteAnonymousIdentity: vi.fn(async () => {}),
}));

const snap = (docs: { ref: string; data: Record<string, unknown> }[]) => ({
  docs: docs.map((entry) => ({ ref: entry.ref, data: () => entry.data })),
});

describe("community data deletion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes own recipes, uploaded photos, the pseudonym and finally the identity", async () => {
    vi.mocked(firestore.getDocs)
      .mockResolvedValueOnce(snap([
        { ref: "recipe-1", data: { imageUrl: "https://firebasestorage.googleapis.com/x.jpg" } },
        { ref: "recipe-2", data: { imageUrl: "https://example.com/external.jpg" } },
      ]) as never)
      .mockResolvedValueOnce(snap([{ ref: "pseudo", data: { uid: "me" } }]) as never);
    const result = await deleteMyCommunityData("Chef");
    expect(result).toEqual({ recipes: 2, images: 1, pseudonym: true });
    expect(storage.deleteObject).toHaveBeenCalledTimes(1);
    expect(vi.mocked(firestore.deleteDoc).mock.calls.map(([ref]) => ref)).toEqual(["recipe-1", "recipe-2", "pseudo"]);
    expect(deleteAnonymousIdentity).toHaveBeenCalledTimes(1);
    expect(vi.mocked(deleteAnonymousIdentity).mock.invocationCallOrder[0]).toBeGreaterThan(
      vi.mocked(firestore.deleteDoc).mock.invocationCallOrder.at(-1)!,
    );
  });

  it("keeps the identity when content could not be deleted, so the user can retry", async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(snap([{ ref: "recipe-1", data: {} }]) as never);
    vi.mocked(firestore.deleteDoc).mockRejectedValueOnce(new Error("permission-denied"));
    await expect(deleteMyCommunityData(null)).rejects.toThrow("permission-denied");
    expect(deleteAnonymousIdentity).not.toHaveBeenCalled();
  });
});

describe("report results", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports whether the recipe was newly reported, already reported or gone", async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({ exists: () => true } as never);
    await expect(reportCommunityRecipe("r")).resolves.toBe("alreadyReported");
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce({ exists: () => false } as never)
      .mockResolvedValueOnce({ exists: () => false } as never);
    await expect(reportCommunityRecipe("r")).resolves.toBe("missing");
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce({ exists: () => false } as never)
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ reportCount: 0 }) } as never);
    await expect(reportCommunityRecipe("r")).resolves.toBe("reported");
  });

  it("rejects when the server refuses the report", async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({ exists: () => false } as never);
    vi.mocked(firestore.setDoc).mockRejectedValueOnce(new Error("unavailable"));
    await expect(reportCommunityRecipe("r")).rejects.toThrow("unavailable");
  });
});
