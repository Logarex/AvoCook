import { describe, expect, it } from "vitest";
import {
  applyKeywordSuggestion,
  expandEditableListItem,
  getKeywordSuggestions
} from "../src/screens/recipeEditorHelpers";

describe("recipe editor helpers", () => {
  it("suggests existing keywords for the keyword currently being typed", () => {
    const suggestions = getKeywordSuggestions("ra", [
      { keywords: "rapide,frais" },
      { keywords: "dessert,ratatouille" }
    ]);

    expect(suggestions).toEqual(["frais", "rapide", "ratatouille"]);
  });

  it("keeps already selected keywords out of the suggestions", () => {
    const suggestions = getKeywordSuggestions("rapide, fr", [
      { keywords: "rapide,frais" },
      { keywords: "fromage" }
    ]);

    expect(suggestions).toEqual(["frais", "fromage"]);
  });

  it("does not suggest a completed keyword after a trailing comma", () => {
    const suggestions = getKeywordSuggestions("rapide, ", [
      { keywords: "rapide,frais" }
    ]);

    expect(suggestions).toEqual(["frais"]);
  });

  it("applies a keyword suggestion to the current comma-separated segment", () => {
    expect(applyKeywordSuggestion("rapide, fr", "frais")).toBe("rapide, frais");
    expect(applyKeywordSuggestion("des", "dessert")).toBe("dessert");
  });

  it("splits pasted ingredient lines into separate editable items", () => {
    expect(
      expandEditableListItem(["2 eggs", ""], 1, "200 g flour\n100 g sugar\n\n1 tsp salt")
    ).toEqual(["2 eggs", "200 g flour", "100 g sugar", "1 tsp salt"]);
  });
});
