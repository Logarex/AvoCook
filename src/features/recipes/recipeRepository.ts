import { importRecipeFromWeb } from "../import/schemaRecipeParser";
import {
  logDebug,
  logError,
  logInfo,
  logWarn,
  normalizeLogError
} from "../logging/appLogger";
import { CookbookApiError, type CookbookClient } from "../nextcloud/cookbookClient";
import { saveCustomCategories } from "./categoryStore";
import {
  findDuplicateRecipeGroups,
  mergeDuplicateRecipeData,
  resolveRecipeImport,
  upsertRecipeInList,
  type RecipeDuplicateGroup,
  type RecipeImportDecision
} from "./backupDuplicates";
import { withInferredCategory } from "./categories";
import {
  deleteQueuedOperation,
  deleteQueuedOperationsForRecipe,
  clearLocalRecipeCache,
  enqueueSyncOperation,
  listQueuedOperations,
  loadDirtyLocalRecipes,
  loadLocalRecipes,
  markLocalRecipeDeleted,
  migrateDatabase,
  removeLocalRecipe,
  saveLocalRecipe,
  loadAnyLocalRecipeById
} from "./offlineDatabase";
import {
  persistRecipeImage,
  pruneRecipeImageCache,
  restoreRecipeImageFromBackup
} from "./recipeImages";
import {
  getCachedRecipeImage,
  getNextcloudFileRecipeImage,
  getExternalRecipeImageSource,
  getLocalRecipeImage,
  getRemoteRecipeImage,
  hasRecipeImageReference,
  hasRecipeImageRemovalIntent,
  isCookbookImageEndpoint,
  isRemoteImageReference,
  preferRecipeImageUrls,
  replaceLocalRecipeImageReferencesWithRemote,
  sanitizeRecipeImagesForNextcloud,
  withoutRecipeImages,
  withRecipeImageRemovalIntent,
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
  isExternalRecipeSourceUrl,
  mergeRecipeUpdateFromSource
} from "./recipeSource";
import {
  createRecipeBackup,
  readRecipeBackupFile,
  type RecipeBackup,
  type RecipeBackupExportResult
} from "./recipeBackup";

export type RecipeNameConflictResolution = "keep-both" | "merge";

export type RecipeNameConflict = {
  recipe: Recipe;
  existingRecipe: Recipe;
};

export type RecipeRepositoryOptions = {
  resolveNameConflict?: (
    conflict: RecipeNameConflict
  ) => Promise<RecipeNameConflictResolution>;
};

export async function initialiseRecipeStore() {
  await migrateDatabase();
  return replaceLocalRecipeImageReferences(await loadLocalRecipes());
}

export async function clearSyncedLocalRecipes() {
  await migrateDatabase();
  await clearLocalRecipeCache();
  await pruneRecipeImageCache(await loadLocalRecipes());
}

export async function updateRecipeLocalPreferences(recipe: Recipe) {
  await migrateDatabase();
  // only save locally, don't mark as dirty because it's just app preferences
  return saveLocalRecipe(recipe, false, false);
}

export async function findDuplicateRecipes() {
  await migrateDatabase();
  return findDuplicateRecipeGroups(await loadLocalRecipes());
}

export type RecipeDuplicateMergeResult = {
  recipe: Recipe | null;
  recipes: Recipe[];
  removed: number;
};

export async function mergeDuplicateRecipes(
  group: RecipeDuplicateGroup,
  client: CookbookClient | null
): Promise<RecipeDuplicateMergeResult> {
  await migrateDatabase();
  const groupRecipeIds = new Set(
    group.recipes.map((recipe) => recipe.id).filter(Boolean)
  );
  const currentRecipes = (await loadLocalRecipes()).filter(
    (recipe) => recipe.id && groupRecipeIds.has(recipe.id)
  );

  if (currentRecipes.length < 2) {
    // it's possible one of the duplicates was deleted in the meantime, 
    // nothing to merge if less than 2
    return {
      recipe: currentRecipes[0] ?? null,
      recipes: replaceLocalRecipeImageReferences(await loadLocalRecipes()),
      removed: 0
    };
  }

  // merge all data into the first one, then try to guess category
  const mergedRecipe = withInferredCategory(
    replaceLocalRecipeImageReferencesWithRemote(
      mergeDuplicateRecipeData(currentRecipes)
    )
  );
  const removedRecipes = currentRecipes.filter(
    (recipe) => recipe.id !== mergedRecipe.id
  );
  const savedRecipe = await saveMergedDuplicateRecipe(
    mergedRecipe,
    removedRecipes,
    client
  );
  const recipes = replaceLocalRecipeImageReferences(await loadLocalRecipes());
  await pruneRecipeImageCache(recipes);

  return {
    recipe: savedRecipe,
    recipes,
    removed: removedRecipes.length
  };
}

export async function createRecipe(
  recipe: Recipe,
  client: CookbookClient | null,
  options: RecipeRepositoryOptions = {}
) {
  await migrateDatabase();
  logInfo("local", "Create recipe requested", {
    name: recipe.name,
    hasClient: Boolean(client),
    image: getRecipeImageDebugState(recipe)
  });
  const decision = await resolveRecipeImportWithNameConflict(
    withInferredCategory(recipe),
    await loadLocalRecipes(),
    options
  );

  if (decision.action === "skip") {
    return saveLocalRecipe(
      decision.existingRecipe ?? decision.recipe,
      false,
      false
    );
  }

  if (decision.action === "update") {
    return updateRecipe(getResolvedImportRecipe(decision), client, options);
  }

  const localRecipe = await saveLocalRecipe(
    withInferredCategory(decision.recipe),
    true
  );
  logInfo("local", "Recipe saved locally before create sync", {
    id: localRecipe.id,
    name: localRecipe.name,
    image: getRecipeImageDebugState(localRecipe)
  });

  if (!client) {
    await enqueueSyncOperation("create", localRecipe.id ?? "", localRecipe);
    logInfo("sync", "Recipe create queued without client", {
      id: localRecipe.id,
      name: localRecipe.name
    });
    return localRecipe;
  }

  try {
    logInfo("sync", "Remote recipe create started", {
      localId: localRecipe.id,
      name: localRecipe.name,
      image: getRecipeImageDebugState(localRecipe)
    });
    const serverId = await client.createRecipe(
      toCookbookCreateRecipe(await prepareRecipeForNextcloud(localRecipe, client))
    );
    const saved = await client.getRecipe(String(serverId));
    await removeLocalRecipe(localRecipe.id ?? "");
    logInfo("sync", "Remote recipe create finished", {
      localId: localRecipe.id,
      serverId,
      name: saved.name,
      image: getRecipeImageDebugState(saved)
    });
    return saveLocalRecipe(
      withInferredCategory(mergeServerRecipeWithLocalImages(saved, localRecipe)),
      false,
      false
    );
  } catch (error) {
    logError("sync", "Remote recipe create failed; queued locally", {
      localId: localRecipe.id,
      name: localRecipe.name,
      image: getRecipeImageDebugState(localRecipe),
      error: normalizeLogError(error)
    });
    await enqueueSyncOperation("create", localRecipe.id ?? "", localRecipe);
    return localRecipe;
  }
}

export async function updateRecipe(
  recipe: Recipe,
  client: CookbookClient | null,
  options: RecipeRepositoryOptions = {}
) {
  await migrateDatabase();
  logInfo("local", "Update recipe requested", {
    id: recipe.id,
    name: recipe.name,
    hasClient: Boolean(client),
    image: getRecipeImageDebugState(recipe)
  });
  const saveTarget = await resolveRecipeForSave(recipe, options);

  if (saveTarget.removeRecipeId) {
    await removeLocalRecipe(saveTarget.removeRecipeId);
    await deleteQueuedOperationsForRecipe(saveTarget.removeRecipeId);
  }

  if (saveTarget.action === "skip") {
    return saveLocalRecipe(saveTarget.recipe, false, false);
  }

  const localRecipe = await saveLocalRecipe(
    withInferredCategory(saveTarget.recipe),
    true
  );
  logInfo("local", "Recipe saved locally before update sync", {
    id: localRecipe.id,
    name: localRecipe.name,
    image: getRecipeImageDebugState(localRecipe)
  });

  if (!client || !localRecipe.id || localRecipe.id.startsWith("local-")) {
    await enqueueSyncOperation(
      localRecipe.id?.startsWith("local-") ? "create" : "update",
      localRecipe.id ?? "",
      localRecipe
    );
    logInfo("sync", "Recipe update queued", {
      id: localRecipe.id,
      name: localRecipe.name,
      reason: !client
        ? "no-client"
        : !localRecipe.id
          ? "missing-id"
          : "local-id"
    });
    await pruneRecipeImageCache(await loadLocalRecipes());
    return localRecipe;
  }

  try {
    logInfo("sync", "Remote recipe update started", {
      id: localRecipe.id,
      name: localRecipe.name,
      image: getRecipeImageDebugState(localRecipe)
    });
    await updateRecipeOnNextcloud(localRecipe, client);
    const saved = await saveLocalRecipe(localRecipe, false);
    logInfo("sync", "Remote recipe update finished", {
      id: saved.id,
      name: saved.name,
      image: getRecipeImageDebugState(saved)
    });
    await pruneRecipeImageCache(await loadLocalRecipes());
    return saved;
  } catch (error) {
    logError("sync", "Remote recipe update failed; queued locally", {
      id: localRecipe.id,
      name: localRecipe.name,
      image: getRecipeImageDebugState(localRecipe),
      error: normalizeLogError(error)
    });
    await enqueueSyncOperation("update", localRecipe.id ?? "", localRecipe);
    await pruneRecipeImageCache(await loadLocalRecipes());
    return localRecipe;
  }
}

export async function deleteRecipe(id: string, client: CookbookClient | null) {
  if (!client) {
    await deleteQueuedOperationsForRecipe(id);
    await removeLocalRecipe(id);
    await pruneRecipeImageCache(await loadLocalRecipes());
    return;
  }

  await markLocalRecipeDeleted(id);

  if (id.startsWith("local-")) {
    await deleteQueuedOperationsForRecipe(id);
    await removeLocalRecipe(id);
    await pruneRecipeImageCache(await loadLocalRecipes());
    return;
  }

  await deleteStaleRecipeImages(id, null, client);

  try {
    await client.deleteRecipe(id);
    await removeLocalRecipe(id);
    await pruneRecipeImageCache(await loadLocalRecipes());
  } catch {
    await enqueueSyncOperation("delete", id, null);
  }
}

async function saveMergedDuplicateRecipe(
  mergedRecipe: Recipe,
  removedRecipes: Recipe[],
  client: CookbookClient | null
) {
  if (!mergedRecipe.id) {
    return saveLocalRecipe(mergedRecipe, false);
  }

  if (!client) {
    const saved = await saveLocalRecipe(mergedRecipe, true);
    await enqueueSyncOperation(
      saved.id?.startsWith("local-") ? "create" : "update",
      saved.id ?? "",
      saved
    );
    for (const removedRecipe of removedRecipes) {
      if (!removedRecipe.id) {
        continue;
      }
      await deleteQueuedOperationsForRecipe(removedRecipe.id);
      await removeLocalRecipe(removedRecipe.id);
    }
    return saved;
  }

  if (!mergedRecipe.id.startsWith("local-")) {
    await updateRecipeOnNextcloud(mergedRecipe, client);
    await deleteRemoteDuplicateRecipes(removedRecipes, client);
    const saved = await saveLocalRecipe(mergedRecipe, false);
    await deleteQueuedOperationsForRecipe(saved.id ?? "");
    await removeLocalDuplicateRecipes(removedRecipes);
    await reindexRecipes(client);
    return saved;
  }

  const remoteRecipe = await prepareRecipeForNextcloud(mergedRecipe, client);
  const serverId = await client.createRecipe(toCookbookCreateRecipe(remoteRecipe));
  const serverRecipe = await client.getRecipe(String(serverId));
  await deleteRemoteDuplicateRecipes(removedRecipes, client);
  await removeLocalDuplicateRecipes([mergedRecipe, ...removedRecipes]);
  const saved = await saveLocalRecipe(
    withInferredCategory(mergeServerRecipeWithLocalImages(serverRecipe, mergedRecipe)),
    false,
    false
  );
  await reindexRecipes(client);
  return saved;
}

async function deleteRemoteDuplicateRecipes(
  recipes: Recipe[],
  client: CookbookClient
) {
  for (const recipe of recipes) {
    if (!recipe.id || recipe.id.startsWith("local-")) {
      continue;
    }

    try {
      await deleteStaleRecipeImages(recipe.id, null, client);
      await client.deleteRecipe(recipe.id);
    } catch (error) {
      if (!(error instanceof CookbookApiError) || error.status !== 404) {
        throw error;
      }
    }
  }
}

async function removeLocalDuplicateRecipes(recipes: Recipe[]) {
  for (const recipe of recipes) {
    if (!recipe.id) {
      continue;
    }

    await deleteQueuedOperationsForRecipe(recipe.id);
    await removeLocalRecipe(recipe.id);
  }
}

export async function importRecipe(
  url: string,
  client: CookbookClient | null,
  knownRecipes: Recipe[] = [],
  options: RecipeRepositoryOptions = {}
) {
  await migrateDatabase();
  const existingRecipes = await getExistingRecipesForImport(knownRecipes);

  try {
    const parsed = withInferredCategory(await importRecipeFromWeb(url));
    return saveWebImportedRecipe(parsed, client, existingRecipes, options);
  } catch (localImportError) {
    if (!client) {
      throw localImportError;
    }

    const imported = withInferredCategory(
      normalizeRecipe(await client.importRecipe(url))
    );
    return reconcileNextcloudImportedRecipe(
      imported,
      client,
      existingRecipes,
      options
    );
  }
}

export async function updateRecipeFromSource(
  recipe: Recipe,
  client: CookbookClient | null,
  options: RecipeRepositoryOptions = {}
) {
  await migrateDatabase();
  if (!isExternalRecipeSourceUrl(recipe.url)) {
    throw new Error("Recipe does not have an external source URL");
  }

  let temporaryImportedId: string | null = null;
  let importedRecipe: Recipe;

  try {
    importedRecipe = withInferredCategory(await importRecipeFromWeb(recipe.url));
  } catch (localImportError) {
    if (!client) {
      throw localImportError;
    }

    importedRecipe = withInferredCategory(
      normalizeRecipe(await client.importRecipe(recipe.url))
    );
    temporaryImportedId = importedRecipe.id;
  }

  try {
    return await updateRecipe(
      mergeRecipeUpdateFromSource(recipe, importedRecipe),
      client,
      options
    );
  } finally {
    if (client && temporaryImportedId && temporaryImportedId !== recipe.id) {
      try {
        await deleteNextcloudImportedDuplicate(
          client,
          temporaryImportedId,
          recipe.id
        );
      } catch {
        // The source refresh succeeded; cleanup can be retried by sync/reindex later.
      }
    }
  }
}

async function getExistingRecipesForImport(knownRecipes: Recipe[]) {
  const localRecipes = await loadLocalRecipes();
  return mergeRecipeLists([...knownRecipes, ...localRecipes]);
}

async function saveWebImportedRecipe(
  importedRecipe: Recipe,
  client: CookbookClient | null,
  existingRecipes: Recipe[],
  options: RecipeRepositoryOptions
) {
  const decision = await resolveRecipeImportWithNameConflict(
    importedRecipe,
    existingRecipes,
    options
  );

  if (decision.action === "skip") {
    return saveLocalRecipe(
      decision.existingRecipe ?? decision.recipe,
      false,
      false
    );
  }

  const recipe = getResolvedImportRecipe(decision);
  return decision.action === "update"
    ? updateRecipe(recipe, client, options)
    : createRecipe(recipe, client, options);
}

async function reconcileNextcloudImportedRecipe(
  importedRecipe: Recipe,
  client: CookbookClient,
  existingRecipes: Recipe[],
  options: RecipeRepositoryOptions
) {
  const decision = await resolveRecipeImportWithNameConflict(
    importedRecipe,
    existingRecipes,
    options
  );
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
    const saved = await updateRecipe(recipe, client, options);
    await deleteNextcloudImportedDuplicate(client, importedRecipe.id, saved.id);
    return saved;
  }

  if (recipe.id && !recipe.id.startsWith("local-")) {
    if (decision.renamed) {
      await updateRecipeOnNextcloud(recipe, client);
      const serverRecipe = await client.getRecipe(recipe.id);
      return saveLocalRecipe(
        mergeServerRecipeWithLocalImages(serverRecipe, recipe),
        false,
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
    await deleteStaleRecipeImages(importedId, null, client);
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

async function resolveRecipeForSave(
  recipe: Recipe,
  options: RecipeRepositoryOptions
) {
  const candidate = withInferredCategory(recipe);
  const localRecipes = await loadLocalRecipes();
  const previousRecipe = candidate.id
    ? localRecipes.find((existingRecipe) => existingRecipe.id === candidate.id)
    : undefined;
  const existingRecipes = localRecipes.filter(
    (existingRecipe) => existingRecipe.id !== candidate.id
  );
  const decision = await resolveRecipeImportWithNameConflict(
    candidate,
    existingRecipes,
    options
  );

  if (decision.action === "create" && !decision.renamed) {
    return {
      action: "save" as const,
      recipe: applyRecipeImageRemovalIntent(candidate, previousRecipe)
    };
  }

  const resolvedRecipe =
    decision.action === "skip"
      ? decision.existingRecipe ?? decision.recipe
      : getResolvedImportRecipe(decision);
  const removeRecipeId =
    candidate.id && resolvedRecipe.id && candidate.id !== resolvedRecipe.id
      ? candidate.id
      : undefined;

  return {
    action: decision.action === "skip" ? ("skip" as const) : ("save" as const),
    recipe: applyRecipeImageRemovalIntent(resolvedRecipe, previousRecipe),
    removeRecipeId
  };
}

function applyRecipeImageRemovalIntent(recipe: Recipe, previousRecipe?: Recipe) {
  if (hasRecipeImageReference(recipe)) {
    return withRecipeImageRemovalIntent(recipe, false);
  }

  return withRecipeImageRemovalIntent(
    recipe,
    hasRecipeImageRemovalIntent(previousRecipe ?? recipe) ||
      hasRecipeImageReference(previousRecipe ?? recipe)
  );
}

async function resolveRecipeImportWithNameConflict(
  recipe: Recipe,
  existingRecipes: Recipe[],
  options: RecipeRepositoryOptions
) {
  const decision = resolveRecipeImport(recipe, existingRecipes);
  if (
    decision.reason !== "name-conflict" ||
    !decision.existingRecipe ||
    !options.resolveNameConflict
  ) {
    return decision;
  }

  const resolution = await options.resolveNameConflict({
    recipe,
    existingRecipe: decision.existingRecipe
  });
  if (resolution !== "merge") {
    return decision;
  }

  return {
    action: "update" as const,
    reason: "name-conflict" as const,
    recipe: normalizeRecipe({
      ...recipe,
      id: decision.existingRecipe.id
    }),
    existingRecipe: decision.existingRecipe,
    renamed: false
  };
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

function replaceLocalRecipeImageReferences(recipes: Recipe[]) {
  return recipes.map(replaceLocalRecipeImageReferencesWithRemote);
}

const SYNC_DETAIL_CONCURRENCY = 6;

export async function syncRecipes(
  client: CookbookClient,
  persistLocal = true,
  options: RecipeRepositoryOptions = {}
) {
  await migrateDatabase();
  logInfo("sync", "Sync started", { persistLocal });
  let rawExistingRecipes = await loadLocalRecipes();
  logDebug("local", "Local recipes loaded for sync", {
    count: rawExistingRecipes.length,
    metadataCount: rawExistingRecipes.filter((recipe) => hasLocalMetadata(recipe))
      .length
  });
  let existingRecipes = replaceLocalRecipeImageReferences(
    rawExistingRecipes.map((recipe) => client.normalizeRecipeImageUrls(recipe))
  );
  let stubs = await client.listRecipes();
  logInfo("sync", "Remote recipe stubs loaded", { count: stubs.length });
  if (persistLocal && hasLegacyRelativeCookbookImage(rawExistingRecipes)) {
    await reindexRecipes(client);
    stubs = await client.listRecipes().catch(() => stubs);
  }

  let recipes = await syncServerRecipesFromStubs(
    client,
    stubs,
    existingRecipes,
    persistLocal
  );
  const flushResult = await flushSyncQueue(client, recipes, options);

  for (const deletedRecipeId of flushResult.deletedRecipeIds) {
    recipes = recipes.filter((recipe) => recipe.id !== deletedRecipeId);
  }

  for (const flushedRecipe of flushResult.recipes) {
    recipes = upsertRecipeInList(recipes, flushedRecipe);
  }

  if (flushResult.pushed) {
    await reindexRecipes(client);
  }

  rawExistingRecipes = await loadLocalRecipes();
  const dirtyLocalRecipes = replaceLocalRecipeImageReferences(
    (await loadDirtyLocalRecipes()).map((recipe) =>
      client.normalizeRecipeImageUrls(recipe)
    )
  );
  logDebug("local", "Dirty local recipes loaded for sync", {
    count: dirtyLocalRecipes.length
  });
  const staleCleanup = await removeServerDeletedLocalRecipes(
    rawExistingRecipes,
    recipes,
    dirtyLocalRecipes
  );
  recipes = staleCleanup.recipes;

  existingRecipes = dirtyLocalRecipes;
  const missingLocalSync = await syncMissingLocalRecipes(
    client,
    existingRecipes,
    recipes,
    options
  );
  recipes = missingLocalSync.recipes;
  if (missingLocalSync.pushed) {
    await reindexRecipes(client);
  }

  await pruneRecipeImageCache(await loadLocalRecipes());

  logInfo("sync", "Sync finished", { count: recipes.length });
  return recipes;
}

async function removeServerDeletedLocalRecipes(
  localRecipes: Recipe[],
  syncedRecipes: Recipe[],
  pendingLocalRecipes: Recipe[]
) {
  const syncedRecipeIds = new Set(
    syncedRecipes.map((recipe) => recipe.id).filter((id): id is string => Boolean(id))
  );
  const pendingRecipeIds = new Set(
    pendingLocalRecipes
      .map((recipe) => recipe.id)
      .filter((id): id is string => Boolean(id))
  );
  const removedRecipeIds: string[] = [];

  for (const localRecipe of localRecipes) {
    if (
      !localRecipe.id ||
      localRecipe.id.startsWith("local-") ||
      syncedRecipeIds.has(localRecipe.id) ||
      pendingRecipeIds.has(localRecipe.id)
    ) {
      continue;
    }

    await deleteQueuedOperationsForRecipe(localRecipe.id);
    await removeLocalRecipe(localRecipe.id);
    removedRecipeIds.push(localRecipe.id);
  }

  return {
    recipes: syncedRecipes.filter(
      (recipe) => !recipe.id || !removedRecipeIds.includes(recipe.id)
    ),
    removedRecipeIds
  };
}

async function syncServerRecipesFromStubs(
  client: CookbookClient,
  stubs: Pick<Recipe, "id" | "recipe_id" | "dateModified">[],
  existingRecipes: Recipe[],
  persistLocal: boolean
) {
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
  const remoteRecipes = await mapWithConcurrency(
    stubs,
    SYNC_DETAIL_CONCURRENCY,
    async (stub) => {
      const id = getRecipeStubId(stub);
      if (!id) {
        return null;
      }

      const existingRecipe = existingRecipesById.get(id);
      if (
        existingRecipe &&
        existingRecipe.dateModified &&
        stub.dateModified &&
        existingRecipe.dateModified === stub.dateModified
      ) {
        return {
          recipe: replaceLocalRecipeImageReferencesWithRemote(existingRecipe)
        };
      }

      const recipe = await client.getRecipe(id);
      return {
        recipe: withInferredCategory(
          replaceLocalRecipeImageReferencesWithRemote(
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
          )
        )
      };
    }
  );
  const recipes: Recipe[] = [];

  for (const result of remoteRecipes) {
    if (!result) {
      continue;
    }

    if (persistLocal || hasLocalMetadata(result.recipe)) {
      recipes.push(await saveLocalRecipe(result.recipe, false, false));
    } else {
      recipes.push(result.recipe);
    }
  }

  return recipes;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    }
  );
  await Promise.all(workers);
  return results;
}

async function syncMissingLocalRecipes(
  client: CookbookClient,
  localRecipes: Recipe[],
  syncedRecipes: Recipe[],
  options: RecipeRepositoryOptions
) {
  let recipes = syncedRecipes;
  let pushed = false;

  for (const localRecipe of localRecipes) {
    if (!localRecipe.id || recipes.some((recipe) => recipe.id === localRecipe.id)) {
      continue;
    }

    const decision = await resolveRecipeImportWithNameConflict(
      localRecipe,
      recipes,
      options
    );
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
      await updateRecipeOnNextcloud(recipe, client);
      const serverRecipe = await client.getRecipe(recipe.id);
      if (localRecipe.id !== recipe.id) {
        await removeLocalRecipe(localRecipe.id);
      }
      const saved = await saveLocalRecipe(
        withInferredCategory(mergeServerRecipeWithLocalImages(serverRecipe, recipe)),
        false,
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
      false,
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

export async function exportRecipeBackup(
  {
    client,
    customCategories,
    isLocalMode
  }: {
    client: CookbookClient | null;
    customCategories: string[];
    isLocalMode: boolean;
  },
  options: RecipeRepositoryOptions = {}
): Promise<RecipeBackupExportResult> {
  await migrateDatabase();
  const recipes = client
    ? await syncRecipes(client, true, options)
    : await loadLocalRecipes();
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
  client: CookbookClient | null,
  options: RecipeRepositoryOptions = {}
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
    const decision = await resolveRecipeImportWithNameConflict(
      localRecipe,
      existingRecipes,
      options
    );

    if (decision.action === "skip") {
      summary.skipped += 1;
      continue;
    }

    const saved = await saveImportedRecipe(
      decision.recipe,
      originalRecipe,
      client,
      decision.action,
      options
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

export async function importRecipeBackupFile(
  uri: string,
  client: CookbookClient | null,
  options: RecipeRepositoryOptions = {}
) {
  return importRecipeBackup(await readRecipeBackupFile(uri), client, options);
}

async function flushSyncQueue(
  client: CookbookClient,
  syncedRecipes: Recipe[],
  options: RecipeRepositoryOptions
) {
  const operations = await listQueuedOperations();
  logInfo("sync", "Sync queue loaded", {
    count: operations.length,
    operations: operations.map((operation) => ({
      id: operation.id,
      operation: operation.operation,
      recipeId: operation.recipeId,
      hasPayload: Boolean(operation.payload)
    }))
  });
  let recipes = syncedRecipes;
  const flushedRecipes: Recipe[] = [];
  const deletedRecipeIds: string[] = [];
  let pushed = false;

  for (const operation of operations) {
    if (operation.operation === "delete") {
      if (!operation.recipeId.startsWith("local-")) {
        try {
          await deleteStaleRecipeImages(operation.recipeId, null, client);
          await client.deleteRecipe(operation.recipeId);
          pushed = true;
        } catch (error) {
          if (!(error instanceof CookbookApiError) || error.status !== 404) {
            throw error;
          }
        }
      }
      await removeLocalRecipe(operation.recipeId);
      await deleteQueuedOperation(operation.id);
      deletedRecipeIds.push(operation.recipeId);
      recipes = recipes.filter((recipe) => recipe.id !== operation.recipeId);
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
      const result = await pushQueuedRecipeAsCreateOrMerge(
        client,
        operation.recipeId,
        operation.payload,
        recipes,
        options
      );
      recipes = result.recipes;
      flushedRecipes.push(result.recipe);
      pushed = pushed || result.pushed;
      await deleteQueuedOperation(operation.id);
      continue;
    }

    try {
      await updateRecipeOnNextcloud(operation.payload, client);
      const saved = await saveLocalRecipe(operation.payload, false);
      recipes = upsertRecipeInList(recipes, saved);
      flushedRecipes.push(saved);
      pushed = true;
    } catch (error) {
      if (!(error instanceof CookbookApiError) || error.status !== 404) {
        throw error;
      }

      await removeLocalRecipe(operation.recipeId);
      await deleteQueuedOperation(operation.id);
      deletedRecipeIds.push(operation.recipeId);
      recipes = recipes.filter((recipe) => recipe.id !== operation.recipeId);
      continue;
    }
    await deleteQueuedOperation(operation.id);
  }

  return { deletedRecipeIds, pushed, recipes: flushedRecipes };
}

async function pushQueuedRecipeAsCreateOrMerge(
  client: CookbookClient,
  queuedRecipeId: string,
  payload: Recipe,
  syncedRecipes: Recipe[],
  options: RecipeRepositoryOptions
) {
  const decision = await resolveRecipeImportWithNameConflict(
    payload,
    syncedRecipes,
    options
  );
  const recipe = getResolvedImportRecipe(decision);

  if (decision.action === "skip") {
    const existingRecipe = decision.existingRecipe ?? recipe;
    if (existingRecipe.id && queuedRecipeId !== existingRecipe.id) {
      await removeLocalRecipe(queuedRecipeId);
    }
    const saved = await saveLocalRecipe(
      mergeServerRecipeWithLocalImages(existingRecipe, payload),
      false,
      false
    );
    return {
      pushed: false,
      recipe: saved,
      recipes: upsertRecipeInList(syncedRecipes, saved)
    };
  }

  if (decision.action === "update" && recipe.id && !recipe.id.startsWith("local-")) {
    await updateRecipeOnNextcloud(recipe, client);
    const serverRecipe = await client.getRecipe(recipe.id);
    if (queuedRecipeId !== recipe.id) {
      await removeLocalRecipe(queuedRecipeId);
    }
    const saved = await saveLocalRecipe(
      withInferredCategory(mergeServerRecipeWithLocalImages(serverRecipe, recipe)),
      false,
      false
    );
    return {
      pushed: true,
      recipe: saved,
      recipes: upsertRecipeInList(syncedRecipes, saved)
    };
  }

  const remoteRecipe = await prepareRecipeForNextcloud(recipe, client);
  const serverId = await client.createRecipe(toCookbookCreateRecipe(remoteRecipe));
  const serverRecipe = await client.getRecipe(String(serverId));
  await removeLocalRecipe(queuedRecipeId);
  const saved = await saveLocalRecipe(
    withInferredCategory(mergeServerRecipeWithLocalImages(serverRecipe, recipe)),
    false,
    false
  );
  return {
    pushed: true,
    recipe: saved,
    recipes: upsertRecipeInList(syncedRecipes, saved)
  };
}

async function saveImportedRecipe(
  localRecipe: Recipe,
  originalRecipe: Recipe,
  client: CookbookClient | null,
  action: "create" | "update",
  options: RecipeRepositoryOptions
) {
  if (!client) {
    return action === "update"
      ? updateRecipe(localRecipe, null, options)
      : createRecipe(localRecipe, null, options);
  }

  if (
    action === "update" &&
    localRecipe.id &&
    !localRecipe.id.startsWith("local-")
  ) {
    try {
      await updateRecipeOnNextcloud(
        getNextcloudImportRecipe(localRecipe, originalRecipe),
        client
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
    false,
    false
  );
}

function getNextcloudImportRecipe(localRecipe: Recipe, originalRecipe: Recipe) {
  const originalExternalImage = getExternalRecipeImageSource(originalRecipe);
  if (!originalExternalImage) {
    return localRecipe;
  }

  return normalizeRecipe({
    ...localRecipe,
    image: originalExternalImage,
    imageUrl: originalExternalImage,
    imagePlaceholderUrl: originalExternalImage
  });
}

async function updateRecipeOnNextcloud(recipe: Recipe, client: CookbookClient) {
  if (recipe.id) {
    await deleteStaleRecipeImages(recipe.id, recipe, client);
  }

  const shouldRemoveImage = hasRecipeImageRemovalIntent(recipe);

  await client.updateRecipe(
    toCookbookRecipe(await prepareRecipeForNextcloud(recipe, client))
  );

  if (shouldRemoveImage) {
    void deleteRemovedRecipeImagesFromNextcloud(recipe, client);
  }
}

async function deleteStaleRecipeImages(
  recipeId: string,
  newRecipe: Recipe | null,
  client: CookbookClient
) {
  if (recipeId.startsWith("local-")) {
    return;
  }

  try {
    const oldPaths = new Set<string>();

    const localRecipeBefore = await loadAnyLocalRecipeById(recipeId);
    if (localRecipeBefore) {
      getAvoCookImagePaths(localRecipeBefore).forEach((p) => oldPaths.add(p));
    }

    const serverRecipe = await client.getRecipe(recipeId).catch(() => null);
    if (serverRecipe) {
      getAvoCookImagePaths(serverRecipe).forEach((p) => oldPaths.add(p));
    }

    const newPaths = new Set(newRecipe ? getAvoCookImagePaths(newRecipe) : []);

    const allRecipes = await loadLocalRecipes();
    const otherRecipes = allRecipes.filter((r) => r.id !== recipeId);
    const referencedPaths = new Set(
      otherRecipes.flatMap((r) => getAvoCookImagePaths(r))
    );

    const pathsToDelete = Array.from(oldPaths).filter(
      (p) => !newPaths.has(p) && !referencedPaths.has(p)
    );

    if (pathsToDelete.length > 0) {
      logInfo("sync", "Deleting stale recipe images from Nextcloud", {
        recipeId,
        paths: pathsToDelete
      });
      await Promise.all(
        pathsToDelete.map((path) =>
          client.deleteWebDavFile(path).catch((error) => {
            logError("sync", "Failed to delete stale recipe image", {
              path,
              error: normalizeLogError(error)
            });
          })
        )
      );
    }
  } catch (error) {
    logError("sync", "Failed to clean up stale recipe images", {
      recipeId,
      error: normalizeLogError(error)
    });
  }
}

async function deleteRemovedRecipeImagesFromNextcloud(
  recipe: Recipe,
  client: CookbookClient
) {
  try {
    await client.deleteCookbookRecipeImages(recipe.name);
  } catch {
    // The Cookbook update already requests image removal. This WebDAV cleanup
    // handles stale recipe-folder files when a server keeps them around.
  }

  await reindexRecipes(client);
}

function getAvoCookImagePaths(recipe: Recipe) {
  return Array.from(
    new Set(
      [recipe.image, recipe.imageUrl, recipe.imagePlaceholderUrl].filter(
        (value): value is string =>
          typeof value === "string" && value.startsWith("/AvoCook Images/")
      )
    )
  );
}

async function prepareRecipeForNextcloud(
  recipe: Recipe,
  client?: CookbookClient | null
) {
  if (hasRecipeImageRemovalIntent(recipe)) {
    logInfo("sync", "Preparing recipe for Nextcloud without image", {
      id: recipe.id,
      name: recipe.name,
      reason: "image-removed"
    });
    return sanitizeRecipeImagesForNextcloud(withoutRecipeImages(recipe));
  }

  if (getExternalRecipeImageSource(recipe)) {
    logInfo("sync", "Preparing recipe for Nextcloud with external image", {
      id: recipe.id,
      name: recipe.name,
      image: getRecipeImageDebugState(recipe)
    });
    return sanitizeRecipeImagesForNextcloud(recipe);
  }

  if (getNextcloudFileRecipeImage(recipe)) {
    logInfo("sync", "Preparing recipe for Nextcloud with uploaded file image", {
      id: recipe.id,
      name: recipe.name,
      image: getRecipeImageDebugState(recipe)
    });
    return sanitizeRecipeImagesForNextcloud(recipe);
  }

  if (
    recipe.id &&
    !recipe.id.startsWith("local-") &&
    [recipe.image, recipe.imageUrl, recipe.imagePlaceholderUrl].some(
      isCookbookImageEndpoint
    )
  ) {
    logInfo("sync", "Preparing recipe for Nextcloud with existing Cookbook image", {
      id: recipe.id,
      name: recipe.name,
      image: getRecipeImageDebugState(recipe)
    });
    return normalizeRecipe(recipe);
  }

  const localImage = getLocalRecipeImage(recipe) || getCachedRecipeImage(recipe);
  if (localImage && client) {
    logInfo("sync", "Preparing recipe for Nextcloud by uploading local image", {
      id: recipe.id,
      name: recipe.name,
      localImage,
      image: getRecipeImageDebugState(recipe)
    });
    const remotePath = await client.uploadRecipeImage(localImage);
    return normalizeRecipe({
      ...recipe,
      image: remotePath,
      imageUrl: remotePath,
      imagePlaceholderUrl: remotePath
    });
  }

  if (!isRemoteImageReference(recipe.url)) {
    logInfo("sync", "Preparing recipe for Nextcloud without usable image source", {
      id: recipe.id,
      name: recipe.name,
      image: getRecipeImageDebugState(recipe)
    });
    return sanitizeRecipeImagesForNextcloud(recipe);
  }

  try {
    const sourceRecipe = await importRecipeFromWeb(recipe.url);
    const remoteImage = getExternalRecipeImageSource(sourceRecipe);
    if (!remoteImage) {
      logWarnRecipeImageSourceMissing(recipe);
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
  if (hasRecipeImageRemovalIntent(localRecipe)) {
    return normalizeRecipe({
      ...serverRecipe,
      image: "",
      imageUrl: "",
      imagePlaceholderUrl: "",
      localMeta: localRecipe.localMeta
    });
  }

  const externalImage =
    getExternalRecipeImageSource(localRecipe) ||
    getExternalRecipeImageSource(serverRecipe);
  const localImage =
    getLocalRecipeImage(localRecipe) || getCachedRecipeImage(localRecipe);
  const nextcloudFileImage =
    getNextcloudFileRecipeImage(localRecipe) ||
    getNextcloudFileRecipeImage(serverRecipe);
  const localRemoteImage = getRemoteRecipeImage(localRecipe);
  const serverRemoteImage = getRemoteRecipeImage(serverRecipe);
  const displayImage =
    externalImage || localRemoteImage || serverRemoteImage || nextcloudFileImage;

  const mergedRecipe = normalizeRecipe({
    ...serverRecipe,
    image:
      externalImage ||
      nextcloudFileImage ||
      serverRecipe.image ||
      localImage,
    imageUrl: externalImage || displayImage || serverRecipe.imageUrl,
    imagePlaceholderUrl:
      externalImage || displayImage || serverRecipe.imagePlaceholderUrl,
    localMeta: localRecipe.localMeta
  });

  if (localImage) {
    return withCachedRecipeImage(mergedRecipe, localImage);
  }

  return replaceLocalRecipeImageReferencesWithRemote(mergedRecipe);
}

function getRecipeImageDebugState(recipe: Recipe) {
  return {
    image: recipe.image,
    imageUrl: recipe.imageUrl,
    imagePlaceholderUrl: recipe.imagePlaceholderUrl,
    cachedImage: getCachedRecipeImage(recipe),
    localImage: getLocalRecipeImage(recipe),
    remoteImage: getRemoteRecipeImage(recipe),
    externalImage: getExternalRecipeImageSource(recipe),
    nextcloudFileImage: getNextcloudFileRecipeImage(recipe),
    removalIntent: hasRecipeImageRemovalIntent(recipe)
  };
}

function logWarnRecipeImageSourceMissing(recipe: Recipe) {
  logWarn("sync", "Recipe source URL did not provide a replacement image", {
    id: recipe.id,
    name: recipe.name,
    url: recipe.url,
    image: getRecipeImageDebugState(recipe)
  });
}

export async function cacheRecipePhoto(
  recipe: Recipe,
  options?: { headers?: Record<string, string> }
) {
  if (hasRecipeImageRemovalIntent(recipe)) {
    return withoutRecipeImages(recipe);
  }

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
