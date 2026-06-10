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
});
