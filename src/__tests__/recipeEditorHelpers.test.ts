import { describe, expect, it } from "vitest";
import {
  applyKeywordSuggestion,
  expandEditableListItem,
  getInsertedText,
  getKeywordSuggestions,
  isMultilinePaste
} from "../screens/recipeEditorHelpers";

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

  it("finds the text inserted between two input values", () => {
    expect(getInsertedText("Mix well", "Mix\nwell")).toBe("\n");
    expect(getInsertedText("Mix\nwell", "Mix the\nwell")).toBe(" the");
  });

  it("does not treat typing in a multi-line step as a paste (#129)", () => {
    expect(isMultilinePaste("Mix well", "Mix well\n")).toBe(false);
    expect(isMultilinePaste("Mix well\nBake", "Mix well\nBake for ")).toBe(false);
    expect(isMultilinePaste("Mix\nBake", "Mix gently\nBake")).toBe(false);
  });

  it("still splits real multi-line pastes", () => {
    expect(isMultilinePaste("", "200 g flour\n100 g sugar")).toBe(true);
    expect(isMultilinePaste("Step", "Step one\nStep two")).toBe(true);
  });
});
