import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
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
  sortBy?: "recent" | "topRated" | "mostVoted";
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

function toRecipe(d: QueryDocumentSnapshot<DocumentData>): CommunityRecipe {
  const data = d.data();
  return {
    id: d.id,
    title: data.title ?? "",
    description: data.description ?? "",
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    steps: Array.isArray(data.steps) ? data.steps : [],
    language: data.language ?? "en",
    authorName: data.authorName ?? "",
    imageUrl: data.imageUrl ?? undefined,
    sourceUrl: data.sourceUrl ?? undefined,
    prepTime: data.prepTime ?? null,
    cookTime: data.cookTime ?? null,
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
    sortBy === "topRated"
      ? "avgRating"
      : sortBy === "mostVoted"
      ? "ratingCount"
      : "createdAt";

  // To avoid requiring complex composite indexes in Firebase, we just query by the order field
  // and do the filtering client-side. We fetch a larger batch to ensure we have enough results.
  const constraints: QueryConstraint[] = [orderBy(orderField, "desc")];
  
  if (afterDoc) constraints.push(startAfter(afterDoc));
  constraints.push(limit(100)); // Fetch more to allow client-side filtering

  const snap = await getDocs(query(coll, ...constraints));
  
  // Client-side filtering
  let filteredDocs = snap.docs.filter((d) => {
    const data = d.data();
    if (data.approved === false) return false;
    if (language !== "all" && data.language !== language) return false;
    if (minRating > 0 && (typeof data.avgRating !== "number" || data.avgRating < minRating)) return false;
    return true;
  });

  const hasMore = snap.docs.length === 100;
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
  const ref = await addDoc(collection(getDb(), "communityRecipes"), {
    ...input,
    avgRating: 0,
    ratingCount: 0,
    reportCount: 0,
    approved: true, // Auto-approved, flagged if 3+ reports
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function checkCommunityRecipeDuplicate(
  title: string,
  authorName: string,
  steps: string[]
): Promise<boolean> {
  await waitForAuth();
  const coll = collection(getDb(), "communityRecipes");
  const q = query(coll, where("title", "==", title), limit(10));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    const data = d.data();
    if (data.authorName === authorName) return true;
    const existingSteps = Array.isArray(data.steps) ? data.steps : [];
    if (existingSteps.length > 0 && steps.length > 0 && existingSteps.join("") === steps.join("")) {
      return true;
    }
  }
  return false;
}

// ─── Vote ─────────────────────────────────────────────────────────────────────

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

  // Recalculate average:
  // new_avg = (old_avg * count + new_stars - old_stars) / (old_count + (prevStars === 0 ? 1 : 0))
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

// ─── Get single recipe ────────────────────────────────────────────────────────

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

// ─── Report ───────────────────────────────────────────────────────────────────

export async function reportCommunityRecipe(recipeId: string): Promise<void> {
  await waitForAuth();
  const ref = doc(getDb(), "communityRecipes", recipeId);
  await updateDoc(ref, {
    reportCount: increment(1),
    // Auto-hide if 3+ reports
    approved: false,
  });
}

// ─── User vote ────────────────────────────────────────────────────────────────

export async function getUserVote(recipeId: string): Promise<number> {
  await waitForAuth();
  const uid = getAnonymousUid();
  if (!uid) return 0;
  const snap = await getDoc(
    doc(getDb(), "communityRecipes", recipeId, "ratings", uid)
  );
  if (!snap.exists()) return 0;
  return (snap.data() as { stars: number }).stars;
}
