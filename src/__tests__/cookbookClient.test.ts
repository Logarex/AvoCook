import { afterEach, describe, expect, it, vi } from "vitest";
import { CookbookClient } from "../features/nextcloud/cookbookClient";
import { normalizeRecipe } from "../features/recipes/types";
import { base64Encode } from "../utils/base64";

vi.mock("expo-file-system", () => ({
  File: class {
    constructor(readonly uri: string) {}
    arrayBuffer = vi.fn(async () => new ArrayBuffer(4));
  }
}));

describe("CookbookClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    CookbookClient.setCurrent(null);
  });

  it("keeps the active account unchanged while constructing a client for connection validation", () => {
    const active = new CookbookClient({ serverUrl: "https://active.example", username: "user", appPassword: "secret" });
    CookbookClient.setCurrent(active);
    new CookbookClient({ serverUrl: "https://candidate.example", username: "other", appPassword: "wrong" });
    expect(CookbookClient.getCurrent()).toBe(active);
    CookbookClient.setCurrent(null);
    expect(CookbookClient.getCurrent()).toBeNull();
  });

  it.each(["https://cloud.example.com", "http://192.168.1.50:8080/nextcloud"])(
    "only attaches image credentials to Cookbook endpoints on %s",
    (serverUrl) => {
      const client = new CookbookClient({ serverUrl, username: "user", appPassword: "secret" });
      expect(client.getImageHeaders(client.getRecipeImageUrl("42"))?.Authorization)
        .toBe(`Basic ${base64Encode("user:secret")}`);
      expect(client.getImageHeaders(`${serverUrl}/index.php/apps/cookbook/webapp/recipes/42/image?size=full`))
        .toHaveProperty("Authorization");
      for (const uri of [
        "https://attacker.example/apps/cookbook/api/v1/recipes/42/image",
        `${serverUrl}/other?path=/apps/cookbook/api/v1/recipes/42/image`,
        `${serverUrl}/apps/cookbook/api/v1/recipes/42/image/other`,
        `${serverUrl}/photo.jpg`,
        "file:///photo.jpg"
      ]) {
        expect(client.getImageHeaders(uri)).toBeUndefined();
      }
      const url = new URL(client.getRecipeImageUrl("42"));
      url.protocol = url.protocol === "https:" ? "http:" : "https:";
      expect(client.getImageHeaders(url.toString())).toBeUndefined();
      url.protocol = new URL(serverUrl).protocol;
      url.port = "1234";
      expect(client.getImageHeaders(url.toString())).toBeUndefined();
    }
  );

  it.each(["/Recipes/../photo.jpg", "/Recipes/./photo.jpg"])(
    "rejects destructive WebDAV paths containing dot segments: %s",
    async (path) => {
      const fetchMock = vi.spyOn(globalThis, "fetch");
      const client = new CookbookClient({
        serverUrl: "https://cloud.example.com", username: "user", appPassword: "secret", userId: "user"
      });
      await expect(client.deleteWebDavFile(path)).rejects.toThrow("Invalid Nextcloud file path");
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it.each(["https://cloud.example.com", "http://192.168.1.50:8080/nextcloud"])(
    "preserves the POST body and authentication when falling back to index.php on %s",
    async (serverUrl) => {
      const fetchMock = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response("Not found", { status: 404 }))
        .mockResolvedValueOnce(new Response("123", { status: 200, headers: { "Content-Type": "application/json" } }));
      const client = new CookbookClient({ serverUrl, username: "user", appPassword: "secret" });
      expect(await client.createRecipe(normalizeRecipe({ name: "Cake" }))).toBe(123);
      expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
        `${serverUrl}/apps/cookbook/api/v1/recipes`,
        `${serverUrl}/index.php/apps/cookbook/api/v1/recipes`
      ]);
      const [first, fallback] = fetchMock.mock.calls.map(([, options]) => options!);
      expect(fallback.body).toBe(first.body);
      expect(fallback.method).toBe("POST");
      expect(new Headers(fallback.headers).get("Authorization"))
        .toBe(`Basic ${base64Encode("user:secret")}`);
    }
  );

  it("validates an HTTP Nextcloud connection and lists recipes without upgrading the protocol", async () => {
    const serverUrl = "http://192.168.1.50:8080/nextcloud";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const payload = String(url).endsWith("/ocs/v2.php/cloud/user?format=json")
        ? { ocs: { meta: { status: "ok", statuscode: 100 }, data: { id: "reedstrm" } } }
        : [{ id: "123", name: "Chocolate cake" }];
      return new Response(JSON.stringify(payload), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    });
    const client = new CookbookClient({
      serverUrl,
      username: "reedstrm",
      appPassword: "app-password"
    });

    expect(await client.validateConnection()).toEqual({ id: "reedstrm" });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      `${serverUrl}/ocs/v2.php/cloud/user?format=json`,
      `${serverUrl}/apps/cookbook/api/v1/recipes`
    ]);
    for (const [, options] of fetchMock.mock.calls) {
      expect(new Headers(options?.headers).get("Authorization")).toBe(
        `Basic ${base64Encode("reedstrm:app-password")}`
      );
    }
    expect(client.getRecipeImageUrl("123")).toBe(
      `${serverUrl}/apps/cookbook/api/v1/recipes/123/image?size=thumb`
    );
  });

  it.each(["https://cloud.example.com", "http://192.168.1.50:8080/nextcloud"])(
    "creates a recipe on %s without sending a local recipe id",
    async (serverUrl) => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(123), {
          headers: { "Content-Type": "application/json" },
          status: 200
        })
      );
      const client = new CookbookClient({
        serverUrl,
        username: "reedstrm",
        appPassword: "app-password"
      });

      await client.createRecipe(
        normalizeRecipe({
          id: "local-abc",
          name: "Chocolate cake",
          recipeIngredient: ["flour"],
          recipeInstructions: ["Bake."],
          localMeta: {
            timers: [{ id: "timer-1", label: "Bake", minutes: 20 }]
          }
        })
      );

      const [, options] = fetchMock.mock.calls[0];
      const body = JSON.parse(String(options?.body));
      expect(options?.credentials).toBe("omit");
      expect(body.id).toBeUndefined();
      expect(body.localMeta).toBeUndefined();
      expect(body.prepTime).toBeUndefined();
      expect(body.nutrition).toBeUndefined();
      expect(body.name).toBe("Chocolate cake");
      expect(String(fetchMock.mock.calls[0][0])).toBe(
        `${serverUrl}/apps/cookbook/api/v1/recipes`
      );
    }
  );

  it.each(["https://cloud.example.com", "http://nextcloud.local:8080/nextcloud"])(
    "normalizes relative Cookbook image URLs on %s",
    async (serverUrl) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "3254",
            name: "Chocolate cake",
            image: "/apps/cookbook/webapp/recipes/3254/image?size=full",
            imageUrl: "/apps/cookbook/webapp/recipes/3254/image?size=thumb",
            imagePlaceholderUrl:
              "/apps/cookbook/webapp/recipes/3254/image?size=thumb16"
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200
          }
        )
      );
      const client = new CookbookClient({
        serverUrl: `${serverUrl}/`,
        username: "reedstrm",
        userId: "reedstrm",
        appPassword: "app-password"
      });

      const recipe = await client.getRecipe("3254");

      expect(recipe.image).toBe(
        `${serverUrl}/apps/cookbook/webapp/recipes/3254/image?size=full`
      );
      expect(recipe.imageUrl).toBe(
        `${serverUrl}/apps/cookbook/webapp/recipes/3254/image?size=thumb`
      );
      expect(recipe.imagePlaceholderUrl).toBe(
        `${serverUrl}/apps/cookbook/webapp/recipes/3254/image?size=thumb16`
      );
    }
  );

  it("repairs legacy Cookbook image endpoint sizes from v1 data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "1380499",
          name: "Chocolate cake",
          image:
            "https://cloud.example.com/apps/cookbook/webapp/recipes/1380499/image?size=fulld",
          imageUrl:
            "/apps/cookbook/api/v1/recipes/1380499/image?size=thumbd",
          imagePlaceholderUrl:
            "/apps/cookbook/api/v1/recipes/1380499/image?size=thumb16d"
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200
        }
      )
    );
    const client = new CookbookClient({
      serverUrl: "https://cloud.example.com/",
      username: "reedstrm",
      userId: "reedstrm",
      appPassword: "app-password"
    });

    const recipe = await client.getRecipe("1380499");

    expect(recipe.image).toBe(
      "https://cloud.example.com/apps/cookbook/webapp/recipes/1380499/image?size=full"
    );
    expect(recipe.imageUrl).toBe(
      "https://cloud.example.com/apps/cookbook/api/v1/recipes/1380499/image?size=thumb"
    );
    expect(recipe.imagePlaceholderUrl).toBe(
      "https://cloud.example.com/apps/cookbook/api/v1/recipes/1380499/image?size=thumb16"
    );
  });

  it("keeps Nextcloud file paths used as Cookbook image sources relative", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "3254",
          name: "Baguette",
          image: "/AvoCook Images/baguette.jpg",
          imageUrl: "/AvoCook Images/baguette.jpg",
          imagePlaceholderUrl: "/AvoCook Images/baguette.jpg"
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200
        }
      )
    );
    const client = new CookbookClient({
      serverUrl: "https://cloud.example.com/",
      username: "reedstrm",
      appPassword: "app-password"
    });

    const recipe = await client.getRecipe("3254");

    expect(recipe.image).toBe("/AvoCook Images/baguette.jpg");
    expect(recipe.imageUrl).toBe("/AvoCook Images/baguette.jpg");
    expect(recipe.imagePlaceholderUrl).toBe("/AvoCook Images/baguette.jpg");
  });

  it.each(["https://cloud.example.com", "http://192.168.1.50:8080/nextcloud"])(
    "uploads images over WebDAV on %s using the resolved Nextcloud user id",
    async (serverUrl) => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("", {
          status: 201
        })
      );
      const client = new CookbookClient({
        serverUrl: `${serverUrl}/`,
        username: "reed@example.com",
        userId: "reedstrm",
        appPassword: "app-password"
      });

      const remotePath = await client.uploadRecipeImage(
        "file:///documents/recipe-images/photo.jpg"
      );

      expect(remotePath).toBe("/AvoCook Images/photo.jpg");
      expect(String(fetchMock.mock.calls[0][0])).toBe(
        `${serverUrl}/remote.php/dav/files/reedstrm/AvoCook%20Images/photo.jpg`
      );
      expect(fetchMock.mock.calls[0][1]?.credentials).toBe("omit");
      expect(
        new Headers(fetchMock.mock.calls[0][1]?.headers).get(
          "X-NC-WebDAV-AutoMkcol"
        )
      ).toBe("1");
    }
  );

  it("falls back to explicit MKCOL when WebDAV auto directory creation is unavailable", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (_url, options) => {
        const headers = new Headers(options?.headers);
        if (
          options?.method === "PUT" &&
          headers.get("X-NC-WebDAV-AutoMkcol") === "1"
        ) {
          return new Response("", { status: 409 });
        }

        return new Response("", { status: 201 });
      }
    );
    const client = new CookbookClient({
      serverUrl: "https://cloud.example.com/",
      username: "reedstrm",
      userId: "reedstrm",
      appPassword: "app-password"
    });

    const remotePath = await client.uploadRecipeImage(
      "file:///documents/recipe-images/photo.jpg"
    );

    expect(remotePath).toBe("/AvoCook Images/photo.jpg");
    expect(fetchMock.mock.calls.map(([, options]) => options?.method)).toEqual([
      "PUT",
      "MKCOL",
      "PUT"
    ]);
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      "https://cloud.example.com/remote.php/dav/files/reedstrm/AvoCook%20Images"
    );
  });

  it("falls back to the legacy WebDAV endpoint when dav-files rejects auth", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (url) => {
        const urlText = String(url);
        if (urlText.includes("/remote.php/dav/files/")) {
          return new Response("", { status: 401 });
        }

        if (urlText.includes("/remote.php/webdav/")) {
          return new Response("", { status: 201 });
        }

        throw new Error(`Unexpected request: ${urlText}`);
      }
    );
    const client = new CookbookClient({
      serverUrl: "https://cloud.example.com/",
      username: "reed@example.com",
      userId: "reedstrm",
      appPassword: "app-password"
    });

    const remotePath = await client.uploadRecipeImage(
      "file:///documents/recipe-images/photo.jpg"
    );

    expect(remotePath).toBe("/AvoCook Images/photo.jpg");
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://cloud.example.com/remote.php/dav/files/reedstrm/AvoCook%20Images/photo.jpg"
    );
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      "https://cloud.example.com/remote.php/dav/files/reedstrm/AvoCook%20Images/photo.jpg"
    );
    expect(String(fetchMock.mock.calls[2][0])).toBe(
      "https://cloud.example.com/remote.php/webdav/AvoCook%20Images/photo.jpg"
    );
  });

  it("loads the WebDAV user id lazily for existing stored credentials", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (url) => {
        if (String(url).endsWith("/ocs/v2.php/cloud/user?format=json")) {
          return new Response(
            JSON.stringify({
              ocs: {
                meta: { status: "ok", statuscode: 100 },
                data: { id: "reedstrm" }
              }
            }),
            {
              headers: { "Content-Type": "application/json" },
              status: 200
            }
          );
        }

        return new Response("", { status: 201 });
      }
    );
    const client = new CookbookClient({
      serverUrl: "https://cloud.example.com/",
      username: "reed@example.com",
      appPassword: "app-password"
    });

    await client.uploadRecipeImage("file:///documents/recipe-images/photo.jpg");

    expect(String(fetchMock.mock.calls[1][0])).toBe(
      "https://cloud.example.com/remote.php/dav/files/reedstrm/AvoCook%20Images/photo.jpg"
    );
  });

  it("retries WebDAV auth with the resolved user id when login auth is rejected", async () => {
    const loginAuthorization = `Basic ${base64Encode(
      "reed@example.com:app-password"
    )}`;
    const userIdAuthorization = `Basic ${base64Encode("reedstrm:app-password")}`;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (url, options) => {
        if (String(url).endsWith("/ocs/v2.php/cloud/user?format=json")) {
          return new Response(
            JSON.stringify({
              ocs: {
                meta: { status: "ok", statuscode: 100 },
                data: { id: "reedstrm" }
              }
            }),
            {
              headers: { "Content-Type": "application/json" },
              status: 200
            }
          );
        }

        const authorization = new Headers(options?.headers).get("Authorization");
        if (authorization === loginAuthorization) {
          return new Response("", { status: 401 });
        }
        if (authorization === userIdAuthorization) {
          return new Response("", { status: 201 });
        }

        throw new Error(`Unexpected request: ${String(url)}`);
      }
    );
    const client = new CookbookClient({
      serverUrl: "https://cloud.example.com/",
      username: "reed@example.com",
      appPassword: "app-password"
    });

    const remotePath = await client.uploadRecipeImage(
      "file:///documents/recipe-images/photo.jpg"
    );

    expect(remotePath).toBe("/AvoCook Images/photo.jpg");
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get("Authorization"))
      .toBe(loginAuthorization);
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get("Authorization"))
      .toBe(userIdAuthorization);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("deletes Cookbook recipe image files from the configured recipe folder", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (url, options) => {
        if (String(url).endsWith("/apps/cookbook/api/v1/config")) {
          return new Response(JSON.stringify({ folder: "/Mes recettes" }), {
            headers: { "Content-Type": "application/json" },
            status: 200
          });
        }

        expect(options?.method).toBe("DELETE");
        return new Response("", { status: 200 });
      }
    );
    const client = new CookbookClient({
      serverUrl: "https://cloud.example.com/",
      username: "reedstrm",
      userId: "reedstrm",
      appPassword: "app-password"
    });

    await client.deleteCookbookRecipeImages('Pain / beurre: miel? "test"');

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      "https://cloud.example.com/remote.php/dav/files/reedstrm/Mes%20recettes/Pain%20_%20beurre_%20miel_%20_test_/full.jpg"
    );
    expect(String(fetchMock.mock.calls[2][0])).toBe(
      "https://cloud.example.com/remote.php/dav/files/reedstrm/Mes%20recettes/Pain%20_%20beurre_%20miel_%20_test_/thumb.jpg"
    );
    expect(String(fetchMock.mock.calls[3][0])).toBe(
      "https://cloud.example.com/remote.php/dav/files/reedstrm/Mes%20recettes/Pain%20_%20beurre_%20miel_%20_test_/thumb16.jpg"
    );
  });
});
