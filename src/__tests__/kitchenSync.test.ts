import { describe, expect, it, vi } from "vitest";
import { emptyKitchen, type KitchenData, type Meal, type StockItem } from "../features/kitchen/kitchen";
import {
  applySyncedKitchen,
  KITCHEN_SYNC_PATH,
  mergeSyncedKitchen,
  parseKitchenSyncDocument,
  syncedPart,
  syncKitchenWithRemote,
} from "../features/kitchen/kitchenSync";

const stock = (id: string, patch: Partial<StockItem> = {}): StockItem => ({ id, name: id, quantity: "", location: "fridge", expires: "", ...patch });
const meal = (id: string, patch: Partial<Meal> = {}): Meal => ({ id, date: "2026-11-02", slot: "dinner", recipeId: "r1", servings: 2, ...patch });
const kitchen = (patch: Partial<KitchenData> = {}): KitchenData => ({ ...emptyKitchen(), ...patch });

describe("three-way merge of My kitchen", () => {
  const base = syncedPart(kitchen({ stock: [stock("milk", { quantity: "1 l" }), stock("eggs")], meals: [meal("m1")] }));

  it("keeps independent edits from both devices", () => {
    const local = syncedPart(kitchen({ stock: [stock("milk", { quantity: "50 cl" }), stock("eggs"), stock("butter")], meals: [meal("m1")] }));
    const remote = syncedPart(kitchen({ stock: [stock("milk", { quantity: "1 l", expires: "2026-11-09" })], meals: [meal("m1", { servings: 4 }), meal("m2")] }));
    const merged = mergeSyncedKitchen(base, local, remote);
    expect(merged.stock).toEqual([
      stock("milk", { quantity: "50 cl", expires: "2026-11-09" }),
      stock("butter"),
    ]);
    expect(merged.meals).toEqual([meal("m1", { servings: 4 }), meal("m2")]);
  });

  it("lets this device win a real conflict and merges journals field by field", () => {
    const journal = { rating: 0, notes: "", changes: "", difficulty: "" as const, cost: "", cooked: [] };
    const b = { ...base, journals: { r1: journal } };
    const local = { ...b, journals: { r1: { ...journal, rating: 5, notes: "local" } } };
    const remote = { ...b, journals: { r1: { ...journal, notes: "remote", cost: "8 €" } } };
    expect(mergeSyncedKitchen(b, local, remote).journals.r1).toEqual({ ...journal, rating: 5, notes: "local", cost: "8 €" });
  });

  it("never syncs running timers, reminders or the shopping group", () => {
    const data = kitchen({
      shoppingGroupId: "group",
      remindersEnabled: false,
      journals: { r1: { rating: 1, notes: "", changes: "", difficulty: "", cost: "", cooked: [], stepTimerStates: { "step-0": { durationSeconds: 60, remainingSeconds: 10, running: false } } } },
    });
    const part = syncedPart(data);
    expect(part).not.toHaveProperty("shoppingGroupId");
    expect(part).not.toHaveProperty("remindersEnabled");
    expect(part.journals.r1).not.toHaveProperty("stepTimerStates");
    const applied = applySyncedKitchen(data, { ...part, excludedWords: "coriandre" });
    expect(applied.journals.r1.stepTimerStates).toEqual(data.journals.r1.stepTimerStates);
    expect(applied.shoppingGroupId).toBe("group");
    expect(applied.remindersEnabled).toBe(false);
    expect(applied.excludedWords).toBe("coriandre");
  });
});

describe("Nextcloud round trip", () => {
  const remote = (initial: unknown) => {
    let stored = initial;
    return {
      getJsonWebDav: vi.fn(async (_path: string): Promise<unknown> => stored ?? null),
      putJsonWebDav: vi.fn(async (_path: string, data: unknown) => { stored = JSON.parse(JSON.stringify(data)); }),
      read: () => stored,
    };
  };

  it("uploads the first device and lets a second device pick it up", async () => {
    const server = remote(null);
    const phone = syncedPart(kitchen({ stock: [stock("milk")] }));
    const first = await syncKitchenWithRemote(server, phone, null, new Date("2026-11-01T10:00:00Z"));
    expect(first.uploaded).toBe(true);
    expect(server.putJsonWebDav).toHaveBeenCalledWith(KITCHEN_SYNC_PATH, expect.objectContaining({ app: "AvoCook", schema: 1 }));
    const tablet = await syncKitchenWithRemote(server, syncedPart(kitchen()), null);
    expect(tablet.merged.stock).toEqual([stock("milk")]);
    expect(tablet.downloaded).toBe(true);
    expect(tablet.uploaded).toBe(false);
  });

  it("propagates a deletion made on another device", async () => {
    const base = syncedPart(kitchen({ stock: [stock("milk"), stock("eggs")] }));
    const server = remote({ app: "AvoCook", schema: 1, updatedAt: "", kitchen: syncedPart(kitchen({ stock: [stock("eggs")] })) });
    const result = await syncKitchenWithRemote(server, base, base);
    expect(result.merged.stock).toEqual([stock("eggs")]);
    expect(result.uploaded).toBe(false);
  });

  it("refuses damaged or foreign files instead of overwriting the device", async () => {
    expect(() => parseKitchenSyncDocument({ app: "Other", schema: 1, kitchen: {} })).toThrow();
    expect(() => parseKitchenSyncDocument({ app: "AvoCook", schema: 1, kitchen: { meals: "x", stock: [], journals: {} } })).toThrow();
    const server = remote({ app: "AvoCook", schema: 2, kitchen: {} });
    await expect(syncKitchenWithRemote(server, syncedPart(kitchen()), null)).rejects.toThrow();
    expect(server.putJsonWebDav).not.toHaveBeenCalled();
  });
});
