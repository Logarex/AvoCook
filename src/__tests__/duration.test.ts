import { describe, expect, it } from "vitest";
import {
  humanDuration,
  isoDurationToMinutes,
  minutesToIsoDuration
} from "../utils/duration";

describe("duration utilities", () => {
  it("converts minutes to ISO-8601 duration", () => {
    expect(minutesToIsoDuration(35)).toBe("PT35M");
    expect(minutesToIsoDuration(95)).toBe("PT1H35M");
    expect(minutesToIsoDuration(null)).toBeNull();
  });

  it("converts ISO-8601 duration to minutes and display text", () => {
    expect(isoDurationToMinutes("PT1H30M")).toBe(90);
    expect(humanDuration("PT1H30M")).toBe("1 h 30 min");
    expect(humanDuration("PT20M")).toBe("20 min");
  });

  it("handles raw numeric strings and text formats", () => {
    expect(isoDurationToMinutes("15")).toBe(15);
    expect(humanDuration("15")).toBe("15 min");
    expect(humanDuration("90")).toBe("1 h 30 min");
    expect(isoDurationToMinutes("1h30")).toBe(90);
    expect(humanDuration("1h30")).toBe("1 h 30 min");
    expect(isoDurationToMinutes("15 min")).toBe(15);
    expect(humanDuration("15 min")).toBe("15 min");
    expect(humanDuration("0")).toBeNull();
    expect(humanDuration("PT0M")).toBeNull();
  });

  it("reads fractional ISO durations from imported recipes", () => {
    expect(isoDurationToMinutes("PT1.5H")).toBe(90);
    expect(isoDurationToMinutes("PT1,5H")).toBe(90);
    expect(isoDurationToMinutes("PT0.5M30S")).toBe(1);
    expect(isoDurationToMinutes("PT1M30.5S")).toBe(2);
    expect(minutesToIsoDuration(1.5)).toBe("PT1M30S");
    expect(isoDurationToMinutes(minutesToIsoDuration(1.5))).toBe(2);
  });

  it("rejects non-finite and overflowing durations", () => {
    for (const value of [NaN, Infinity, -Infinity, Number.MAX_VALUE, -1, 0]) {
      expect(minutesToIsoDuration(value)).toBeNull();
    }
    expect(isoDurationToMinutes("9".repeat(400))).toBeNull();
    expect(isoDurationToMinutes(`PT${"9".repeat(400)}H`)).toBeNull();
  });
});
