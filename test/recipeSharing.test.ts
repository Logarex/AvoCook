import { describe, expect, it } from "vitest";
import { getRecipeShareFilename } from "../src/features/recipes/recipeShareFilenames";

describe("getRecipeShareFilename", () => {
  it("uses the recipe name for shared PDF and AvoCook files", () => {
    expect(getRecipeShareFilename({ name: "Gâteau léger au chocolat" }, "pdf"))
      .toBe("Gâteau léger au chocolat.pdf");
    expect(getRecipeShareFilename({ name: "Gâteau léger au chocolat" }, "json"))
      .toBe("Gâteau léger au chocolat.avocook.json");
  });

  it("removes filename separators while keeping a readable title", () => {
    expect(getRecipeShareFilename({ name: "Pain / beurre: miel?" }, "pdf"))
      .toBe("Pain beurre miel.pdf");
  });
});
