import { importRecipeFromWeb } from "../import/schemaRecipeParser";
import type { CookbookClient } from "../nextcloud/cookbookClient";
import {
  deleteQueuedOperation,
  enqueueSyncOperation,
  listQueuedOperations,
  loadLocalRecipes,
  markLocalRecipeDeleted,
  migrateDatabase,
  removeLocalRecipe,
  saveLocalRecipe
} from "./offlineDatabase";
import { normalizeRecipe, type Recipe } from "./types";

export async function initialiseRecipeStore() {
  await migrateDatabase();
  return loadLocalRecipes();
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
      return saveLocalRecipe(normalizeRecipe(imported), false);
    } catch {
      const parsed = await importRecipeFromWeb(url);
      return createRecipe(parsed, client);
    }
  }

  const parsed = await importRecipeFromWeb(url);
  return createRecipe(parsed, null);
}

export async function syncRecipes(client: CookbookClient) {
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
    const saved = await saveLocalRecipe(normalizeRecipe(recipe), false);
    recipes.push(saved);
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
