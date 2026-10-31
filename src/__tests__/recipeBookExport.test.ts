import { describe, expect, it, vi } from "vitest";
import { createIllustratedRecipeBookHtml } from "../features/kitchen/recipeBookExport";
import { createRecipeBookHtml } from "../features/kitchen/recipeBook";
import { normalizeRecipe } from "../features/recipes/types";

const image = vi.hoisted(() => vi.fn());
vi.mock("../features/recipes/recipeSharing", () => ({ getRecipePrintImageDataUri: image }));
const labels = { title: "Mon **livre**", contents: "Sommaire", recipes: "Recettes", ingredients: "Ingrédients", instructions: "Étapes", servings: "portions", prepTime: "Préparation", cookTime: "Cuisson" };
const recipes = ["Aubergines", "Tarte", "Soupe", "Pain"].map((name, index) => normalizeRecipe({ id: String(index), name, image: "https://cloud.example/photo.jpg", recipeYield: 2, recipeIngredient: ["**200 g** farine", "<script>bad</script>"], recipeInstructions: ["Mélanger", "Cuire"], prepTime: "PT15M", cookTime: "PT30M" }));
const uri = "data:image/jpeg;base64,cGhvdG8=";

describe("illustrated recipe books", () => {
  it("embeds photos and localizes the contents, metadata and recipe sections without exposing raw file URLs", () => {
    const html = createRecipeBookHtml(recipes, labels, [uri]);
    expect(html).toContain('class="cover-photo"');
    expect(html).toContain('class="recipe-photo"');
    expect(html).toContain(uri);
    expect(html).toContain("Sommaire");
    expect(html).toContain("Préparation · 15 min");
    expect(html).toContain("Cuisson · 30 min");
    expect(html).toContain('href="#recipe-0"');
    expect(html).toContain("<strong>200 g</strong>");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("https://cloud.example/photo.jpg");
    expect(html.match(/<article>/g)).toHaveLength(4);
  });
  it("ignores unsafe image sources and keeps recipes readable without photos", () => {
    const html = createRecipeBookHtml(recipes, labels, ['https://private.example/photo.jpg', 'file:///secret.jpg', 'data:image/jpeg;base64,\" onerror=\"alert(1)']);
    expect(html).not.toContain("<img");
    expect(html).toContain('class="cover-art"');
    expect(html).toContain("Soupe");
    expect(html).not.toContain("onerror");
  });
  it("bounds photo loading to three concurrent operations and preserves order after failures", async () => {
    let active = 0;
    let peak = 0;
    image.mockImplementation(async (recipe: { id: string }) => {
      peak = Math.max(peak, ++active);
      await new Promise((resolve) => setTimeout(resolve, recipe.id === "0" ? 10 : 0));
      active--;
      if (recipe.id === "1") throw new Error("Photo unavailable");
      return `data:image/jpeg;base64,${Buffer.from(recipe.id).toString("base64")}`;
    });
    const html = await createIllustratedRecipeBookHtml(recipes, labels, null);
    expect(peak).toBe(3);
    expect(html.indexOf("Aubergines")).toBeLessThan(html.indexOf("Tarte"));
    expect(html.match(/class="recipe-photo"/g)).toHaveLength(3);
    expect(html).toContain("Tarte");
  });
});
