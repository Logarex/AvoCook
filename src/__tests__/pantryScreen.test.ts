import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PantryScreen } from "../screens/PantryScreen";
import { PantryClient, PantryError } from "../features/pantry/pantryClient";
import en from "../i18n/locales/en";
const mocks = vi.hoisted(() => ({
  mode: { kind: "local" } as { kind: string; selection?: { house: { id: number; name: string }; list: { id: number; houseId: number; name: string } } },
  auth: { credentials: { serverUrl: "https://cloud.example", username: "alice", appPassword: "test-only" } as { serverUrl: string; username: string; appPassword: string } | null },
  switchToPantry: vi.fn(async () => {}), alert: vi.fn()
}));
vi.mock("react-native", () => ({ View: "View", Pressable: "Pressable", ActivityIndicator: "Spinner", StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1 }, Alert: { alert: mocks.alert }, Linking: { openURL: vi.fn() } }));
vi.mock("lucide-react-native", () => Object.fromEntries(["ArrowLeft", "ArrowUpRight", "ChevronRight", "Home", "ListChecks", "Plus", "ShoppingBag"].map((name) => [name, name])));
vi.mock("../features/auth/AuthProvider", () => ({ useAuth: () => mocks.auth }));
vi.mock("../features/shopping/ShoppingListProvider", () => ({ useShoppingList: () => ({ mode: mocks.mode, switching: false, switchToPantry: mocks.switchToPantry }) }));
vi.mock("../theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: { primary: "green" } }) }));
vi.mock("../components/Screen", () => ({ Screen: "Screen" }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/GlassPanel", () => ({ GlassPanel: "Panel" }));
vi.mock("../components/IconButton", () => ({ IconButton: "IconButton" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../components/EmptyState", () => ({ EmptyState: "Empty" }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key.split(".").reduce<unknown>((value, part) => (value as Record<string, unknown>)?.[part], en.translation) ?? key }) }));
const house = { id: 1, name: "Home" }; const list = { id: 2, houseId: 1, name: "Groceries", canEdit: true };
let screen: ReactTestRenderer; const back = vi.fn();
async function render() { await act(async () => { screen = create(React.createElement(PantryScreen, { navigation: { goBack: back } } as never)); }); }
async function press(label: string) {
  const button = screen.root.findAll((node) => typeof node.type === "string" && node.props.label === label)[0];
  expect(button).toBeDefined(); expect(button.props.disabled).not.toBe(true);
  await act(async () => { await button.props.onPress(); });
}
async function chooseHouse() {
  await press("Choose a Pantry list");
  await act(async () => { await screen.root.findAll((node) => String(node.type) === "Pressable")[0].props.onPress(); });
}
beforeEach(() => {
  mocks.mode = { kind: "local" };
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); back.mockClear(); mocks.switchToPantry.mockReset().mockResolvedValue();
  mocks.auth = { credentials: { serverUrl: "https://cloud.example", username: "alice", appPassword: "test-only" } };
  vi.spyOn(PantryClient.prototype, "houses").mockResolvedValue([house]); vi.spyOn(PantryClient.prototype, "lists").mockResolvedValue([list]);
  vi.spyOn(PantryClient.prototype, "createList").mockResolvedValue({ ...list, id: 4, name: "Weekend" });
});
afterEach(async () => { if (screen) await act(async () => screen.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("Pantry mode setup", () => {
  it("requires Nextcloud and performs no Pantry calls for local-only accounts", async () => {
    mocks.auth.credentials = null; await render();
    expect(JSON.stringify(screen.toJSON())).toContain("Connect a Nextcloud account");
    expect(PantryClient.prototype.houses).not.toHaveBeenCalled();
  });
  it("opens the current Pantry household's lists directly when changing lists", async () => {
    mocks.mode = { kind: "pantry", selection: { house, list } }; await render();
    expect(PantryClient.prototype.houses).toHaveBeenCalledOnce();
    expect(PantryClient.prototype.lists).toHaveBeenCalledWith(1);
    expect(JSON.stringify(screen.toJSON())).toContain("Choose a list");
    expect(JSON.stringify(screen.toJSON())).not.toContain("Choose a Pantry list");
  });
  it("loads households only on demand and switches the main shopping mode after selecting a list", async () => {
    await render(); expect(PantryClient.prototype.houses).not.toHaveBeenCalled();
    await chooseHouse();
    await act(async () => { await screen.root.findAll((node) => String(node.type) === "Pressable")[0].props.onPress(); });
    expect(mocks.switchToPantry).toHaveBeenCalledWith({ house, list }); expect(back).toHaveBeenCalledOnce();
    expect(JSON.stringify(screen.toJSON())).not.toContain("Send items");
  });
  it("keeps the picker open and explains that the source remains active after a failed migration", async () => {
    mocks.switchToPantry.mockRejectedValueOnce(new PantryError("network"));
    await render(); await chooseHouse();
    await act(async () => { await screen.root.findAll((node) => String(node.type) === "Pressable")[0].props.onPress(); });
    expect(back).not.toHaveBeenCalled();
    expect(JSON.stringify(screen.toJSON())).toContain("Your previous mode remains active");
    await act(async () => { await screen.root.findAll((node) => String(node.type) === "Pressable")[0].props.onPress(); });
    expect(back).toHaveBeenCalledOnce();
  });
  it("shows unavailable Pantry and supports retry", async () => {
    vi.mocked(PantryClient.prototype.houses).mockRejectedValueOnce(new PantryError("unavailable"));
    await render(); await press("Choose a Pantry list");
    expect(JSON.stringify(screen.toJSON())).toContain("Check that Pantry is installed");
    await press(en.translation.common.retry);
    expect(JSON.stringify(screen.toJSON())).toContain("Choose a household");
  });
  it("keeps a newly created list selectable if the subsequent migration fails", async () => {
    mocks.switchToPantry.mockRejectedValueOnce(new PantryError("network"));
    await render(); await chooseHouse();
    await act(async () => { screen.root.findByType("Input" as never).props.onChangeText("Weekend"); });
    await press("Create and use this list");
    expect(PantryClient.prototype.createList).toHaveBeenCalledWith(1, "Weekend");
    expect(JSON.stringify(screen.toJSON())).toContain("Weekend"); expect(back).not.toHaveBeenCalled();
  });
  it("resets the picker immediately when the Nextcloud account changes", async () => {
    await render(); await chooseHouse();
    mocks.auth.credentials = { ...mocks.auth.credentials!, username: "bob" };
    await act(async () => { screen.update(React.createElement(PantryScreen, { navigation: { goBack: back } } as never)); });
    expect(JSON.stringify(screen.toJSON())).toContain("Choose a Pantry list");
    expect(screen.root.findAll((node) => String(node.type) === "Pressable")).toHaveLength(0);
  });
});
