import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeRecipe, type Recipe } from "../features/recipes/types";
import en from "../i18n/locales/en";
import { RecipeEditorScreen } from "../screens/RecipeEditorScreen";

const mocks = vi.hoisted(() => ({
  recipe: undefined as Recipe | undefined,
  save: vi.fn(async (recipe: Recipe) => ({ ...recipe, id: "test" })),
}));
vi.mock("react-native", () => ({
  View: "View",
  Pressable: "Pressable",
  Switch: "Switch",
  Platform: { OS: "ios" },
  StyleSheet: { create: (value: unknown) => value },
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));
vi.mock("expo-image", () => ({ Image: "Image" }));
vi.mock("expo-image-picker", () => ({}));
vi.mock("../features/recipes/recipeImages", () => ({
  persistRecipeImage: vi.fn(),
}));
vi.mock("lucide-react-native", () =>
  Object.fromEntries(
    [
      "ArrowLeft",
      "ArrowDown",
      "ArrowUp",
      "Check",
      "ImagePlus",
      "Link",
      "Plus",
      "Save",
      "Trash2",
      "X",
      "ChevronDown",
    ].map((name) => [name, name]),
  ),
);
vi.mock("../features/auth/AuthProvider", () => ({
  useAuth: () => ({ getClient: () => null }),
}));
vi.mock("../features/recipes/RecipesProvider", () => ({
  useRecipes: () => ({
    createRecipe: mocks.save,
    updateRecipe: mocks.save,
    customCategories: [],
    getRecipe: () => mocks.recipe,
    recipes: [],
  }),
}));
vi.mock("../theme/ThemeProvider", () => ({
  useAppTheme: () => ({ colors: { primary: "green" } }),
}));
vi.mock("../components/Screen", async () => {
  const React = await import("react");
  return {
    Screen: ({
      header,
      children,
    }: {
      header: React.ReactNode;
      children: React.ReactNode;
    }) => React.createElement("Screen", {}, header, children),
  };
});
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/IconButton", () => ({ IconButton: "IconButton" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/ActionMenu", () => ({ ActionMenu: "ActionMenu" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../i18n", () => ({ default: { language: "en" } }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params: Record<string, unknown> = {}) => {
      const value = key
        .split(".")
        .reduce<unknown>(
          (value, part) => (value as Record<string, unknown>)?.[part],
          en.translation,
        );
      return typeof value === "string"
        ? value.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
            String(params[name] ?? ""),
          )
        : key;
    },
  }),
}));

let screen: ReactTestRenderer;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.recipe = undefined;
  mocks.save.mockClear();
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  vi.unstubAllGlobals();
});
async function render() {
  await act(async () => {
    screen = create(
      React.createElement(RecipeEditorScreen, {
        route: { params: { id: mocks.recipe?.id } },
        navigation: {
          canGoBack: () => true,
          goBack: vi.fn(),
          replace: vi.fn(),
        },
      } as never),
    );
  });
}
function input(label: string) {
  return screen.root.findAll(
    (node) => String(node.type) === "Input" && node.props.label === label,
  )[0];
}
async function reveal(label: string) {
  for (const title of [
    en.translation.ui.details,
    en.translation.ui.optional,
    en.translation.ui.nutrition,
  ]) {
    if (input(label)) return;
    const heading = screen.root.findAll(
      (node) =>
        typeof node.type === "function" &&
        node.type.name === "DisclosureSection" &&
        node.props.title === title,
    )[0];
    if (heading) {
      const button = heading.findAll(
        (node) =>
          String(node.type) === "Pressable" &&
          node.props.accessibilityState?.expanded === false,
      )[0];
      if (button) await act(async () => button.props.onPress());
    }
  }
}
async function enter(label: string, value: string) {
  await reveal(label);
  await act(async () => input(label).props.onChangeText(value));
}
async function save() {
  await act(async () =>
    screen.root
      .findAll(
        (node) =>
          String(node.type) === "IconButton" &&
          node.props.label === en.translation.common.save,
      )[0]
      .props.onPress(),
  );
}

describe("Markdown recipe editing and saving", () => {
  it("starts with essentials and preserves existing optional values without opening their sections", async () => {
    mocks.recipe = normalizeRecipe({
      id: "42",
      name: "Soup",
      description: "Keep this description",
      keywords: "winter",
      recipeIngredient: ["Water"],
      recipeInstructions: ["Boil"],
      tool: ["Pot"],
      nutrition: { calories: "42 kcal" },
    });
    await render();
    expect(input(en.translation.editor.description)).toBeUndefined();
    expect(input(en.translation.editor.caloriesKcal)).toBeUndefined();
    await save();
    expect(mocks.save.mock.calls[0][0]).toMatchObject({
      description: "Keep this description",
      keywords: "winter",
      tool: ["Pot"],
      nutrition: { calories: "42 kcal" },
    });
  });
  it("shows a translated save error instead of the technical server message", async () => {
    await render();
    await enter(en.translation.editor.name, "Soup");
    mocks.save.mockRejectedValueOnce(
      new Error("Cookbook returned a different recipe ID"),
    );
    await save();
    const text = JSON.stringify(screen.toJSON());
    expect(text).toContain(en.translation.editor.saveFailed);
    expect(text).not.toContain("Cookbook returned a different recipe ID");
  });

  it("saves Markdown in every editable text field, preserving multiline blocks and numeric fields", async () => {
    await render();
    await enter(en.translation.editor.name, "**Crème**");
    await enter(
      en.translation.editor.description,
      "## Sauce\n\n> *Mix* gently",
    );
    await enter(en.translation.editor.category, "**Dessert**");
    await enter(en.translation.editor.keywords, "*Quick*, **Sweet**");
    await act(async () =>
      screen.root
        .findAll(
          (node) =>
            String(node.type) === "Button" &&
            node.props.label === en.translation.editor.addSource,
        )[0]
        .props.onPress(),
    );
    await enter(
      en.translation.editor.sourceName,
      "[Chef](https://example.com)",
    );
    await enter(en.translation.editor.sourceUrl, "https://example.com/recipe");
    await enter("Ingredient 1", "**200 g** flour\n*2* eggs");
    const step = "## Mix\n\n- **Stir**\n  - salt\n\n```\n  Cool\n```";
    await enter("Step 1", step);
    const tool = "**Whisk**\n\n> Hand wash";
    await enter("Tool 1", tool);
    await enter(en.translation.editor.caloriesKcal, "**420**");
    await enter(en.translation.editor.proteinGrams, "*10*");
    await enter(en.translation.recipes.yield, "4");
    await enter(en.translation.editor.prepMinutes, "15");
    await save();
    const recipe = mocks.save.mock.calls[0][0];
    expect(recipe.name).toBe("**Crème**");
    expect(recipe.description).toBe("## Sauce\n\n> *Mix* gently");
    expect(recipe.recipeCategory).toBe("**Dessert**");
    expect(recipe.keywords).toBe("*Quick*, **Sweet**");
    expect(recipe.sourceName).toBe("[Chef](https://example.com)");
    expect(recipe.url).toBe("https://example.com/recipe");
    expect(recipe.recipeIngredient).toEqual(["**200 g** flour", "*2* eggs"]);
    expect(recipe.recipeInstructions).toEqual([step]);
    expect(recipe.tool).toEqual([tool]);
    expect(recipe.nutrition).toMatchObject({
      calories: "**420** kcal",
      proteinContent: "*10* g",
    });
    expect(recipe.recipeYield).toBe(4);
    expect(recipe.prepTime).toBe("PT15M");
    const textInputs = screen.root.findAll(
      (node) =>
        String(node.type) === "Input" &&
        !["url", "number-pad"].includes(node.props.keyboardType),
    );
    expect(textInputs.every((node) => node.props.markdown)).toBe(true);
  });

  it("reopens and saves formatted nutrition and separate tools without losing imported nutrition fields", async () => {
    mocks.recipe = normalizeRecipe({
      id: "42",
      name: "**Soup**",
      description: "## Sauce\n\n*Mix*",
      recipeIngredient: ["**200 g** flour"],
      recipeInstructions: ["**Mix**\n\n> Gently"],
      tool: ["**Whisk**\n\n> Wash", "*Spoon*"],
      nutrition: [
        {
          calories: "**420** kcal",
          proteinContent: "*10* g",
          servingSize: "**250 g**",
          cholesterolContent: "*2* mg",
        },
        { calories: "*840* kcal" },
      ],
    });
    await render();
    await reveal(en.translation.editor.caloriesKcal);
    expect(input(en.translation.editor.caloriesKcal).props.value).toBe(
      "**420** kcal",
    );
    await save();
    const recipe = mocks.save.mock.calls[0][0];
    expect(recipe.nutrition).toEqual(mocks.recipe.nutrition);
    expect(recipe.tool).toEqual(mocks.recipe.tool);
    expect(recipe.recipeInstructions).toEqual(mocks.recipe.recipeInstructions);
  });

  it("keeps ordinary nutrition entry and pasted tools simple", async () => {
    await render();
    await enter(en.translation.editor.name, "Soup");
    await enter(en.translation.editor.caloriesKcal, "420");
    await enter("Tool 1", "Whisk\nSpoon");
    await save();
    expect(mocks.save.mock.calls[0][0].nutrition).toMatchObject({
      calories: "420 kcal",
    });
    expect(mocks.save.mock.calls[0][0].tool).toEqual(["Whisk", "Spoon"]);
  });
});
