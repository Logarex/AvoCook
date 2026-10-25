import { describe, expect, it } from "vitest";
import { createEmptyRecipe } from "../features/recipes/types";
import {
  consolidateIngredients,
  emptyJournal,
  emptyKitchen,
  matchesDietPreference,
  matchesFoodPreferences,
  mealIngredients,
  parseIngredient,
  parseKitchenData,
  sharedBatchIngredients,
  type Meal,
  type StockItem,
} from "../features/kitchen/kitchen";
import { foodsInSeason, seasonalRecipes } from "../features/kitchen/seasonal";
import { stockReminderPlan } from "../features/kitchen/stockReminders";
import { cookingCommand } from "../features/kitchen/voiceCommands";
import { suggestMenu } from "../features/kitchen/menus";
import { remapKitchenBackup } from "../features/kitchen/kitchenBackup";
import { createRecipeBookHtml } from "../features/kitchen/recipeBook";
const recipe = (id: string, name: string, ingredients = ["2 oeufs"]) => ({
  ...createEmptyRecipe(),
  id,
  name,
  recipeIngredient: ingredients,
  recipeInstructions: ["Mix"],
});
const meal = (kind: Meal["kind"], overrides: Partial<Meal> = {}): Meal => ({
  id: kind ?? "recipe",
  kind,
  recipeId: "r",
  date: "2026-10-18",
  slot: "dinner",
  servings: 4,
  ...overrides,
});
const stock = (id: string, expires: string): StockItem => ({
  id,
  name: id,
  expires,
  quantity: "",
  location: "fridge",
});

describe("everyday meals and food preferences", () => {
  it("includes simple-meal shopping as written and never buys leftovers or eating-out meals twice", () => {
    expect(
      mealIngredients(
        [
          meal("simple", { ingredients: ["2 tomates", "100 g riz"] }),
          meal("leftovers"),
          meal("out"),
        ],
        [recipe("r", "R")],
      ),
    ).toEqual(["2 tomates", "100 g riz"]);
  });
  it("preserves unknown quantities when scaling recipes", () => {
    expect(
      consolidateIngredients([
        { line: "1 cup flour", factor: 2 },
        { line: "1 cup flour", factor: 2 },
      ]),
    ).toEqual(["2 × (1 cup flour) (×2)"]);
  });
  it.each(["2 à 3 oeufs", "2 to 3 eggs", "1,000 g flour", "2 x 200 g farine"])(
    "keeps ambiguous input opaque: %s",
    (line) => expect(parseIngredient(line).amount).toBeNull(),
  );
  it("matches common names across six supported languages without equating related foods", () => {
    for (const name of ["oeufs", "eggs", "Eier", "huevos", "uova", "æg"])
      expect(parseIngredient(name).key).toBe("oeuf");
    expect(parseIngredient("fromage blanc").key).not.toBe(
      parseIngredient("fromage").key,
    );
    expect(
      matchesFoodPreferences(recipe("r", "Cake", ["200 g blé"]), "BLE"),
    ).toBe(false);
  });
  it("uses explicit personal labels and excludes unknown classifications", () => {
    const data = {
      ...emptyKitchen(),
      dietaryPreference: "vegetarian" as const,
      journals: { r: { ...emptyJournal(), diets: ["vegan" as const] } },
    };
    expect(matchesDietPreference("r", data)).toBe(true);
    expect(matchesDietPreference("unknown", data)).toBe(false);
    expect(
      matchesDietPreference("r", { ...data, dietaryPreference: "glutenFree" }),
    ).toBe(false);
  });
  it("only groups shared ingredients, retaining original recipes and incompatible units", () => {
    const recipes = [
      recipe("a", "A", ["100 g farine", "1 oeuf"]),
      recipe("b", "B", ["50 g farine", "10 ml farine"]),
    ];
    const before = JSON.stringify(recipes);
    expect(sharedBatchIngredients(recipes)).toEqual([
      {
        name: "farine",
        ingredients: ["150 g farine", "10 ml farine"],
        recipes: 2,
      },
    ]);
    expect(JSON.stringify(recipes)).toBe(before);
  });
});

describe("seasonal catalog and menus", () => {
  it("does not extrapolate a French calendar to another country or invalid month", () => {
    expect(foodsInSeason("NZ", 10)).toEqual([]);
    expect(foodsInSeason(undefined, 10)).toEqual([]);
    expect(foodsInSeason("FR", 13)).toEqual([]);
    expect(foodsInSeason("FR", 10).map((food) => food.id)).not.toContain(
      "tomato",
    );
    expect(foodsInSeason("FR", 7).map((food) => food.id)).toContain("tomato");
  });
  it("matches seasonal ingredients, not recipe titles or ingredient substrings", () => {
    const matches = seasonalRecipes(
      [
        recipe("a", "Not seasonal", ["2 pommes"]),
        recipe("b", "Apple pie", ["100 g farine"]),
        recipe("c", "C", ["20 g jus de pomme"]),
      ],
      "FR",
      10,
    );
    expect(matches.map((result) => result.recipe.id)).toEqual(["a"]);
  });
  it("suggests only known course categories without inventing missing courses", () => {
    const recipes = [
      { ...recipe("a", "A"), recipeCategory: "dessert" },
      { ...recipe("b", "Christmas pie"), recipeCategory: "dessert" },
      { ...recipe("c", "C"), recipeCategory: "plat principal" },
      { ...recipe("d", "D"), recipeCategory: "unknown" },
    ];
    expect(suggestMenu(recipes, "christmas")).toEqual(["c", "b"]);
    expect(suggestMenu([], "friends")).toEqual([]);
  });
});

describe("local reminders and voice commands", () => {
  it("groups reminders two calendar days ahead at 9am, excluding past reminder dates", () => {
    const plan = stockReminderPlan(
      [
        stock("milk", "2026-10-22"),
        stock("eggs", "2026-10-22"),
        stock("old", "2026-10-17"),
        stock("near", "2026-10-19"),
        stock("none", ""),
      ],
      new Date("2026-10-18T12:00:00"),
      "Title",
      (names) => names,
    );
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      id: "2026-10-20",
      title: "Title",
      body: "milk, eggs",
    });
    expect(new Date(plan[0].date).getHours()).toBe(9);
  });
  it("limits scheduled reminders without touching timer IDs", () => {
    const items = Array.from({ length: 28 }, (_, index) =>
      stock(String(index), `2026-11-${String(index + 1).padStart(2, "0")}`),
    );
    expect(
      stockReminderPlan(
        items,
        new Date("2026-10-01T12:00:00"),
        "Title",
        (names) => names,
      ),
    ).toHaveLength(20);
  });
  it.each(["suivant", "next step", "weiter", "siguiente", "avanti", "næste"])(
    "supports the next command in each language: %s",
    (text) => expect(cookingCommand(text)).toBe("next"),
  );
  it.each([
    ["précédent", "ingrédients", "minuteur", "arrêter l’écoute"],
    ["previous", "ingredients", "timer", "stop listening"],
    ["zurück", "Zutaten", "Timer", "Zuhören beenden"],
    ["anterior", "ingredientes", "temporizador", "dejar de escuchar"],
    ["indietro", "ingredienti", "timer", "interrompi ascolto"],
    ["forrige", "ingredienser", "timer", "stop med at lytte"],
  ])("recognises every advertised command: %s, %s, %s, %s", (...phrases) => {
    expect(phrases.map(cookingCommand)).toEqual(["previous", "ingredients", "timer", "stop"]);
  });
  it("ignores ambiguous speech and recognises only complete commands", () => {
    expect(cookingCommand("ne passe pas au suivant")).toBeNull();
    expect(cookingCommand("previous step, please")).toBeNull();
    expect(cookingCommand("Étape suivante.")).toBe("next");
    expect(cookingCommand("arrêter l’écoute")).toBe("stop");
  });
});

describe("private backups, books and community challenges", () => {
  it("remaps recipe references after import without attaching notes to a different recipe with the same ID", () => {
    const source = recipe("old", "Cake");
    const data = {
      ...emptyKitchen(),
      meals: [meal("recipe", { recipeId: "old" }), meal("leftovers")],
      journals: { old: { ...emptyJournal(), notes: "private" } },
      menus: [{ id: "m", title: "Menu", recipeIds: ["old"] }],
      remindersEnabled: true,
    };
    const result = remapKitchenBackup(
      data,
      [source],
      [recipe("old", "Unrelated", ["salt"]), { ...source, id: "new" }],
    );
    expect(result.unresolved).toBe(0);
    expect(result.data.meals[0].recipeId).toBe("new");
    expect(result.data.journals.new.notes).toBe("private");
    expect(result.data.menus?.[0].recipeIds).toEqual(["new"]);
    expect(result.data.remindersEnabled).toBe(false);
  });
  it("keeps unresolved references unavailable rather than guessing between duplicates", () => {
    const source = recipe("old", "Cake");
    const result = remapKitchenBackup(
      { ...emptyKitchen(), meals: [meal("recipe", { recipeId: "old" })] },
      [source],
      [
        { ...source, id: "a" },
        { ...source, id: "b" },
      ],
    );
    expect(result.unresolved).toBe(1);
    expect(result.data.meals[0].recipeId).toBe("unresolved:old");
  });
  it("rejects duplicate IDs in a backup", () =>
    expect(() =>
      parseKitchenData({
        ...emptyKitchen(),
        meals: [meal("out"), meal("out")],
      }),
    ).toThrow());
  it("creates a text cookbook with a table of contents, preserving selection order and excluding private notes", () => {
    const html = createRecipeBookHtml(
      [
        { ...recipe("a", "First"), localMeta: { servingOverride: 99 } },
        recipe("b", "Second"),
      ],
      {
        title: "My <book>",
        ingredients: "Ingredients",
        instructions: "Steps",
        servings: "servings",
      },
    );
    expect(html.indexOf("First")).toBeLessThan(html.indexOf("Second"));
    expect(html.match(/<article>/g)).toHaveLength(2);
    expect(html).toContain("My &lt;book&gt;");
    expect(html).not.toContain("servingOverride");
    expect(html).not.toMatch(/<script/);
  });

});

describe("history and bounded substitution advice", () => {
  it("includes simple meals, leftovers and outings only after they are marked as eaten", async () => {
    const { kitchenHistory } = await import("../features/kitchen/history");
    const data = {
      ...emptyKitchen(),
      meals: [
        meal("simple", { title: "Quick pasta", completed: true }),
        meal("out", { title: "Restaurant", completed: true }),
        meal("leftovers", { title: "Soup", completed: false }),
      ],
    };
    expect(kitchenHistory(data, []).map((entry) => entry.meal?.title)).toEqual([
      "Quick pasta",
      "Restaurant",
    ]);
  });
  it("does not duplicate a recipe logged in both the planner and the cooking journal", async () => {
    const { kitchenHistory } = await import("../features/kitchen/history");
    const data = {
      ...emptyKitchen(),
      meals: [meal("recipe", { completed: true })],
      journals: { r: { ...emptyJournal(), cooked: ["2026-10-18"] } },
    };
    expect(kitchenHistory(data, [recipe("r", "R")])).toHaveLength(1);
  });
  it("calculates documented ratios only within the allowed preparation context", async () => {
    const { substitutionAmount } = await import(
      "../features/kitchen/substitutions"
    );
    expect(substitutionAmount("muffins", 2)).toEqual({
      amount: 114,
      unit: "g",
    });
    expect(substitutionAmount("white", 1)).toEqual({ amount: 28, unit: "g" });
    expect(substitutionAmount("flax", 3)).toEqual({
      amount: 3,
      water: 9,
      unit: "tbsp",
    });
    expect(substitutionAmount("butter", 100)).toEqual({
      amount: 75,
      unit: "ml",
    });
    for (const [context, amount] of [
      ["omelette", 1],
      ["muffins", 4],
      ["white", 0.5],
      ["flax", 0],
      ["butter", Infinity],
    ] as const)
      expect(substitutionAmount(context, amount)).toBeNull();
  });
});

describe("durable cooking timer snapshots", () => {
  it("keeps the persisted deadline stable across ticks and scopes it to its account", async () => {
    const { timerSnapshot, cookingTimerScope, timerScopeRecipe } = await import(
      "../features/kitchen/cookingTimerState"
    );
    const timer = {
      durationSeconds: 300,
      remainingSeconds: 250,
      endsAt: 1000000,
      running: true,
      notificationId: "local-alarm",
    };
    expect(timerSnapshot(timer)).toEqual(
      timerSnapshot({ ...timer, remainingSeconds: 249 }),
    );
    expect(
      timerSnapshot({ ...timer, running: false, remainingSeconds: 249 })
        .remainingSeconds,
    ).toBe(249);
    const scope = cookingTimerScope("https://account.example:user", "step:1");
    expect(timerScopeRecipe(scope, "https://account.example:user")).toBe(
      "step:1",
    );
    expect(timerScopeRecipe(scope, "another-account")).toBeNull();
  });
  it("rejects corrupt timer state and drops native identifiers when restoring a backup", async () => {
    const bad = {
      ...emptyJournal(),
      stepTimerStates: {
        "step-0": { durationSeconds: 60, remainingSeconds: 60, running: true },
      },
    };
    expect(() =>
      parseKitchenData({ ...emptyKitchen(), journals: { r: bad } }),
    ).toThrow();
    const source = recipe("r", "Recipe");
    const data = {
      ...emptyKitchen(),
      journals: {
        r: {
          ...emptyJournal(),
          stepTimerStates: {
            "step-0": {
              durationSeconds: 60,
              remainingSeconds: 60,
              running: true,
              endsAt: 1000000,
              notificationId: "other-device",
            },
          },
        },
      },
    };
    expect(
      remapKitchenBackup(data, [source], [source]).data.journals.r
        .stepTimerStates,
    ).toBeUndefined();
  });
});
