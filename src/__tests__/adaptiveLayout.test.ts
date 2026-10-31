import { describe, expect, it } from "vitest";
import { getAdaptiveLayout } from "../utils/adaptiveLayout";

describe("adaptive window layouts", () => {
  it("keeps compact windows and Split View in one column", () => {
    for (const width of [320, 375, 390, 540]) {
      expect(getAdaptiveLayout(width, 1)).toEqual({ columns: 1, sideBySide: false });
    }
  });

  it("uses extra space when unfolding and returns to compact when folding", () => {
    expect([390, 820, 390].map((width) => getAdaptiveLayout(width, 1))).toEqual([
      { columns: 1, sideBySide: false },
      { columns: 2, sideBySide: true },
      { columns: 1, sideBySide: false },
    ]);
  });

  it("reserves safe areas and respects large text", () => {
    expect(getAdaptiveLayout(760, 1, 88).sideBySide).toBe(false);
    expect(getAdaptiveLayout(820, 1.5)).toEqual({ columns: 1, sideBySide: false });
    expect(getAdaptiveLayout(1400, 2)).toEqual({ columns: 1, sideBySide: false });
  });
});
