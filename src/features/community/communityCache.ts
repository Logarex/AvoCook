import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CommunityRecipe, CommunityRecipeCursor } from "./communityClient";
import { isRecipeLanguage } from "./communityLanguages";

const CACHE_KEY = "community.feeds.v1";
const MAX_FEEDS = 8;
const MAX_RECIPES = 300;
export const COMMUNITY_CACHE_TTL_MS = 5 * 60 * 1000;

export type CommunityFeed = {
  recipes: CommunityRecipe[];
  lastDoc: CommunityRecipeCursor | null;
  hasMore: boolean;
  fetchedAt: number;
};

const feeds = new Map<string, CommunityFeed>();
let hydration: Promise<void> | undefined;
let writes = Promise.resolve();

function isRecipe(value: unknown): value is CommunityRecipe {
  if (!value || typeof value !== "object") return false;
  const recipe = value as CommunityRecipe;
  return typeof recipe.id === "string" && typeof recipe.title === "string"
    && typeof recipe.description === "string" && typeof recipe.authorName === "string"
    && isRecipeLanguage(recipe.language) && recipe.approved !== false
    && Array.isArray(recipe.ingredients) && recipe.ingredients.every((item) => typeof item === "string")
    && Array.isArray(recipe.steps) && recipe.steps.every((item) => typeof item === "string")
    && Number.isFinite(recipe.avgRating) && Number.isFinite(recipe.ratingCount);
}

function isCursor(value: unknown): value is CommunityRecipeCursor | null {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const cursor = value as CommunityRecipeCursor;
  const validTimestamp = typeof cursor.value === "object" && cursor.value !== null
    && Number.isInteger(cursor.value.seconds) && Number.isInteger(cursor.value.nanoseconds)
    && cursor.value.nanoseconds >= 0 && cursor.value.nanoseconds < 1_000_000_000;
  return typeof cursor.id === "string" && ["title", "createdAt", "avgRating", "ratingCount", "id"].includes(cursor.field)
    && (typeof cursor.value === "string" || (typeof cursor.value === "number" && Number.isFinite(cursor.value))
      || (cursor.field === "createdAt" && validTimestamp));
}

export function hydrateCommunityCache(): Promise<void> {
  hydration ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      const entries: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(entries)) return;
      for (const entry of entries.slice(-MAX_FEEDS)) {
        if (!Array.isArray(entry) || typeof entry[0] !== "string") continue;
        const feed = entry[1] as CommunityFeed | undefined;
        if (!feed || !Array.isArray(feed.recipes) || !feed.recipes.every(isRecipe)
          || !isCursor(feed.lastDoc) || typeof feed.hasMore !== "boolean" || !Number.isFinite(feed.fetchedAt)) continue;
        if (!feeds.has(entry[0])) feeds.set(entry[0], feed);
      }
    } catch {
      // Cache failures must not prevent a fresh download.
    }
  })();
  return hydration;
}

export function getCachedCommunityFeed(scope: string): CommunityFeed | undefined {
  return feeds.get(scope);
}

export function getCachedCommunityRecipe(id: string): CommunityRecipe | undefined {
  for (const feed of [...feeds.values()].reverse()) {
    const recipe = feed.recipes.find((item) => item.id === id);
    if (recipe) return recipe;
  }
}

function persist(): void {
  const raw = JSON.stringify([...feeds]);
  writes = writes.then(async () => {
    try { await AsyncStorage.setItem(CACHE_KEY, raw); } catch { /* Keep the in-memory cache. */ }
  });
}

export function cacheCommunityFeed(scope: string, feed: CommunityFeed): void {
  // Keep the previous complete pages and their cursor when the cache is full.
  if (feed.recipes.length > MAX_RECIPES) return;
  feeds.delete(scope);
  feeds.set(scope, feed);
  while (feeds.size > MAX_FEEDS) feeds.delete(feeds.keys().next().value!);
  persist();
}

export async function invalidateCommunityCache(recipeId?: string): Promise<void> {
  await hydrateCommunityCache();
  for (const [scope, feed] of feeds) {
    feeds.set(scope, {
      ...feed,
      fetchedAt: 0,
      recipes: recipeId ? feed.recipes.filter((recipe) => recipe.id !== recipeId) : feed.recipes
    });
  }
  persist();
}

export async function updateCachedCommunityRecipe(recipe: CommunityRecipe): Promise<void> {
  await hydrateCommunityCache();
  const { userVote: _userVote, ...publicRecipe } = recipe;
  for (const [scope, feed] of feeds) {
    feeds.set(scope, { ...feed, recipes: feed.recipes.map((item) => item.id === recipe.id ? publicRecipe : item) });
  }
  persist();
}
