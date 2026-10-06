import AsyncStorage from "@react-native-async-storage/async-storage";

const RATINGS_KEY = "recipe.ratings";

type RatingsMap = Record<string, number>; // recipeId → 1-5

async function loadRatings(): Promise<RatingsMap> {
  try {
    const raw = await AsyncStorage.getItem(RATINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as RatingsMap;
  } catch {
    return {};
  }
}

async function saveRatings(ratings: RatingsMap): Promise<void> {
  await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
}

export async function getRecipeRating(recipeId: string): Promise<number> {
  const ratings = await loadRatings();
  return ratings[recipeId] ?? 0;
}

export async function setRecipeRating(
  recipeId: string,
  stars: number
): Promise<void> {
  const ratings = await loadRatings();
  if (stars === 0) {
    delete ratings[recipeId];
  } else {
    ratings[recipeId] = Math.max(1, Math.min(5, Math.round(stars)));
  }
  await saveRatings(ratings);
  void syncRatingsToNextcloud(ratings);
}

export async function getAllRatings(): Promise<RatingsMap> {
  return loadRatings();
}

// Ratings use /AvoCook/ratings.json; load the client lazily when Nextcloud is configured.

async function syncRatingsToNextcloud(ratings: RatingsMap): Promise<void> {
  try {
    const { CookbookClient } = await import("../nextcloud/cookbookClient");
    const client = CookbookClient.getCurrent?.();
    if (!client) return;
    await client.putJsonWebDav("/AvoCook/ratings.json", ratings);
  } catch {
  }
}

export async function pullRatingsFromNextcloud(
  client: import("../nextcloud/cookbookClient").CookbookClient
): Promise<void> {
  try {
    const remote = await client.getJsonWebDav<RatingsMap>("/AvoCook/ratings.json");
    if (!remote) return;
    // Ratings have no timestamps; keep the higher score when merging.
    const local = await loadRatings();
    const merged: RatingsMap = { ...remote };
    for (const [id, stars] of Object.entries(local)) {
      if (!merged[id] || stars > 0) merged[id] = stars;
    }
    await saveRatings(merged);
  } catch {
  }
}
