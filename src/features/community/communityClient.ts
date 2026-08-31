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
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
  type QueryConstraint
} from "firebase/firestore";
import { getDb, waitForAuth, getAnonymousUid } from "../firebase/firebaseClient";
import { cleanTranslatedText } from "./communityTranslation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecipeLanguage = "en" | "fr" | "de" | "es" | "it" | "da";

export type CommunityRecipe = {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  language: RecipeLanguage;
  authorName: string;
  authorUid?: string; // stored but not displayed publicly
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
  createdAt: string; // ISO string (converted from Firestore Timestamp)
  userVote?: number; // 1-5, populated client-side
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sanitize ISO 8601 duration strings: returns null if duration is zero or invalid.
 * e.g. "PT0H0M0S", "PT0M", "P0D" → null
 */
export function sanitizeIsoDuration(value: string | null | undefined): string | null {
  if (!value) return null;
  // Parse and check if total is zero
  const match = value.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/
  );
  if (!match) return value; // not ISO duration, return as-is
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  const total = days * 1440 + hours * 60 + minutes + seconds / 60;
  return total > 0 ? value : null;
}

/**
 * Returns true only for remote http(s) URLs.
 * Local file:// / content:// / ph:// URIs must NOT be stored in Firestore
 * (no file storage budget).
 */
export function isRemoteUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

function toRecipe(d: QueryDocumentSnapshot<DocumentData>): CommunityRecipe {
  const data = d.data();
  return {
    id: d.id,
    title: cleanTranslatedText(data.title ?? ""),
    description: cleanTranslatedText(data.description ?? ""),
    ingredients: Array.isArray(data.ingredients)
      ? data.ingredients.map((ing) => cleanTranslatedText(String(ing)))
      : [],
    steps: Array.isArray(data.steps)
      ? data.steps.map((step) => cleanTranslatedText(String(step)))
      : [],
    language: data.language ?? "en",
    authorName: cleanTranslatedText(data.authorName ?? ""),
    authorUid: data.authorUid ?? undefined,
    imageUrl: data.imageUrl ?? undefined,
    sourceUrl: data.sourceUrl ?? undefined,
    prepTime: sanitizeIsoDuration(data.prepTime) ?? null,
    cookTime: sanitizeIsoDuration(data.cookTime) ?? null,
    servings: data.servings ?? null,
    nutriScore: data.nutriScore ?? null,
    avgRating: typeof data.avgRating === "number" ? data.avgRating : 0,
    ratingCount: typeof data.ratingCount === "number" ? data.ratingCount : 0,
    reportCount: typeof data.reportCount === "number" ? data.reportCount : 0,
    approved: data.approved !== false,
    createdAt:
      data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
  };
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchCommunityRecipes(
  opts: FetchRecipesOptions = {}
): Promise<FetchRecipesResult> {
  await waitForAuth();
  const {
    language = "all",
    minRating = 0,
    sortBy = "recent",
    pageSize = 20,
    after: afterDoc,
  } = opts;

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
  const constraints: QueryConstraint[] = [orderBy(orderField, direction)];
  
  if (afterDoc) constraints.push(startAfter(afterDoc));
  constraints.push(limit(fetchLimit));

  const snap = await getDocs(query(coll, ...constraints));
  
  // Client-side filtering
  let filteredDocs = snap.docs.filter((d) => {
    const data = d.data();
    if (data.approved === false) return false;
    if (language !== "all" && data.language !== language) return false;
    if (minRating > 0 && (typeof data.avgRating !== "number" || data.avgRating < minRating)) return false;
    return true;
  });

  const hasMore = snap.docs.length >= fetchLimit;
  const sliced = filteredDocs.slice(0, pageSize);

  const uid = getAnonymousUid();
  const recipes = await Promise.all(
    sliced.map(async (d) => {
      const recipe = toRecipe(d);
      if (uid) {
        const voteSnap = await getDoc(
          doc(getDb(), "communityRecipes", d.id, "ratings", uid)
        );
        if (voteSnap.exists()) {
          recipe.userVote = (voteSnap.data() as { stars: number }).stars;
        }
      }
      return recipe;
    })
  );

  return {
    recipes,
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore,
  };
}

// ─── Submit ───────────────────────────────────────────────────────────────────

export async function submitCommunityRecipe(
  input: SubmitRecipeInput
): Promise<string> {
  await waitForAuth();
  const uid = getAnonymousUid();
  const ref = await addDoc(collection(getDb(), "communityRecipes"), {
    ...input,
    prepTime: sanitizeIsoDuration(input.prepTime ?? null),
    cookTime: sanitizeIsoDuration(input.cookTime ?? null),
    // Only store remote URLs — local file:// URIs must not go to Firestore
    imageUrl: isRemoteUrl(input.imageUrl) ? input.imageUrl : null,
    authorUid: uid ?? null,
    avgRating: 0,
    ratingCount: 0,
    reportCount: 0,
    approved: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCommunityRecipe(
  recipeId: string,
  input: SubmitRecipeInput,
  authorUid: string
): Promise<void> {
  await waitForAuth();
  const ref = doc(getDb(), "communityRecipes", recipeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Recipe not found");
  const data = snap.data();
  // Only allow the original author to update
  if (data.authorUid && data.authorUid !== authorUid) {
    throw new Error("Not authorized to update this recipe");
  }
  await updateDoc(ref, {
    ...input,
    prepTime: sanitizeIsoDuration(input.prepTime ?? null),
    cookTime: sanitizeIsoDuration(input.cookTime ?? null),
    // Only store remote URLs — local file:// URIs must not go to Firestore
    imageUrl: isRemoteUrl(input.imageUrl) ? input.imageUrl : null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Find an existing community recipe published by this user with the same title.
 * Returns the recipe id if found, null otherwise.
 */
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

/**
 * Soft-delete: marks a recipe as not approved and adds the authorUid to a deletedBy field.
 * Only the original author (matched by authorUid) can delete their own recipe.
 */
export async function deleteCommunityRecipe(
  recipeId: string,
  authorUid: string
): Promise<void> {
  await waitForAuth();
  const ref = doc(getDb(), "communityRecipes", recipeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Recipe not found");
  const data = snap.data();
  if (data.authorUid && data.authorUid !== authorUid) {
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
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const existing = (snap.data() as { uid: string }).uid;
    if (existing !== uid) throw new Error("PSEUDONYM_TAKEN");
  }
  await setDoc(ref, { uid, pseudonym: pseudo.trim(), reservedAt: serverTimestamp() });
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
  if (stars < 1 || stars > 5) throw new Error("Stars must be 1–5");

  const ratingRef = doc(getDb(), "communityRecipes", recipeId, "ratings", uid);
  const recipeRef = doc(getDb(), "communityRecipes", recipeId);

  const prevSnap = await getDoc(ratingRef);
  const prevStars: number = prevSnap.exists()
    ? (prevSnap.data() as { stars: number }).stars
    : 0;

  await setDoc(ratingRef, { stars, at: serverTimestamp() });

  const recipeSnap = await getDoc(recipeRef);
  if (!recipeSnap.exists()) return;
  const data = recipeSnap.data() as { avgRating: number; ratingCount: number };
  const isNew = prevStars === 0;
  const newCount = isNew ? data.ratingCount + 1 : data.ratingCount;
  const sumBefore = data.avgRating * data.ratingCount;
  const newAvg = (sumBefore - prevStars + stars) / Math.max(newCount, 1);

  await updateDoc(recipeRef, {
    avgRating: Math.round(newAvg * 10) / 10,
    ratingCount: isNew ? increment(1) : data.ratingCount,
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
    const voteSnap = await getDoc(
      doc(getDb(), "communityRecipes", recipeId, "ratings", uid)
    );
    if (voteSnap.exists()) {
      recipe.userVote = (voteSnap.data() as { stars: number }).stars;
    }
  }
  return recipe;
}

export async function reportCommunityRecipe(recipeId: string): Promise<void> {
  await waitForAuth();
  const ref = doc(getDb(), "communityRecipes", recipeId);
  await updateDoc(ref, {
    reportCount: increment(1),
    approved: false,
  });
}
