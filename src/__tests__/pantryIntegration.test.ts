import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PantryClient, type PantryItem } from "../features/pantry/pantryClient";
import { migrateShoppingToPantry } from "../features/pantry/pantryMigration";
import { PantrySession } from "../features/pantry/pantrySession";
import type { PantryCache } from "../features/pantry/pantryStore";
import { addIngredientsToShoppingList } from "../features/shopping/shoppingList";

// Real HTTP transport against the OCS contract (no live Nextcloud account needed).
let server: Server;
let serverUrl: string;
let remote: PantryItem[];
let nextId: number;
let dropNextPost: boolean;
let unavailable: boolean;
const requests: { method: string; path: string; authorization?: string; ocs?: string | string[] }[] = [];
const house = { id: 1, name: "Family", isAdmin: true };
const list = { id: 2, houseId: 1, name: "Groceries", canEdit: true };
beforeAll(async () => {
  server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url!, "http://localhost");
      const path = url.pathname;
      requests.push({ method: req.method!, path, authorization: req.headers.authorization, ocs: req.headers["ocs-apirequest"] });
      const reply = (data: unknown, status = 200) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ocs: { meta: { status: status === 200 ? "ok" : "failure", statuscode: status }, data } }));
      };
      if (unavailable) { reply([], 503); return; }
      if (req.headers.authorization !== `Basic ${Buffer.from("alice:test-password").toString("base64")}` || req.headers["ocs-apirequest"] !== "true") { reply([], 401); return; }
      if (!path.startsWith("/nextcloud/ocs/v2.php/apps/pantry/api/") || url.searchParams.get("format") !== "json") { reply([], 404); return; }
      if (path.endsWith("/houses")) { reply([house]); return; }
      if (path.endsWith("/houses/1")) { reply(house); return; }
      if (path.endsWith("/lists")) { reply([list]); return; }
      if (path.endsWith("/lists/2")) { reply(list); return; }
      if (req.method === "GET" && path.endsWith("/items")) {
        const offset = Number(url.searchParams.get("offset"));
        reply(remote.slice(offset, offset + Number(url.searchParams.get("limit")))); return;
      }
      if (req.method === "POST" && path.endsWith("/items")) {
        let raw = ""; for await (const chunk of req) raw += String(chunk);
        const body = JSON.parse(raw);
        const item: PantryItem = { id: nextId++, listId: 2, name: body.name, quantity: null, description: body.description ?? null, done: false };
        remote.push(item);
        if (dropNextPost) { dropNextPost = false; res.destroy(); return; }
        reply(item); return;
      }
      const match = path.match(/\/items\/(\d+)(\/toggle)?$/);
      const item = remote.find((item) => item.id === Number(match?.[1]));
      if (!item) { reply([], 404); return; }
      if (match?.[2]) { item.done = !item.done; reply(item); return; }
      if (req.method === "PATCH") {
        let raw = ""; for await (const chunk of req) raw += String(chunk);
        Object.assign(item, JSON.parse(raw)); reply(item); return;
      }
      if (req.method === "DELETE") { remote = remote.filter((current) => current.id !== item.id); reply({ success: true }); return; }
      reply([], 404);
    })().catch(() => { res.writeHead(500); res.end(); });
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  serverUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/nextcloud`;
});
afterAll(async () => {
  if (!server?.listening) return;
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
beforeEach(() => { remote = []; nextId = 1; requests.length = 0; dropNextPost = false; unavailable = false; });
function makeSession() {
  let saved: PantryCache | null = null;
  const storage = { load: async () => saved, save: async (cache: PantryCache) => { saved = structuredClone(cache); }, clear: async () => { saved = null; } };
  const newClient = () => new PantryClient({ serverUrl, username: "alice", appPassword: "test-password" });
  return { session: new PantrySession(newClient(), storage), reopen: () => new PantrySession(newClient(), storage) };
}
async function connect(session: PantrySession) {
  await session.load(); await session.discover(); await session.chooseHouse(house); await session.link(list);
  expect(session.getSnapshot().fresh).toBe(true);
}
describe("Pantry integration over HTTP", () => {
  it("migrates checked and unchecked items with recovery after an accepted POST loses its response", async () => {
    const client = new PantryClient({ serverUrl, username: "alice", appPassword: "test-password" });
    const local = addIngredientsToShoppingList([], ["Bread", "Milk"]).items; local[0].checked = true;
    let journal: string | null = null;
    const storage = { load: async () => journal, save: async (raw: string) => { journal = raw; }, clear: async () => { journal = null; } };
    dropNextPost = true;
    await expect(migrateShoppingToPantry(client, { house, list }, local, storage)).rejects.toMatchObject({ code: "network" });
    const cache = await migrateShoppingToPantry(client, { house, list }, local, storage);
    expect(cache.items.map((item) => [item.name, item.done])).toEqual([["Bread", true], ["Milk", false]]);
    expect(requests.filter((req) => req.method === "POST" && req.path.endsWith("/items"))).toHaveLength(2);
    client.dispose();
  });
  it("preserves Pantry metadata while editing only the quantity", async () => {
    const client = new PantryClient({ serverUrl, username: "alice", appPassword: "test-password" });
    remote = [{ id: 1, listId: 2, name: "Tomatoes", quantity: "500 g", description: "Pasta", done: false, categoryId: 8, rrule: "FREQ=WEEKLY" }];
    const updated = await client.updateItem(1, 2, 1, { quantity: "1 kg" });
    expect(updated).toMatchObject({ name: "Tomatoes", quantity: "1 kg", description: "Pasta", categoryId: 8, rrule: "FREQ=WEEKLY" });
    client.dispose();
  });

  it("connects, transfers recipe ingredients, checks items, refreshes and disconnects", async () => {
    const { session, reopen } = makeSession();
    await connect(session);
    const local = addIngredientsToShoppingList([], ["2 eggs", "Milk"], { recipeName: "Pancakes" }).items;
    expect(await session.transfer(local)).toBe(true);
    expect(remote.map((item) => item.name)).toEqual(["2 eggs", "Milk"]);
    expect(remote[0].description).toBe("Pancakes");
    await session.toggleItem(session.getSnapshot().items[0]);
    expect(remote[0].done).toBe(true);
    remote[1].name = "Oat milk";
    await session.refresh();
    expect(session.getSnapshot().items[1].name).toBe("Oat milk");
    await session.deleteItem(session.getSnapshot().items[0]);
    expect(remote).toHaveLength(1);
    await session.disconnect();
    expect(remote).toHaveLength(1);
    const next = reopen(); await next.load();
    expect(next.getSnapshot().selection).toBeNull();
    expect(local.every((item) => !item.checked)).toBe(true);
    expect(requests.every((req) => req.ocs === "true" && req.authorization)).toBe(true);
    session.dispose(); next.dispose();
  });
  it("does not duplicate a transfer accepted before a dropped connection", async () => {
    const { session } = makeSession(); await connect(session);
    const local = addIngredientsToShoppingList([], ["Milk", "Bread"]).items;
    dropNextPost = true;
    expect(await session.transfer(local)).toBe(false);
    expect(remote).toHaveLength(1);
    await session.refresh();
    expect(await session.transfer(local)).toBe(true);
    expect(remote.map((item) => item.name)).toEqual(["Milk", "Bread"]);
    expect(requests.filter((req) => req.method === "POST")).toHaveLength(2);
    session.dispose();
  });
  it("reopens an account's cache offline without writing to the unavailable server", async () => {
    const { session, reopen } = makeSession(); await connect(session);
    await session.addItem("Milk"); session.dispose(); unavailable = true;
    const next = reopen(); await next.load();
    expect(next.getSnapshot()).toMatchObject({ view: "items", fresh: false, error: "server" });
    expect(next.getSnapshot().items.map((item) => item.name)).toEqual(["Milk"]);
    const before = requests.length;
    expect(await next.addItem("Bread")).toBe(false);
    expect(requests).toHaveLength(before);
    next.dispose();
  });
});
