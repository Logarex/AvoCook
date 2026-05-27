import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";
import { logDebug } from "../logging/appLogger";
import { hasLocalMetadata, normalizeRecipe, type Recipe } from "./types";

export type SyncOperationType = "create" | "update" | "delete";

export type QueuedSyncOperation = {
  id: number;
  operation: SyncOperationType;
  recipeId: string;
  payload: Recipe | null;
  createdAt: string;
};

type RecipeRow = {
  id: string;
  payload: string;
  dirty: number;
  deleted: number;
  updated_at: string;
};

type QueueRow = {
  id: number;
  operation: SyncOperationType;
  recipe_id: string;
  payload: string | null;
  created_at: string;
};

const dbPromise = SQLite.openDatabaseAsync("nextcloud-cookbook.db");

export async function migrateDatabase() {
  const db = await dbPromise;
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      dirty INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation TEXT NOT NULL,
      recipe_id TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

export function createLocalRecipeId() {
  return `local-${Crypto.randomUUID()}`;
}

export async function loadLocalRecipes() {
  const db = await dbPromise;
  const rows = await db.getAllAsync<RecipeRow>(
    "SELECT * FROM recipes WHERE deleted = 0 ORDER BY updated_at DESC"
  );
  return rows.map((row) => normalizeRecipe(JSON.parse(row.payload) as Recipe));
}

export async function loadDirtyLocalRecipes() {
  const db = await dbPromise;
  const rows = await db.getAllAsync<RecipeRow>(
    "SELECT * FROM recipes WHERE deleted = 0 AND dirty = 1 ORDER BY updated_at DESC"
  );
  return rows.map((row) => normalizeRecipe(JSON.parse(row.payload) as Recipe));
}

export async function saveLocalRecipe(
  recipe: Recipe,
  dirty = false,
  touchModified = true
) {
  const db = await dbPromise;
  const id = recipe.id ?? createLocalRecipeId();
  const dateModified = touchModified
    ? new Date().toISOString()
    : recipe.dateModified ?? new Date().toISOString();
  const payload = normalizeRecipe({
    ...recipe,
    id,
    dateModified
  });

  await db.runAsync(
    `INSERT OR REPLACE INTO recipes (id, payload, dirty, deleted, updated_at)
     VALUES (?, ?, ?, 0, ?)`,
    id,
    JSON.stringify(payload),
    dirty ? 1 : 0,
    payload.dateModified ?? dateModified
  );
  logDebug("local", "Local recipe saved", {
    id,
    dirty,
    touchModified,
    name: payload.name,
    dateModified: payload.dateModified
  });

  return payload;
}

export async function removeLocalRecipe(id: string) {
  const db = await dbPromise;
  await db.runAsync("DELETE FROM recipes WHERE id = ?", id);
}

export async function markLocalRecipeDeleted(id: string) {
  const db = await dbPromise;
  await db.runAsync(
    "UPDATE recipes SET deleted = 1, dirty = 1, updated_at = ? WHERE id = ?",
    new Date().toISOString(),
    id
  );
}

export async function enqueueSyncOperation(
  operation: SyncOperationType,
  recipeId: string,
  payload: Recipe | null
) {
  const db = await dbPromise;

  if (operation === "delete") {
    // a delete cancels everything else that was queued for this recipe
    await db.runAsync("DELETE FROM sync_queue WHERE recipe_id = ?", recipeId);
  } else if (operation === "create") {
    // a new create cancels previous creates or updates
    await db.runAsync(
      "DELETE FROM sync_queue WHERE recipe_id = ? AND operation IN ('create', 'update')",
      recipeId
    );
  } else {
    const queuedCreates = await db.getAllAsync<QueueRow>(
      "SELECT * FROM sync_queue WHERE recipe_id = ? AND operation = 'create' ORDER BY id ASC",
      recipeId
    );
    const queuedCreate = queuedCreates[0];

    await db.runAsync(
      "DELETE FROM sync_queue WHERE recipe_id = ? AND operation = 'update'",
      recipeId
    );

    if (queuedCreate) {
      await db.runAsync(
        "UPDATE sync_queue SET payload = ?, created_at = ? WHERE id = ?",
        payload ? JSON.stringify(payload) : null,
        new Date().toISOString(),
        queuedCreate.id
      );
      logDebug("local", "Queued create operation payload updated", {
        operation,
        recipeId,
        queueId: queuedCreate.id,
        hasPayload: Boolean(payload),
        payloadName: payload?.name
      });
      return;
    }
  }

  await db.runAsync(
    `INSERT INTO sync_queue (operation, recipe_id, payload, created_at)
     VALUES (?, ?, ?, ?)`,
    operation,
    recipeId,
    payload ? JSON.stringify(payload) : null,
    new Date().toISOString()
  );
  logDebug("local", "Sync operation queued", {
    operation,
    recipeId,
    hasPayload: Boolean(payload),
    payloadName: payload?.name
  });
}

export async function listQueuedOperations() {
  const db = await dbPromise;
  const rows = await db.getAllAsync<QueueRow>(
    "SELECT * FROM sync_queue ORDER BY id ASC"
  );

  return rows.map<QueuedSyncOperation>((row) => ({
    id: row.id,
    operation: row.operation,
    recipeId: row.recipe_id,
    payload: row.payload
      ? normalizeRecipe(JSON.parse(row.payload) as Partial<Recipe>)
      : null,
    createdAt: row.created_at
  }));
}

export async function deleteQueuedOperation(id: number) {
  const db = await dbPromise;
  await db.runAsync("DELETE FROM sync_queue WHERE id = ?", id);
}

export async function deleteQueuedOperationsForRecipe(recipeId: string) {
  const db = await dbPromise;
  await db.runAsync("DELETE FROM sync_queue WHERE recipe_id = ?", recipeId);
}

export async function clearLocalRecipeCache() {
  const db = await dbPromise;
  const rows = await db.getAllAsync<RecipeRow>(
    "SELECT * FROM recipes WHERE dirty = 0"
  );

  for (const row of rows) {
    const recipe = normalizeRecipe(JSON.parse(row.payload) as Recipe);
    // don't delete if we have local timers or notes not synced yet
    if (!hasLocalMetadata(recipe)) {
      await db.runAsync("DELETE FROM recipes WHERE id = ?", row.id);
    }
  }
}

export async function loadAnyLocalRecipeById(id: string) {
  const db = await dbPromise;
  const rows = await db.getAllAsync<RecipeRow>(
    "SELECT * FROM recipes WHERE id = ?",
    id
  );
  const row = rows[0];
  if (!row) {
    return null;
  }
  return normalizeRecipe(JSON.parse(row.payload) as Recipe);
}

