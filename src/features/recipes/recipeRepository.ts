import { importRecipeFromWeb } from "../import/schemaRecipeParser";
import { CookbookApiError, type CookbookClient } from "../nextcloud/cookbookClient";
import { saveCustomCategories } from "./categoryStore";
import {
  resolveRecipeImport,
  upsertRecipeInList,
  type RecipeImportDecision
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
  getExternalRecipeImageSource,
  getLocalRecipeImage,
  getRemoteRecipeImage,
  isRemoteImageReference,
  preferRecipeImageUrls,
  sanitizeRecipeImagesForNextcloud,
  withCachedRecipeImage
} from "./recipeImageReferences";
import {
  hasLocalMetadata,
  normalizeRecipe,
  toCookbookCreateRecipe,
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
    const serverId = await client.createRecipe(
      toCookbookCreateRecipe(await prepareRecipeForNextcloud(localRecipe, client))
    );
    const saved = await client.getRecipe(String(serverId));
    await removeLocalRecipe(localRecipe.id ?? "");
    return saveLocalRecipe(
      withInferredCategory(mergeServerRecipeWithLocalImages(saved, localRecipe)),
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
    await client.updateRecipe(
      toCookbookRecipe(await prepareRecipeForNextcloud(localRecipe, client))
    );
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

export async function importRecipe(
  url: string,
  client: CookbookClient | null,
  knownRecipes: Recipe[] = []
) {
  await migrateDatabase();
  const existingRecipes = await getExistingRecipesForImport(knownRecipes);

  try {
    const parsed = withInferredCategory(await importRecipeFromWeb(url));
    return saveWebImportedRecipe(parsed, client, existingRecipes);
  } catch (localImportError) {
    if (!client) {
      throw localImportError;
    }

    const imported = withInferredCategory(
      normalizeRecipe(await client.importRecipe(url))
    );
    return reconcileNextcloudImportedRecipe(imported, client, existingRecipes);
  }
}

async function getExistingRecipesForImport(knownRecipes: Recipe[]) {
  const localRecipes = await loadLocalRecipes();
  return mergeRecipeLists([...knownRecipes, ...localRecipes]);
}

async function saveWebImportedRecipe(
  importedRecipe: Recipe,
  client: CookbookClient | null,
  existingRecipes: Recipe[]
) {
  const decision = resolveRecipeImport(importedRecipe, existingRecipes);

  if (decision.action === "skip") {
    return saveLocalRecipe(
      decision.existingRecipe ?? decision.recipe,
      false,
      false
    );
  }

  const recipe = getResolvedImportRecipe(decision);
  return decision.action === "update"
    ? updateRecipe(recipe, client)
    : createRecipe(recipe, client);
}

async function reconcileNextcloudImportedRecipe(
  importedRecipe: Recipe,
  client: CookbookClient,
  existingRecipes: Recipe[]
) {
  const decision = resolveRecipeImport(importedRecipe, existingRecipes);
  const recipe = getResolvedImportRecipe(decision);

  if (decision.action === "skip") {
    await deleteNextcloudImportedDuplicate(
      client,
      importedRecipe.id,
      decision.existingRecipe?.id ?? recipe.id
    );
    return saveLocalRecipe(decision.existingRecipe ?? recipe, false, false);
  }

  if (decision.action === "update") {
    const saved = await updateRecipe(recipe, client);
    await deleteNextcloudImportedDuplicate(client, importedRecipe.id, saved.id);
    return saved;
  }

  if (recipe.id && !recipe.id.startsWith("local-")) {
    if (decision.renamed) {
      await client.updateRecipe(
        toCookbookRecipe(await prepareRecipeForNextcloud(recipe, client))
      );
      const serverRecipe = await client.getRecipe(recipe.id);
      return saveLocalRecipe(
        mergeServerRecipeWithLocalImages(serverRecipe, recipe),
        false
      );
    }

    return saveLocalRecipe(recipe, false);
  }

  return createRecipe(recipe, client);
}

async function deleteNextcloudImportedDuplicate(
  client: CookbookClient,
  importedId: string | null,
  retainedId: string | null
) {
  if (!importedId || importedId === retainedId || importedId.startsWith("local-")) {
    return;
  }

  try {
    await client.deleteRecipe(importedId);
  } catch (error) {
    if (!(error instanceof CookbookApiError) || error.status !== 404) {
      throw error;
    }
  }
  await removeLocalRecipe(importedId);
}

function getResolvedImportRecipe(decision: RecipeImportDecision) {
  const existingRecipe = decision.existingRecipe;
  if (!existingRecipe) {
    return withInferredCategory(decision.recipe);
  }

  return withInferredCategory(
    preferRecipeImageUrls(
      normalizeRecipe({
        ...decision.recipe,
        image: decision.recipe.image || existingRecipe.image,
        imageUrl: decision.recipe.imageUrl || existingRecipe.imageUrl,
        imagePlaceholderUrl:
          decision.recipe.imagePlaceholderUrl ||
          existingRecipe.imagePlaceholderUrl,
        localMeta: existingRecipe.localMeta
      }),
      existingRecipe
    )
  );
}

function mergeRecipeLists(recipes: Recipe[]) {
  const recipesWithoutId: Recipe[] = [];
  const recipesById = new Map<string, Recipe>();

  for (const recipe of recipes) {
    const normalized = normalizeRecipe(recipe);
    if (!normalized.id) {
      recipesWithoutId.push(normalized);
      continue;
    }
    recipesById.set(normalized.id, normalized);
  }

  return [...recipesById.values(), ...recipesWithoutId];
}

export async function syncRecipes(client: CookbookClient, persistLocal = true) {
  await migrateDatabase();
  const flushedRecipes = await flushSyncQueue(client);

  const rawExistingRecipes = await loadLocalRecipes();
  const existingRecipes = rawExistingRecipes.map((recipe) =>
    client.normalizeRecipeImageUrls(recipe)
  );
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
  let stubs = await client.listRecipes();
  const flushedRecipeIds = new Set(
    flushedRecipes
      .map((recipe) => recipe.id)
      .filter((id): id is string => Boolean(id))
  );
  const missingFlushedRecipe = Array.from(flushedRecipeIds).some(
    (id) => !stubs.some((stub) => getRecipeStubId(stub) === id)
  );
  if (
    missingFlushedRecipe ||
    (persistLocal && hasLegacyRelativeCookbookImage(rawExistingRecipes))
  ) {
    await reindexRecipes(client);
    stubs = await client.listRecipes().catch(() => stubs);
  }
  let recipes: Recipe[] = [];

  for (const stub of stubs) {
    const id = getRecipeStubId(stub);
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
      recipes.push(
        persistLocal
          ? await saveLocalRecipe(existingRecipe, false, false)
          : existingRecipe
      );
      continue;
    }

    const recipe = await client.getRecipe(id);
    const normalized = withInferredCategory(
      existingRecipe
        ? mergeServerRecipeWithLocalImages(
            recipe,
            normalizeRecipe({
              ...existingRecipe,
              localMeta: localMetaById.get(id)
            })
          )
        : normalizeRecipe({
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

  for (const flushedRecipe of flushedRecipes) {
    appendRecipeIfMissing(recipes, flushedRecipe);
  }

  const missingLocalSync = await syncMissingLocalRecipes(
    client,
    existingRecipes,
    recipes
  );
  recipes = missingLocalSync.recipes;
  if (missingLocalSync.pushed) {
    await reindexRecipes(client);
  }

  await pruneRecipeImageCache(await loadLocalRecipes());

  return recipes;
}

function appendRecipeIfMissing(recipes: Recipe[], recipe: Recipe) {
  if (
    recipe.id &&
    !recipes.some((currentRecipe) => currentRecipe.id === recipe.id)
  ) {
    recipes.push(recipe);
  }
}

async function syncMissingLocalRecipes(
  client: CookbookClient,
  localRecipes: Recipe[],
  syncedRecipes: Recipe[]
) {
  let recipes = syncedRecipes;
  let pushed = false;

  for (const localRecipe of localRecipes) {
    if (!localRecipe.id || recipes.some((recipe) => recipe.id === localRecipe.id)) {
      continue;
    }

    const decision = resolveRecipeImport(localRecipe, recipes);
    const recipe = getResolvedImportRecipe(decision);

    if (decision.action === "skip") {
      const existingRecipe = decision.existingRecipe ?? recipe;
      if (existingRecipe.id && localRecipe.id !== existingRecipe.id) {
        await removeLocalRecipe(localRecipe.id);
      }
      const saved = await saveLocalRecipe(
        mergeServerRecipeWithLocalImages(existingRecipe, localRecipe),
        false,
        false
      );
      recipes = upsertRecipeInList(recipes, saved);
      continue;
    }

    if (decision.action === "update" && recipe.id && !recipe.id.startsWith("local-")) {
      await client.updateRecipe(
        toCookbookRecipe(await prepareRecipeForNextcloud(recipe, client))
      );
      const serverRecipe = await client.getRecipe(recipe.id);
      if (localRecipe.id !== recipe.id) {
        await removeLocalRecipe(localRecipe.id);
      }
      const saved = await saveLocalRecipe(
        withInferredCategory(mergeServerRecipeWithLocalImages(serverRecipe, recipe)),
        false
      );
      recipes = upsertRecipeInList(recipes, saved);
      pushed = true;
      continue;
    }

    const serverId = await client.createRecipe(
      toCookbookCreateRecipe(await prepareRecipeForNextcloud(recipe, client))
    );
    const serverRecipe = await client.getRecipe(String(serverId));
    await removeLocalRecipe(localRecipe.id);
    const saved = await saveLocalRecipe(
      withInferredCategory(mergeServerRecipeWithLocalImages(serverRecipe, recipe)),
      false
    );
    recipes = upsertRecipeInList(recipes, saved);
    pushed = true;
  }

  return { pushed, recipes };
}

function hasLegacyRelativeCookbookImage(recipes: Recipe[]) {
  return recipes.some((recipe) =>
    [recipe.image, recipe.imageUrl, recipe.imagePlaceholderUrl].some(
      (value) =>
        value.startsWith("/apps/cookbook/") &&
        value.includes("/recipes/") &&
        value.includes("/image")
    )
  );
}

function getRecipeStubId(stub: Pick<Recipe, "id" | "recipe_id">) {
  return stub.id || (stub.recipe_id ? String(stub.recipe_id) : "");
}

async function reindexRecipes(client: CookbookClient) {
  try {
    await client.reindex();
  } catch {
    // The pushed recipe is still kept locally; reindex is only a visibility nudge.
  }
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
      ? withCachedRecipeImage(originalRecipe, restoredImageUri)
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
  const flushedRecipes: Recipe[] = [];

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
      const remoteRecipe = await prepareRecipeForNextcloud(
        operation.payload,
        client
      );
      const serverId = await client.createRecipe(
        toCookbookCreateRecipe(remoteRecipe)
      );
      const serverRecipe = await client.getRecipe(String(serverId));
      await removeLocalRecipe(operation.recipeId);
      const saved = await saveLocalRecipe(
        withInferredCategory(
          mergeServerRecipeWithLocalImages(serverRecipe, operation.payload)
        ),
        false
      );
      flushedRecipes.push(saved);
      await deleteQueuedOperation(operation.id);
      continue;
    }

    await client.updateRecipe(
      toCookbookRecipe(await prepareRecipeForNextcloud(operation.payload, client))
    );
    flushedRecipes.push(await saveLocalRecipe(operation.payload, false));
    await deleteQueuedOperation(operation.id);
  }

  return flushedRecipes;
}

async function saveImportedRecipe(
  localRecipe: Recipe,
  originalRecipe: Recipe,
  client: CookbookClient | null,
  action: "create" | "update"
) {
  if (!client) {
    return action === "update"
      ? updateRecipe(localRecipe, null)
      : createRecipe(localRecipe, null);
  }

  if (
    action === "update" &&
    localRecipe.id &&
    !localRecipe.id.startsWith("local-")
  ) {
    try {
      await client.updateRecipe(
        toCookbookRecipe(
          await prepareRecipeForNextcloud(
            getNextcloudImportRecipe(localRecipe, originalRecipe),
            client
          )
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
    toCookbookCreateRecipe(
      await prepareRecipeForNextcloud(
        getNextcloudImportRecipe(localRecipe, originalRecipe),
        client
      )
    )
  );
  const serverRecipe = await client.getRecipe(String(serverId));
  return saveLocalRecipe(
    mergeServerRecipeWithLocalImages(serverRecipe, localRecipe),
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

async function prepareRecipeForNextcloud(
  recipe: Recipe,
  client?: CookbookClient | null
) {
  if (getExternalRecipeImageSource(recipe)) {
    return sanitizeRecipeImagesForNextcloud(recipe);
  }

  const localImage = getLocalRecipeImage(recipe);
  if (localImage && client) {
    const remotePath = await client.uploadRecipeImage(localImage);
    return normalizeRecipe({
      ...recipe,
      image: remotePath,
      imageUrl: remotePath,
      imagePlaceholderUrl: remotePath
    });
  }

  if (!isRemoteImageReference(recipe.url)) {
    return sanitizeRecipeImagesForNextcloud(recipe);
  }

  try {
    const sourceRecipe = await importRecipeFromWeb(recipe.url);
    const remoteImage = getExternalRecipeImageSource(sourceRecipe);
    if (!remoteImage) {
      return sanitizeRecipeImagesForNextcloud(recipe);
    }

    return sanitizeRecipeImagesForNextcloud(
      normalizeRecipe({
        ...recipe,
        imageUrl: remoteImage,
        imagePlaceholderUrl: remoteImage
      })
    );
  } catch {
    return sanitizeRecipeImagesForNextcloud(recipe);
  }
}

function mergeServerRecipeWithLocalImages(
  serverRecipe: Recipe,
  localRecipe: Recipe
) {
  const localImage = getLocalRecipeImage(localRecipe);
  const localRemoteImage = getRemoteRecipeImage(localRecipe);
  const serverRemoteImage = getRemoteRecipeImage(serverRecipe);
  const referenceImage = localRemoteImage || serverRemoteImage;

  return normalizeRecipe({
    ...serverRecipe,
    image: localImage || serverRecipe.image,
    imageUrl: referenceImage || serverRecipe.imageUrl,
    imagePlaceholderUrl: referenceImage || serverRecipe.imagePlaceholderUrl,
    localMeta: localRecipe.localMeta
  });
}

export async function cacheRecipePhoto(
  recipe: Recipe,
  options?: { headers?: Record<string, string> }
) {
  const image = recipe.image || recipe.imageUrl || recipe.imagePlaceholderUrl;
  if (!image) {
    return recipe;
  }

  try {
    const localImage = await persistRecipeImage(image, options);
    return withCachedRecipeImage(recipe, localImage);
  } catch {
    return recipe;
  }
}
