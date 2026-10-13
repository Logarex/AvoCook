import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PantryClient } from "../features/pantry/pantryClient";

const credentials = { serverUrl: "https://cloud.example/nextcloud/index.php/", username: "élise", appPassword: "app-password" };
const house = { id: 1, name: "Home" };
const list = { id: 2, houseId: 1, name: "Groceries", canEdit: true };
const item = { id: 3, listId: 2, name: "Tomatoes", quantity: "500 g", description: null, done: false };
const fetchMock = vi.fn<typeof fetch>();
const ocs = (data: unknown, statuscode = 200) => new Response(JSON.stringify({ ocs: { meta: { status: "ok", statuscode }, data } }), { status: 200 });
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Pantry OCS client", () => {
  it("uses authenticated OCS JSON requests and preserves Nextcloud subdirectories", async () => {
    fetchMock.mockResolvedValueOnce(ocs([house], 100));
    expect(await new PantryClient(credentials).houses()).toEqual([house]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://cloud.example/nextcloud/ocs/v2.php/apps/pantry/api/houses?limit=100&offset=0&format=json");
    expect(options).toMatchObject({ method: "GET", redirect: "error", headers: { "OCS-APIRequest": "true", Accept: "application/json", Authorization: `Basic ${Buffer.from("élise:app-password").toString("base64")}` } });
  });
  it("loads every page, preserving order and omitting archived/deleted items", async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => ({ ...item, id: i + 1 }));
    fetchMock.mockResolvedValueOnce(ocs(firstPage)).mockResolvedValueOnce(ocs([
      { ...item, id: 101 }, { ...item, id: 102, deletedAt: 123 }, { ...item, id: 103, archivedAt: 123 }
    ]));
    const items = await new PantryClient(credentials).items(1, 2);
    expect(items).toHaveLength(101);
    expect(items.at(-1)?.id).toBe(101);
    expect(fetchMock.mock.calls[1][0]).toContain("offset=100");
  });
  it("rejects a server that ignores pagination instead of returning a truncated list", async () => {
    fetchMock.mockImplementation(async () => ocs(Array.from({ length: 100 }, (_, i) => ({ ...house, id: i + 1 }))));
    await expect(new PantryClient(credentials).houses()).rejects.toMatchObject({ code: "invalid" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it.each([[401, "auth"], [403, "forbidden"], [404, "unavailable"], [500, "server"]])("handles HTTP %s without exposing server content", async (status, code) => {
    fetchMock.mockResolvedValueOnce(new Response("private server details", { status: Number(status) }));
    await expect(new PantryClient(credentials).houses()).rejects.toMatchObject({ code, message: `Pantry: ${code}` });
  });
  it.each([[997, "auth"], [104, "forbidden"], [998, "unavailable"], [500, "server"]])("handles OCS error %s inside HTTP 200", async (status, code) => {
    fetchMock.mockResolvedValueOnce(ocs([], Number(status)));
    await expect(new PantryClient(credentials).houses()).rejects.toMatchObject({ code });
  });
  it.each([
    {}, { ocs: { data: [] } }, { ocs: { meta: { statuscode: 200 }, data: { houses: [] } } },
    { ocs: { meta: { statuscode: 200 }, data: [{ id: "1", name: "Home" }] } },
    { ocs: { meta: { statuscode: 200 }, data: [{ id: 1, name: "Home", permissions: { canAddItems: "true" } }] } }
  ])("rejects malformed responses", async (payload) => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(payload)));
    await expect(new PantryClient(credentials).houses()).rejects.toMatchObject({ code: "invalid" });
  });
  it("rejects HTML login pages", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>Sign in</html>"));
    await expect(new PantryClient(credentials).houses()).rejects.toMatchObject({ code: "invalid" });
  });
  it("does not accept a list or item belonging to a different destination", async () => {
    const client = new PantryClient(credentials);
    fetchMock.mockResolvedValueOnce(ocs({ ...list, houseId: 9 })).mockResolvedValueOnce(ocs([{ ...item, listId: 9 }]));
    await expect(client.list(1, 2)).rejects.toMatchObject({ code: "invalid" });
    await expect(client.items(1, 2)).rejects.toMatchObject({ code: "invalid" });
  });
  it("uses documented write endpoints and sends only intended fields", async () => {
    const client = new PantryClient(credentials);
    fetchMock.mockResolvedValueOnce(ocs(list)).mockResolvedValueOnce(ocs(item))
      .mockResolvedValueOnce(ocs({ ...item, name: "Cherry tomatoes" }))
      .mockResolvedValueOnce(ocs({ ...item, done: true })).mockResolvedValueOnce(ocs({ success: true }));
    await client.createList(1, " Groceries ");
    await client.addItem(1, 2, " Tomatoes ", "Pasta");
    await client.renameItem(1, 2, 3, " Cherry tomatoes ");
    expect((await client.toggleItem(1, 2, 3)).done).toBe(true);
    await client.deleteItem(1, 2, 3);
    expect(fetchMock.mock.calls.map(([url, options]) => [new URL(String(url)).pathname, options?.method, options?.body ? JSON.parse(String(options.body)) : undefined])).toEqual([
      ["/nextcloud/ocs/v2.php/apps/pantry/api/houses/1/lists", "POST", { name: "Groceries" }],
      ["/nextcloud/ocs/v2.php/apps/pantry/api/houses/1/lists/2/items", "POST", { name: "Tomatoes", description: "Pasta", rrule: "", repeatFromCompletion: false, deleteOnDone: false }],
      ["/nextcloud/ocs/v2.php/apps/pantry/api/houses/1/lists/2/items/3", "PATCH", { name: "Cherry tomatoes" }],
      ["/nextcloud/ocs/v2.php/apps/pantry/api/houses/1/lists/2/items/3/toggle", "POST", undefined],
      ["/nextcloud/ocs/v2.php/apps/pantry/api/houses/1/lists/2/items/3", "DELETE", undefined]
    ]);
  });
  it("uses Pantry category, partial-edit and reorder routes without overwriting other fields", async () => {
    fetchMock.mockResolvedValueOnce(ocs([{ id: 8, houseId: 1, name: "Produce" }]))
      .mockResolvedValueOnce(ocs({ ...item, quantity: "1 kg", categoryId: 8 }))
      .mockResolvedValueOnce(ocs({ success: true }));
    const client = new PantryClient(credentials);
    expect(await client.categories(1)).toEqual([{ id: 8, houseId: 1, name: "Produce" }]);
    await client.updateItem(1, 2, 3, { quantity: "1 kg", categoryId: 8 });
    await client.reorderItems(1, 2, [4, 3]);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ quantity: "1 kg", categoryId: 8 });
    expect(fetchMock.mock.calls[2][0]).toContain("/lists/2/items/reorder");
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({ items: [{ id: 4, sortOrder: 0 }, { id: 3, sortOrder: 1 }] });
  });
  it("times out stalled requests and never retries a write automatically", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new Error("Aborted")));
    }));
    const pending = new PantryClient(credentials).addItem(1, 2, "Milk");
    const assertion = expect(pending).rejects.toMatchObject({ code: "network" });
    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("cancels in-flight requests on account disposal and rejects new requests", async () => {
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new Error("Aborted")));
    }));
    const client = new PantryClient(credentials);
    const pending = client.houses();
    client.dispose();
    await expect(pending).rejects.toMatchObject({ code: "network" });
    await expect(client.houses()).rejects.toMatchObject({ code: "network" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
