import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocalDay } from "../features/kitchen/useLocalDay";
const mocks = vi.hoisted(() => ({
  listener: undefined as undefined | ((state: string) => void),
  remove: vi.fn(),
}));
vi.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: (_: string, listener: (state: string) => void) => {
      mocks.listener = listener;
      return { remove: mocks.remove };
    },
  },
}));
let screen: ReactTestRenderer;
function DailyClock() {
  return React.createElement("span", null, useLocalDay());
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 19, 23, 59, 50));
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("daily kitchen date", () => {
  it("switches days at local midnight without reopening the screen", async () => {
    await act(async () => {
      screen = create(React.createElement(DailyClock));
    });
    expect(screen.root.findByType("span").children[0]).toBe("2026-10-19");
    await act(async () => {
      vi.advanceTimersByTime(11000);
    });
    expect(screen.root.findByType("span").children[0]).toBe("2026-10-20");
  });
  it("refreshes after returning from the background without polling while inactive", async () => {
    await act(async () => {
      screen = create(React.createElement(DailyClock));
    });
    await act(async () => {
      mocks.listener!("background");
    });
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(new Date(2026, 9, 22, 8));
    await act(async () => {
      mocks.listener!("active");
    });
    expect(screen.root.findByType("span").children[0]).toBe("2026-10-22");
    expect(vi.getTimerCount()).toBe(1);
  });
});
