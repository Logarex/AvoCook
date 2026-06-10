import { describe, expect, it } from "vitest";
import { findRecipeJsonLd, jsonLdToRecipe } from "../features/import/schemaRecipeParser";

describe("schemaRecipeParser", () => {
  it("extracts a Recipe object from JSON-LD graph", () => {
    const html = `
      <html>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "WebPage", "name": "Example" },
              {
                "@type": "Recipe",
                "name": "Tarte aux pommes",
                "recipeIngredient": ["2 pommes", "1 pâte"],
                "recipeInstructions": [
                  { "@type": "HowToStep", "text": "Couper les pommes." },
                  { "@type": "HowToStep", "text": "Cuire 30 minutes." }
                ],
                "prepTime": "PT15M",
                "recipeYield": "6 personnes",
                "image": { "url": "https://example.com/tarte.jpg" }
              }
            ]
          }
        </script>
      </html>
    `;

    const jsonLd = findRecipeJsonLd(html);
    expect(jsonLd?.name).toBe("Tarte aux pommes");

    const recipe = jsonLdToRecipe(jsonLd!, "https://example.com/recipe");
    expect(recipe.name).toBe("Tarte aux pommes");
    expect(recipe.recipeIngredient).toEqual(["2 pommes", "1 pâte"]);
    expect(recipe.recipeInstructions).toEqual([
      "Couper les pommes.",
      "Cuire 30 minutes."
    ]);
    expect(recipe.recipeYield).toBe(6);
    expect(recipe.image).toBe("https://example.com/tarte.jpg");
  });

  it("extracts Recipe JSON-LD when the script type is HTML-encoded", () => {
    const html = `
      <script type="application&#x2F;ld&#x2B;json">
        {
          "@context": "https://schema.org",
          "@type": "Recipe",
          "name": "Crêpes",
          "recipeIngredient": ["250 g de farine"],
          "recipeInstructions": ["Mélanger."]
        }
      </script>
    `;

    const jsonLd = findRecipeJsonLd(html);
    expect(jsonLd?.name).toBe("Crêpes");
  });

  it("resolves relative source and image URLs against the imported page", () => {
    const recipe = jsonLdToRecipe(
      {
        "@type": "Recipe",
        name: "Cake citron",
        url: "/recettes/cake-citron",
        image: { url: "../images/cake.jpg" }
      },
      "https://example.com/blog/page"
    );

    expect(recipe.url).toBe("https://example.com/recettes/cake-citron");
    expect(recipe.image).toBe("https://example.com/images/cake.jpg");
    expect(recipe.imageUrl).toBe("https://example.com/images/cake.jpg");
  });
});
