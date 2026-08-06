import { describe, expect, it } from "vitest";
import { findRecipeJsonLd, jsonLdToRecipe, extractSemanticHtmlRecipe } from "../features/import/schemaRecipeParser";

// Helper: parse HTML and convert in one step
function importFromHtml(html: string, url = "https://example.com/recipe") {
  const jsonLd = findRecipeJsonLd(html);
  if (!jsonLd) throw new Error("No JSON-LD found");
  return jsonLdToRecipe(jsonLd, url);
}

describe("schemaRecipeParser", () => {
  // ─── Existing tests (must remain green) ──────────────────────────────────────

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

  // ─── HTML entity decoding ─────────────────────────────────────────────────────

  it("decodes decimal numeric HTML entities in JSON-LD values", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type": "Recipe",
          "name": "Cr&#234;pes au citron",
          "recipeIngredient": ["250 g de farine"],
          "recipeInstructions": ["M&#233;langer la p&#226;te."]
        }
      </script>
    `;
    const recipe = importFromHtml(html);
    expect(recipe.name).toBe("Crêpes au citron");
    expect(recipe.recipeInstructions[0]).toBe("Mélanger la pâte.");
  });

  it("decodes hexadecimal numeric HTML entities", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type": "Recipe",
          "name": "Salade ni&#xE7;oise",
          "recipeIngredient": ["2 oeufs"],
          "recipeInstructions": ["Cuire."]
        }
      </script>
    `;
    const recipe = importFromHtml(html);
    expect(recipe.name).toBe("Salade niçoise");
  });

  it("decodes typographic named entities (&rsquo;, &laquo;, &hellip;)", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type": "Recipe",
          "name": "Recette de l&rsquo;&eacute;t&eacute;",
          "description": "&laquo;&nbsp;Tr&egrave;s bon&nbsp;&raquo;&hellip;",
          "recipeIngredient": ["1 aubergine"],
          "recipeInstructions": ["Cuire."]
        }
      </script>
    `;
    const recipe = importFromHtml(html);
    expect(recipe.name).toBe("Recette de l\u2019été");
    expect(recipe.description).toContain("Très bon");
  });

  // ─── HTML tag stripping ───────────────────────────────────────────────────────

  it("strips HTML tags from instruction text in JSON-LD", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type": "Recipe",
          "name": "Soupe",
          "recipeIngredient": ["1 oignon"],
          "recipeInstructions": [
            { "@type": "HowToStep", "text": "Faire revenir l&rsquo;oignon dans <strong>un filet d&rsquo;huile</strong>." }
          ]
        }
      </script>
    `;
    const recipe = importFromHtml(html);
    // Stripping <strong>...</strong> may insert a space before the period;
    // the important thing is the HTML tags are gone and the text is readable.
    expect(recipe.recipeInstructions[0]).toContain(
      "Faire revenir l\u2019oignon dans un filet d\u2019huile"
    );
    expect(recipe.recipeInstructions[0]).not.toContain("<strong>");
    expect(recipe.recipeInstructions[0]).not.toContain("</strong>");
  });

  it("strips HTML tags from ingredients in JSON-LD", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type": "Recipe",
          "name": "Salade",
          "recipeIngredient": ["<strong>200 g</strong> de tomates <em>cerises</em>"],
          "recipeInstructions": ["Mélanger."]
        }
      </script>
    `;
    const recipe = importFromHtml(html);
    expect(recipe.recipeIngredient[0]).toBe("200 g de tomates cerises");
  });

  // ─── JSON repair ──────────────────────────────────────────────────────────────

  it("repairs JSON-LD with trailing commas", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type": "Recipe",
          "name": "Gâteau",
          "recipeIngredient": ["200 g farine",],
          "recipeInstructions": ["Mélanger.",],
        }
      </script>
    `;
    const recipe = importFromHtml(html);
    expect(recipe.name).toBe("Gâteau");
    expect(recipe.recipeIngredient).toEqual(["200 g farine"]);
  });

  // ─── HowToSection support ─────────────────────────────────────────────────────

  it("flattens HowToSection instructions into a single list", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type": "Recipe",
          "name": "Lasagnes",
          "recipeIngredient": ["500 g de viande"],
          "recipeInstructions": [
            {
              "@type": "HowToSection",
              "name": "Sauce",
              "itemListElement": [
                { "@type": "HowToStep", "text": "Faire revenir la viande." },
                { "@type": "HowToStep", "text": "Ajouter la tomate." }
              ]
            },
            {
              "@type": "HowToSection",
              "name": "Montage",
              "itemListElement": [
                { "@type": "HowToStep", "text": "Alterner pâtes et sauce." }
              ]
            }
          ]
        }
      </script>
    `;
    const recipe = importFromHtml(html);
    expect(recipe.recipeInstructions).toEqual([
      "Faire revenir la viande.",
      "Ajouter la tomate.",
      "Alterner pâtes et sauce."
    ]);
  });

  // ─── Semantic HTML fallback ──────────────────────────────────────────────────

  it("extracts ingredients and instructions from semantic HTML", () => {
    const html = `
      <html>
        <head>
          <title>Sabich maison - Papilles et Pupilles</title>
          <meta property="og:image" content="https://example.com/sabich.jpg" />
        </head>
        <body>
          <h2>Ingrédients</h2>
          <p>Temps de préparation : 25 minutes - cuisson : 30 min</p>
          <p>Pour 2 personnes</p>
          <ul>
            <li>2 aubergines</li>
            <li>4 oeufs</li>
          </ul>
          <h2>Préparation</h2>
          <p>Préchauffez le four.</p>
          <p>Cuire 30 min.</p>
        </body>
      </html>
    `;

    const semanticData = extractSemanticHtmlRecipe(html);
    expect(semanticData).not.toBeNull();
    const recipe = jsonLdToRecipe(semanticData!, "https://example.com/");
    
    expect(recipe.name).toBe("Sabich maison");
    expect(recipe.image).toBe("https://example.com/sabich.jpg");
    expect(recipe.prepTime).toBe("PT25M");
    expect(recipe.cookTime).toBe("PT30M");
    expect(recipe.recipeYield).toBe(2);
    expect(recipe.recipeIngredient).toEqual(["2 aubergines", "4 oeufs"]);
    expect(recipe.recipeInstructions).toEqual(["Préchauffez le four.", "Cuire 30 min."]);
  });

// ─── Edge cases ───────────────────────────────────────────────────────────────

  it("handles a recipe where recipeYield is a string like '6 personnes'", () => {
    const recipe = jsonLdToRecipe(
      {
        "@type": "Recipe",
        name: "Tarte",
        recipeIngredient: ["pâte"],
        recipeInstructions: ["Cuire."],
        recipeYield: "6 personnes"
      },
      "https://example.com/"
    );
    expect(recipe.recipeYield).toBe(6);
  });

  it("handles instructions as a plain string (some older sites)", () => {
    const recipe = jsonLdToRecipe(
      {
        "@type": "Recipe",
        name: "Omelette",
        recipeIngredient: ["2 oeufs"],
        recipeInstructions: "Battre les oeufs.\nCuire à la poêle."
      },
      "https://example.com/"
    );
    expect(recipe.recipeInstructions).toEqual([
      "Battre les oeufs.",
      "Cuire à la poêle."
    ]);
  });

  it("handles instructions separated by <br> tags (some WordPress themes)", () => {
    const recipe = jsonLdToRecipe(
      {
        "@type": "Recipe",
        name: "Soupe",
        recipeIngredient: ["légumes"],
        recipeInstructions: "Éplucher les légumes.<br>Faire bouillir 20 min."
      },
      "https://example.com/"
    );
    expect(recipe.recipeInstructions).toEqual([
      "Éplucher les légumes.",
      "Faire bouillir 20 min."
    ]);
  });
});
