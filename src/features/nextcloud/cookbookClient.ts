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
  private readonly username: string;
  private readonly authorization: string;

  constructor(credentials: NextcloudCredentials) {
    this.serverUrl = normalizeNextcloudUrl(credentials.serverUrl);
    this.username = credentials.username.trim();
    this.authorization = `Basic ${base64Encode(
      `${this.username}:${credentials.appPassword.replace(/\s+/g, "")}`
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
    const recipes = await this.request<RecipeStub[]>(
      "/apps/cookbook/api/v1/recipes"
    );
    return recipes.map((recipe) => this.normalizeRecipeImageUrls(recipe));
  }

  async getRecipe(id: string) {
    const recipe = await this.request<Recipe>(
      `/apps/cookbook/api/v1/recipes/${encodeURIComponent(id)}`
    );
    return this.normalizeRecipeImageUrls(recipe);
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
    const recipe = await this.request<Recipe>("/apps/cookbook/api/v1/import", {
      method: "POST",
      body: JSON.stringify({ url })
    });
    return this.normalizeRecipeImageUrls(recipe);
  }

  normalizeRecipeImageUrls<T extends Partial<Recipe>>(recipe: T): T {
    return {
      ...recipe,
      image: this.resolveServerUrl(recipe.image),
      imageUrl: this.resolveServerUrl(recipe.imageUrl),
      imagePlaceholderUrl: this.resolveServerUrl(recipe.imagePlaceholderUrl)
    };
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

  async uploadRecipeImage(localUri: string) {
    const { File } = await import("expo-file-system");
    const localFile = new File(localUri);
    const remotePath = `/AvoCook Images/${getSafeRemoteImageFilename(localUri)}`;
    await this.ensureWebDavDirectory("/AvoCook Images");
    await this.rawRequest(this.getWebDavPath(remotePath), {
      method: "PUT",
      body: await localFile.arrayBuffer(),
      headers: {
        "Content-Type": getImageMimeType(remotePath)
      }
    });
    return remotePath;
  }

  async deleteCookbookRecipeImages(recipeName: string) {
    const recipeFolderPath = await this.getCookbookRecipeFolderPath(recipeName);
    await Promise.all(
      ["full.jpg", "thumb.jpg", "thumb16.jpg"].map((filename) =>
        this.deleteWebDavFile(`${recipeFolderPath}/${filename}`)
      )
    );
  }

  async deleteWebDavFile(path: string) {
    try {
      await this.rawRequest(this.getWebDavPath(path), { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof CookbookApiError) || error.status !== 404) {
        throw error;
      }
    }
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

  private async rawRequest(path: string, options: RequestOptions = {}) {
    const headers = new Headers(options.headers);
    headers.set("Authorization", this.authorization);

    const response = await fetch(`${this.serverUrl}${path}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new CookbookApiError(
        `Nextcloud returned ${response.status}`,
        response.status,
        await response.text().catch(() => "")
      );
    }

    return response;
  }

  private async ensureWebDavDirectory(path: string) {
    try {
      await this.rawRequest(this.getWebDavPath(path), { method: "MKCOL" });
    } catch (error) {
      if (!(error instanceof CookbookApiError) || error.status !== 405) {
        throw error;
      }
    }
  }

  private async getCookbookRecipeFolderPath(recipeName: string) {
    const config = await this.getConfig().catch(
      (): Partial<CookbookConfig> => ({})
    );
    const cookbookFolder = normalizeWebDavPath(config.folder || "/Recipes");
    return `${cookbookFolder}/${getSafeCookbookRecipeFolderName(recipeName)}`;
  }

  private getWebDavPath(path: string) {
    const encodedPath = normalizeWebDavPath(path)
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
    return `/remote.php/dav/files/${encodeURIComponent(this.username)}/${encodedPath}`;
  }

  private resolveServerUrl(value: unknown) {
    if (typeof value !== "string" || !value) {
      return value;
    }

    if (/^(?:https?:|file:|data:)/i.test(value)) {
      return value;
    }

    if (value.startsWith("/apps/cookbook/")) {
      return `${this.serverUrl}${value}`;
    }

    return value;
  }
}

function normalizeWebDavPath(path: string) {
  const normalized = path.trim().replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}` : "";
}

function getSafeRemoteImageFilename(uri: string) {
  const withoutQuery = uri.split("?")[0] ?? uri;
  const rawName = decodeURIComponent(withoutQuery.split("/").pop() || "image.jpg");
  const safeName = rawName
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  const extension = getImageExtension(safeName);
  const baseName = safeName.replace(/\.[^.]+$/, "") || "image";
  return `${baseName}.${extension}`;
}

function getSafeCookbookRecipeFolderName(recipeName: string) {
  const safeName = recipeName.replace(/[\\/:?!"'|&^#]/g, "_");
  return safeName.length > 100 ? `${safeName.slice(0, 97)}___` : safeName;
}

function getImageExtension(value: string) {
  const extension = value.split(".").pop()?.toLowerCase();
  if (extension && ["jpg", "jpeg", "png", "webp", "heic"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }
  return "jpg";
}

function getImageMimeType(value: string) {
  switch (getImageExtension(value)) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    default:
      return "image/jpeg";
  }
}

async function safeJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  return JSON.parse(text) as unknown;
}
