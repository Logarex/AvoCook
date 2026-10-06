import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  increment,
  runTransaction,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
  type QueryConstraint
} from "firebase/firestore";
import { getDb, waitForAuth, getAnonymousUid, getFirebaseStorage } from "../firebase/firebaseClient";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { cleanTranslatedText } from "./communityTranslation";
import { isoDurationToMinutes, minutesToIsoDuration } from "../../utils/duration";

export type RecipeLanguage = "en" | "fr" | "de" | "es" | "it" | "da";

export type CommunityRecipe = {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  language: RecipeLanguage;
  authorName: string;
  authorUid?: string; // Not shown publicly.
  imageUrl?: string;
  sourceUrl?: string;
  prepTime?: string | null;
  cookTime?: string | null;
  servings?: number | null;
  nutriScore?: "A" | "B" | "C" | "D" | "E" | null;
  avgRating: number;
  ratingCount: number;
  reportCount: number;
  approved: boolean;
  createdAt: string; // ISO 8601.
  userVote?: number; // 1-5, populated client-side.
};

export type FetchRecipesOptions = {
  language?: RecipeLanguage | "all";
  minRating?: number;
  sortBy?: "recent" | "topRated" | "mostVoted" | "alphabetical";
  pageSize?: number;
  after?: QueryDocumentSnapshot<DocumentData>;
};

export type FetchRecipesResult = {
  recipes: CommunityRecipe[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
};

export type SubmitRecipeInput = {
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  language: RecipeLanguage;
  authorName: string;
  imageUrl?: string;
  sourceUrl?: string;
  prepTime?: string | null;
  cookTime?: string | null;
  servings?: number | null;
  nutriScore?: "A" | "B" | "C" | "D" | "E" | null;
};

export function sanitizeIsoDuration(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !value) return null;
  const mins = isoDurationToMinutes(value);
  if (!mins || mins <= 0) return null;
  return minutesToIsoDuration(mins);
}

export function isRemoteUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

export async function uploadCommunityImage(localUri: string): Promise<string | null> {
  if (!localUri) return null;
  if (isRemoteUrl(localUri)) return localUri;

  await waitForAuth();
  try {
    const storage = getFirebaseStorage();
    const filename = `recipe_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
    const storageRef = ref(storage, `community_images/${filename}`);

    const response = await fetch(localUri);
    const blob = await response.blob();

    await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
    const b = blob as unknown as { close?: () => void };
    if (typeof b.close === "function") {
      b.close();
    }

    return await getDownloadURL(storageRef);
  } catch (err) {
    console.warn("community", "Failed to upload image to Firebase Storage", err);
    return null;
  }
}

function toRecipe(d: QueryDocumentSnapshot<DocumentData>): CommunityRecipe {
  const data = d.data();
  const text = (value: unknown) => typeof value === "string" ? cleanTranslatedText(value) : "";
  const count = (value: unknown) => typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value)) : 0;
  let createdAt = new Date().toISOString();
  try {
    const date: unknown = data.createdAt?.toDate?.();
    if (date instanceof Date && Number.isFinite(date.getTime())) {
      createdAt = date.toISOString();
    }
  } catch {
    console.warn("community", "Invalid recipe timestamp", { id: d.id });
  }
  return {
    id: d.id,
    title: text(data.title),
    description: text(data.description),
    ingredients: Array.isArray(data.ingredients)
      ? data.ingredients.filter((ing): ing is string => typeof ing === "string").map(text)
      : [],
    steps: Array.isArray(data.steps)
      ? data.steps.filter((step): step is string => typeof step === "string").map(text)
      : [],
    language: ["en", "fr", "de", "es", "it", "da"].includes(data.language) ? data.language : "en",
    authorName: text(data.authorName),
    authorUid: typeof data.authorUid === "string" ? data.authorUid : undefined,
    imageUrl: typeof data.imageUrl === "string" && isRemoteUrl(data.imageUrl) ? data.imageUrl : undefined,
    sourceUrl: typeof data.sourceUrl === "string" && isRemoteUrl(data.sourceUrl) ? data.sourceUrl : undefined,
    prepTime: sanitizeIsoDuration(data.prepTime) ?? null,
    cookTime: sanitizeIsoDuration(data.cookTime) ?? null,
    servings: count(data.servings) || null,
    nutriScore: ["A", "B", "C", "D", "E"].includes(data.nutriScore) ? data.nutriScore : null,
    avgRating: typeof data.avgRating === "number" && Number.isFinite(data.avgRating)
      ? Math.max(0, Math.min(5, data.avgRating)) : 0,
    ratingCount: count(data.ratingCount),
    reportCount: count(data.reportCount),
    approved: data.approved !== false,
    createdAt,
  };
}

export async function fetchCommunityRecipes(
  opts: FetchRecipesOptions = {}
): Promise<FetchRecipesResult> {
  await waitForAuth();
  const {
    language = "all",
    minRating = 0,
    sortBy = "recent",
    pageSize: requestedPageSize = 20,
    after: afterDoc,
  } = opts;
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.max(1, Math.min(100, Math.floor(requestedPageSize))) : 20;

  const coll = collection(getDb(), "communityRecipes");
  const orderField =
    sortBy === "alphabetical"
      ? "title"
      : sortBy === "topRated"
      ? "avgRating"
      : sortBy === "mostVoted"
      ? "ratingCount"
      : "createdAt";

  const direction = sortBy === "alphabetical" ? "asc" : "desc";

  const fetchLimit = language !== "all" ? 300 : Math.max(100, pageSize * 2);
  let snap;
  try {
    const constraints: QueryConstraint[] = [orderBy(orderField, direction)];
    if (afterDoc) constraints.push(startAfter(afterDoc));
    constraints.push(limit(fetchLimit));
    snap = await getDocs(query(coll, ...constraints));
  } catch (err) {
    console.warn("community", "Ordered fetch failed, trying fallback query without orderBy", err);
    try {
      const fallbackConstraints: QueryConstraint[] = [];
      if (afterDoc) fallbackConstraints.push(startAfter(afterDoc));
      fallbackConstraints.push(limit(fetchLimit));
      snap = await getDocs(query(coll, ...fallbackConstraints));
    } catch (fallbackErr) {
      console.error("community", "Fetch community recipes failed completely", fallbackErr);
      return { recipes: [], lastDoc: null, hasMore: false };
    }
  }
  
  const filteredDocs = snap.docs.filter((d) => {
    const data = d.data();
    if (data.approved === false) return false;
    if (language !== "all" && data.language !== language) return false;
    if (minRating > 0 && (typeof data.avgRating !== "number" || data.avgRating < minRating)) return false;
    return true;
  });

  const hasMore = filteredDocs.length > pageSize || snap.docs.length >= fetchLimit;
  const sliced = filteredDocs.slice(0, pageSize);

  const uid = getAnonymousUid();
  const recipes = await Promise.all(
    sliced.map(async (d) => {
      const recipe = toRecipe(d);
      if (uid) {
        try {
          const voteSnap = await getDoc(
            doc(getDb(), "communityRecipes", d.id, "ratings", uid)
          );
          if (voteSnap.exists()) {
            recipe.userVote = (voteSnap.data() as { stars: number }).stars;
          }
        } catch {
        }
      }
      return recipe;
    })
  );

  return {
    recipes,
    lastDoc: filteredDocs.length > pageSize
      ? sliced[sliced.length - 1] ?? null
      : snap.docs[snap.docs.length - 1] ?? null,
    hasMore,
  };
}

export async function submitCommunityRecipe(
  input: SubmitRecipeInput
): Promise<string> {
  await waitForAuth();
  const uid = getAnonymousUid();
  if (!uid) throw new Error("Not authenticated");

  let imageUrl: string | null = null;
  if (input.imageUrl) {
    if (isRemoteUrl(input.imageUrl)) {
      imageUrl = input.imageUrl;
    } else {
      imageUrl = await uploadCommunityImage(input.imageUrl);
    }
  }

  const refDoc = await addDoc(collection(getDb(), "communityRecipes"), {
    ...input,
    prepTime: sanitizeIsoDuration(input.prepTime ?? null),
    cookTime: sanitizeIsoDuration(input.cookTime ?? null),
    imageUrl: imageUrl,
    authorUid: uid,
    avgRating: 0,
    ratingCount: 0,
    reportCount: 0,
    approved: true,
    createdAt: serverTimestamp(),
  });
  return refDoc.id;
}

export async function updateCommunityRecipe(
  recipeId: string,
  input: SubmitRecipeInput,
  authorUid: string
): Promise<void> {
  await waitForAuth();
  const uid = getAnonymousUid();
  if (!uid || uid !== authorUid) throw new Error("Not authorized to update this recipe");
  const refDoc = doc(getDb(), "communityRecipes", recipeId);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) throw new Error("Recipe not found");
  const data = snap.data();
  if (data.authorUid !== uid) {
    throw new Error("Not authorized to update this recipe");
  }

  let imageUrl: string | null = data.imageUrl ?? null;
  if (input.imageUrl) {
    if (isRemoteUrl(input.imageUrl)) {
      imageUrl = input.imageUrl;
    } else {
      const uploaded = await uploadCommunityImage(input.imageUrl);
      if (uploaded) imageUrl = uploaded;
    }
  }

  await updateDoc(refDoc, {
    ...input,
    prepTime: sanitizeIsoDuration(input.prepTime ?? null),
    cookTime: sanitizeIsoDuration(input.cookTime ?? null),
    imageUrl: imageUrl,
    updatedAt: serverTimestamp(),
  });
}

export async function findUserCommunityRecipe(
  authorUid: string,
  title: string
): Promise<string | null> {
  await waitForAuth();
  const coll = collection(getDb(), "communityRecipes");
  const q = query(
    coll,
    where("authorUid", "==", authorUid),
    where("title", "==", title.trim()),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0]!.id;
}

export async function deleteCommunityRecipe(
  recipeId: string,
  authorUid: string
): Promise<void> {
  await waitForAuth();
  const uid = getAnonymousUid();
  if (!uid || uid !== authorUid) throw new Error("Not authorized to delete this recipe");
  const ref = doc(getDb(), "communityRecipes", recipeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Recipe not found");
  const data = snap.data();
  if (data.authorUid !== uid) {
    throw new Error("Not authorized to delete this recipe");
  }
  await deleteDoc(ref);
}

export async function checkCommunityRecipeDuplicate(
  title: string,
  authorName: string,
  steps: string[],
  authorUid?: string | null
): Promise<boolean> {
  await waitForAuth();
  const coll = collection(getDb(), "communityRecipes");
  const q = query(coll, where("title", "==", title), limit(10));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    const data = d.data();
    if (authorUid && data.authorUid && data.authorUid === authorUid) return true;
    if (data.authorName === authorName) return true;
    const existingSteps = Array.isArray(data.steps) ? data.steps : [];
    if (existingSteps.length > 0 && steps.length > 0 && existingSteps.join("") === steps.join("")) {
      return true;
    }
  }
  return false;
}

function normalizePseudonym(pseudo: string): string {
  return pseudo.trim().toLowerCase().replace(/\s+/g, "_");
}

export async function checkPseudonymAvailable(pseudo: string): Promise<boolean> {
  await waitForAuth();
  const key = normalizePseudonym(pseudo);
  if (!key) return false;
  const ref = doc(getDb(), "pseudonyms", key);
  const snap = await getDoc(ref);
  if (!snap.exists()) return true;
  const uid = getAnonymousUid();
  return uid !== null && (snap.data() as { uid: string }).uid === uid;
}

export async function reservePseudonym(pseudo: string): Promise<void> {
  await waitForAuth();
  const uid = getAnonymousUid();
  if (!uid) throw new Error("Not authenticated");
  const key = normalizePseudonym(pseudo);
  if (!key) throw new Error("Invalid pseudonym");
  const ref = doc(getDb(), "pseudonyms", key);
  await runTransaction(getDb(), async (transaction) => {
    const snap = await transaction.get(ref);
    if (snap.exists() && snap.data().uid !== uid) throw new Error("PSEUDONYM_TAKEN");
    transaction.set(ref, { uid, pseudonym: pseudo.trim(), reservedAt: serverTimestamp() });
  });
}

export async function releasePseudonym(pseudo: string): Promise<void> {
  await waitForAuth();
  const uid = getAnonymousUid();
  if (!uid) return;
  const key = normalizePseudonym(pseudo);
  if (!key) return;
  const ref = doc(getDb(), "pseudonyms", key);
  const snap = await getDoc(ref);
  if (snap.exists() && (snap.data() as { uid: string }).uid === uid) {
    await deleteDoc(ref);
  }
}

export async function voteOnRecipe(
  recipeId: string,
  stars: number
): Promise<void> {
  await waitForAuth();
  const uid = getAnonymousUid();
  if (!uid) throw new Error("Not authenticated");
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new Error("Stars must be 1–5");

  const ratingRef = doc(getDb(), "communityRecipes", recipeId, "ratings", uid);
  const recipeRef = doc(getDb(), "communityRecipes", recipeId);

  await runTransaction(getDb(), async (transaction) => {
    const prevSnap = await transaction.get(ratingRef);
    const recipeSnap = await transaction.get(recipeRef);
    if (!recipeSnap.exists()) throw new Error("Recipe not found");
    const previous = prevSnap.exists() ? prevSnap.data().stars : 0;
    const prevStars = Number.isInteger(previous) && previous >= 1 && previous <= 5 ? previous : 0;
    const data = recipeSnap.data();
    const ratingCount = Number.isInteger(data.ratingCount) && data.ratingCount >= 0 ? data.ratingCount : 0;
    const avgRating = Number.isFinite(data.avgRating) ? Math.max(0, Math.min(5, data.avgRating)) : 0;
    const newCount = prevStars === 0 ? ratingCount + 1 : Math.max(1, ratingCount);
    const newAvg = (avgRating * ratingCount - prevStars + stars) / newCount;
    transaction.set(ratingRef, { stars, at: serverTimestamp() });
    transaction.update(recipeRef, {
      avgRating: Math.max(0, Math.min(5, Math.round(newAvg * 10) / 10)),
      ratingCount: newCount
    });
  });
}

export async function getCommunityRecipe(
  recipeId: string
): Promise<CommunityRecipe | null> {
  await waitForAuth();
  const snap = await getDoc(doc(getDb(), "communityRecipes", recipeId));
  if (!snap.exists()) return null;
  const recipe = toRecipe(snap as QueryDocumentSnapshot<DocumentData>);
  const uid = getAnonymousUid();
  if (uid) {
    try {
      const voteSnap = await getDoc(
        doc(getDb(), "communityRecipes", recipeId, "ratings", uid)
      );
      if (voteSnap.exists()) {
        recipe.userVote = (voteSnap.data() as { stars: number }).stars;
      }
    } catch {
    }
  }
  return recipe;
}

export const REPORT_THRESHOLD = 3;

export async function reportCommunityRecipe(
  recipeId: string,
  reason?: string
): Promise<void> {
  await waitForAuth();
  const db = getDb();
  const uid = getAnonymousUid();

  if (uid) {
    const userReportRef = doc(db, "communityRecipes", recipeId, "reports", uid);
    const userReportSnap = await getDoc(userReportRef);
    if (userReportSnap.exists()) {
      return;
    }
    await setDoc(userReportRef, {
      reportedAt: serverTimestamp(),
      reason: reason ?? "Inappropriate content",
    });
  }

  const ref = doc(db, "communityRecipes", recipeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const currentCount = typeof data.reportCount === "number" ? data.reportCount : 0;
  const newCount = currentCount + 1;
  const isAutoSuppressed = newCount >= REPORT_THRESHOLD;

  await updateDoc(ref, {
    reportCount: increment(1),
    ...(isAutoSuppressed ? { approved: false } : {}),
  });

  await addDoc(collection(db, "communityReports"), {
    recipeId,
    recipeTitle: data.title ?? "Unknown",
    authorUid: data.authorUid ?? null,
    reportedByUid: uid ?? null,
    reportCount: newCount,
    status: isAutoSuppressed ? "auto_suppressed" : "pending_review",
    reason: reason ?? "Inappropriate content",
    createdAt: serverTimestamp(),
  });
}
