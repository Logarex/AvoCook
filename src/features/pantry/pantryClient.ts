import { base64Encode } from "../../utils/base64";
import { normalizeNextcloudUrl } from "../../utils/url";
import type { NextcloudCredentials } from "../nextcloud/cookbookClient";

export type PantryHouse = { id: number; name: string; isAdmin?: boolean; permissions?: Record<string, boolean> };
export type PantryList = { id: number; houseId: number; name: string; canEdit?: boolean; sharedOnly?: boolean };
export type PantryItem = {
  id: number;
  listId: number;
  name: string;
  quantity: string | null;
  description: string | null;
  done: boolean;
  categoryId?: number | null;
  sortOrder?: number;
  rrule?: string | null;
  deleteOnDone?: boolean;
  repeatFromCompletion?: boolean;
  deletedAt?: number | null;
  archivedAt?: number | null;
};
export type PantryCategory = { id: number; houseId: number; listId?: number | null; name: string };
export type PantryItemPatch = { name?: string; quantity?: string; description?: string; categoryId?: number; rrule?: string; repeatFromCompletion?: boolean; deleteOnDone?: boolean };
export type PantryErrorCode = "auth" | "forbidden" | "unavailable" | "network" | "invalid" | "server";

export class PantryError extends Error {
  constructor(readonly code: PantryErrorCode) {
    super(`Pantry: ${code}`);
    this.name = "PantryError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function isId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
export function isPantryHouse(value: unknown): value is PantryHouse {
  return isRecord(value) && isId(value.id) && typeof value.name === "string" &&
    (value.isAdmin === undefined || typeof value.isAdmin === "boolean") &&
    (value.permissions === undefined || (isRecord(value.permissions) && Object.values(value.permissions).every((entry) => typeof entry === "boolean")));
}
export function isPantryList(value: unknown): value is PantryList {
  return isRecord(value) && isId(value.houseId) &&
    (value.canEdit === undefined || typeof value.canEdit === "boolean") &&
    (value.sharedOnly === undefined || typeof value.sharedOnly === "boolean") && isPantryHouse(value);
}
export function isPantryItem(value: unknown): value is PantryItem {
  return isRecord(value) && isId(value.listId) &&
    typeof value.done === "boolean" &&
    (value.quantity === null || typeof value.quantity === "string") &&
    (value.description === null || typeof value.description === "string") && isPantryHouse(value);
}
function requireShape<T>(value: unknown, guard: (value: unknown) => value is T): T {
  if (!guard(value)) throw new PantryError("invalid");
  return value;
}
function statusError(status: number): PantryError {
  return new PantryError(status === 401 || status === 997 ? "auth" :
    status === 403 || status === 104 ? "forbidden" :
      status === 404 || status === 998 ? "unavailable" : "server");
}
function pathId(id: number) {
  if (!isId(id)) throw new PantryError("invalid");
  return String(id);
}

export class PantryClient {
  private readonly baseUrl: string;
  private readonly authorization: string;
  private readonly requests = new Set<AbortController>();
  private disposed = false;

  constructor(credentials: NextcloudCredentials) {
    this.baseUrl = `${normalizeNextcloudUrl(credentials.serverUrl)}/ocs/v2.php/apps/pantry/api`;
    this.authorization = `Basic ${base64Encode(`${credentials.username}:${credentials.appPassword}`)}`;
  }

  dispose() {
    this.disposed = true;
    this.requests.forEach((controller) => controller.abort());
  }

  private async request(path: string, method = "GET", body?: object): Promise<unknown> {
    if (this.disposed) throw new PantryError("network");
    const controller = new AbortController();
    this.requests.add(controller);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${this.baseUrl}${path}${path.includes("?") ? "&" : "?"}format=json`, {
        method,
        headers: {
          Authorization: this.authorization,
          "OCS-APIRequest": "true",
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
        redirect: "error"
      });
      if (!response.ok) throw statusError(response.status);
      let payload: unknown;
      try { payload = await response.json(); } catch { throw new PantryError("invalid"); }
      if (!isRecord(payload) || !isRecord(payload.ocs) || !isRecord(payload.ocs.meta)) {
        throw new PantryError("invalid");
      }
      const { meta, data } = payload.ocs;
      const status = Number(meta.statuscode);
      if (meta.status === "failure" || !(status === 100 || (status >= 200 && status < 300))) {
        throw statusError(status);
      }
      return data;
    } catch (error) {
      if (error instanceof PantryError) throw error;
      throw new PantryError("network");
    } finally {
      clearTimeout(timeout);
      this.requests.delete(controller);
    }
  }

  private async all<T extends { id: number }>(path: string, guard: (value: unknown) => value is T): Promise<T[]> {
    const result: T[] = [];
    const seen = new Set<number>();
    const limit = 100;
    for (let offset = 0; offset < 100000; offset += limit) {
      const data = await this.request(`${path}?limit=${limit}&offset=${offset}`);
      if (!Array.isArray(data)) throw new PantryError("invalid");
      const page = data.map((value) => requireShape(value, guard));
      let added = 0;
      for (const item of page) {
        if (!seen.has(item.id)) { result.push(item); seen.add(item.id); added++; }
      }
      if (page.length < limit) return result;
      if (!added) throw new PantryError("invalid");
    }
    throw new PantryError("invalid");
  }

  houses() { return this.all("/houses", isPantryHouse); }
  async house(houseId: number) {
    const house = requireShape(await this.request(`/houses/${pathId(houseId)}`), isPantryHouse);
    if (house.id !== houseId) throw new PantryError("invalid");
    return house;
  }
  lists(houseId: number) { return this.all(`/houses/${pathId(houseId)}/lists`, isPantryList); }
  async list(houseId: number, listId: number) {
    const list = requireShape(await this.request(this.listPath(houseId, listId)), isPantryList);
    if (list.houseId !== houseId || list.id !== listId) throw new PantryError("invalid");
    return list;
  }
  async items(houseId: number, listId: number) {
    const items = await this.all(`${this.listPath(houseId, listId)}/items`, isPantryItem);
    if (items.some((item) => item.listId !== listId)) throw new PantryError("invalid");
    return items.filter((item) => !item.deletedAt && !item.archivedAt);
  }
  async createList(houseId: number, name: string) {
    const list = requireShape(await this.request(`/houses/${pathId(houseId)}/lists`, "POST", { name: name.trim() }), isPantryList);
    if (list.houseId !== houseId) throw new PantryError("invalid");
    return list;
  }
  async addItem(houseId: number, listId: number, name: string, description?: string) {
    return this.itemResult(await this.request(`${this.listPath(houseId, listId)}/items`, "POST", {
      name: name.trim(), ...(description ? { description } : {}),
      rrule: "", repeatFromCompletion: false, deleteOnDone: false
    }), listId);
  }
  async categories(houseId: number) {
    return this.all(`/houses/${pathId(houseId)}/categories`, (value): value is PantryCategory => isRecord(value) && isId(value.houseId) && isPantryHouse(value));
  }
  async updateItem(houseId: number, listId: number, itemId: number, patch: PantryItemPatch) {
    return this.itemResult(await this.request(`${this.listPath(houseId, listId)}/items/${pathId(itemId)}`, "PATCH", patch), listId, itemId);
  }
  async reorderItems(houseId: number, listId: number, itemIds: number[]) {
    await this.request(`${this.listPath(houseId, listId)}/items/reorder`, "POST", {
      items: itemIds.map((id, sortOrder) => ({ id, sortOrder }))
    });
  }
  async renameItem(houseId: number, listId: number, itemId: number, name: string) {
    return this.itemResult(await this.request(`${this.listPath(houseId, listId)}/items/${pathId(itemId)}`, "PATCH", { name: name.trim() }), listId, itemId);
  }
  async toggleItem(houseId: number, listId: number, itemId: number) {
    return this.itemResult(await this.request(`${this.listPath(houseId, listId)}/items/${pathId(itemId)}/toggle`, "POST"), listId, itemId);
  }
  async deleteItem(houseId: number, listId: number, itemId: number) {
    await this.request(`${this.listPath(houseId, listId)}/items/${pathId(itemId)}`, "DELETE");
  }
  private itemResult(data: unknown, listId: number, itemId?: number) {
    const item = requireShape(data, isPantryItem);
    if (item.listId !== listId || (itemId !== undefined && item.id !== itemId)) throw new PantryError("invalid");
    return item;
  }
  private listPath(houseId: number, listId: number) {
    return `/houses/${pathId(houseId)}/lists/${pathId(listId)}`;
  }
}
