import { describe, expect, it } from "vitest";
import type { StockItem } from "../features/kitchen/kitchen";
import { PantryError, type PantryInventoryItem, type PantryInventoryItemInput, type PantryInventoryItemPatch } from "../features/pantry/pantryClient";
import {
  applyInventorySync,
  expiryFromPantry,
  expiryToPantry,
  restockedItem,
  suggestInventory,
  syncInventory,
  type InventoryBase,
  type InventoryConfig,
} from "../features/pantry/inventorySync";

const FRIDGE = 10, CUPBOARD = 11;
const config = (canEdit = true): InventoryConfig => ({
  house: { id: 1, name: "Home" },
  locations: {
    fridge: { id: FRIDGE, name: "Fridge", canEdit },
    cupboard: { id: CUPBOARD, name: "Pantry", canEdit },
    // Freezer shares the cupboard inventory.
    freezer: { id: CUPBOARD, name: "Pantry", canEdit },
  },
});

function status(item: PantryInventoryItem): PantryInventoryItem {
  if (item.stockMode === "level") return { ...item, stockStatus: item.stockLevel === "out" ? "out" : item.stockLevel === "low" ? "low" : "ok" };
  const quantity = (item.quantity ?? "").trim();
  return { ...item, stockStatus: !quantity ? "uncounted" : Number.parseFloat(quantity) === 0 ? "out" : "ok" };
}

class FakePantry {
  items = new Map<number, PantryInventoryItem>();
  calls: string[] = [];
  next = 100;
  refuse = new Set<string>();
  seed(item: Partial<PantryInventoryItem> & { name: string; listId: number }) {
    const id = item.id ?? this.next++;
    this.items.set(id, status({ quantity: null, stockMode: "count", stockLevel: "full", expiresAt: null, barcode: null, ...item, id }));
    return id;
  }
  async inventoryItems(_house: number, listId: number) {
    return [...this.items.values()].filter((item) => item.listId === listId);
  }
  async addInventoryItem(_house: number, listId: number, input: PantryInventoryItemInput) {
    this.calls.push(`add ${input.name}`);
    if (this.refuse.has("add")) throw new PantryError("forbidden");
    const id = this.seed({ ...input, listId, quantity: input.quantity ?? null });
    return this.items.get(id)!;
  }
  async updateInventoryItem(_house: number, listId: number, itemId: number, patch: PantryInventoryItemPatch) {
    this.calls.push(`patch ${itemId} ${JSON.stringify(patch)}`);
    if (this.refuse.has("patch")) throw new PantryError("forbidden");
    const item = this.items.get(itemId);
    if (!item || item.listId !== listId) throw new PantryError("unavailable");
    const { targetListId, expiresAt, ...rest } = patch;
    const next = status({
      ...item,
      ...rest,
      ...(targetListId ? { listId: targetListId } : {}),
      ...(expiresAt !== undefined ? { expiresAt: expiresAt || null } : {}),
    });
    this.items.set(itemId, next);
    return next;
  }
  async deleteInventoryItem(_house: number, _listId: number, itemId: number) {
    this.calls.push(`delete ${itemId}`);
    this.items.delete(itemId);
  }
}

let ids = 0;
const createId = () => `new-${++ids}`;
const stock = (item: Partial<StockItem> & { name: string }): StockItem => ({ id: `local-${item.name}`, quantity: "", location: "fridge", expires: "", ...item });

async function round(server: FakePantry, local: StockItem[], base: InventoryBase | null, cfg = config()) {
  return syncInventory(server, cfg, local, base, createId);
}

describe("Pantry inventory dates", () => {
  it("round-trips calendar days through midnight timestamps from any server timezone", () => {
    expect(expiryFromPantry(expiryToPantry("2026-12-01"))).toBe("2026-12-01");
    // Midnight in Paris (UTC+1) and in Los Angeles (UTC-8).
    expect(expiryFromPantry(Date.UTC(2026, 11, 1) / 1000 - 3600)).toBe("2026-12-01");
    expect(expiryFromPantry(Date.UTC(2026, 11, 1) / 1000 + 8 * 3600)).toBe("2026-12-01");
    expect(expiryFromPantry(null)).toBe("");
    expect(expiryToPantry("")).toBe(0);
  });
});

describe("Pantry inventory sync", () => {
  it("first round uploads local products, downloads Pantry ones and merges the same product once", async () => {
    const server = new FakePantry();
    server.seed({ name: "Lait", listId: FRIDGE, quantity: "2" });
    server.seed({ name: "Riz", listId: CUPBOARD, quantity: "1 kg", expiresAt: expiryToPantry("2027-03-01") });
    const result = await round(server, [
      stock({ name: "Lait", expires: "2026-12-10" }),
      stock({ name: "Yaourts", quantity: "4", barcode: "3017620422003" }),
    ], null);
    expect(server.calls).toEqual([
      expect.stringMatching(/^patch \d+ \{"expiresAt":\d+\}$/),
      "add Yaourts",
    ]);
    expect(result.stock.map(({ name, quantity, location, expires }) => ({ name, quantity, location, expires }))).toEqual([
      { name: "Lait", quantity: "2", location: "fridge", expires: "2026-12-10" },
      { name: "Yaourts", quantity: "4", location: "fridge", expires: "" },
      { name: "Riz", quantity: "1 kg", location: "cupboard", expires: "2027-03-01" },
    ]);
    expect(result.stock[0].id).toBe("local-Lait");
    expect(result.stock.every((item) => item.pantry)).toBe(true);
    expect([...server.items.values()].find((item) => item.name === "Yaourts")?.barcode).toBe("3017620422003");
    // A second round with nothing changed sends nothing.
    server.calls = [];
    const again = await round(server, result.stock, result.base);
    expect(server.calls).toEqual([]);
    expect(again.stock).toEqual(result.stock);
  });

  it("merges edits field by field and lets this device win a real conflict", async () => {
    const server = new FakePantry();
    const id = server.seed({ name: "Beurre", listId: FRIDGE, quantity: "250 g" });
    const first = await round(server, [], null);
    // Someone renames it in Pantry, this device changes the quantity.
    await server.updateInventoryItem(1, FRIDGE, id, { name: "Beurre doux" });
    server.calls = [];
    const local = first.stock.map((item) => ({ ...item, quantity: "125 g" }));
    const result = await round(server, local, first.base);
    expect(server.calls).toEqual([`patch ${id} {"quantity":"125 g"}`]);
    expect(result.stock[0]).toMatchObject({ name: "Beurre doux", quantity: "125 g" });
    // Both sides change the quantity: this device wins.
    await server.updateInventoryItem(1, FRIDGE, id, { quantity: "500 g" });
    const conflict = await round(server, result.stock.map((item) => ({ ...item, quantity: "100 g" })), result.base);
    expect(conflict.stock[0].quantity).toBe("100 g");
    expect(server.items.get(id)?.quantity).toBe("100 g");
  });

  it("sets a used-up product to zero in Pantry instead of deleting it, and restocks it later", async () => {
    const server = new FakePantry();
    const id = server.seed({ name: "Œufs", listId: FRIDGE, quantity: "6" });
    const first = await round(server, [], null);
    const used = await round(server, [], first.base);
    expect(server.items.get(id)).toMatchObject({ quantity: "0", stockStatus: "out" });
    expect(used.stock).toEqual([]);
    expect(used.out).toEqual([{ itemId: id, listId: FRIDGE, name: "Œufs", quantity: "", location: "fridge", level: false }]);
    const back = { ...restockedItem(used.out[0], createId), quantity: "12" };
    const restocked = await round(server, [back], used.base);
    expect(server.items.get(id)).toMatchObject({ quantity: "12", stockStatus: "ok" });
    expect(restocked.out).toEqual([]);
    expect(restocked.stock[0]).toMatchObject({ id: back.id, name: "Œufs", quantity: "12" });
  });

  it("follows products used up, removed or restocked by another household member", async () => {
    const server = new FakePantry();
    const eggs = server.seed({ name: "Œufs", listId: FRIDGE, quantity: "6" });
    const rice = server.seed({ name: "Riz", listId: CUPBOARD, quantity: "1 kg" });
    const flour = server.seed({ name: "Farine", listId: CUPBOARD, quantity: "0" });
    const first = await round(server, [], null);
    expect(first.stock.map((item) => item.name)).toEqual(["Œufs", "Riz"]);
    await server.updateInventoryItem(1, FRIDGE, eggs, { quantity: "0" });
    await server.deleteInventoryItem(1, CUPBOARD, rice);
    await server.updateInventoryItem(1, CUPBOARD, flour, { quantity: "1 kg" });
    server.calls = [];
    const result = await round(server, first.stock, first.base);
    expect(server.calls).toEqual([]);
    expect(result.stock.map((item) => item.name)).toEqual(["Farine"]);
    expect(result.out.map((item) => item.name)).toEqual(["Œufs"]);
  });

  it("restocks a used-up Pantry product when the same food is added on this device", async () => {
    const server = new FakePantry();
    const id = server.seed({ name: "Lait", listId: FRIDGE, quantity: "0" });
    const first = await round(server, [], null);
    expect(first.out).toHaveLength(1);
    const result = await round(server, [stock({ name: "lait", quantity: "1 l" })], first.base);
    expect(server.items.get(id)).toMatchObject({ quantity: "1 l", stockStatus: "ok" });
    expect(server.calls.filter((call) => call.startsWith("add"))).toEqual([]);
    expect(result.stock[0].pantry?.itemId).toBe(id);
  });

  it("moves products between inventories and keeps the place when two places share one", async () => {
    const server = new FakePantry();
    const id = server.seed({ name: "Petits pois", listId: CUPBOARD, quantity: "1" });
    const first = await round(server, [], null);
    expect(first.stock[0].location).toBe("cupboard");
    const frozen = await round(server, first.stock.map((item) => ({ ...item, location: "freezer" as const })), first.base);
    expect(server.calls.filter((call) => call.startsWith("patch"))).toEqual([]);
    expect(frozen.stock[0].location).toBe("freezer");
    const fridge = await round(server, frozen.stock.map((item) => ({ ...item, location: "fridge" as const })), frozen.base);
    expect(server.items.get(id)?.listId).toBe(FRIDGE);
    expect(fridge.stock[0]).toMatchObject({ location: "fridge", pantry: { listId: FRIDGE } });
  });

  it("tracks level items without inventing quantities", async () => {
    const server = new FakePantry();
    const id = server.seed({ name: "Sel", listId: CUPBOARD, stockMode: "level", stockLevel: "full", quantity: "1 paquet" });
    const first = await round(server, [], null);
    expect(first.stock[0]).toMatchObject({ quantity: "", pantry: { level: "full" } });
    const low = await round(server, first.stock.map((item) => ({ ...item, pantry: { ...item.pantry!, level: "low" as const } })), first.base);
    expect(server.items.get(id)).toMatchObject({ stockLevel: "low", quantity: "1 paquet" });
    expect(low.stock[0].pantry).toMatchObject({ level: "low", low: true });
    await round(server, [], low.base);
    expect(server.items.get(id)?.stockLevel).toBe("out");
  });

  it("keeps the Pantry version of read-only inventories and never uploads into them", async () => {
    const server = new FakePantry();
    server.seed({ name: "Café", listId: CUPBOARD, quantity: "1" });
    const first = await round(server, [], null, config(false));
    const result = await round(server, [
      { ...first.stock[0], quantity: "5" },
      stock({ name: "Thé", location: "cupboard" }),
    ], first.base, config(false));
    expect(server.calls).toEqual([]);
    expect(result.stock.map(({ name, quantity, pantry }) => ({ name, quantity, linked: Boolean(pantry) }))).toEqual([
      { name: "Café", quantity: "1", linked: true },
      { name: "Thé", quantity: "", linked: false },
    ]);
    expect(result.rejected).toBe(1);
  });

  it("keeps the server version when Pantry refuses a change and stops on network errors", async () => {
    const server = new FakePantry();
    server.seed({ name: "Pain", listId: FRIDGE, quantity: "1" });
    const first = await round(server, [], null);
    server.refuse.add("patch");
    const refused = await round(server, first.stock.map((item) => ({ ...item, quantity: "2" })), first.base);
    expect(refused.stock[0].quantity).toBe("1");
    expect(refused.rejected).toBe(1);
    const offline = { ...server, inventoryItems: async () => { throw new PantryError("network"); } } as unknown as FakePantry;
    await expect(round(offline, first.stock, first.base)).rejects.toMatchObject({ code: "network" });
  });

  it("does not read a wiped stock as everything used up", async () => {
    const server = new FakePantry();
    ["Lait", "Œufs", "Beurre"].forEach((name) => server.seed({ name, listId: FRIDGE, quantity: "1" }));
    const first = await round(server, [], null);
    const restored = await round(server, [stock({ name: "Lait", quantity: "1" })], first.base);
    expect([...server.items.values()].every((item) => item.stockStatus === "ok")).toBe(true);
    expect(restored.stock.map((item) => item.name).sort()).toEqual(["Beurre", "Lait", "Œufs"]);
    expect(server.calls.filter((call) => call.startsWith("add"))).toEqual([]);
  });

  it("drops duplicate rows linked to one Pantry product and recreates products edited after a remote removal", async () => {
    const server = new FakePantry();
    const id = server.seed({ name: "Jambon", listId: FRIDGE, quantity: "4" });
    const first = await round(server, [], null);
    const twice = await round(server, [first.stock[0], { ...first.stock[0], id: "copy" }], first.base);
    expect(twice.stock).toHaveLength(1);
    await server.deleteInventoryItem(1, FRIDGE, id);
    const edited = await round(server, twice.stock.map((item) => ({ ...item, quantity: "2" })), twice.base);
    expect(server.calls).toContain("add Jambon");
    expect(edited.stock[0]).toMatchObject({ quantity: "2" });
    expect(edited.stock[0].pantry?.itemId).not.toBe(id);
  });
});

describe("applying a finished round", () => {
  it("keeps edits and additions made while the round was running", () => {
    const sent = [stock({ name: "A" }), stock({ name: "B" }), stock({ name: "C" })];
    const result = [
      { ...sent[0], pantry: { itemId: 1, listId: FRIDGE } },
      { ...sent[1], pantry: { itemId: 2, listId: FRIDGE } },
      stock({ id: "remote", name: "D", pantry: { itemId: 4, listId: FRIDGE } }),
    ];
    const current = [sent[0], { ...sent[1], quantity: "3" }, stock({ name: "E" })];
    expect(applyInventorySync(sent, current, result)).toEqual([
      result[0],
      { ...current[1], pantry: { itemId: 2, listId: FRIDGE } },
      current[2],
      result[2],
    ]);
  });
});

describe("choosing inventories", () => {
  it("preselects existing inventories named like each place, in any supported language", () => {
    const inventories = [{ id: 1, name: "Kühlschrank" }, { id: 2, name: "Garde-manger" }, { id: 3, name: "Bar" }];
    expect(suggestInventory("fridge", inventories)).toBe(1);
    expect(suggestInventory("cupboard", inventories)).toBe(2);
    expect(suggestInventory("freezer", inventories)).toBe("new");
    expect(suggestInventory("freezer", [{ id: 4, name: "Big freezer" }])).toBe(4);
  });
});
