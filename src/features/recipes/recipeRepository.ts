import { importRecipeFromWeb } from "../import/schemaRecipeParser";
import { CookbookApiError, CookbookClient } from "../nextcloud/cookbookClient";
import {
  normalizeCategoryName,
  renameCustomCategory,
  saveCustomCategories,
  saveFavoriteCategories
} from "./categoryStore";
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
  acknowledgeQueuedRecipeUpdate,
  completeRecipeSync,
  saveRecipeForSync,
  recoverUnqueuedChanges,
  resolveRecipeId,
  deleteQueuedOperation,
  discardLocalRecipe,
  deleteQueuedOperationsForRecipe,
  clearLocalRecipeCache,
  enqueueSyncOperation,
  listQueuedOperations,
  loadDirtyLocalRecipes,
  loadDeletedLocalRecipeIds,
  loadLocalRecipes,
  loadAllAccountImageReferences,
  selectRecipeDatabase,
  markLocalRecipeDeleted,
  migrateDatabase,
  removeLocalRecipe,
  saveLocalRecipe,
  saveLocalRecipePreferences,
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
  mergeRecipeImageReferences,
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

async function pruneLocalRecipeImageCache(recipes?: Recipe[]) {
  try {
    const allRecipes = await loadAllAccountImageReferences();
    if (!allRecipes) {
      console.warn("local", "Image cleanup skipped to preserve unreadable recipes");
      return;
    }
    await pruneRecipeImageCache([...allRecipes, ...(recipes ?? [])]);
  } catch (error) {
    console.warn("local", "Image cleanup could not finish", error);
  }
}

async function initialiseRecipeStore() {
  await migrateDatabase();
  return replaceLocalRecipeImageReferences(await loadLocalRecipes());
}

async function clearSyncedLocalRecipes() {
  await migrateDatabase();
  await clearLocalRecipeCache();
  await pruneLocalRecipeImageCache(await loadLocalRecipes());
}

async function updateRecipeLocalPreferences(recipe: Recipe) {
  await migrateDatabase();
  return saveLocalRecipePreferences({ ...recipe, id: recipe.id ? await resolveRecipeId(recipe.id) : null });
}

async function findDuplicateRecipes() {
  await migrateDatabase();
  return findDuplicateRecipeGroups(await loadLocalRecipes());
}

export type RecipeDuplicateMergeResult = {
  recipe: Recipe | null;
  recipes: Recipe[];
  removed: number;
};

async function mergeDuplicateRecipes(
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
    return {
      recipe: currentRecipes[0] ?? null,
      recipes: replaceLocalRecipeImageReferences(await loadLocalRecipes()),
      removed: 0
    };
  }

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
  await pruneLocalRecipeImageCache(recipes);

  return {
    recipe: savedRecipe,
    recipes,
    removed: removedRecipes.length
  };
}

async function createRecipe(
  recipe: Recipe,
  client: CookbookClient | null,
  options: RecipeRepositoryOptions = {}
) {
  await migrateDatabase();
  console.info("local", "Create recipe requested", {
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
    return decision.existingRecipe ?? decision.recipe;
  }

  if (decision.action === "update") {
    return updateRecipe(getResolvedImportRecipe(decision), client, options);
  }

  const localRecipe = await saveRecipeForSync(withInferredCategory(decision.recipe));
  console.info("local", "Recipe saved locally before create sync", {
    id: localRecipe.id,
    name: localRecipe.name,
    image: getRecipeImageDebugState(localRecipe)
  });

  if (!client) {
    console.info("sync", "Recipe create queued without client", {
      id: localRecipe.id,
      name: localRecipe.name
    });
    return localRecipe;
  }

  try {
    console.info("sync", "Remote recipe create started", {
      localId: localRecipe.id,
      name: localRecipe.name,
      image: getRecipeImageDebugState(localRecipe)
    });
    return await createRemoteRecipe(client, localRecipe.id!, localRecipe);
  } catch (error) {
    console.error("sync", "Remote recipe create failed; queued locally", {
      localId: localRecipe.id,
      name: localRecipe.name,
      image: getRecipeImageDebugState(localRecipe),
      error: error
    });
    return localRecipe;
  }
}

async function updateRecipe(
  recipe: Recipe,
  client: CookbookClient | null,
  options: RecipeRepositoryOptions = {}
) {
  await migrateDatabase();
  console.info("local", "Update recipe requested", {
    id: recipe.id,
    name: recipe.name,
    hasClient: Boolean(client),
    image: getRecipeImageDebugState(recipe)
  });
  if (recipe.id) recipe = { ...recipe, id: await resolveRecipeId(recipe.id) };
  const saveTarget = await resolveRecipeForSave(recipe, options);

  if (saveTarget.removeRecipeId) {
    await removeLocalRecipe(saveTarget.removeRecipeId);
    await deleteQueuedOperationsForRecipe(saveTarget.removeRecipeId);
  }

  if (saveTarget.action === "skip") {
    return saveTarget.recipe;
  }

  const localRecipe = await saveRecipeForSync(withInferredCategory(saveTarget.recipe));
  console.info("local", "Recipe saved locally before update sync", {
    id: localRecipe.id,
    name: localRecipe.name,
    image: getRecipeImageDebugState(localRecipe)
  });

  if (!client || !localRecipe.id || localRecipe.id.startsWith("local-")) {
    console.info("sync", "Recipe update queued", {
      id: localRecipe.id,
      name: localRecipe.name,
      reason: !client
        ? "no-client"
        : !localRecipe.id
          ? "missing-id"
          : "local-id"
    });
    await pruneLocalRecipeImageCache(await loadLocalRecipes());
    return localRecipe;
  }

  try {
    console.info("sync", "Remote recipe update started", {
      id: localRecipe.id,
      name: localRecipe.name,
      image: getRecipeImageDebugState(localRecipe)
    });
    await updateRecipeOnNextcloud(localRecipe, client);
    const serverRecipe = await client.getRecipe(localRecipe.id).catch(() => null);
    const recipeToSave = serverRecipe
      ? mergeServerRecipeWithLocalImages(serverRecipe, localRecipe)
      : localRecipe;
    const saved = await completeRecipeSync(localRecipe.id, recipeToSave);
    console.info("sync", "Remote recipe update finished", {
      id: saved.id,
      name: saved.name,
      image: getRecipeImageDebugState(saved)
    });
    await pruneLocalRecipeImageCache(await loadLocalRecipes());
    return saved;
  } catch (error) {
    console.error("sync", "Remote recipe update failed; queued locally", {
      id: localRecipe.id,
      name: localRecipe.name,
      image: getRecipeImageDebugState(localRecipe),
      error: error
    });
    await pruneLocalRecipeImageCache(await loadLocalRecipes());
    return localRecipe;
  }
}

async function deleteRecipe(id: string, client: CookbookClient | null) {
  await migrateDatabase();
  id = await resolveRecipeId(id);
  if (id.startsWith("local-")) {
    await discardLocalRecipe(id);
    await pruneLocalRecipeImageCache();
    return;
  }

  await markLocalRecipeDeleted(id);
  if (!client) return;

  try {
    await deleteRemoteRecipe(client, id);
  } catch (error) {
    if (!(error instanceof CookbookApiError) || error.status !== 404) {
      console.warn("sync", "Recipe deletion remains queued", { id, error });
      return;
    }
  }
  await deleteStaleRecipeImages(id, null, client);
  await removeLocalRecipe(id);
  await deleteQueuedOperationsForRecipe(id);
  await pruneLocalRecipeImageCache();
}

async function deleteRemoteRecipe(client: CookbookClient, id: string) {
  try {
    await client.deleteRecipe(id);
  } catch (error) {
    if (error instanceof CookbookApiError && error.status === 404) return;
    try {
      await client.getRecipe(id);
    } catch (lookupError) {
      if (lookupError instanceof CookbookApiError && lookupError.status === 404) return;
    }
    throw error;
  }
}

async function renameRecipeCategory(
  category: string,
  nextCategory: string,
  client: CookbookClient | null,
  options: RecipeRepositoryOptions = {},
  knownRecipes: Recipe[] = []
) {
  await migrateDatabase();
  const normalized = normalizeCategoryName(category);
  const nextNormalized = normalizeCategoryName(nextCategory);

  if (!normalized || !nextNormalized || normalized === nextNormalized) {
    return {
      recipes: replaceLocalRecipeImageReferences(
        mergeRecipeLists([...knownRecipes, ...(await loadLocalRecipes())])
      ),
      updated: 0
    };
  }

  await renameCustomCategory(normalized, nextNormalized);

  const localRecipes = await loadLocalRecipes();
  const candidateRecipes = mergeRecipeLists([...knownRecipes, ...localRecipes]);
  const recipesToUpdate = candidateRecipes.filter(
    (recipe) => normalizeCategoryName(recipe.recipeCategory) === normalized
  );
  let recipes = candidateRecipes;

  for (const recipe of recipesToUpdate) {
    const saved = await updateRecipe(
      normalizeRecipe({
        ...recipe,
        recipeCategory: nextNormalized
      }),
      client,
      options
    );
    recipes = upsertRecipeInList(recipes, saved);
  }

  return {
    recipes: replaceLocalRecipeImageReferences(
      mergeRecipeLists([...recipes, ...(await loadLocalRecipes())])
    ),
    updated: recipesToUpdate.length
  };
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
      await deleteRemoteRecipe(client, recipe.id);
      await deleteStaleRecipeImages(recipe.id, null, client);
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

async function importRecipe(
  url: string,
  client: CookbookClient | null,
  knownRecipes: Recipe[] = [],
  options: RecipeRepositoryOptions = {}
) {
  if (url.toLowerCase().includes("papillesetpupilles.fr")) {
    throw new Error("PAPILLES_BLOCKED");
  }

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

async function updateRecipeFromSource(
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
        // Retry cleanup later; the source refresh already succeeded.
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
    return decision.existingRecipe ?? decision.recipe;
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
    await deleteRemoteRecipe(client, importedId);
    await deleteStaleRecipeImages(importedId, null, client);
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

export function areRecipeDatesEqual(date1?: string, date2?: string): boolean {
  if (!date1 || !date2) return false;
  if (date1 === date2) return true;
  const t1 = Date.parse(date1);
  const t2 = Date.parse(date2);
  if (Number.isNaN(t1) || Number.isNaN(t2)) return false;
  return t1 === t2;
}

function replaceLocalRecipeImageReferences(recipes: Recipe[]) {
  return recipes.map(replaceLocalRecipeImageReferencesWithRemote);
}

export class RecipeSyncError extends Error {
  constructor(readonly recipes: Recipe[], readonly failures: unknown[]) {
    super(failures.map((error) => error instanceof Error ? error.message : String(error)).join("; "));
    this.name = "RecipeSyncError";
  }
}

const SYNC_DETAIL_CONCURRENCY = 6;

async function syncRecipes(
  client: CookbookClient,
  persistLocal = true,
  options: RecipeRepositoryOptions = {}
) {
  await migrateDatabase();
  console.info("sync", "Sync started", { persistLocal });
  await recoverUnqueuedChanges();
  const failures: unknown[] = [];
  let rawExistingRecipes = await loadLocalRecipes();
  console.debug("local", "Local recipes loaded for sync", {
    count: rawExistingRecipes.length,
    metadataCount: rawExistingRecipes.filter((recipe) => hasLocalMetadata(recipe))
      .length
  });
  let existingRecipes = replaceLocalRecipeImageReferences(
    rawExistingRecipes.map((recipe) => client.normalizeRecipeImageUrls(recipe))
  );

  let recipes = [...existingRecipes];
  const flushResult = await flushSyncQueue(client, recipes, options, failures);

  for (const deletedRecipeId of flushResult.deletedRecipeIds) {
    recipes = recipes.filter((recipe) => recipe.id !== deletedRecipeId);
  }

  for (const flushedRecipe of flushResult.recipes) {
    recipes = upsertRecipeInList(recipes, flushedRecipe);
  }

  if (flushResult.pushed) {
    await reindexRecipes(client);
  }

  let stubs = await client.listRecipes();
  console.info("sync", "Remote recipe stubs loaded", { count: stubs.length });
  if (persistLocal && hasLegacyRelativeCookbookImage(rawExistingRecipes)) {
    await reindexRecipes(client);
    stubs = await client.listRecipes().catch(() => stubs);
  }

  rawExistingRecipes = await loadLocalRecipes();
  existingRecipes = replaceLocalRecipeImageReferences(
    rawExistingRecipes.map((recipe) => client.normalizeRecipeImageUrls(recipe))
  );

  const dirtyLocalRecipesList = await loadDirtyLocalRecipes();
  const dirtyRecipeIds = new Set(
    dirtyLocalRecipesList
      .map((r) => r.id)
      .filter((id): id is string => Boolean(id))
  );

  const remainingOperations = await listQueuedOperations(() => undefined);
  const deletedIds = new Set([
    ...await loadDeletedLocalRecipeIds(),
    ...flushResult.deletedRecipeIds,
    ...remainingOperations.filter((operation) => operation.operation === "delete").map((operation) => operation.recipeId)
  ]);
  recipes = await syncServerRecipesFromStubs(
    client,
    stubs.filter((stub) => !deletedIds.has(getRecipeStubId(stub))),
    existingRecipes,
    persistLocal,
    dirtyRecipeIds,
    failures
  );

  rawExistingRecipes = await loadLocalRecipes();
  const dirtyLocalRecipes = replaceLocalRecipeImageReferences(
    (await loadDirtyLocalRecipes()).map((recipe) =>
      client.normalizeRecipeImageUrls(recipe)
    )
  );
  console.debug("local", "Dirty local recipes loaded for sync", {
    count: dirtyLocalRecipes.length
  });
  const staleCleanup = await removeServerDeletedLocalRecipes(
    client,
    rawExistingRecipes,
    recipes,
    dirtyLocalRecipes,
    failures
  );
  recipes = staleCleanup.recipes;

  for (const localRecipe of dirtyLocalRecipes) {
    recipes = upsertRecipeInList(recipes, localRecipe);
  }

  await pruneLocalRecipeImageCache(await loadLocalRecipes());

  if (!persistLocal) await clearLocalRecipeCache();
  console.info("sync", "Sync finished", { count: recipes.length });
  if (failures.length) throw new RecipeSyncError(recipes, failures);
  return recipes;
}

async function removeServerDeletedLocalRecipes(
  client: CookbookClient | null,
  localRecipes: Recipe[],
  syncedRecipes: Recipe[],
  pendingLocalRecipes: Recipe[],
  failures: unknown[]
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

    let confirmedDeleted = false;
    if (client) {
      let serverRecipe: Recipe | null = null;
      try {
        serverRecipe = await client.getRecipe(localRecipe.id);
      } catch (error) {
        confirmedDeleted = error instanceof CookbookApiError && error.status === 404;
        if (!confirmedDeleted) {
          failures.push(error);
          console.warn("sync", "Could not confirm remote deletion; keeping local recipe", {
            id: localRecipe.id
          });
        }
      }
      if (serverRecipe && serverRecipe.name) {
        console.info("sync", "Recipe missing from list but found on server, keeping", {
          id: localRecipe.id
        });
        const keptRecipe = withInferredCategory(
          replaceLocalRecipeImageReferencesWithRemote(
            mergeDownloadedRecipe(serverRecipe, localRecipe)
          )
        );
        await saveLocalRecipe(keptRecipe, false, false);
        syncedRecipes.push(keptRecipe);
        syncedRecipeIds.add(localRecipe.id);
        continue;
      }
    }

    if (!confirmedDeleted) {
      syncedRecipes.push(localRecipe);
      syncedRecipeIds.add(localRecipe.id);
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

function mergeDownloadedRecipe(recipe: Recipe, existingRecipe?: Recipe) {
  const sameImage = existingRecipe && areRecipeDatesEqual(recipe.dateModified, existingRecipe.dateModified) &&
    (recipe.image === existingRecipe.image || (!recipe.image && isCookbookImageEndpoint(existingRecipe.image)));
  return normalizeRecipe({
    ...recipe,
    localMeta: existingRecipe?.localMeta ? {
      ...existingRecipe.localMeta,
      cachedImage: sameImage ? existingRecipe.localMeta.cachedImage : undefined,
      imageRemoved: undefined
    } : undefined
  });
}

async function syncServerRecipesFromStubs(
  client: CookbookClient,
  stubs: Pick<Recipe, "id" | "recipe_id" | "dateModified">[],
  existingRecipes: Recipe[],
  persistLocal: boolean,
  dirtyRecipeIds: Set<string> = new Set(),
  failures: unknown[] = []
) {
  const existingRecipesById = new Map(
    existingRecipes
      .filter((recipe) => recipe.id)
      .map((recipe) => [recipe.id ?? "", recipe])
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
      const isDirty = dirtyRecipeIds.has(id);

      if (existingRecipe && isDirty) {
        return {
          recipe: replaceLocalRecipeImageReferencesWithRemote(existingRecipe),
          isDirty
        };
      }

      let recipe: Recipe;
      try {
        recipe = await client.getRecipe(id);
      } catch (error) {
        if (error instanceof CookbookApiError && error.status === 404) return null;
        failures.push(error);
        return existingRecipe ? { recipe: existingRecipe, isDirty: true } : null;
      }
      return {
        recipe: withInferredCategory(
          replaceLocalRecipeImageReferencesWithRemote(
            mergeDownloadedRecipe(recipe, existingRecipe)
          )
        ),
        isDirty: false
      };
    }
  );
  const recipes: Recipe[] = [];

  for (const result of remoteRecipes) {
    if (!result) {
      continue;
    }

    if (result.isDirty) {
      recipes.push(result.recipe);
    } else if (persistLocal || hasLocalMetadata(result.recipe)) {
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
  return String(stub.id ?? stub.recipe_id ?? "");
}

async function reindexRecipes(client: CookbookClient) {
  try {
    await client.reindex();
  } catch {
    // The recipe is already saved remotely; reindex refreshes its visibility.
  }
}

async function exportRecipeBackup(
  {
    client,
    customCategories,
    favoriteCategories,
    isLocalMode
  }: {
    client: CookbookClient | null;
    customCategories: string[];
    favoriteCategories: string[];
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
    favoriteCategories,
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

async function importRecipeBackup(
  backup: RecipeBackup,
  client: CookbookClient | null,
  options: RecipeRepositoryOptions = {}
): Promise<RecipeBackupImportResult> {
  await migrateDatabase();
  const categories = await saveCustomCategories(backup.customCategories);
  if (backup.favoriteCategories) {
    await saveFavoriteCategories(backup.favoriteCategories);
  }
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
  await pruneLocalRecipeImageCache(recipes);

  return {
    ...summary,
    categories: categories.length,
    recipes
  };
}

async function importRecipeBackupFile(
  uri: string,
  client: CookbookClient | null,
  options: RecipeRepositoryOptions = {}
) {
  return importRecipeBackup(await readRecipeBackupFile(uri), client, options);
}

async function flushSyncQueue(
  client: CookbookClient,
  syncedRecipes: Recipe[],
  options: RecipeRepositoryOptions,
  failures: unknown[]
) {
  const operations = await listQueuedOperations((error) => failures.push(error));
  console.info("sync", "Sync queue loaded", {
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
    try {
      if (operation.operation === "delete") {
        if (!operation.recipeId.startsWith("local-")) {
          try {
            await deleteRemoteRecipe(client, operation.recipeId);
            await deleteStaleRecipeImages(operation.recipeId, null, client);
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

      await updateRecipeOnNextcloud(operation.payload, client);
      const saved = await acknowledgeQueuedRecipeUpdate(operation);
      if (saved) {
        recipes = upsertRecipeInList(recipes, saved);
        flushedRecipes.push(saved);
      }
      pushed = true;
    } catch (error) {
      failures.push(error);
      console.warn("sync", "Operation remains queued", { recipeId: operation.recipeId, error });
    }
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
    syncedRecipes.filter((item) => item.id !== queuedRecipeId && !item.id?.startsWith("local-")),
    options
  );
  const recipe = getResolvedImportRecipe(decision);

  if (decision.action === "skip") {
    const existingRecipe = decision.existingRecipe ?? recipe;
    const saved = await completeRecipeSync(queuedRecipeId,
      mergeServerRecipeWithLocalImages(existingRecipe, payload)
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
    const saved = await completeRecipeSync(queuedRecipeId,
      withInferredCategory(mergeServerRecipeWithLocalImages(serverRecipe, recipe))
    );
    return {
      pushed: true,
      recipe: saved,
      recipes: upsertRecipeInList(syncedRecipes, saved)
    };
  }

  const saved = await createRemoteRecipe(client, queuedRecipeId, recipe);
  return {
    pushed: true,
    recipe: saved,
    recipes: upsertRecipeInList(syncedRecipes, saved)
  };
}


async function createRemoteRecipe(client: CookbookClient, localId: string, recipe: Recipe) {
  const prepared = await prepareRecipeForNextcloud(recipe, client);
  let serverId: string;
  try {
    serverId = String(await client.createRecipe(toCookbookCreateRecipe(prepared)));
    if (!/^[1-9]\d*$/.test(serverId)) throw new Error("Cookbook did not return a valid recipe ID");
  } catch (error) {
    const recovered = await findAcceptedCreation(client, prepared).catch(() => null);
    if (!recovered?.id) throw error;
    serverId = recovered.id;
  }
  const saved = await completeRecipeSync(localId, normalizeRecipe({ ...prepared, id: serverId }));
  const remote = await client.getRecipe(serverId).catch(() => null);
  return remote
    ? saveLocalRecipe(withInferredCategory(mergeServerRecipeWithLocalImages(remote, saved)), false, false).catch(() => saved)
    : saved;
}

async function findAcceptedCreation(client: CookbookClient, recipe: Recipe) {
  const candidates = (await client.listRecipes()).filter((stub) => stub.name === recipe.name);
  const fields = ["name", "description", "sourceName", "url", "image", "keywords", "prepTime", "cookTime",
    "totalTime", "recipeYield", "recipeCategory", "tool", "recipeIngredient", "recipeInstructions", "nutrition"] as const;
  for (const candidate of candidates) {
    const remote = await client.getRecipe(candidate.id);
    if (fields.every((field) => JSON.stringify(remote[field]) === JSON.stringify(recipe[field]))) return remote;
  }
  return null;
}

async function saveImportedRecipe(
  localRecipe: Recipe,
  originalRecipe: Recipe,
  client: CookbookClient | null,
  action: "create" | "update",
  options: RecipeRepositoryOptions
) {
  const recipe = getNextcloudImportRecipe(localRecipe, originalRecipe);
  return action === "update"
    ? updateRecipe(recipe, client, options)
    : createRecipe({ ...recipe, id: null }, client, options);
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
  const shouldRemoveImage = hasRecipeImageRemovalIntent(recipe);

  await client.updateRecipe(
    toCookbookRecipe(await prepareRecipeForNextcloud(recipe, client))
  );

  if (recipe.id) {
    await deleteStaleRecipeImages(recipe.id, recipe, client);
  }
  if (shouldRemoveImage) {
    await deleteRemovedRecipeImagesFromNextcloud(recipe, client);
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
      getAvoCookImagePaths(localRecipeBefore, client.getImageFolder()).forEach((p) => oldPaths.add(p));
    }

    const serverRecipe = await client.getRecipe(recipeId).catch(() => null);
    if (serverRecipe) {
      getAvoCookImagePaths(serverRecipe, client.getImageFolder()).forEach((p) => oldPaths.add(p));
    }

    const newPaths = new Set(newRecipe ? getAvoCookImagePaths(newRecipe, client.getImageFolder()) : []);

    const allRecipes = await loadLocalRecipes();
    const otherRecipes = allRecipes.filter((r) => r.id !== recipeId);
    const referencedPaths = new Set(
      otherRecipes.flatMap((r) => getAvoCookImagePaths(r, client.getImageFolder()))
    );

    const pathsToDelete = Array.from(oldPaths).filter(
      (p) => !newPaths.has(p) && !referencedPaths.has(p)
    );

    if (pathsToDelete.length > 0) {
      console.info("sync", "Deleting stale recipe images from Nextcloud", {
        recipeId,
        paths: pathsToDelete
      });
      await Promise.all(
        pathsToDelete.map((path) =>
          client.deleteWebDavFile(path).catch((error) => {
            console.error("sync", "Failed to delete stale recipe image", {
              path,
              error: error
            });
          })
        )
      );
    }
  } catch (error) {
    console.error("sync", "Failed to clean up stale recipe images", {
      recipeId,
      error: error
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
    // Remove recipe-folder images left behind by some Cookbook servers.
  }

  await reindexRecipes(client);
}

function getAvoCookImagePaths(recipe: Recipe, imageFolder?: string) {
  const prefix = `/${imageFolder?.trim() || "AvoCook Images"}/`;
  return Array.from(
    new Set(
      [recipe.image, recipe.imageUrl, recipe.imagePlaceholderUrl].filter(
        (value): value is string =>
          typeof value === "string" && value.startsWith(prefix)
      )
    )
  );
}

async function prepareRecipeForNextcloud(
  recipe: Recipe,
  client?: CookbookClient | null
) {
  if (hasRecipeImageRemovalIntent(recipe)) {
    console.info("sync", "Preparing recipe for Nextcloud without image", {
      id: recipe.id,
      name: recipe.name,
      reason: "image-removed"
    });
    return sanitizeRecipeImagesForNextcloud(withoutRecipeImages(recipe));
  }

  if (getExternalRecipeImageSource(recipe)) {
    console.info("sync", "Preparing recipe for Nextcloud with external image", {
      id: recipe.id,
      name: recipe.name,
      image: getRecipeImageDebugState(recipe)
    });
    return sanitizeRecipeImagesForNextcloud(recipe);
  }

  if (getNextcloudFileRecipeImage(recipe)) {
    console.info("sync", "Preparing recipe for Nextcloud with uploaded file image", {
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
    console.info("sync", "Preparing recipe for Nextcloud with existing Cookbook image", {
      id: recipe.id,
      name: recipe.name,
      image: getRecipeImageDebugState(recipe)
    });
    return normalizeRecipe(recipe);
  }

  const localImage = getLocalRecipeImage(recipe) || getCachedRecipeImage(recipe);
  if (localImage && client) {
    console.info("sync", "Preparing recipe for Nextcloud by uploading local image", {
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
    console.info("sync", "Preparing recipe for Nextcloud without usable image source", {
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
  return mergeRecipeImageReferences(serverRecipe, localRecipe);
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
  console.warn("sync", "Recipe source URL did not provide a replacement image", {
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

let pendingRepositoryOperation: Promise<unknown> = Promise.resolve();

function serializeRepositoryOperation<Args extends unknown[], Result>(
  operation: (...args: Args) => Promise<Result>,
  accountKey: string | null
) {
  return (...args: Args): Promise<Result> => {
    const result = pendingRepositoryOperation.then(async () => {
      if (accountKey === null) throw new Error("No active recipe account");
      for (const arg of args) {
        const candidate = arg && typeof arg === "object" && "client" in arg ? arg.client : arg;
        if (candidate instanceof CookbookClient && candidate.getAccountKey() !== accountKey) {
          throw new Error("Recipe account does not match the Nextcloud client");
        }
      }
      await selectRecipeDatabase(accountKey);
      return operation(...args);
    });
    pendingRepositoryOperation = result.catch(() => undefined);
    return result;
  };
}

export function createRecipeRepository(accountKey: string | null) {
  return {
    initialiseRecipeStore: serializeRepositoryOperation(initialiseRecipeStore, accountKey),
    clearSyncedLocalRecipes: serializeRepositoryOperation(clearSyncedLocalRecipes, accountKey),
    updateRecipeLocalPreferences: serializeRepositoryOperation(updateRecipeLocalPreferences, accountKey),
    findDuplicateRecipes: serializeRepositoryOperation(findDuplicateRecipes, accountKey),
    mergeDuplicateRecipes: serializeRepositoryOperation(mergeDuplicateRecipes, accountKey),
    createRecipe: serializeRepositoryOperation(createRecipe, accountKey),
    updateRecipe: serializeRepositoryOperation(updateRecipe, accountKey),
    deleteRecipe: serializeRepositoryOperation(deleteRecipe, accountKey),
    renameRecipeCategory: serializeRepositoryOperation(renameRecipeCategory, accountKey),
    importRecipe: serializeRepositoryOperation(importRecipe, accountKey),
    updateRecipeFromSource: serializeRepositoryOperation(updateRecipeFromSource, accountKey),
    syncRecipes: serializeRepositoryOperation(syncRecipes, accountKey),
    exportRecipeBackup: serializeRepositoryOperation(exportRecipeBackup, accountKey),
    importRecipeBackup: serializeRepositoryOperation(importRecipeBackup, accountKey),
    importRecipeBackupFile: serializeRepositoryOperation(importRecipeBackupFile, accountKey)
  };
}
