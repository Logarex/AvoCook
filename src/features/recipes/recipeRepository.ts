import { importRecipeFromWeb } from "../import/schemaRecipeParser";
import type { CookbookClient } from "../nextcloud/cookbookClient";
import {
  deleteQueuedOperation,
  clearLocalRecipeCache,
  enqueueSyncOperation,
  listQueuedOperations,
  loadLocalRecipes,
  markLocalRecipeDeleted,
  migrateDatabase,
  removeLocalRecipe,
  saveLocalRecipe
} from "./offlineDatabase";
import { persistRecipeImage } from "./recipeImages";
import { normalizeRecipe, type Recipe } from "./types";

export async function initialiseRecipeStore() {
  await migrateDatabase();
  return loadLocalRecipes();
}

export async function clearSyncedLocalRecipes() {
  await migrateDatabase();
  await clearLocalRecipeCache();
}

export async function createRecipe(
  recipe: Recipe,
  client: CookbookClient | null
) {
  const localRecipe = await saveLocalRecipe(recipe, true);

  if (!client) {
    await enqueueSyncOperation("create", localRecipe.id ?? "", localRecipe);
    return localRecipe;
  }

  try {
    const serverId = await client.createRecipe(localRecipe);
    const saved = await client.getRecipe(String(serverId));
    await removeLocalRecipe(localRecipe.id ?? "");
    return saveLocalRecipe(normalizeRecipe(saved), false);
  } catch {
    await enqueueSyncOperation("create", localRecipe.id ?? "", localRecipe);
    return localRecipe;
  }
}

export async function updateRecipe(
  recipe: Recipe,
  client: CookbookClient | null
) {
  const localRecipe = await saveLocalRecipe(recipe, true);

  if (!client || !recipe.id || recipe.id.startsWith("local-")) {
    await enqueueSyncOperation(
      recipe.id?.startsWith("local-") ? "create" : "update",
      localRecipe.id ?? "",
      localRecipe
    );
    return localRecipe;
  }

  try {
    await client.updateRecipe(localRecipe);
    return saveLocalRecipe(localRecipe, false);
  } catch {
    await enqueueSyncOperation("update", localRecipe.id ?? "", localRecipe);
    return localRecipe;
  }
}

export async function deleteRecipe(id: string, client: CookbookClient | null) {
  await markLocalRecipeDeleted(id);

  if (!client || id.startsWith("local-")) {
    await enqueueSyncOperation("delete", id, null);
    return;
  }

  try {
    await client.deleteRecipe(id);
    await removeLocalRecipe(id);
  } catch {
    await enqueueSyncOperation("delete", id, null);
  }
}

export async function importRecipe(url: string, client: CookbookClient | null) {
  if (client) {
    try {
      const imported = await client.importRecipe(url);
      const withLocalPhoto = await cacheRecipePhoto(normalizeRecipe(imported));
      return saveLocalRecipe(withLocalPhoto, false);
    } catch {
      const parsed = await importRecipeFromWeb(url);
      const saved = await createRecipe(parsed, client);
      return saveLocalRecipe(await cacheRecipePhoto(saved), false);
    }
  }

  const parsed = await importRecipeFromWeb(url);
  return createRecipe(await cacheRecipePhoto(parsed), null);
}

export async function syncRecipes(client: CookbookClient, persistLocal = true) {
  await migrateDatabase();
  await flushSyncQueue(client);

  const stubs = await client.listRecipes();
  const recipes: Recipe[] = [];

  for (const stub of stubs) {
    const id = stub.id || String(stub.recipe_id);
    if (!id) {
      continue;
    }
    const recipe = await client.getRecipe(id);
    const normalized = normalizeRecipe(recipe);
    if (persistLocal) {
      const saved = await saveLocalRecipe(normalized, false);
      recipes.push(saved);
    } else {
      recipes.push(normalized);
    }
  }

  return recipes;
}

async function flushSyncQueue(client: CookbookClient) {
  const operations = await listQueuedOperations();

  for (const operation of operations) {
    if (operation.operation === "delete") {
      if (!operation.recipeId.startsWith("local-")) {
        await client.deleteRecipe(operation.recipeId);
      }
      await removeLocalRecipe(operation.recipeId);
      await deleteQueuedOperation(operation.id);
      continue;
    }

    if (!operation.payload) {
      await deleteQueuedOperation(operation.id);
      continue;
    }

    if (
      operation.operation === "create" ||
      operation.recipeId.startsWith("local-")
    ) {
      const serverId = await client.createRecipe(operation.payload);
      const serverRecipe = await client.getRecipe(String(serverId));
      await removeLocalRecipe(operation.recipeId);
      await saveLocalRecipe(normalizeRecipe(serverRecipe), false);
      await deleteQueuedOperation(operation.id);
      continue;
    }

    await client.updateRecipe(operation.payload);
    await saveLocalRecipe(operation.payload, false);
    await deleteQueuedOperation(operation.id);
  }
}

export async function cacheRecipePhoto(recipe: Recipe) {
  const image = recipe.image || recipe.imageUrl;
  if (!image) {
    return recipe;
  }

  const localImage = await persistRecipeImage(image);
  return normalizeRecipe({
    ...recipe,
    image: localImage,
    imageUrl: localImage,
    imagePlaceholderUrl: localImage
  });
}
