import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCookingVoice } from "../features/kitchen/useCookingVoice";

const mocks = vi.hoisted(() => ({
  listeners: {} as Record<string, (event: { text?: string }) => void>,
  appState: (_state: string) => {},
  available: vi.fn(), start: vi.fn(), stop: vi.fn(), command: vi.fn(),
}));
vi.mock("react-native", () => ({ AppState: {
  addEventListener: (_name: string, callback: typeof mocks.appState) => {
    mocks.appState = callback;
    return { remove: vi.fn() };
  },
} }));
vi.mock("../features/kitchen/kitchenNative", () => ({
  startLocalVoice: mocks.start,
  getKitchenNative: () => ({
    voiceAvailable: mocks.available,
    stopVoice: mocks.stop,
    addListener: (name: string, callback: (event: { text?: string }) => void) => {
      mocks.listeners[name] = callback;
      return { remove: vi.fn() };
    },
  }),
}));
let screen: ReactTestRenderer;
let voice: ReturnType<typeof useCookingVoice>;
function Probe() {
  const current = useCookingVoice("fr-FR", mocks.command);
  React.useEffect(() => { voice = current; });
  return null;
}
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  mocks.available.mockResolvedValue(true);
  mocks.start.mockResolvedValue(true);
  mocks.stop.mockResolvedValue(undefined);
  await act(async () => { screen = create(React.createElement(Probe)); });
});
afterEach(async () => {
  await act(async () => screen.unmount());
  vi.unstubAllGlobals();
});
it("keeps the first iOS activation through permission dialogs", async () => {
  mocks.start.mockImplementationOnce(async () => {
    mocks.appState("inactive");
    mocks.appState("active");
    return true;
  });
  await act(async () => voice.toggle());
  expect(voice.listening).toBe(true);
  expect(voice.failed).toBe(false);
  expect(mocks.stop).not.toHaveBeenCalled();
});
it("handles successive commands and resumes after Android silence without executing a command", async () => {
  await act(async () => voice.toggle());
  for (const text of ["Étape suivante.", "", "précédent"]) {
    await act(async () => mocks.listeners.voiceResult({ text }));
  }
  expect(mocks.command.mock.calls).toEqual([["next"], ["previous"]]);
  expect(mocks.start).toHaveBeenCalledTimes(4);
  expect(voice.listening).toBe(true);
  await act(async () => mocks.listeners.voiceResult({ text: "arrêter l’écoute" }));
  expect(voice.listening).toBe(false);
  expect(mocks.start).toHaveBeenCalledTimes(4);
});
it("stops in the background and ignores late recognition results", async () => {
  await act(async () => voice.toggle());
  await act(async () => mocks.appState("background"));
  await act(async () => mocks.listeners.voiceResult({ text: "suivant" }));
  expect(voice.listening).toBe(false);
  expect(mocks.stop).toHaveBeenCalled();
  expect(mocks.command).not.toHaveBeenCalled();
  expect(mocks.start).toHaveBeenCalledTimes(1);
});
it("stops a pending restart if the app enters the background", async () => {
  await act(async () => voice.toggle());
  let resolve!: (started: boolean) => void;
  mocks.start.mockImplementationOnce(() => new Promise<boolean>((done) => { resolve = done; }));
  await act(async () => mocks.listeners.voiceResult({ text: "suivant" }));
  await act(async () => mocks.appState("background"));
  mocks.stop.mockClear();
  await act(async () => resolve(true));
  expect(mocks.stop).toHaveBeenCalled();
  expect(voice.listening).toBe(false);
});
it("reports fatal recognition errors and allows another activation", async () => {
  await act(async () => voice.toggle());
  await act(async () => mocks.listeners.voiceError({}));
  expect(voice.failed).toBe(true);
  expect(voice.listening).toBe(false);
  await act(async () => voice.toggle());
  expect(voice.listening).toBe(true);
  expect(voice.failed).toBe(false);
});

it("ignores unknown transcripts and can process a recognized command after restarting", async () => {
  await act(async () => voice.toggle());
  await act(async () => mocks.listeners.voiceResult({ text: "étape" }));
  expect(mocks.command).not.toHaveBeenCalled();
  await act(async () => mocks.listeners.voiceResult({ text: "Étape suivante." }));
  expect(mocks.command).toHaveBeenCalledExactlyOnceWith("next");
});
