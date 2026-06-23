import { base64Encode } from "../../utils/base64";
import { normalizeNextcloudUrl } from "../../utils/url";
import {
  logError,
  logInfo,
  logWarn,
  normalizeLogError
} from "../logging/appLogger";
import { normalizeCookbookImageEndpointReference } from "../recipes/recipeImageReferences";
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
  userId?: string;
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

type WebDavPathStyle = "dav-files" | "webdav";

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
  private readonly appPassword: string;
  private readonly authorization: string;
  private webDavAuthorization: string | null;
  private webDavUserId: string | null;
  private webDavUserIdPromise: Promise<string> | null;
  private webDavPathStyle: WebDavPathStyle | null;

  constructor(credentials: NextcloudCredentials) {
    this.serverUrl = normalizeNextcloudUrl(credentials.serverUrl);
    this.username = credentials.username.trim();
    this.appPassword = credentials.appPassword.replace(/\s+/g, "");
    this.authorization = this.getAuthorizationForUsername(this.username);
    this.webDavAuthorization = null;
    this.webDavUserId = credentials.userId?.trim() || null;
    this.webDavUserIdPromise = null;
    this.webDavPathStyle = null;
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
      // fetch recipes just to make sure the Cookbook app is actually installed
      await this.listRecipes();
      return user;
    } catch (userError) {
      try {
        // sometimes getting user fails but recipes works? fallback to just testing recipes
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
    logInfo("sync", "Recipe image upload started", {
      localUri,
      remotePath
    });
    try {
      const body = await localFile.arrayBuffer();
      await this.putWebDavFileWithAutoMkcol(remotePath, body, {
        "Content-Type": getImageMimeType(remotePath)
      });
      logInfo("sync", "Recipe image upload finished", { remotePath });
    } catch (error) {
      logError("sync", "Recipe image upload failed", {
        localUri,
        remotePath,
        error: normalizeLogError(error)
      });
      throw error;
    }
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
      await this.requestWebDav(path, { method: "DELETE" });
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const signal = options.signal ?? controller.signal;

    try {
      let response = await fetch(`${this.serverUrl}${path}`, {
        ...options,
        credentials: "omit",
        headers,
        signal
      });

      if (response.status === 404 && !this.serverUrl.endsWith("index.php")) {
        const fallbackResponse = await fetch(`${this.serverUrl}/index.php${path}`, {
          ...options,
          credentials: "omit",
          headers,
          signal
        });
        if (
          fallbackResponse.ok ||
          fallbackResponse.status === 401 ||
          fallbackResponse.status === 403
        ) {
          response = fallbackResponse;
        }
      }

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
    } finally {
      clearTimeout(timeout);
    }
  }

  private async rawRequest(
    path: string,
    options: RequestOptions = {},
    authorization = this.authorization
  ) {
    const headers = new Headers(options.headers);
    headers.set("Authorization", authorization);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const signal = options.signal ?? controller.signal;

    try {
      const response = await fetch(`${this.serverUrl}${path}`, {
        ...options,
        credentials: "omit",
        headers,
        signal
      });

      if (!response.ok) {
        throw new CookbookApiError(
          `Nextcloud returned ${response.status}`,
          response.status,
          await response.text().catch(() => "")
        );
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async ensureWebDavDirectory(path: string) {
    try {
      await this.requestWebDav(path, { method: "MKCOL" });
    } catch (error) {
      if (!(error instanceof CookbookApiError) || error.status !== 405) {
        throw error;
      }
    }
  }

  private async putWebDavFileWithAutoMkcol(
    path: string,
    body: BodyInit,
    headers: HeadersInit
  ) {
    try {
      // try to put the file directly. Nextcloud supports auto mkcol
      // but not all endpoints do, so we might need a fallback
      await this.requestWebDav(path, {
        method: "PUT",
        body,
        headers: {
          ...headers,
          "X-NC-WebDAV-AutoMkcol": "1"
        }
      });
      return;
    } catch (error) {
      if (!isMissingWebDavParentError(error)) {
        throw error;
      }

      // fallback: explicit MKCOL if auto failed
      logWarn(
        "sync",
        "WebDAV auto directory creation failed; trying explicit MKCOL",
        {
          path,
          status: error.status
        }
      );
    }

    await this.ensureWebDavDirectory(getWebDavParentPath(path));
    await this.requestWebDav(path, {
      method: "PUT",
      body,
      headers
    });
  }

  private async getCookbookRecipeFolderPath(recipeName: string) {
    const config = await this.getConfig().catch(
      (): Partial<CookbookConfig> => ({})
    );
    const cookbookFolder = normalizeWebDavPath(config.folder || "/Recipes");
    return `${cookbookFolder}/${getSafeCookbookRecipeFolderName(recipeName)}`;
  }

  private async requestWebDav(path: string, options: RequestOptions = {}) {
    let lastError: unknown;
    const styles = this.getWebDavPathStyles();

    for (let styleIndex = 0; styleIndex < styles.length; styleIndex += 1) {
      const style = styles[styleIndex];
      const webDavPath = await this.getWebDavPath(path, style);
      const authorizations = this.getKnownWebDavAuthorizations();
      const triedAuthorizations = new Set<string>();
      let shouldResolveUserAuth = true;

      for (let index = 0; index < authorizations.length; index += 1) {
        const authorization = authorizations[index];
        if (triedAuthorizations.has(authorization)) {
          continue;
        }
        triedAuthorizations.add(authorization);

        try {
          const response = await this.rawRequest(
            webDavPath,
            options,
            authorization
          );
          this.webDavPathStyle = style;
          this.webDavAuthorization = authorization;
          return response;
        } catch (error) {
          if (error instanceof CookbookApiError && error.status === 401) {
            lastError = error;
            if (shouldResolveUserAuth) {
              shouldResolveUserAuth = false;
              const resolvedAuthorization =
                await this.getResolvedUserWebDavAuthorization();
              if (
                resolvedAuthorization &&
                !triedAuthorizations.has(resolvedAuthorization)
              ) {
                // The user id and the login username can differ on Nextcloud
                // (e.g. "john@example.com" login but "john" user id for WebDAV paths).
                // We try the login first, then fall back to the resolved user id.
                logWarn(
                  "sync",
                  "WebDAV auth rejected login; retrying with resolved user id",
                  {
                    path,
                    method: options.method,
                    endpoint: style
                  }
                );
                authorizations.push(resolvedAuthorization);
                continue;
              }
            }
            break;
          }

          if (error instanceof CookbookApiError && error.status === 404) {
            lastError = error;
            break;
          }

          if (error instanceof CookbookApiError && error.status === 405) {
            this.webDavPathStyle = style;
            this.webDavAuthorization = authorization;
          }

          throw error;
        }
      }

      const hasFallbackEndpoint = styleIndex < styles.length - 1;
      logWarn(
        "sync",
        hasFallbackEndpoint
          ? "WebDAV request failed; trying fallback endpoint"
          : "WebDAV request failed",
        {
          path,
          method: options.method,
          status: lastError instanceof CookbookApiError ? lastError.status : null,
          endpoint: style
        }
      );
    }

    throw lastError instanceof Error
      ? lastError
      : new CookbookApiError("Nextcloud WebDAV request failed", 0);
  }

  private getWebDavPathStyles(): WebDavPathStyle[] {
    if (!this.webDavPathStyle) {
      return ["dav-files", "webdav"];
    }

    return this.webDavPathStyle === "dav-files"
      ? ["dav-files", "webdav"]
      : ["webdav", "dav-files"];
  }

  private async getWebDavPath(path: string, style: WebDavPathStyle) {
    const encodedPath = normalizeWebDavPath(path)
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");

    if (style === "webdav") {
      return `/remote.php/webdav/${encodedPath}`;
    }

    const webDavUserId = await this.getWebDavUserId();
    return `/remote.php/dav/files/${encodeURIComponent(webDavUserId)}/${encodedPath}`;
  }

  private async getWebDavUserId() {
    if (this.webDavUserId) {
      return this.webDavUserId;
    }

    this.webDavUserIdPromise ??= this.resolveWebDavUserId();
    return this.webDavUserIdPromise;
  }

  private getKnownWebDavAuthorizations() {
    return Array.from(
      new Set([this.webDavAuthorization, this.authorization].filter(Boolean))
    ) as string[];
  }

  private async getResolvedUserWebDavAuthorization() {
    const webDavUserId = await this.getWebDavUserId();
    const authorization = this.getAuthorizationForUsername(webDavUserId);
    return authorization === this.authorization ? null : authorization;
  }

  private getAuthorizationForUsername(username: string) {
    return `Basic ${base64Encode(`${username}:${this.appPassword}`)}`;
  }

  private async resolveWebDavUserId() {
    try {
      const user = await this.getCurrentUser();
      this.webDavUserId = user.id?.trim() || this.username;
    } catch {
      this.webDavUserId = this.username;
    }

    return this.webDavUserId;
  }

  private resolveServerUrl(value: unknown) {
    if (typeof value !== "string" || !value) {
      return value;
    }

    if (/^(?:https?:|file:|data:)/i.test(value)) {
      return normalizeCookbookImageEndpointReference(value);
    }

    if (value.startsWith("/apps/cookbook/")) {
      return normalizeCookbookImageEndpointReference(`${this.serverUrl}${value}`);
    }

    return value;
  }
}

function normalizeWebDavPath(path: string) {
  const normalized = path.trim().replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}` : "";
}

function getWebDavParentPath(path: string) {
  const normalized = normalizeWebDavPath(path);
  const parentPath = normalized.split("/").slice(0, -1).join("/");
  return parentPath || "/";
}

function isMissingWebDavParentError(
  error: unknown
): error is CookbookApiError {
  return (
    error instanceof CookbookApiError &&
    (error.status === 404 || error.status === 409)
  );
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
