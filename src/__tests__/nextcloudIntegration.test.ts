import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { CookbookClient } from "../features/nextcloud/cookbookClient";
import { createRecipeRepository, RecipeSyncError } from "../features/recipes/recipeRepository";
import { migrateDatabase, saveRecipeForSync, selectRecipeDatabase } from "../features/recipes/offlineDatabase";
import { normalizeRecipe, type Recipe } from "../features/recipes/types";
import { pruneRecipeImageCache } from "../features/recipes/recipeImages";

const databases = vi.hoisted(() => new Map<string, DatabaseSync>());
vi.mock("expo-sqlite", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  return { openDatabaseAsync: async (name: string) => {
    const raw = databases.get(name) ?? new DatabaseSync(":memory:");
    databases.set(name, raw);
    return {
      execAsync: async (sql: string) => { raw.exec(sql); },
      getAllAsync: async (sql: string, ...params: SQLInputValue[]) => raw.prepare(sql).all(...params),
      runAsync: async (sql: string, ...params: SQLInputValue[]) => {
        const result = raw.prepare(sql).run(...params);
        return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
      },
      withTransactionAsync: async (task: () => Promise<void>) => {
        raw.exec("BEGIN");
        try { await task(); raw.exec("COMMIT"); }
        catch (error) { raw.exec("ROLLBACK"); throw error; }
      }
    };
  } };
});
vi.mock("expo-crypto", async () => {
  const { randomUUID, createHash } = await import("node:crypto");
  return { randomUUID, CryptoDigestAlgorithm: { SHA256: "sha256" },
    digestStringAsync: async (algorithm: string, input: string) => createHash(algorithm).update(input).digest("hex") };
});
vi.mock("../features/recipes/recipeImages", () => ({
  persistRecipeImage: vi.fn(async (uri: string) => uri), pruneRecipeImageCache: vi.fn(), restoreRecipeImageFromBackup: vi.fn()
}));
vi.mock("../features/recipes/recipeBackup", () => ({ createRecipeBackup: vi.fn(), readRecipeBackupFile: vi.fn() }));
vi.mock("../features/recipes/categoryStore", () => ({
  renameCustomCategory: vi.fn(), saveCustomCategories: vi.fn(), saveFavoriteCategories: vi.fn(),
  normalizeCategoryName: (value: string) => value
}));

let server: Server;
let baseUrl: string;
const accounts = new Map<string, Map<string, Recipe>>();
const requests: { method: string; path: string; user: string; cache: string | undefined }[] = [];
let nextId = 100;
let failDelete = false;
let indexStatus = 0;
let onlyIndex = false;
let omitFromList = false;
let failRead = false;
let failList = false;
let failPost = false;
let loseCreateResponse = false;
let activeReads = 0;
let maxActiveReads = 0;

beforeAll(async () => {
  server = createServer((req, res) => {
    void (async () => {
    const user = Buffer.from((req.headers.authorization ?? "").replace(/^Basic /, ""), "base64").toString().split(":")[0];
    const path = new URL(req.url!, "http://localhost").pathname;
    const method = req.method!;
    requests.push({ method, path, user, cache: req.headers["cache-control"] });
    const reply = (status: number, body: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (!user) { reply(401, {}); return; }
    if (onlyIndex && !path.includes("/index.php/")) { reply(404, {}); return; }
    if (path.includes("/index.php/") && indexStatus) { reply(indexStatus, {}); return; }
    if (path.endsWith("/reindex")) { reply(200, "OK"); return; }
    const match = path.match(/\/apps\/cookbook\/api\/v1\/recipes(?:\/(\d+))?$/);
    if (!match) { reply(404, {}); return; }
    const recipes = accounts.get(user) ?? new Map<string, Recipe>();
    accounts.set(user, recipes);
    const id = match[1];
    if (method === "GET") {
      if (!id) { reply(failList ? 503 : 200, omitFromList ? [] : [...recipes.values()]); return; }
      if (failRead) { reply(503, {}); return; }
      activeReads++; maxActiveReads = Math.max(maxActiveReads, activeReads);
      await new Promise((resolve) => setTimeout(resolve, 5));
      activeReads--;
      reply(recipes.has(id) ? 200 : 404, recipes.get(id) ?? {});
      return;
    }
    if (method === "DELETE") {
      if (failDelete) { reply(503, {}); return; }
      const deleted = recipes.delete(id);
      reply(deleted ? 200 : 502, deleted ? "OK" : "Not found");
      return;
    }
    let body = "";
    for await (const chunk of req) body += String(chunk);
    const recipe = normalizeRecipe(JSON.parse(body));
    if (method === "POST") {
      if (failPost) { reply(503, {}); return; }
      if ([...recipes.values()].some((existing) => existing.name === recipe.name)) { reply(409, {}); return; }
      const newId = String(nextId++);
      recipes.set(newId, normalizeRecipe({ ...recipe, id: newId }));
      if (loseCreateResponse) { loseCreateResponse = false; res.destroy(); return; }
      reply(200, Number(newId));
      return;
    }
    if (!recipes.has(id)) { reply(404, {}); return; }
    recipes.set(id, normalizeRecipe({ ...recipe, id }));
    reply(200, Number(id));
    })().catch(() => { res.writeHead(500); res.end(); });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/nextcloud`;
});
afterAll(async () => {
  if (!server.listening) return;
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
beforeEach(() => {
  accounts.clear(); requests.length = 0; nextId = 100;
  failDelete = false; indexStatus = 0; onlyIndex = false; omitFromList = false;
  failRead = false; failList = false; failPost = false; loseCreateResponse = false; activeReads = 0; maxActiveReads = 0;
  vi.mocked(pruneRecipeImageCache).mockClear();
  for (const database of databases.values()) {
    for (const table of ["recipes", "sync_queue", "recipe_id_aliases", "recipe_accounts"]) {
      if (database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)) database.exec(`DELETE FROM ${table}`);
    }
  }
});
function session(user = "lukas") {
  const client = new CookbookClient({ serverUrl: baseUrl, username: user, userId: user, appPassword: "test-password" });
  return { client, store: createRecipeRepository(client.getAccountKey()) };
}

describe("Cookbook synchronization over HTTP with SQLite", () => {
  it("reconciles an accepted POST whose response was lost without creating a second recipe", async () => {
    const { store, client } = session();
    loseCreateResponse = true;
    await store.createRecipe(normalizeRecipe({ name: "Accepted before disconnect", recipeIngredient: ["Potatoes"] }), client);
    expect(await store.syncRecipes(client)).toHaveLength(1);
    expect(accounts.get("lukas")!.size).toBe(1);
    expect(await store.initialiseRecipeStore()).toHaveLength(1);
  });

  it("adopts the existing database once without transferring it to subsequent accounts", async () => {
    const alice = session("alice"); const bob = session("bob");
    await selectRecipeDatabase(alice.client.getAccountKey());
    await migrateDatabase();
    const pending = await saveRecipeForSync(normalizeRecipe({ name: "Pre-upgrade recipe" }));
    databases.get("nextcloud-cookbook.db")!.exec("DELETE FROM recipe_accounts");
    expect((await alice.store.initialiseRecipeStore())[0].id).toBe(pending.id);
    expect(await bob.store.initialiseRecipeStore()).toEqual([]);
    expect((await alice.store.syncRecipes(alice.client))[0].name).toBe("Pre-upgrade recipe");
  });

  it("rejects using another account's client before making a request", async () => {
    const alice = session("alice"); const bob = session("bob");
    await expect(alice.store.syncRecipes(bob.client)).rejects.toThrow("does not match");
    expect(requests).toHaveLength(0);
  });

  it("retains the account store when the app password changes", async () => {
    const { store, client } = session();
    await store.createRecipe(normalizeRecipe({ name: "Pending before password rotation" }), null);
    const nextClient = new CookbookClient({ serverUrl: baseUrl, username: "lukas", userId: "lukas", appPassword: "rotated-password" });
    expect(nextClient.getAccountKey()).toBe(client.getAccountKey());
    expect((await createRecipeRepository(nextClient.getAccountKey()).syncRecipes(nextClient))[0].name).toBe("Pending before password rotation");
  });

  it("replays Lukas's workflow and retries a failed deletion without resurrecting it", async () => {
    const { client, store } = session();
    const first = await store.createRecipe(normalizeRecipe({ name: "Suppe" }), client);
    failDelete = true;
    await store.deleteRecipe(first.id!, client);
    await expect(store.syncRecipes(client)).rejects.toMatchObject({ recipes: [] });
    const second = await store.createRecipe(normalizeRecipe({ name: "Grandma's cake" }), client);
    accounts.get("lukas")!.set(second.id!, { ...second, name: "Edited in Cookbook" });
    failDelete = false;
    expect((await store.syncRecipes(client)).map((recipe) => recipe.name)).toEqual(["Edited in Cookbook"]);
    expect(accounts.get("lukas")!.has(first.id!)).toBe(false);
    expect(requests.every((request) => request.cache?.includes("no-store"))).toBe(true);
  });

  it("keeps a queued creation in its original account across an account switch", async () => {
    const alice = session("alice"); const bob = session("bob");
    const pending = await alice.store.createRecipe(normalizeRecipe({ name: "Alice private recipe" }), null);
    expect(await bob.store.syncRecipes(bob.client)).toEqual([]);
    expect(requests.filter((request) => request.user === "bob" && request.method === "POST")).toEqual([]);
    expect((await alice.store.initialiseRecipeStore())[0].id).toBe(pending.id);
    expect((await alice.store.syncRecipes(alice.client))[0].name).toBe("Alice private recipe");
    expect(await bob.store.initialiseRecipeStore()).toEqual([]);
  });

  it("isolates identical server IDs, pending edits, deletes and aliases between accounts", async () => {
    const alice = session("alice"); const bob = session("bob");
    accounts.set("alice", new Map([["42", normalizeRecipe({ id: "42", name: "Alice" })]]));
    accounts.set("bob", new Map([["42", normalizeRecipe({ id: "42", name: "Bob" })]]));
    await alice.store.syncRecipes(alice.client);
    await bob.store.syncRecipes(bob.client);
    await alice.store.deleteRecipe("42", null);
    const bobRecipes = await bob.store.syncRecipes(bob.client);
    expect(bobRecipes[0].name).toBe("Bob");
    await alice.store.syncRecipes(alice.client);
    expect(accounts.get("alice")!.size).toBe(0);
    expect(accounts.get("bob")!.get("42")?.name).toBe("Bob");
  });

  it("finishes a slow old session in its own database while the next account is queued", async () => {
    const alice = session("alice"); const bob = session("bob");
    const pending = alice.store.createRecipe(normalizeRecipe({ name: "Alice" }), alice.client);
    const next = bob.store.syncRecipes(bob.client);
    const saved = await pending;
    expect(await next).toEqual([]);
    await alice.store.updateRecipe({ ...saved, name: "Alice late edit" }, alice.client);
    expect(await bob.store.initialiseRecipeStore()).toEqual([]);
    expect(accounts.get("alice")!.get(saved.id!)?.name).toBe("Alice late edit");
  });

  it("keeps local-only recipes and other accounts' cached photos", async () => {
    const local = createRecipeRepository("local"); const bob = session("bob");
    const recipe = await local.createRecipe(normalizeRecipe({ name: "Local", localMeta: { cachedImage: "file:///recipe-images/local.jpg" } }), null);
    expect(await bob.store.syncRecipes(bob.client)).toEqual([]);
    expect(vi.mocked(pruneRecipeImageCache).mock.lastCall?.[0].some((item) => item.id === recipe.id)).toBe(true);
    expect((await local.initialiseRecipeStore())[0].name).toBe("Local");
  });

  it("surfaces fallback 503 errors without treating them as confirmed deletions", async () => {
    const { store } = session();
    accounts.set("lukas", new Map([["42", normalizeRecipe({ id: "42", name: "Keep me" })]]));
    await store.syncRecipes(session().client);
    onlyIndex = true; indexStatus = 503;
    await expect(store.syncRecipes(session().client)).rejects.toMatchObject({ status: 503 });
    expect((await store.initialiseRecipeStore())[0].name).toBe("Keep me");
    indexStatus = 0;
    expect((await store.syncRecipes(session().client))[0].name).toBe("Keep me");
  });

  it("reports failed deletion checks instead of reporting a successful sync", async () => {
    const { client, store } = session();
    const recipe = await store.createRecipe(normalizeRecipe({ name: "Keep me" }), client);
    omitFromList = true; failRead = true;
    await expect(store.syncRecipes(client)).rejects.toMatchObject({ recipes: [expect.objectContaining({ id: recipe.id })] });
    expect((await store.initialiseRecipeStore())[0].name).toBe("Keep me");
  });

  it("persists server edits even when the recipe is temporarily absent from the index", async () => {
    const { client, store } = session();
    const recipe = await store.createRecipe(normalizeRecipe({ name: "Before" }), client);
    omitFromList = true;
    accounts.get("lukas")!.set(recipe.id!, { ...recipe, name: "After" });
    expect((await store.syncRecipes(client))[0].name).toBe("After");
    expect((await store.initialiseRecipeStore())[0].name).toBe("After");
  });

  it("recovers after a failed list request without losing queued edits", async () => {
    const { client, store } = session();
    failPost = true; failList = true;
    await store.createRecipe(normalizeRecipe({ name: "Offline" }), client);
    await expect(store.syncRecipes(client)).rejects.toThrow();
    expect((await store.initialiseRecipeStore())[0].name).toBe("Offline");
    failPost = false; failList = false;
    expect((await store.syncRecipes(client))[0].name).toBe("Offline");
    expect(accounts.get("lukas")!.size).toBe(1);
  });

  it("limits concurrent detail requests and completes a 120-recipe library", async () => {
    const { client, store } = session();
    accounts.set("lukas", new Map(Array.from({ length: 120 }, (_, index) => {
      const id = String(index + 1); return [id, normalizeRecipe({ id, name: `Recipe ${id}` })];
    })));
    expect(await store.syncRecipes(client)).toHaveLength(120);
    expect(maxActiveReads).toBeGreaterThan(1);
    expect(maxActiveReads).toBeLessThanOrEqual(6);
    expect(await store.initialiseRecipeStore()).toHaveLength(120);
  });

  it("rejects an operation without an authenticated or local session", async () => {
    await expect(createRecipeRepository(null).createRecipe(normalizeRecipe({ name: "No account" }), null)).rejects.toThrow("No active recipe account");
  });

  it("reports multiple failed operations while still downloading other recipes", async () => {
    const { client, store } = session();
    await store.createRecipe(normalizeRecipe({ name: "One" }), null);
    await store.createRecipe(normalizeRecipe({ name: "Two" }), null);
    accounts.set("lukas", new Map([["42", normalizeRecipe({ id: "42", name: "Remote" })]]));
    failPost = true;
    try { await store.syncRecipes(client); throw new Error("Expected partial failure"); }
    catch (error) {
      expect(error).toBeInstanceOf(RecipeSyncError);
      expect((error as RecipeSyncError).failures).toHaveLength(2);
      expect((error as RecipeSyncError).recipes).toHaveLength(3);
    }
  });
});
