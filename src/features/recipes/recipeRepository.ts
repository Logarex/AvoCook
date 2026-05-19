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
  deleteQueuedOperationsForRecipe,
  clearLocalRecipeCache,
  enqueueSyncOperation,
  listQueuedOperations,
  loadDirtyLocalRecipes,
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
  client: CookbookClient | null,
  options: RecipeRepositoryOptions = {}
) {
  await migrateDatabase();
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
      false,
      false
    );
  } catch {
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

  if (!client || !localRecipe.id || localRecipe.id.startsWith("local-")) {
    await enqueueSyncOperation(
      localRecipe.id?.startsWith("local-") ? "create" : "update",
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
      await client.updateRecipe(
        toCookbookRecipe(await prepareRecipeForNextcloud(recipe, client))
      );
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
  const existingRecipes = (await loadLocalRecipes()).filter(
    (existingRecipe) => existingRecipe.id !== candidate.id
  );
  const decision = await resolveRecipeImportWithNameConflict(
    candidate,
    existingRecipes,
    options
  );

  if (decision.action === "create" && !decision.renamed) {
    return { action: "save" as const, recipe: candidate };
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
    recipe: resolvedRecipe,
    removeRecipeId
  };
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

const SYNC_DETAIL_CONCURRENCY = 6;

export async function syncRecipes(
  client: CookbookClient,
  persistLocal = true,
  options: RecipeRepositoryOptions = {}
) {
  await migrateDatabase();
  let rawExistingRecipes = await loadLocalRecipes();
  let existingRecipes = rawExistingRecipes.map((recipe) =>
    client.normalizeRecipeImageUrls(recipe)
  );
  let stubs = await client.listRecipes();
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
  const dirtyLocalRecipes = (await loadDirtyLocalRecipes()).map((recipe) =>
    client.normalizeRecipeImageUrls(recipe)
  );
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
        return { recipe: existingRecipe };
      }

      const recipe = await client.getRecipe(id);
      return {
        recipe: withInferredCategory(
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
      await client.updateRecipe(
        toCookbookRecipe(await prepareRecipeForNextcloud(recipe, client))
      );
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
  let recipes = syncedRecipes;
  const flushedRecipes: Recipe[] = [];
  const deletedRecipeIds: string[] = [];
  let pushed = false;

  for (const operation of operations) {
    if (operation.operation === "delete") {
      if (!operation.recipeId.startsWith("local-")) {
        try {
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
      await client.updateRecipe(
        toCookbookRecipe(await prepareRecipeForNextcloud(operation.payload, client))
      );
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
    await client.updateRecipe(
      toCookbookRecipe(await prepareRecipeForNextcloud(recipe, client))
    );
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
