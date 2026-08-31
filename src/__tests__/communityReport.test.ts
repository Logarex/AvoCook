import { describe, expect, it, vi, beforeEach } from "vitest";
import { REPORT_THRESHOLD, reportCommunityRecipe } from "../features/community/communityClient";
import * as firebaseClient from "../features/firebase/firebaseClient";
import * as firestore from "firebase/firestore";

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual<typeof import("firebase/firestore")>("firebase/firestore");
  return {
    ...actual,
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    addDoc: vi.fn(),
    collection: vi.fn(),
    increment: vi.fn((n: number) => ({ type: "increment", value: n })),
    serverTimestamp: vi.fn(() => "TIMESTAMP"),
  };
});

vi.mock("../features/firebase/firebaseClient", () => ({
  getDb: vi.fn(() => ({})),
  waitForAuth: vi.fn(async () => {}),
  getAnonymousUid: vi.fn(() => "user-123"),
}));

describe("communityReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports REPORT_THRESHOLD equal to 3", () => {
    expect(REPORT_THRESHOLD).toBe(3);
  });

  it("does not suppress recipe on report count < 3 (e.g. 1st report)", async () => {
    const recipeSnap = {
      exists: () => true,
      data: () => ({ title: "Tacos", reportCount: 0, authorUid: "author-1" }),
    };
    const userReportSnap = {
      exists: () => false,
    };

    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce(userReportSnap as any) // User report subcollection check
      .mockResolvedValueOnce(recipeSnap as any);    // Recipe doc check

    await reportCommunityRecipe("recipe-1");

    expect(firestore.updateDoc).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        reportCount: expect.any(Object),
      })
    );

    // Verify approved: false is NOT included when report count is < 3
    const updateCall = vi.mocked(firestore.updateDoc).mock.calls[0]?.[1];
    expect(updateCall).not.toHaveProperty("approved");

    // Verify communityReports log was created with pending_review
    expect(firestore.addDoc).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        recipeId: "recipe-1",
        recipeTitle: "Tacos",
        reportCount: 1,
        status: "pending_review",
      })
    );
  });

  it("suppresses recipe (approved: false) when report count reaches 3", async () => {
    const recipeSnap = {
      exists: () => true,
      data: () => ({ title: "Suspicious Recipe", reportCount: 2, authorUid: "author-2" }),
    };
    const userReportSnap = {
      exists: () => false,
    };

    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce(userReportSnap as any)
      .mockResolvedValueOnce(recipeSnap as any);

    await reportCommunityRecipe("recipe-2");

    // Verify approved: false IS set when report count reaches 3
    const updateCall = vi.mocked(firestore.updateDoc).mock.calls[0]?.[1];
    expect(updateCall).toEqual({
      reportCount: expect.any(Object),
      approved: false,
    });

    // Verify communityReports log was created with status auto_suppressed
    expect(firestore.addDoc).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        recipeId: "recipe-2",
        recipeTitle: "Suspicious Recipe",
        reportCount: 3,
        status: "auto_suppressed",
      })
    );
  });

  it("ignores report if the same user has already reported the recipe", async () => {
    const userReportSnap = {
      exists: () => true,
    };

    vi.mocked(firestore.getDoc).mockResolvedValueOnce(userReportSnap as any);

    await reportCommunityRecipe("recipe-3");

    // Should return early and not update recipe or log report
    expect(firestore.updateDoc).not.toHaveBeenCalled();
    expect(firestore.addDoc).not.toHaveBeenCalled();
  });
});
