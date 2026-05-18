import { importRecipeFromWeb } from "../import/schemaRecipeParser";
import { CookbookApiError, type CookbookClient } from "../nextcloud/cookbookClient";
import { saveCustomCategories } from "./categoryStore";
import {
  resolveRecipeImport,
  upsertRecipeInList
} from "./backupDuplicates";
import { withInferredCategory } from "./categories";
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
import {
  persistRecipeImage,
  pruneRecipeImageCache,
  restoreRecipeImageFromBackup
} from "./recipeImages";
import {
  hasLocalMetadata,
  normalizeRecipe,
  toCookbookRecipe,
  type Recipe
} from "./types";
import {
  createRecipeBackup,
  type RecipeBackup,
  type RecipeBackupExportResult
} from "./recipeBackup";

export async function initialiseRecipeStore() {
  await migrateDatabase();
  return loadLocalRecipes();
}

export async function clearSyncedLocalRecipes() {
  await migrateDatabase();
  await clearLocalRecipeCache();
  await pruneRecipeImageCache(await loadLocalRecipes());
}

export async function updateRecipeLocalPreferences(recipe: Recipe) {
  await migrateDatabase();
  return saveLocalRecipe(recipe, false, false);
}

export async function createRecipe(
  recipe: Recipe,
  client: CookbookClient | null
) {
  const localRecipe = await saveLocalRecipe(withInferredCategory(recipe), true);

  if (!client) {
    await enqueueSyncOperation("create", localRecipe.id ?? "", localRecipe);
    return localRecipe;
  }

  try {
    const serverId = await client.createRecipe(toCookbookRecipe(localRecipe));
    const saved = await client.getRecipe(String(serverId));
    await removeLocalRecipe(localRecipe.id ?? "");
    return saveLocalRecipe(
      withInferredCategory(
        normalizeRecipe({ ...saved, localMeta: localRecipe.localMeta })
      ),
      false
    );
  } catch {
    await enqueueSyncOperation("create", localRecipe.id ?? "", localRecipe);
    return localRecipe;
  }
}

export async function updateRecipe(
  recipe: Recipe,
  client: CookbookClient | null
) {
  const localRecipe = await saveLocalRecipe(withInferredCategory(recipe), true);

  if (!client || !recipe.id || recipe.id.startsWith("local-")) {
    await enqueueSyncOperation(
      recipe.id?.startsWith("local-") ? "create" : "update",
      localRecipe.id ?? "",
      localRecipe
    );
    await pruneRecipeImageCache(await loadLocalRecipes());
    return localRecipe;
  }

  try {
    await client.updateRecipe(toCookbookRecipe(localRecipe));
    const saved = await saveLocalRecipe(localRecipe, false);
    await pruneRecipeImageCache(await loadLocalRecipes());
    return saved;
  } catch {
    await enqueueSyncOperation("update", localRecipe.id ?? "", localRecipe);
    await pruneRecipeImageCache(await loadLocalRecipes());
    return localRecipe;
  }
}

export async function deleteRecipe(id: string, client: CookbookClient | null) {
  await markLocalRecipeDeleted(id);

  if (!client || id.startsWith("local-")) {
    await enqueueSyncOperation("delete", id, null);
    await pruneRecipeImageCache(await loadLocalRecipes());
    return;
  }

  try {
    await client.deleteRecipe(id);
    await removeLocalRecipe(id);
    await pruneRecipeImageCache(await loadLocalRecipes());
  } catch {
    await enqueueSyncOperation("delete", id, null);
  }
}

export async function importRecipe(url: string, client: CookbookClient | null) {
  if (client) {
    try {
      const imported = await client.importRecipe(url);
      const withLocalPhoto = await cacheRecipePhoto(
        withInferredCategory(normalizeRecipe(imported))
      );
      return saveLocalRecipe(withLocalPhoto, false);
    } catch {
      const parsed = withInferredCategory(await importRecipeFromWeb(url));
      const saved = await createRecipe(parsed, client);
      return saveLocalRecipe(await cacheRecipePhoto(saved), false);
    }
  }

  const parsed = withInferredCategory(await importRecipeFromWeb(url));
  return createRecipe(await cacheRecipePhoto(parsed), null);
}

export async function syncRecipes(client: CookbookClient, persistLocal = true) {
  await migrateDatabase();
  await flushSyncQueue(client);

  const existingRecipes = await loadLocalRecipes();
  const existingRecipesById = new Map(
    existingRecipes
      .filter((recipe) => recipe.id)
      .map((recipe) => [recipe.id ?? "", recipe])
  );
  const localMetaById = new Map(
    existingRecipes
      .filter((recipe) => recipe.id && hasLocalMetadata(recipe))
      .map((recipe) => [recipe.id ?? "", recipe.localMeta])
  );
  const stubs = await client.listRecipes();
  const recipes: Recipe[] = [];

  for (const stub of stubs) {
    const id = stub.id || String(stub.recipe_id);
    if (!id) {
      continue;
    }
    const existingRecipe = existingRecipesById.get(id);
    if (
      existingRecipe &&
      existingRecipe.dateModified &&
      stub.dateModified &&
      existingRecipe.dateModified === stub.dateModified
    ) {
      recipes.push(existingRecipe);
      continue;
    }

    const recipe = await client.getRecipe(id);
    const normalized = withInferredCategory(
      normalizeRecipe({
        ...recipe,
        localMeta: localMetaById.get(id)
      })
    );
    if (persistLocal || hasLocalMetadata(normalized)) {
      const saved = await saveLocalRecipe(normalized, false);
      recipes.push(saved);
    } else {
      recipes.push(normalized);
    }
  }

  await pruneRecipeImageCache(await loadLocalRecipes());

  return recipes;
}

export async function exportRecipeBackup({
  client,
  customCategories,
  isLocalMode
}: {
  client: CookbookClient | null;
  customCategories: string[];
  isLocalMode: boolean;
}): Promise<RecipeBackupExportResult> {
  await migrateDatabase();
  const recipes = client ? await syncRecipes(client, true) : await loadLocalRecipes();
  return createRecipeBackup({
    recipes,
    customCategories,
    source: client ? "nextcloud" : isLocalMode ? "local" : "mixed",
    client
  });
}

export type RecipeBackupImportResult = {
  created: number;
  updated: number;
  skipped: number;
  renamed: number;
  categories: number;
  recipes: Recipe[];
};

export async function importRecipeBackup(
  backup: RecipeBackup,
  client: CookbookClient | null
): Promise<RecipeBackupImportResult> {
  await migrateDatabase();
  const categories = await saveCustomCategories(backup.customCategories);
  let existingRecipes = await loadLocalRecipes();
  const summary = {
    created: 0,
    updated: 0,
    skipped: 0,
    renamed: 0
  };

  for (const entry of backup.recipes) {
    const originalRecipe = withInferredCategory(normalizeRecipe(entry.recipe));
    const imageAsset = entry.imageAssetId
      ? backup.assets[entry.imageAssetId]
      : undefined;
    const restoredImageUri = imageAsset
      ? await restoreRecipeImageFromBackup({
          base64: imageAsset.data,
          extension: imageAsset.extension
        })
      : "";
    const localRecipe = restoredImageUri
      ? normalizeRecipe({
          ...originalRecipe,
          image: restoredImageUri,
          imageUrl: restoredImageUri,
          imagePlaceholderUrl: restoredImageUri
        })
      : originalRecipe;
    const decision = resolveRecipeImport(localRecipe, existingRecipes);

    if (decision.action === "skip") {
      summary.skipped += 1;
      continue;
    }

    const saved = await saveImportedRecipe(
      decision.recipe,
      originalRecipe,
      client,
      decision.action
    );

    existingRecipes = upsertRecipeInList(existingRecipes, saved);
    if (decision.action === "update") {
      summary.updated += 1;
    } else {
      summary.created += 1;
    }
    if (decision.renamed) {
      summary.renamed += 1;
    }
  }

  const recipes = await loadLocalRecipes();
  await pruneRecipeImageCache(recipes);

  return {
    ...summary,
    categories: categories.length,
    recipes
  };
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
      const serverId = await client.createRecipe(
        toCookbookRecipe(operation.payload)
      );
      const serverRecipe = await client.getRecipe(String(serverId));
      await removeLocalRecipe(operation.recipeId);
      await saveLocalRecipe(
        withInferredCategory(
          normalizeRecipe({
            ...serverRecipe,
            localMeta: operation.payload.localMeta
          })
        ),
        false
      );
      await deleteQueuedOperation(operation.id);
      continue;
    }

    await client.updateRecipe(toCookbookRecipe(operation.payload));
    await saveLocalRecipe(operation.payload, false);
    await deleteQueuedOperation(operation.id);
  }
}

async function saveImportedRecipe(
  localRecipe: Recipe,
  originalRecipe: Recipe,
  client: CookbookClient | null,
  action: "create" | "update"
) {
  if (!client) {
    return saveLocalRecipe(localRecipe, false);
  }

  if (action === "update" && localRecipe.id && !localRecipe.id.startsWith("local-")) {
    try {
      await client.updateRecipe(
        toCookbookRecipe(
          sanitizeRecipeForNextcloud(getNextcloudImportRecipe(localRecipe, originalRecipe))
        )
      );
      return saveLocalRecipe(localRecipe, false);
    } catch (error) {
      if (!(error instanceof CookbookApiError) || error.status !== 404) {
        throw error;
      }
    }
  }

  const serverId = await client.createRecipe(
    toCookbookRecipe(
      sanitizeRecipeForNextcloud({
        ...getNextcloudImportRecipe(localRecipe, originalRecipe),
        id: null
      })
    )
  );
  const serverRecipe = await client.getRecipe(String(serverId));
  return saveLocalRecipe(
    normalizeRecipe({
      ...serverRecipe,
      image: localRecipe.image,
      imageUrl: localRecipe.imageUrl,
      imagePlaceholderUrl: localRecipe.imagePlaceholderUrl,
      localMeta: localRecipe.localMeta
    }),
    false
  );
}

function getNextcloudImportRecipe(localRecipe: Recipe, originalRecipe: Recipe) {
  return normalizeRecipe({
    ...localRecipe,
    image: originalRecipe.image,
    imageUrl: originalRecipe.imageUrl,
    imagePlaceholderUrl: originalRecipe.imagePlaceholderUrl
  });
}

function sanitizeRecipeForNextcloud(recipe: Recipe) {
  return normalizeRecipe({
    ...recipe,
    image: getRemoteImageValue(recipe.image),
    imageUrl: getRemoteImageValue(recipe.imageUrl),
    imagePlaceholderUrl: getRemoteImageValue(recipe.imagePlaceholderUrl)
  });
}

function getRemoteImageValue(value: string) {
  return /^https?:\/\//i.test(value) ? value : "";
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
