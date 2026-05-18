import { base64Encode } from "../../utils/base64";
import { normalizeNextcloudUrl } from "../../utils/url";
import {
  toCookbookCreateRecipe,
  type Category,
  type Keyword,
  type Recipe,
  type RecipeStub
} from "../recipes/types";

export type NextcloudCredentials = {
  serverUrl: string;
  username: string;
  appPassword: string;
};

export type CookbookConfig = {
  folder?: string;
  update_interval?: number;
  print_image?: boolean;
  visibleInfoBlocks?: Record<string, boolean>;
};

type RequestOptions = RequestInit & {
  ocs?: boolean;
};

type OcsResponse<T> = {
  ocs?: {
    meta?: {
      status?: string;
      statuscode?: number;
      message?: string;
    };
    data?: T;
  };
};

export type NextcloudUser = {
  id?: string;
  displayname?: string;
  email?: string;
};

export class CookbookApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown
  ) {
    super(message);
    this.name = "CookbookApiError";
  }
}

export class CookbookClient {
  private readonly serverUrl: string;
  private readonly authorization: string;

  constructor(credentials: NextcloudCredentials) {
    this.serverUrl = normalizeNextcloudUrl(credentials.serverUrl);
    this.authorization = `Basic ${base64Encode(
      `${credentials.username}:${credentials.appPassword.replace(/\s+/g, "")}`
    )}`;
  }

  getRecipeImageUrl(id: string, size: "full" | "thumb" | "thumb16" = "thumb") {
    return `${this.serverUrl}/apps/cookbook/api/v1/recipes/${encodeURIComponent(
      id
    )}/image?size=${size}`;
  }

  getImageHeaders() {
    return {
      Authorization: this.authorization
    };
  }

  async getCapabilities() {
    return this.request<unknown>("/ocs/v2.php/cloud/capabilities?format=json", {
      ocs: true
    });
  }

  async getCurrentUser() {
    const payload = await this.request<OcsResponse<NextcloudUser>>(
      "/ocs/v2.php/cloud/user?format=json",
      {
        ocs: true
      }
    );
    const meta = payload.ocs?.meta;
    const statusOk =
      meta?.status?.toLowerCase() === "ok" ||
      meta?.statuscode === 100 ||
      meta?.statuscode === 200;

    if (!statusOk || !payload.ocs?.data) {
      throw new CookbookApiError(
        meta?.message || "Invalid Nextcloud credentials",
        meta?.statuscode ?? 401,
        payload
      );
    }

    return payload.ocs.data;
  }

  async validateConnection() {
    try {
      const user = await this.getCurrentUser();
      await this.listRecipes();
      return user;
    } catch (userError) {
      try {
        await this.listRecipes();
        return null;
      } catch (cookbookError) {
        throw cookbookError instanceof Error ? cookbookError : userError;
      }
    }
  }

  async getApiVersion() {
    return this.request<unknown>("/apps/cookbook/api/version");
  }

  async listRecipes() {
    return this.request<RecipeStub[]>("/apps/cookbook/api/v1/recipes");
  }

  async getRecipe(id: string) {
    return this.request<Recipe>(
      `/apps/cookbook/api/v1/recipes/${encodeURIComponent(id)}`
    );
  }

  async createRecipe(recipe: Recipe) {
    return this.request<number | string>("/apps/cookbook/api/v1/recipes", {
      method: "POST",
      body: JSON.stringify(toCookbookCreateRecipe(recipe))
    });
  }

  async updateRecipe(recipe: Recipe) {
    if (!recipe.id) {
      throw new Error("Recipe id is required for update");
    }
    return this.request<number | string>(
      `/apps/cookbook/api/v1/recipes/${encodeURIComponent(recipe.id)}`,
      {
        method: "PUT",
        body: JSON.stringify(recipe)
      }
    );
  }

  async deleteRecipe(id: string) {
    return this.request<string>(
      `/apps/cookbook/api/v1/recipes/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );
  }

  async importRecipe(url: string) {
    return this.request<Recipe>("/apps/cookbook/api/v1/import", {
      method: "POST",
      body: JSON.stringify({ url })
    });
  }

  async listCategories() {
    return this.request<Category[]>("/apps/cookbook/api/v1/categories");
  }

  async listKeywords() {
    return this.request<Keyword[]>("/apps/cookbook/api/v1/keywords");
  }

  async reindex() {
    return this.request<string>("/apps/cookbook/api/v1/reindex", {
      method: "POST"
    });
  }

  async getConfig() {
    return this.request<CookbookConfig>("/apps/cookbook/api/v1/config");
  }

  async setConfig(config: CookbookConfig) {
    return this.request<string>("/apps/cookbook/api/v1/config", {
      method: "POST",
      body: JSON.stringify(config)
    });
  }

  private async request<T>(path: string, options: RequestOptions = {}) {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    headers.set("Authorization", this.authorization);

    if (options.ocs) {
      headers.set("OCS-APIRequest", "true");
    }

    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${this.serverUrl}${path}`, {
      ...options,
      headers
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await safeJson(response)
      : await response.text();

    if (!response.ok) {
      throw new CookbookApiError(
        `Cookbook API returned ${response.status}`,
        response.status,
        payload
      );
    }

    return payload as T;
  }
}

async function safeJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  return JSON.parse(text) as unknown;
}
