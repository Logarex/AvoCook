import { afterEach, describe, expect, it, vi } from "vitest";
import { CookbookClient } from "../src/features/nextcloud/cookbookClient";
import { normalizeRecipe } from "../src/features/recipes/types";
import { base64Encode } from "../src/utils/base64";

vi.mock("expo-file-system", () => ({
  File: class {
    constructor(readonly uri: string) {}
    arrayBuffer = vi.fn(async () => new ArrayBuffer(4));
  }
}));

describe("CookbookClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not send a local recipe id when creating a recipe", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(123), {
        headers: { "Content-Type": "application/json" },
        status: 200
      })
    );
    const client = new CookbookClient({
      serverUrl: "https://cloud.example.com",
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
    expect(body.id).toBeNull();
    expect(body.localMeta).toBeUndefined();
    expect(body.prepTime).toBeUndefined();
    expect(body.nutrition).toBeUndefined();
    expect(body.name).toBe("Chocolate cake");
  });

  it("normalizes relative Cookbook image URLs from recipe details", async () => {
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
      serverUrl: "https://cloud.example.com/",
      username: "reedstrm",
      userId: "reedstrm",
      appPassword: "app-password"
    });

    const recipe = await client.getRecipe("3254");

    expect(recipe.image).toBe(
      "https://cloud.example.com/apps/cookbook/webapp/recipes/3254/image?size=full"
    );
    expect(recipe.imageUrl).toBe(
      "https://cloud.example.com/apps/cookbook/webapp/recipes/3254/image?size=thumb"
    );
    expect(recipe.imagePlaceholderUrl).toBe(
      "https://cloud.example.com/apps/cookbook/webapp/recipes/3254/image?size=thumb16"
    );
  });

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

  it("uses the resolved Nextcloud user id for WebDAV image uploads", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", {
        status: 201
      })
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
    expect(fetchMock.mock.calls[0][1]?.credentials).toBe("omit");
    expect(
      new Headers(fetchMock.mock.calls[0][1]?.headers).get(
        "X-NC-WebDAV-AutoMkcol"
      )
    ).toBe("1");
  });

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
