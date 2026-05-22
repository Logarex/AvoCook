import { afterEach, describe, expect, it, vi } from "vitest";
import { CookbookClient } from "../src/features/nextcloud/cookbookClient";
import { normalizeRecipe } from "../src/features/recipes/types";

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
