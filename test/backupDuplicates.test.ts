import { describe, expect, it } from "vitest";
import { resolveRecipeImport } from "../src/features/recipes/backupDuplicates";
import { normalizeRecipe } from "../src/features/recipes/types";

describe("resolveRecipeImport", () => {
  it("skips exact duplicates", () => {
    const existing = normalizeRecipe({
      id: "1",
      name: "Tarte aux pommes",
      url: "https://example.com/tarte",
      recipeIngredient: ["pommes"],
      recipeInstructions: ["cuire"]
    });

    expect(resolveRecipeImport(existing, [existing])).toMatchObject({
      action: "skip",
      reason: "exact"
    });
  });

  it("updates matching recipes by source URL", () => {
    const existing = normalizeRecipe({
      id: "1",
      name: "Tarte aux pommes",
      url: "https://example.com/tarte",
      recipeIngredient: ["pommes"],
      recipeInstructions: ["cuire"]
    });
    const imported = normalizeRecipe({
      id: "2",
      name: "Tarte aux pommes",
      url: "https://example.com/tarte/",
      recipeIngredient: ["pommes", "sucre"],
      recipeInstructions: ["cuire"]
    });

    expect(resolveRecipeImport(imported, [existing])).toMatchObject({
      action: "update",
      reason: "url",
      recipe: { id: "1" }
    });
  });

  it("renames same-name conflicts when content is different", () => {
    const existing = normalizeRecipe({
      id: "1",
      name: "Soupe",
      recipeIngredient: ["carotte"],
      recipeInstructions: ["mixer"]
    });
    const imported = normalizeRecipe({
      id: "2",
      name: "Soupe",
      recipeIngredient: ["tomate"],
      recipeInstructions: ["mijoter"]
    });

    expect(resolveRecipeImport(imported, [existing])).toMatchObject({
      action: "create",
      reason: "name-conflict",
      renamed: true,
      recipe: { name: "Soupe (import)" }
    });
  });
});
