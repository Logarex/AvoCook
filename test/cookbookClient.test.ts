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
    expect(body.name).toBe("Chocolate cake");
  });
});
