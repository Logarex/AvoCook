import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";
import { hasLocalMetadata, normalizeRecipe, toCookbookRecipe, type Recipe } from "./types";

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

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let pendingOperation: Promise<unknown> = Promise.resolve();
const LEGACY_DATABASE = "nextcloud-cookbook.db";
const databases = new Map<string, Promise<SQLite.SQLiteDatabase>>();

function openDatabase(name: string) {
  let database = databases.get(name);
  if (!database) {
    database = SQLite.openDatabaseAsync(name).catch((error: unknown) => {
      databases.delete(name);
      throw error;
    });
    databases.set(name, database);
  }
  return database;
}

function getDatabase() {
  dbPromise ??= openDatabase(LEGACY_DATABASE).catch((error: unknown) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

export async function selectRecipeDatabase(accountKey: string) {
  await pendingOperation;
  const registry = await openDatabase(LEGACY_DATABASE);
  await registry.execAsync(`CREATE TABLE IF NOT EXISTS recipe_accounts (
    account_key TEXT PRIMARY KEY NOT NULL, database_name TEXT NOT NULL UNIQUE
  )`);
  const accounts = await registry.getAllAsync<{ account_key: string; database_name: string }>(
    "SELECT * FROM recipe_accounts"
  );
  let name = accounts.find((account) => account.account_key === accountKey)?.database_name;
  if (!name) {
    name = accounts.length === 0 ? LEGACY_DATABASE :
      `cookbook-${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, accountKey)}.db`;
    await registry.runAsync("INSERT INTO recipe_accounts VALUES (?, ?)", accountKey, name);
  }
  const database = await openDatabase(name);
  dbPromise = Promise.resolve(database);
}

export async function loadAllAccountImageReferences(): Promise<Recipe[] | null> {
  return withDatabase(async () => {
    const registry = await openDatabase(LEGACY_DATABASE);
    const tables = await registry.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'recipe_accounts'"
    );
    const accounts = tables.length ? await registry.getAllAsync<{ database_name: string }>(
      "SELECT database_name FROM recipe_accounts"
    ) : [{ database_name: LEGACY_DATABASE }];
    const recipes: Recipe[] = [];
    for (const { database_name: name } of accounts) {
      const database = await openDatabase(name);
      const recipeTables = await database.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'recipes'"
      );
      if (!recipeTables.length) continue;
      const rows = await database.getAllAsync<RecipeRow>("SELECT * FROM recipes");
      for (const row of rows) {
        const recipe = readRecipeRow(row);
        if (!recipe) return null;
        recipes.push(recipe);
      }
    }
    return recipes;
  });
}

function withDatabase<T>(task: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const result = pendingOperation.then(async () => task(await getDatabase()));
  pendingOperation = result.catch(() => undefined);
  return result;
}

function parseRecipe(payload: string, id: string): Recipe {
  const parsed: unknown = JSON.parse(payload);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid stored recipe: ${id}`);
  }
  return normalizeRecipe({ ...parsed, id });
}

function readRecipeRow(row: RecipeRow): Recipe | null {
  try {
    return parseRecipe(row.payload, row.id);
  } catch {
    console.warn("local", "Unreadable recipe retained in database", { id: row.id });
    return null;
  }
}

export async function migrateDatabase() {
  await withDatabase((db) => db.execAsync(`
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
    CREATE INDEX IF NOT EXISTS sync_queue_recipe_id ON sync_queue (recipe_id);
    CREATE TABLE IF NOT EXISTS recipe_id_aliases (
      local_id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT NOT NULL
    );
  `));
}

export function createLocalRecipeId() {
  return `local-${Crypto.randomUUID()}`;
}

export async function loadLocalRecipes() {
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<RecipeRow>(
      "SELECT * FROM recipes WHERE deleted = 0 ORDER BY updated_at DESC"
    );
    return rows.flatMap((row) => readRecipeRow(row) ?? []);
  });
}

export async function loadDirtyLocalRecipes() {
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<RecipeRow>(
      "SELECT * FROM recipes WHERE deleted = 0 AND dirty = 1 ORDER BY updated_at DESC"
    );
    return rows.flatMap((row) => readRecipeRow(row) ?? []);
  });
}

export async function loadDeletedLocalRecipeIds() {
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<{ id: string }>("SELECT id FROM recipes WHERE deleted = 1");
    return rows.map((row) => row.id);
  });
}

export async function hasUnreadableLocalRecipes() {
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<RecipeRow>("SELECT * FROM recipes WHERE deleted = 0");
    return rows.some((row) => readRecipeRow(row) === null);
  });
}

export async function saveLocalRecipe(
  recipe: Recipe,
  dirty = false,
  touchModified = true
) {
  return withDatabase((db) => writeLocalRecipe(db, recipe, dirty, touchModified));
}

async function writeLocalRecipe(
  db: SQLite.SQLiteDatabase,
  recipe: Recipe,
  dirty: boolean,
  touchModified: boolean
) {
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
  console.debug("local", "Local recipe saved", {
    id,
    dirty,
    touchModified,
    name: payload.name,
    dateModified: payload.dateModified
  });

  return payload;
}

export async function saveLocalRecipePreferences(recipe: Recipe) {
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<RecipeRow>(
      "SELECT * FROM recipes WHERE id = ?",
      recipe.id ?? ""
    );
    const row = rows[0];
    if (!row) {
      return writeLocalRecipe(db, recipe, false, false);
    }
    if (row.deleted) {
      throw new Error("Cannot change preferences of a deleted recipe");
    }
    const current = parseRecipe(row.payload, row.id);
    const saved = normalizeRecipe({ ...current, localMeta: recipe.localMeta });
    await db.runAsync("UPDATE recipes SET payload = ? WHERE id = ?", JSON.stringify(saved), row.id);
    return saved;
  });
}

export async function discardLocalRecipe(id: string) {
  await withDatabase((db) => db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM sync_queue WHERE recipe_id = ?", id);
    await db.runAsync("DELETE FROM recipes WHERE id = ?", id);
  }));
}

export async function acknowledgeQueuedRecipeUpdate(operation: QueuedSyncOperation): Promise<Recipe | null> {
  return withDatabase(async (db) => {
    let saved: Recipe | null = null;
    await db.withTransactionAsync(async () => {
      const queueRows = await db.getAllAsync<QueueRow>("SELECT * FROM sync_queue WHERE id = ?", operation.id);
      const recipeRows = await db.getAllAsync<RecipeRow>("SELECT * FROM recipes WHERE id = ?", operation.recipeId);
      const queued = queueRows[0];
      const row = recipeRows[0];
      const current = row ? parseRecipe(row.payload, row.id) : null;
      saved = row?.deleted ? null : current;
      if (
        !queued || !operation.payload || row?.deleted ||
        queued.operation !== operation.operation || queued.recipe_id !== operation.recipeId ||
        queued.created_at !== operation.createdAt || queued.payload !== JSON.stringify(operation.payload) ||
        (current && JSON.stringify(toCookbookRecipe(current)) !== JSON.stringify(toCookbookRecipe(operation.payload)))
      ) {
        return;
      }
      saved = await writeLocalRecipe(db, {
        ...operation.payload,
        localMeta: current ? current.localMeta : operation.payload.localMeta
      }, false, false);
      await db.runAsync("DELETE FROM sync_queue WHERE id = ?", operation.id);
    });
    return saved;
  });
}

export async function removeLocalRecipe(id: string) {
  await withDatabase((db) => db.runAsync("DELETE FROM recipes WHERE id = ?", id));
}

export async function markLocalRecipeDeleted(id: string) {
  await withDatabase((db) => db.withTransactionAsync(async () => {
    await db.runAsync(
      "UPDATE recipes SET deleted = 1, dirty = 1, updated_at = ? WHERE id = ?",
      new Date().toISOString(),
      id
    );
    await writeSyncOperation(db, "delete", id, null);
  }));
}

export async function saveRecipeForSync(recipe: Recipe) {
  return withDatabase(async (db) => {
    let saved!: Recipe;
    await db.withTransactionAsync(async () => {
      saved = await writeLocalRecipe(db, recipe, true, true);
      await writeSyncOperation(db, saved.id!.startsWith("local-") ? "create" : "update", saved.id!, saved);
    });
    return saved;
  });
}

export async function completeRecipeSync(localId: string, recipe: Recipe) {
  return withDatabase(async (db) => {
    let saved!: Recipe;
    await db.withTransactionAsync(async () => {
      saved = await writeLocalRecipe(db, recipe, false, false);
      if (localId !== saved.id) {
        await db.runAsync("INSERT OR REPLACE INTO recipe_id_aliases (local_id, remote_id) VALUES (?, ?)", localId, saved.id!);
        await db.runAsync("DELETE FROM recipes WHERE id = ?", localId);
      }
      await db.runAsync("DELETE FROM sync_queue WHERE recipe_id = ?", localId);
    });
    return saved;
  });
}

export async function resolveRecipeId(id: string) {
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<{ remote_id: string }>(
      "SELECT remote_id FROM recipe_id_aliases WHERE local_id = ?", id
    );
    return rows[0]?.remote_id ?? id;
  });
}

export async function enqueueSyncOperation(
  operation: SyncOperationType,
  recipeId: string,
  payload: Recipe | null
) {
  await withDatabase((db) => db.withTransactionAsync(() => writeSyncOperation(db, operation, recipeId, payload)));
}

async function writeSyncOperation(
  db: SQLite.SQLiteDatabase,
  operation: SyncOperationType,
  recipeId: string,
  payload: Recipe | null
) {
  if (operation === "delete") {
    await db.runAsync("DELETE FROM sync_queue WHERE recipe_id = ?", recipeId);
  } else if (operation === "create") {
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
      console.debug("local", "Queued create operation payload updated", {
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
  console.debug("local", "Sync operation queued", {
    operation,
    recipeId,
    hasPayload: Boolean(payload),
    payloadName: payload?.name
  });
}

export async function listQueuedOperations(onInvalid?: (error: unknown) => void) {
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<QueueRow>(
      "SELECT * FROM sync_queue ORDER BY id ASC"
    );

    return rows.flatMap((row): QueuedSyncOperation[] => {
      try {
        if (!["create", "update", "delete"].includes(row.operation) ||
            typeof row.recipe_id !== "string" || !row.recipe_id ||
            (row.operation !== "delete" && !row.payload)) {
          throw new Error(`Invalid stored sync operation: ${row.id}`);
        }
        return [{
          id: row.id,
          operation: row.operation,
          recipeId: row.recipe_id,
          payload: row.operation !== "delete" && row.payload ? parseRecipe(row.payload, row.recipe_id) : null,
          createdAt: row.created_at
        }];
      } catch (error) {
        if (!onInvalid) throw error;
        onInvalid(error);
        return [];
      }
    });
  });
}

export async function recoverUnqueuedChanges() {
  await withDatabase((db) => db.withTransactionAsync(async () => {
    const rows = await db.getAllAsync<RecipeRow>(
      "SELECT * FROM recipes WHERE dirty = 1 AND id NOT IN (SELECT recipe_id FROM sync_queue)"
    );
    for (const row of rows) {
      const recipe = readRecipeRow(row);
      if (row.deleted) {
        await writeSyncOperation(db, "delete", row.id, null);
      } else if (recipe) {
        await writeSyncOperation(db, row.id.startsWith("local-") ? "create" : "update", row.id, recipe);
      }
    }
  }));
}

export async function deleteQueuedOperation(id: number) {
  await withDatabase((db) => db.runAsync("DELETE FROM sync_queue WHERE id = ?", id));
}

export async function deleteQueuedOperationsForRecipe(recipeId: string) {
  await withDatabase((db) => db.runAsync("DELETE FROM sync_queue WHERE recipe_id = ?", recipeId));
}

export async function clearLocalRecipeCache() {
  await withDatabase(async (db) => {
    const rows = await db.getAllAsync<RecipeRow>(
      "SELECT * FROM recipes WHERE dirty = 0"
    );

    for (const row of rows) {
      const recipe = readRecipeRow(row);
      if (recipe && !hasLocalMetadata(recipe)) {
        await db.runAsync("DELETE FROM recipes WHERE id = ?", row.id);
      }
    }
  });
}

export async function loadAnyLocalRecipeById(id: string) {
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<RecipeRow>(
      "SELECT * FROM recipes WHERE id = ?",
      id
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    return readRecipeRow(row);
  });
}
