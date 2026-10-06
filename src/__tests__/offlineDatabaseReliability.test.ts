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
  saveLocalRecipePreferences
} from "../features/recipes/offlineDatabase";
import { clearSyncedLocalRecipes, createRecipe, syncRecipes } from "../features/recipes/recipeRepository";
import { pruneRecipeImageCache } from "../features/recipes/recipeImages";
import { CookbookApiError, CookbookClient } from "../features/nextcloud/cookbookClient";
import { normalizeRecipe } from "../features/recipes/types";

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
  harness.raw!.exec("DELETE FROM recipes; DELETE FROM sync_queue;");
});

describe("SQLite reliability", () => {
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
  it("retains the local creation and queues it if saving the remote response fails", async () => {
    const client = new CookbookClient({ serverUrl: "https://cloud.example.com", username: "user", appPassword: "pass" });
    vi.spyOn(client, "createRecipe").mockResolvedValue(43);
    vi.spyOn(client, "getRecipe").mockImplementation(async () => {
      harness.failSql = "INSERT OR REPLACE INTO recipes";
      return normalizeRecipe({ id: "43", name: "Cake" });
    });
    const saved = await createRecipe(normalizeRecipe({ name: "Cake" }), client);
    expect((await loadAnyLocalRecipeById(saved.id!))?.name).toBe("Cake");
    expect((await listQueuedOperations())[0].recipeId).toBe(saved.id);
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
    expect((await syncRecipes(client)).map((recipe) => recipe.id)).toEqual(["42"]);
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
