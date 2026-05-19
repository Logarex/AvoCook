import { describe, expect, it } from "vitest";
import {
  findDuplicateRecipeGroups,
  mergeDuplicateRecipeData,
  resolveRecipeImport
} from "../src/features/recipes/backupDuplicates";
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

  it("updates an exact duplicate when the imported recipe has a remote image URL", () => {
    const existing = normalizeRecipe({
      id: "1",
      name: "Baguette",
      image: "file:///documents/recipe-images/baguette.jpg",
      imageUrl: "file:///documents/recipe-images/baguette.jpg",
      recipeIngredient: ["farine"],
      recipeInstructions: ["cuire"]
    });
    const imported = normalizeRecipe({
      name: "Baguette",
      image: "https://example.com/baguette.jpg",
      imageUrl: "https://example.com/baguette.jpg",
      recipeIngredient: ["farine"],
      recipeInstructions: ["cuire"]
    });

    expect(resolveRecipeImport(imported, [existing])).toMatchObject({
      action: "update",
      reason: "signature",
      recipe: { id: "1" }
    });
  });

  it("finds duplicate recipes by source URL", () => {
    const recipes = [
      normalizeRecipe({
        id: "1",
        name: "Baguette",
        url: "https://example.com/baguette",
        recipeIngredient: ["farine"],
        recipeInstructions: ["cuire"]
      }),
      normalizeRecipe({
        id: "2",
        name: "Baguette maison",
        url: "https://example.com/baguette/",
        recipeIngredient: ["farine", "eau"],
        recipeInstructions: ["cuire"]
      })
    ];

    expect(findDuplicateRecipeGroups(recipes)).toMatchObject([
      {
        reason: "url",
        recipes: [{ id: "2" }, { id: "1" }]
      }
    ]);
  });

  it("finds imported-copy duplicates by recipe signature", () => {
    const recipes = [
      normalizeRecipe({
        id: "1",
        name: "Soupe",
        recipeIngredient: ["carotte"],
        recipeInstructions: ["mixer"]
      }),
      normalizeRecipe({
        id: "2",
        name: "Soupe (import)",
        recipeIngredient: ["carotte"],
        recipeInstructions: ["mixer"]
      })
    ];

    expect(findDuplicateRecipeGroups(recipes)).toMatchObject([
      {
        reason: "signature",
        recipes: [{ id: "1" }, { id: "2" }]
      }
    ]);
  });

  it("merges duplicate recipe data into the most complete server recipe", () => {
    const merged = mergeDuplicateRecipeData([
      normalizeRecipe({
        id: "local-1",
        name: "Soupe (import)",
        description: "Courte",
        recipeIngredient: ["carotte", "sel"],
        recipeInstructions: ["mixer"],
        image: "https://example.com/soupe.jpg"
      }),
      normalizeRecipe({
        id: "42",
        name: "Soupe",
        description: "Une soupe douce et rapide.",
        recipeIngredient: ["carotte"],
        recipeInstructions: ["mixer", "servir chaud"],
        recipeCategory: "Diner"
      })
    ]);

    expect(merged).toMatchObject({
      id: "42",
      name: "Soupe",
      description: "Une soupe douce et rapide.",
      image: "https://example.com/soupe.jpg",
      imageUrl: "https://example.com/soupe.jpg",
      recipeCategory: "Diner",
      recipeIngredient: ["carotte", "sel"],
      recipeInstructions: ["mixer", "servir chaud"]
    });
  });
});
