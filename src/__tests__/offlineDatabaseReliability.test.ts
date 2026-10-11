import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import {
  acknowledgeQueuedRecipeUpdate,
  clearLocalRecipeCache,
  enqueueSyncOperation,
  listQueuedOperations,
  loadAnyLocalRecipeById,
  loadDirtyLocalRecipes,
  loadLocalRecipes,
  hasUnreadableLocalRecipes,
  migrateDatabase,
  saveLocalRecipe,
  saveLocalRecipePreferences,
  saveRecipeForSync,
  markLocalRecipeDeleted,
  completeRecipeSync,
  resolveRecipeId
} from "../features/recipes/offlineDatabase";
import { createRecipeRepository, RecipeSyncError } from "../features/recipes/recipeRepository";
import { pruneRecipeImageCache } from "../features/recipes/recipeImages";
import { CookbookApiError, CookbookClient } from "../features/nextcloud/cookbookClient";
import { normalizeRecipe } from "../features/recipes/types";

const { clearSyncedLocalRecipes, createRecipe, syncRecipes, updateRecipe, deleteRecipe } =
  createRecipeRepository(JSON.stringify(["https://cloud.example.com", "user"]));

const harness = vi.hoisted(() => ({
  raw: null as DatabaseSync | null,
  failSql: null as string | null
}));

vi.mock("expo-sqlite", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const raw = new DatabaseSync(":memory:");
  harness.raw = raw;
  const db = {
    execAsync: async (sql: string) => { raw.exec(sql); },
    getAllAsync: async (sql: string, ...params: SQLInputValue[]) => raw.prepare(sql).all(...params),
    runAsync: async (sql: string, ...params: SQLInputValue[]) => {
      if (harness.failSql && sql.includes(harness.failSql)) {
        throw new Error("Simulated disk failure");
      }
      const result = raw.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    withTransactionAsync: async (task: () => Promise<void>) => {
      raw.exec("BEGIN");
      try {
        await task();
        raw.exec("COMMIT");
      } catch (error) {
        raw.exec("ROLLBACK");
        throw error;
      }
    }
  };
  return { openDatabaseAsync: vi.fn(async () => db) };
});

vi.mock("expo-crypto", () => ({ randomUUID: () => "uuid" }));
vi.mock("../features/recipes/recipeImages", () => ({
  persistRecipeImage: vi.fn(async (uri: string) => uri),
  pruneRecipeImageCache: vi.fn(),
  restoreRecipeImageFromBackup: vi.fn()
}));
vi.mock("../features/recipes/recipeBackup", () => ({
  createRecipeBackup: vi.fn(),
  readRecipeBackupFile: vi.fn()
}));
vi.mock("../features/recipes/categoryStore", () => ({
  renameCustomCategory: vi.fn(),
  saveCustomCategories: vi.fn(),
  saveFavoriteCategories: vi.fn(),
  normalizeCategoryName: (value: string) => value
}));

beforeEach(async () => {
  vi.restoreAllMocks();
  harness.failSql = null;
  await migrateDatabase();
  harness.raw!.exec("DELETE FROM recipes; DELETE FROM sync_queue; DELETE FROM recipe_id_aliases;");
});

describe("SQLite reliability", () => {
  it("rolls back removing a local creation and its queue together on disk failure", async () => {
    const pending = await createRecipe(normalizeRecipe({ name: "Offline creation" }), null);
    harness.failSql = "DELETE FROM recipes";
    await expect(deleteRecipe(pending.id!, null)).rejects.toThrow("Simulated disk failure");
    expect((await loadLocalRecipes())[0].id).toBe(pending.id);
    expect((await listQueuedOperations())[0].recipeId).toBe(pending.id);
  });

  it("stores SQL metacharacters as data without modifying the schema", async () => {
    const id = "42'; DROP TABLE recipes; --";
    const recipe = normalizeRecipe({ id, name: "Cake'); DELETE FROM sync_queue; --" });
    await saveLocalRecipe(recipe, true, false);
    await enqueueSyncOperation("update", id, recipe);
    expect((await loadLocalRecipes())[0].name).toBe(recipe.name);
    expect((await listQueuedOperations())[0].recipeId).toBe(id);
  });

  it("keeps corrupt rows while allowing valid recipes to load and cache cleanup to finish", async () => {
    await saveLocalRecipe(normalizeRecipe({ id: "clean", name: "Cake" }), false, false);
    await saveLocalRecipe(normalizeRecipe({ id: "dirty", name: "Offline edit" }), true, false);
    await saveLocalRecipe(normalizeRecipe({
      id: "timer", name: "Timer", localMeta: { timers: [{ id: "t", label: "Bake", minutes: 10 }] }
    }), false, false);
    for (const [id, payload] of [["bad-json", "{"], ["bad-shape", "null"]]) {
      harness.raw!.prepare("INSERT INTO recipes VALUES (?, ?, 0, 0, ?)").run(id, payload, "2026");
    }
    expect(await loadLocalRecipes()).toHaveLength(3);
    await clearLocalRecipeCache();
    expect((await loadLocalRecipes()).map((recipe) => recipe.id).sort()).toEqual(["dirty", "timer"]);
    expect(harness.raw!.prepare("SELECT id FROM recipes WHERE id LIKE 'bad-%'").all()).toHaveLength(2);
  });

  it("rolls back queue replacement when the new operation cannot be written", async () => {
    const first = normalizeRecipe({ id: "42", name: "First edit" });
    await enqueueSyncOperation("update", "42", first);
    harness.failSql = "INSERT INTO sync_queue";
    await expect(enqueueSyncOperation("update", "42", normalizeRecipe({ id: "42", name: "Second edit" })))
      .rejects.toThrow("Simulated disk failure");
    expect((await listQueuedOperations())[0].payload?.name).toBe("First edit");
  });

  it("preserves photo files when a corrupt recipe could still reference them", async () => {
    harness.raw!.prepare("INSERT INTO recipes VALUES (?, ?, 0, 0, ?)").run("bad-json", "{", "2026");
    vi.mocked(pruneRecipeImageCache).mockClear();
    expect(await hasUnreadableLocalRecipes()).toBe(true);
    await clearSyncedLocalRecipes();
    expect(pruneRecipeImageCache).not.toHaveBeenCalled();
    harness.raw!.prepare("DELETE FROM recipes WHERE id = ?").run("bad-json");
    expect(await hasUnreadableLocalRecipes()).toBe(false);
  });

  it("coalesces simultaneous edits into the latest queued creation", async () => {
    await Promise.all([
      enqueueSyncOperation("create", "local-42", normalizeRecipe({ id: "local-42", name: "First" })),
      enqueueSyncOperation("update", "local-42", normalizeRecipe({ id: "local-42", name: "Second" })),
      enqueueSyncOperation("update", "local-42", normalizeRecipe({ id: "local-42", name: "Third" }))
    ]);
    const queue = await listQueuedOperations();
    expect(queue).toHaveLength(1);
    expect(queue[0].operation).toBe("create");
    expect(queue[0].payload?.name).toBe("Third");
  });

  it("preserves pending edits and dirty status when preferences use an older recipe snapshot", async () => {
    await saveLocalRecipe(normalizeRecipe({ id: "42", name: "Pending edit" }), true, false);
    const saved = await saveLocalRecipePreferences(normalizeRecipe({
      id: "42", name: "Old server title", localMeta: { hideServings: true }
    }));
    expect(saved.name).toBe("Pending edit");
    expect(saved.localMeta?.hideServings).toBe(true);
    expect(await loadDirtyLocalRecipes()).toHaveLength(1);
  });

  it("fails closed on corrupt queue payloads without deleting operations", async () => {
    harness.raw!.prepare("INSERT INTO sync_queue (operation, recipe_id, payload, created_at) VALUES (?, ?, ?, ?)")
      .run("update", "42", "null", "2026");
    await expect(listQueuedOperations()).rejects.toThrow("Invalid stored recipe");
    expect(harness.raw!.prepare("SELECT * FROM sync_queue").all()).toHaveLength(1);
  });

  it("acknowledges a completed update while preserving preferences cleared during upload", async () => {
    const recipe = await saveLocalRecipe(normalizeRecipe({
      id: "42", name: "Cake", localMeta: { hideServings: true }
    }), true, false);
    await enqueueSyncOperation("update", "42", recipe);
    const [operation] = await listQueuedOperations();
    await saveLocalRecipePreferences({ ...recipe, localMeta: undefined });
    const saved = await acknowledgeQueuedRecipeUpdate(operation);
    expect(saved?.localMeta).toBeUndefined();
    expect(await listQueuedOperations()).toEqual([]);
    expect(await loadDirtyLocalRecipes()).toEqual([]);
  });
});

describe("Nextcloud deletion confirmation", () => {
  it("retains the acknowledged server ID if saving the downloaded response fails", async () => {
    const client = new CookbookClient({ serverUrl: "https://cloud.example.com", username: "user", appPassword: "pass" });
    vi.spyOn(client, "createRecipe").mockResolvedValue(43);
    vi.spyOn(client, "getRecipe").mockImplementation(async () => {
      harness.failSql = "INSERT OR REPLACE INTO recipes";
      return normalizeRecipe({ id: "43", name: "Cake" });
    });
    const saved = await createRecipe(normalizeRecipe({ name: "Cake" }), client);
    expect((await loadAnyLocalRecipeById(saved.id!))?.name).toBe("Cake");
    expect(saved.id).toBe("43");
    expect(await listQueuedOperations()).toEqual([]);
  });

  it("keeps a newer edit queued when an older update finishes uploading", async () => {
    const old = await saveLocalRecipe(normalizeRecipe({ id: "42", name: "Old edit" }), true, false);
    await enqueueSyncOperation("update", "42", old);
    const client = new CookbookClient({ serverUrl: "https://cloud.example.com", username: "user", appPassword: "pass" });
    vi.spyOn(client, "getRecipe").mockResolvedValue(old);
    vi.spyOn(client, "listRecipes").mockResolvedValue([{ ...old, id: "42" }]);
    vi.spyOn(client, "updateRecipe").mockImplementation(async () => {
      const latest = await saveLocalRecipe(normalizeRecipe({ id: "42", name: "Latest edit" }), true, false);
      await enqueueSyncOperation("update", "42", latest);
      return "";
    });
    expect((await syncRecipes(client))[0].name).toBe("Latest edit");
    expect((await listQueuedOperations())[0].payload?.name).toBe("Latest edit");
    expect((await loadDirtyLocalRecipes())[0].name).toBe("Latest edit");
  });

  it.each([
    new TypeError("Network request failed"),
    new CookbookApiError("Unauthorized", 401),
    new CookbookApiError("Service unavailable", 503)
  ])("preserves local recipes and timers when confirmation fails: %s", async (error) => {
    const local = normalizeRecipe({
      id: "42", name: "Cake", localMeta: { timers: [{ id: "t", label: "Bake", minutes: 10 }] }
    });
    await saveLocalRecipe(local, false, false);
    const client = new CookbookClient({ serverUrl: "https://cloud.example.com", username: "user", appPassword: "pass" });
    vi.spyOn(client, "listRecipes").mockResolvedValue([]);
    vi.spyOn(client, "getRecipe").mockRejectedValue(error);
    await expect(syncRecipes(client)).rejects.toMatchObject({
      recipes: [expect.objectContaining({ id: "42" })], failures: [error]
    });
    expect((await loadAnyLocalRecipeById("42"))?.localMeta?.timers).toHaveLength(1);
  });

  it("removes a recipe when the server explicitly confirms HTTP 404", async () => {
    await saveLocalRecipe(normalizeRecipe({ id: "42", name: "Cake" }), false, false);
    const client = new CookbookClient({ serverUrl: "https://cloud.example.com", username: "user", appPassword: "pass" });
    vi.spyOn(client, "listRecipes").mockResolvedValue([]);
    vi.spyOn(client, "getRecipe").mockRejectedValue(new CookbookApiError("Not found", 404));
    expect(await syncRecipes(client)).toEqual([]);
    expect(await loadAnyLocalRecipeById("42")).toBeNull();
  });
});

function recipeServer() {
  const client = new CookbookClient({ serverUrl: "https://cloud.example.com", username: "user", appPassword: "pass" });
  const recipes = new Map<string, ReturnType<typeof normalizeRecipe>>();
  let nextId = 100;
  vi.spyOn(client, "createRecipe").mockImplementation(async (recipe) => {
    const id = String(nextId++);
    recipes.set(id, normalizeRecipe({ ...recipe, id }));
    return id;
  });
  vi.spyOn(client, "getRecipe").mockImplementation(async (id) => {
    const recipe = recipes.get(id);
    if (!recipe) throw new CookbookApiError("Missing recipe", 404);
    return { ...recipe };
  });
  vi.spyOn(client, "listRecipes").mockImplementation(async () =>
    Array.from(recipes.values(), (recipe) => ({ ...recipe, id: recipe.id! }))
  );
  vi.spyOn(client, "updateRecipe").mockImplementation(async (recipe) => {
    if (!recipes.has(recipe.id!)) throw new CookbookApiError("Missing recipe", 404);
    recipes.set(recipe.id!, recipe);
    return recipe.id!;
  });
  vi.spyOn(client, "deleteRecipe").mockImplementation(async (id) => {
    recipes.delete(id);
    return "";
  });
  vi.spyOn(client, "reindex").mockResolvedValue("");
  return { client, recipes };
}

describe("Lukas recipe synchronization regressions", () => {
  it("creates, deletes, creates again, then pulls a server edit even with an unchanged timestamp", async () => {
    const { client, recipes } = recipeServer();
    const first = await createRecipe(normalizeRecipe({ name: "Grandma's soup" }), client);
    expect(recipes.has(first.id!)).toBe(true);
    await deleteRecipe(first.id!, client);
    expect(recipes.has(first.id!)).toBe(false);
    expect(await loadLocalRecipes()).toEqual([]);
    const second = await createRecipe(normalizeRecipe({ name: "Second soup" }), client);
    recipes.set(second.id!, { ...recipes.get(second.id!)!, description: "Edited in Cookbook", imageUrl: "https://cloud.example.com/apps/cookbook/api/v1/recipes/101/image?size=full" });
    const synced = await syncRecipes(client);
    expect(synced).toHaveLength(1);
    expect(synced[0].description).toBe("Edited in Cookbook");
    expect(synced[0].imageUrl).toContain("recipes/101/image");
    expect(await listQueuedOperations()).toEqual([]);
  });

  it("keeps failed deletions hidden while uploading and downloading other recipes, then retries", async () => {
    const { client, recipes } = recipeServer();
    const doomed = await createRecipe(normalizeRecipe({ name: "Delete me" }), client);
    vi.mocked(client.deleteRecipe).mockRejectedValue(new CookbookApiError("Delete temporarily unavailable", 503));
    await deleteRecipe(doomed.id!, client);
    const pending = await createRecipe(normalizeRecipe({ name: "Offline soup" }), null);
    recipes.set("42", normalizeRecipe({ id: "42", name: "Server recipe" }));
    const error = await syncRecipes(client).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(RecipeSyncError);
    const partial = (error as RecipeSyncError).recipes;
    expect(partial.map((recipe) => recipe.name).sort()).toEqual(["Offline soup", "Server recipe"]);
    expect(await loadAnyLocalRecipeById(pending.id!)).toBeNull();
    expect((await listQueuedOperations()).map((operation) => operation.operation)).toEqual(["delete"]);
    vi.mocked(client.deleteRecipe).mockImplementation(async (id) => { recipes.delete(id); return ""; });
    await syncRecipes(client);
    expect(recipes.has(doomed.id!)).toBe(false);
    expect(await listQueuedOperations()).toEqual([]);
  });

  it("treats Cookbook's 502 for an already deleted recipe as complete only after a confirming 404", async () => {
    const { client } = recipeServer();
    await saveLocalRecipe(normalizeRecipe({ id: "42", name: "Gone" }));
    vi.mocked(client.deleteRecipe).mockRejectedValue(new CookbookApiError("Already absent", 502));
    await deleteRecipe("42", client);
    expect(await loadLocalRecipes()).toEqual([]);
    expect(await listQueuedOperations()).toEqual([]);
  });

  it("clears an older queued edit after a later successful save", async () => {
    const { client, recipes } = recipeServer();
    const saved = await createRecipe(normalizeRecipe({ name: "Original", description: "First" }), client);
    await updateRecipe({ ...saved, description: "Offline edit" }, null);
    await updateRecipe({ ...saved, description: "Latest edit" }, client);
    expect(await listQueuedOperations()).toEqual([]);
    await syncRecipes(client);
    expect(recipes.get(saved.id!)?.description).toBe("Latest edit");
  });

  it("does not recreate a recipe when POST succeeds but the following GET fails", async () => {
    const { client } = recipeServer();
    vi.mocked(client.getRecipe).mockRejectedValueOnce(new Error("Connection lost"));
    const saved = await createRecipe(normalizeRecipe({ name: "Soup" }), client);
    expect(saved.id).toBe("100");
    expect(await listQueuedOperations()).toEqual([]);
    await syncRecipes(client);
    expect(client.createRecipe).toHaveBeenCalledTimes(1);
    expect(await loadLocalRecipes()).toHaveLength(1);
  });

  it("uploads a queued creation instead of mistaking its local copy for an existing server recipe", async () => {
    const { client } = recipeServer();
    const local = await createRecipe(normalizeRecipe({ name: "Offline soup" }), null);
    const synced = await syncRecipes(client);
    expect(client.createRecipe).toHaveBeenCalledTimes(1);
    expect(synced.map((recipe) => recipe.id)).toEqual(["100"]);
    expect(await resolveRecipeId(local.id!)).toBe("100");
    expect(await listQueuedOperations()).toEqual([]);
  });

  it("recovers a legacy deletion that had no queue entry", async () => {
    const { client, recipes } = recipeServer();
    const saved = await createRecipe(normalizeRecipe({ name: "Legacy" }), client);
    harness.raw!.prepare("UPDATE recipes SET deleted = 1, dirty = 1 WHERE id = ?").run(saved.id!);
    await syncRecipes(client);
    expect(recipes.size).toBe(0);
    expect(await listQueuedOperations()).toEqual([]);
  });

  it("keeps a failed creation queued without uploading it twice in a single sync", async () => {
    const { client } = recipeServer();
    await createRecipe(normalizeRecipe({ name: "Offline soup" }), null);
    vi.mocked(client.createRecipe).mockRejectedValue(new CookbookApiError("Invalid recipe", 422));
    const error = await syncRecipes(client).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(RecipeSyncError);
    expect((error as RecipeSyncError).recipes[0].name).toBe("Offline soup");
    expect(client.createRecipe).toHaveBeenCalledTimes(1);
    expect(await listQueuedOperations()).toHaveLength(1);
  });

  it("keeps valid recipes syncing when one detail response or queue row is invalid", async () => {
    const { client, recipes } = recipeServer();
    recipes.set("42", normalizeRecipe({ id: "42", name: "Valid" }));
    const cached = normalizeRecipe({ id: "43", name: "Cached" });
    await saveLocalRecipe(cached);
    recipes.set("43", cached);
    vi.mocked(client.getRecipe).mockImplementation(async (id) => {
      if (id === "43") throw new Error("Malformed server recipe");
      return recipes.get(id)!;
    });
    harness.raw!.prepare("INSERT INTO sync_queue (operation, recipe_id, payload, created_at) VALUES (?, ?, ?, ?)")
      .run("update", "99", "{", "2026");
    const error = await syncRecipes(client).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(RecipeSyncError);
    expect((error as RecipeSyncError).recipes.map((recipe) => recipe.name)).toEqual(["Valid", "Cached"]);
    expect(harness.raw!.prepare("SELECT * FROM sync_queue").all()).toHaveLength(1);
  });

  it("serializes deletion with creation and resolves the former local ID", async () => {
    const { client, recipes } = recipeServer();
    const local = await createRecipe(normalizeRecipe({ name: "Offline soup" }), null);
    let release!: () => void;
    let started!: () => void;
    const ready = new Promise<void>((resolve) => { started = resolve; });
    const pause = new Promise<void>((resolve) => { release = resolve; });
    vi.mocked(client.createRecipe).mockImplementation(async (recipe) => {
      started();
      await pause;
      recipes.set("100", normalizeRecipe({ ...recipe, id: "100" }));
      return "100";
    });
    const syncing = syncRecipes(client);
    await ready;
    const deleting = deleteRecipe(local.id!, client);
    release();
    await Promise.all([syncing, deleting]);
    expect(client.deleteRecipe).toHaveBeenCalledWith("100");
    expect(recipes.size).toBe(0);
    expect(await loadLocalRecipes()).toEqual([]);
    expect(await listQueuedOperations()).toEqual([]);
  });

  it("rolls back the saved recipe when its queue entry cannot be written", async () => {
    harness.failSql = "INSERT INTO sync_queue";
    await expect(saveRecipeForSync(normalizeRecipe({ id: "42", name: "Soup" }))).rejects.toThrow("Simulated disk failure");
    expect(await loadLocalRecipes()).toEqual([]);
    expect(await listQueuedOperations()).toEqual([]);
  });

  it("rolls back a deletion when its queue entry cannot be written", async () => {
    await saveLocalRecipe(normalizeRecipe({ id: "42", name: "Soup" }));
    harness.failSql = "INSERT INTO sync_queue";
    await expect(markLocalRecipeDeleted("42")).rejects.toThrow("Simulated disk failure");
    expect(await loadLocalRecipes()).toHaveLength(1);
  });

  it("rolls back ID replacement and preserves the queued creation on disk failure", async () => {
    const local = await saveRecipeForSync(normalizeRecipe({ name: "Soup" }));
    harness.failSql = "DELETE FROM sync_queue";
    await expect(completeRecipeSync(local.id!, { ...local, id: "100" })).rejects.toThrow("Simulated disk failure");
    expect((await loadLocalRecipes()).map((recipe) => recipe.id)).toEqual([local.id]);
    expect(await resolveRecipeId(local.id!)).toBe(local.id);
    expect(await listQueuedOperations()).toHaveLength(1);
  });

  it("keeps a pending offline edit when the server photo and content change", async () => {
    const { client, recipes } = recipeServer();
    recipes.set("42", normalizeRecipe({ id: "42", name: "Server", image: "https://example.com/new.jpg" }));
    await saveRecipeForSync(normalizeRecipe({ id: "42", name: "Offline edit", localMeta: { hideServings: true } }));
    vi.mocked(client.updateRecipe).mockRejectedValue(new Error("Unavailable"));
    const error = await syncRecipes(client).catch((error: unknown) => error);
    expect((error as RecipeSyncError).recipes[0].name).toBe("Offline edit");
    expect((await listQueuedOperations())[0].payload?.name).toBe("Offline edit");
  });
});

describe("sync conflict preservation", () => {
  it("preserves unsent edits when the same recipe was deleted on the server", async () => {
    const { client } = recipeServer();
    await saveRecipeForSync(normalizeRecipe({ id: "42", name: "Unsent changes", recipeIngredient: ["Keep this ingredient"] }));
    await expect(syncRecipes(client)).rejects.toBeInstanceOf(RecipeSyncError);
    expect((await loadLocalRecipes())[0].recipeIngredient).toEqual(["Keep this ingredient"]);
    expect(await listQueuedOperations()).toHaveLength(1);
    expect(client.createRecipe).not.toHaveBeenCalled();
  });

  it("does not mark an existing offline recipe clean when it is imported again", async () => {
    const { client } = recipeServer();
    const recipe = normalizeRecipe({ name: "Offline", recipeIngredient: ["Salt"], recipeInstructions: ["Mix"] });
    const first = await createRecipe(recipe, null);
    const second = await createRecipe(recipe, null);
    expect(second.id).toBe(first.id);
    expect(await loadDirtyLocalRecipes()).toHaveLength(1);
    vi.mocked(client.createRecipe).mockRejectedValue(new Error("Offline"));
    const error = await syncRecipes(client).catch((error: unknown) => error);
    expect((error as RecipeSyncError).recipes).toHaveLength(1);
  });

  it("retains the photo cache while the server photo is unchanged, then invalidates it on change", async () => {
    const { client, recipes } = recipeServer();
    const local = normalizeRecipe({ id: "42", name: "Photo", image: "https://images.example/original.jpg", dateModified: "2026-10-11T12:00:00Z", localMeta: { cachedImage: "file:///photo.jpg", hideServings: true } });
    await saveLocalRecipe(local, false, false);
    recipes.set("42", { ...local, localMeta: undefined });
    expect((await syncRecipes(client))[0].localMeta?.cachedImage).toBe("file:///photo.jpg");
    recipes.set("42", { ...local, image: "https://images.example/new.jpg", localMeta: undefined });
    const synced = (await syncRecipes(client))[0];
    expect(synced.image).toBe("https://images.example/new.jpg");
    expect(synced.localMeta?.cachedImage).toBeUndefined();
    expect(synced.localMeta?.hideServings).toBe(true);
  });

  it("respects disabled local caching while retaining community links and pending changes", async () => {
    const { client, recipes } = recipeServer();
    recipes.set("42", normalizeRecipe({ id: "42", name: "Server only" }));
    const linked = normalizeRecipe({ id: "43", name: "Community", localMeta: { communityId: "shared-recipe" } });
    await saveLocalRecipe(linked, false, false);
    recipes.set("43", { ...linked, localMeta: undefined });
    expect(await syncRecipes(client, false)).toHaveLength(2);
    expect((await loadLocalRecipes()).map((recipe) => recipe.id)).toEqual(["43"]);
  });
});

describe("deletion tombstones", () => {
  it("does not resurrect a deleted recipe when its queue record is corrupt", async () => {
    const { client } = recipeServer();
    const saved = await createRecipe(normalizeRecipe({ name: "Deleted locally" }), client);
    await markLocalRecipeDeleted(saved.id!);
    harness.raw!.prepare("UPDATE sync_queue SET operation = 'invalid' WHERE recipe_id = ?").run(saved.id!);
    const error = await syncRecipes(client).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(RecipeSyncError);
    expect((error as RecipeSyncError).recipes).toEqual([]);
    expect(await loadLocalRecipes()).toEqual([]);
    expect(harness.raw!.prepare("SELECT * FROM sync_queue").all()).toHaveLength(1);
  });
});
