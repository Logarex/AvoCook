import { describe, expect, it } from "vitest";
import { scaleIngredientLine } from "../src/utils/servings";

describe("scaleIngredientLine", () => {
  it("scales simple quantities and decimals", () => {
    expect(scaleIngredientLine("200 g de farine", 1.5)).toBe(
      "300 g de farine"
    );
    expect(scaleIngredientLine("1,5 l de bouillon", 2)).toBe(
      "3 l de bouillon"
    );
  });

  it("scales fractional quantities", () => {
    expect(scaleIngredientLine("1/2 cuillère de sel", 2)).toBe(
      "1 cuillère de sel"
    );
    expect(scaleIngredientLine("1 1/2 tasse de riz", 2)).toBe(
      "3 tasse de riz"
    );
    expect(scaleIngredientLine("½ citron", 3)).toBe("1,5 citron");
  });

  it("does not change ingredient names that contain numbers", () => {
    expect(scaleIngredientLine("vitamine B12", 2)).toBe("vitamine B12");
  });
});
