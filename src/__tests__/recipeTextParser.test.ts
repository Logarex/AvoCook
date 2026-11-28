import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  orderOcrLines,
  parseRecipeText,
  recipeFromStructured,
  toIsoDuration,
  type OcrLine,
} from "../features/import/recipeTextParser";

describe("parseRecipeText with section headings", () => {
  it("reads a French cookbook page with times, servings and numbered steps", () => {
    const { recipe, complete } = parseRecipeText(`Quiche lorraine
Une recette de famille, simple et rapide.
Pour 6 personnes
Préparation : 20 min – Cuisson : 45 min
Ingrédients
• 1 pâte brisée
• 200 g de lardons fumés
• 3 œufs
• 20 cl de crème
fraîche épaisse
Préparation
1. Préchauffez le four à 180 °C.
2. Faites revenir les lardons à la poêle
sans matière grasse.
3. Battez les œufs avec la crème, versez sur la pâte
et enfournez 45 minutes.
12`);
    expect(complete).toBe(true);
    expect(recipe.name).toBe("Quiche lorraine");
    expect(recipe.description).toBe("Une recette de famille, simple et rapide.");
    expect(recipe.recipeYield).toBe(6);
    expect(recipe.prepTime).toBe("PT20M");
    expect(recipe.cookTime).toBe("PT45M");
    expect(recipe.recipeIngredient).toEqual([
      "1 pâte brisée",
      "200 g de lardons fumés",
      "3 œufs",
      "20 cl de crème fraîche épaisse",
    ]);
    expect(recipe.recipeInstructions).toEqual([
      "Préchauffez le four à 180 °C.",
      "Faites revenir les lardons à la poêle sans matière grasse.",
      "Battez les œufs avec la crème, versez sur la pâte et enfournez 45 minutes.",
    ]);
  });

  it.each([
    ["en", "Pancakes", "Serves 4", "Ingredients", "Method", "200 g flour", "Whisk the flour, eggs and milk until smooth."],
    ["de", "Pfannkuchen", "Für 4 Personen", "Zutaten", "Zubereitung", "200 g Mehl", "Mehl, Eier und Milch glatt rühren."],
    ["es", "Tortitas", "Para 4 personas", "Ingredientes", "Preparación", "200 g de harina", "Bate la harina, los huevos y la leche."],
    ["it", "Pancake", "Per 4 persone", "Ingredienti", "Procedimento", "200 g di farina", "Sbatti la farina, le uova e il latte."],
    ["da", "Pandekager", "Til 4 personer", "Ingredienser", "Fremgangsmåde", "200 g hvedemel", "Pisk mel, æg og mælk sammen."],
  ])("reads headings in %s", (_locale, title, servings, ingredients, steps, firstIngredient, firstStep) => {
    const { recipe, complete } = parseRecipeText(
      [title, servings, `${ingredients}:`, firstIngredient, "2 eggs / Eier / huevos / uova / æg", `${steps}:`, firstStep, "Cook 2 minutes on each side."].join("\n"),
    );
    expect(complete).toBe(true);
    expect(recipe.name).toBe(title);
    expect(recipe.recipeYield).toBe(4);
    expect(recipe.recipeIngredient[0]).toBe(firstIngredient);
    expect(recipe.recipeIngredient).toHaveLength(2);
    expect(recipe.recipeInstructions).toEqual([firstStep, "Cook 2 minutes on each side."]);
    expect(recipe.cookTime).toBeNull();
  });

  it("reads hours and minutes and a total time", () => {
    const { recipe } = parseRecipeText(`Bœuf bourguignon
Préparation : 30 min
Cuisson : 3 h
Temps total : 3h30
Ingrédients
1 kg de bœuf
Préparation
Faites mijoter.`);
    expect(recipe.prepTime).toBe("PT30M");
    expect(recipe.cookTime).toBe("PT3H");
    expect(recipe.totalTime).toBe("PT3H30M");
  });

  it("keeps the step heading 'Préparation' apart from the prep time", () => {
    const { recipe } = parseRecipeText(`Salade
Préparation : 10 min
Ingrédients
1 salade
Préparation :
Lavez la salade.`);
    expect(recipe.prepTime).toBe("PT10M");
    expect(recipe.recipeInstructions).toEqual(["Lavez la salade."]);
  });

  it("splits unnumbered steps on paragraph breaks and joins hyphenated words", () => {
    const { recipe } = parseRecipeText(`Mousse au chocolat
Ingrédients
200 g de choco-
lat noir
6 œufs
Préparation
Faites fondre le chocolat au bain-marie, puis laissez
tiédir.

Montez les blancs en neige ferme.

Incorporez-les délicatement.`);
    expect(recipe.recipeIngredient).toEqual(["200 g de chocolat noir", "6 œufs"]);
    expect(recipe.recipeInstructions).toEqual([
      "Faites fondre le chocolat au bain-marie, puis laissez tiédir.",
      "Montez les blancs en neige ferme.",
      "Incorporez-les délicatement.",
    ]);
  });

  it("splits unnumbered steps on sentences when there are no paragraph breaks", () => {
    const { recipe } = parseRecipeText(`Soup
Ingredients
1 onion
Directions
Chop the onion and fry it in a little oil until it is
soft.
Add the stock and simmer for 20 minutes.`);
    expect(recipe.recipeInstructions).toEqual([
      "Chop the onion and fry it in a little oil until it is soft.",
      "Add the stock and simmer for 20 minutes.",
    ]);
  });

  it("reads servings from the ingredients heading and keeps sub-headings and notes", () => {
    const { recipe } = parseRecipeText(`Tarte aux pommes
Ingrédients (pour 8 personnes)
Pour la pâte :
250 g de farine
Pour la garniture :
4 pommes
Réalisation
1. Étalez la pâte.
2. Disposez les pommes.
Astuce
Servez tiède avec une boule de glace.`);
    expect(recipe.recipeYield).toBe(8);
    expect(recipe.recipeIngredient).toEqual(["Pour la pâte :", "250 g de farine", "Pour la garniture :", "4 pommes"]);
    expect(recipe.recipeInstructions).toEqual(["Étalez la pâte.", "Disposez les pommes."]);
    expect(recipe.description).toBe("Servez tiède avec une boule de glace.");
  });

  it("does not take '1.5 kg' or '250 g' for a step number", () => {
    const { recipe } = parseRecipeText(`Rôti
Ingrédients
1.5 kg de porc
250 g d'oignons
Préparation
1) Saisissez le rôti.
2) Ajoutez les oignons.`);
    expect(recipe.recipeIngredient).toEqual(["1.5 kg de porc", "250 g d'oignons"]);
    expect(recipe.recipeInstructions).toEqual(["Saisissez le rôti.", "Ajoutez les oignons."]);
  });

  it("reads 'Étape 1' and 'Step 2' markers", () => {
    const { recipe } = parseRecipeText(`Riz
Ingrédients
200 g de riz
Préparation
Étape 1
Rincez le riz.
Étape 2 : Faites cuire 12 minutes.`);
    expect(recipe.recipeInstructions).toEqual(["Rincez le riz.", "Faites cuire 12 minutes."]);
  });
});

describe("parseRecipeText without headings", () => {
  it("finds quantified ingredients and long sentences", () => {
    const { recipe, complete } = parseRecipeText(`Crêpes
250 g farine
4 œufs
½ l de lait
1 pincée de sel
Mélangez la farine et les œufs, puis ajoutez le lait petit à petit en fouettant.
Laissez reposer la pâte une heure avant de faire cuire les crêpes à la poêle.`);
    expect(complete).toBe(true);
    expect(recipe.name).toBe("Crêpes");
    expect(recipe.recipeIngredient).toEqual(["250 g farine", "4 œufs", "½ l de lait", "1 pincée de sel"]);
    expect(recipe.recipeInstructions).toHaveLength(2);
  });

  it("reports an incomplete recipe instead of inventing one", () => {
    const { recipe, complete } = parseRecipeText("Joyeux anniversaire\nÀ bientôt !");
    expect(complete).toBe(false);
    expect(recipe.recipeIngredient).toEqual([]);
    expect(recipe.recipeInstructions).toEqual([]);
  });

  it("handles empty text", () => {
    expect(parseRecipeText("").complete).toBe(false);
    expect(parseRecipeText([]).recipe.name).toBe("");
  });
});

describe("orderOcrLines", () => {
  const line = (text: string, x: number, y: number, width = 0.35, height = 0.02): OcrLine => ({ text, x, y, width, height });

  it("reads a two-column page column by column, after the full-width title", () => {
    const ordered = orderOcrLines([
      line("Gratin dauphinois", 0.1, 0.05, 0.8, 0.04),
      line("Préparation", 0.55, 0.15),
      line("Ingrédients", 0.08, 0.15),
      line("1 kg de pommes de terre", 0.08, 0.18),
      line("1. Épluchez les pommes de terre.", 0.55, 0.18),
      line("50 cl de crème", 0.08, 0.21),
      line("2. Enfournez 1 heure.", 0.55, 0.21),
    ]);
    expect(ordered).toEqual([
      "Gratin dauphinois",
      "",
      "Ingrédients",
      "1 kg de pommes de terre",
      "50 cl de crème",
      "",
      "Préparation",
      "1. Épluchez les pommes de terre.",
      "2. Enfournez 1 heure.",
    ]);
    const { recipe } = parseRecipeText(ordered);
    expect(recipe.recipeIngredient).toEqual(["1 kg de pommes de terre", "50 cl de crème"]);
    expect(recipe.recipeInstructions).toEqual(["Épluchez les pommes de terre.", "Enfournez 1 heure."]);
  });

  it("joins a quantity and its ingredient printed apart on the same row", () => {
    expect(
      orderOcrLines([line("250 g", 0.1, 0.3, 0.08), line("de farine", 0.2, 0.301, 0.2), line("3 œufs", 0.1, 0.33, 0.1)]),
    ).toEqual(["250 g de farine", "3 œufs"]);
  });

  it("marks larger gaps as paragraph breaks and ignores empty boxes", () => {
    expect(
      orderOcrLines([line("First", 0.1, 0.1), line("", 0.1, 0.12), line("Second", 0.1, 0.2), line("x", 0.1, 0.3, 0, 0.02)]),
    ).toEqual(["First", "", "Second"]);
  });
});

describe("recipeFromStructured", () => {
  it("accepts a complete answer and cleans it", () => {
    const recipe = recipeFromStructured({
      name: " Omelette ",
      description: "Quick",
      servings: 2,
      prepMinutes: 5,
      cookMinutes: 75,
      ingredients: ["3 eggs", " ", 42, "Salt"],
      steps: ["1. Whisk the eggs.", "2. Cook gently."],
    });
    expect(recipe).toMatchObject({
      id: null,
      name: "Omelette",
      recipeYield: 2,
      prepTime: "PT5M",
      cookTime: "PT1H15M",
      recipeIngredient: ["3 eggs", "Salt"],
      recipeInstructions: ["Whisk the eggs.", "Cook gently."],
    });
  });

  it.each([null, undefined, {}, { ingredients: ["x"], steps: [] }, { ingredients: "x", steps: ["y"] }])(
    "rejects an unusable answer %#",
    (value) => expect(recipeFromStructured(value as never)).toBeNull(),
  );

  it("ignores impossible servings and times", () => {
    const recipe = recipeFromStructured({ ingredients: ["a"], steps: ["b"], servings: 0, prepMinutes: -3, cookMinutes: "10" });
    expect(recipe).toMatchObject({ recipeYield: 1, prepTime: null, cookTime: null });
  });
});

it("formats ISO durations", () => {
  expect(toIsoDuration(45)).toBe("PT45M");
  expect(toIsoDuration(60)).toBe("PT1H");
  expect(toIsoDuration(150)).toBe("PT2H30M");
  expect(toIsoDuration(0)).toBeNull();
});

describe("real Apple Vision output", () => {
  const fixture = (name: string): OcrLine[] =>
    JSON.parse(readFileSync(new URL(`./fixtures/ocr-${name}.json`, import.meta.url), "utf8"));

  it("reads a two-column French cookbook page photographed askew", () => {
    const { recipe, complete } = parseRecipeText(orderOcrLines(fixture("fr-gratin")));
    expect(complete).toBe(true);
    expect(recipe).toMatchObject({
      name: "Gratin dauphinois",
      description: "Le grand classique du Dauphiné, fondant et doré.",
      recipeYield: 6,
      prepTime: "PT20M",
      cookTime: "PT1H15M",
      recipeIngredient: [
        "1,5 kg de pommes de terre",
        "50 cl de crème liquide",
        "25 cl de lait entier",
        "2 gousses d'ail",
        "40 g de beurre",
        "1 pincée de noix de muscade",
        "Sel, poivre",
      ],
      recipeInstructions: [
        "Préchauffez le four à 160 °C. Frottez un plat à gratin avec l'ail, puis beurrez-le généreusement.",
        "Épluchez les pommes de terre et coupez-les en fines rondelles, sans les rincer.",
        "Faites chauffer la crème et le lait avec la muscade, le sel et le poivre.",
        "Disposez les rondelles en couches, versez le mélange et parsemez de noisettes de beurre.",
        "Enfournez 1 h 15, jusqu'à ce que le dessus soit bien doré.",
      ],
    });
  });

  it("joins an English recipe printed over two pages", () => {
    const { recipe, complete } = parseRecipeText([
      ...orderOcrLines(fixture("en-page1")),
      "",
      ...orderOcrLines(fixture("en-page2")),
    ]);
    expect(complete).toBe(true);
    expect(recipe).toMatchObject({ name: "Banana Bread", recipeYield: 8, prepTime: "PT15M", cookTime: "PT1H" });
    expect(recipe.recipeIngredient).toHaveLength(6);
    expect(recipe.recipeInstructions).toEqual([
      "Heat the oven to 175 °C and grease a loaf tin.",
      "Mash the bananas, then stir in the butter.",
      "Mix in the sugar, egg, baking soda and flour.",
      "Pour into the tin and bake for 1 hour.",
    ]);
  });
});
