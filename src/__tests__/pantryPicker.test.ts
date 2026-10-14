import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PantryListPicker } from "../screens/PantryListPicker";
import { PantryClient, PantryError } from "../features/pantry/pantryClient";
import en from "../i18n/locales/en";
const mocks = vi.hoisted(() => ({
  mode: { kind: "local" } as { kind: string; selection?: { house: { id: number; name: string }; list: { id: number; houseId: number; name: string } } },
  auth: { credentials: { serverUrl: "https://cloud.example", username: "alice", appPassword: "test-only" } as { serverUrl: string; username: string; appPassword: string } | null },
  switchToPantry: vi.fn(async () => {}), alert: vi.fn()
}));
vi.mock("react-native", () => ({ View: "View", Pressable: "Pressable", ActivityIndicator: "Spinner", StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1 }, Alert: { alert: mocks.alert }, Linking: { openURL: vi.fn() } }));
vi.mock("lucide-react-native", () => Object.fromEntries(["ArrowLeft", "ArrowUpRight", "ChevronRight", "Home", "ListChecks", "Plus", "ShoppingBag", "Check"].map((name) => [name, name])));
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
let screen: ReactTestRenderer; const done = vi.fn(); const busy = vi.fn();
async function render() { await act(async () => { screen = create(React.createElement(PantryListPicker, { credentials: mocks.auth.credentials!, onDone: done, onBusyChange: busy })); }); }
function button(label: string) { return screen.root.findAll((node) => typeof node.type === "string" && node.props.label === label)[0]; }
async function press(label: string) { const node = button(label); expect(node).toBeDefined(); expect(node.props.disabled).not.toBe(true); await act(async () => { node.props.onPress(); }); }
async function choose(label = "Groceries, Home") {
  const node = screen.root.findAll((node) => String(node.type) === "Pressable" && node.props.accessibilityLabel === label)[0];
  expect(node).toBeDefined(); await act(async () => { node.props.onPress(); });
}
beforeEach(() => {
  mocks.mode = { kind: "local" };
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); done.mockClear(); busy.mockClear(); mocks.switchToPantry.mockReset().mockResolvedValue();
  mocks.auth = { credentials: { serverUrl: "https://cloud.example", username: "alice", appPassword: "test-only" } };
  vi.spyOn(PantryClient.prototype, "houses").mockResolvedValue([house]); vi.spyOn(PantryClient.prototype, "lists").mockResolvedValue([list]);
  vi.spyOn(PantryClient.prototype, "createList").mockResolvedValue({ ...list, id: 4, name: "Weekend" });
});
afterEach(async () => { if (screen) await act(async () => screen.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("direct Pantry list selection", () => {
  it("loads existing lists immediately without a welcome page or household-selection step", async () => {
    await render();
    expect(PantryClient.prototype.houses).toHaveBeenCalledOnce(); expect(PantryClient.prototype.lists).toHaveBeenCalledWith(1);
    expect(JSON.stringify(screen.toJSON())).toContain("Groceries, Home");
    expect(JSON.stringify(screen.toJSON())).not.toContain("Choose a household");
    await choose(); expect(mocks.switchToPantry).toHaveBeenCalledWith({ house, list }); expect(done).toHaveBeenCalledOnce();
  });
  it("shows lists from several households together, with unambiguous labels", async () => {
    const other = { id: 5, name: "Work" }; const otherList = { ...list, id: 6, houseId: 5 };
    vi.mocked(PantryClient.prototype.houses).mockResolvedValueOnce([house, other]);
    vi.mocked(PantryClient.prototype.lists).mockImplementation(async (id) => id === 1 ? [list] : [otherList]);
    await render(); await choose("Groceries, Work");
    expect(mocks.switchToPantry).toHaveBeenCalledWith({ house: other, list: otherList });
  });
  it("marks the current list without hiding other households", async () => {
    mocks.mode = { kind: "pantry", selection: { house, list } }; await render();
    const selected = screen.root.findAll((node) => String(node.type) === "Pressable" && node.props.accessibilityState?.selected);
    expect(selected).toHaveLength(1); expect(selected[0].props.accessibilityLabel).toBe("Groceries, Home");
  });
  it("keeps the original mode active after a failed migration and allows retrying the same list", async () => {
    mocks.switchToPantry.mockRejectedValueOnce(new PantryError("network"));
    await render(); await choose();
    expect(done).not.toHaveBeenCalled(); expect(JSON.stringify(screen.toJSON())).toContain("Your previous mode remains active");
    await choose(); expect(done).toHaveBeenCalledOnce();
  });
  it("handles unavailable Pantry and retries discovery", async () => {
    vi.mocked(PantryClient.prototype.houses).mockRejectedValueOnce(new PantryError("unavailable"));
    await render(); expect(JSON.stringify(screen.toJSON())).toContain("Check that Pantry is installed");
    await press(en.translation.common.retry); expect(JSON.stringify(screen.toJSON())).toContain("Groceries, Home");
  });
  it("keeps accessible lists when another household fails to load", async () => {
    vi.mocked(PantryClient.prototype.houses).mockResolvedValueOnce([house, { id: 5, name: "Work" }]);
    vi.mocked(PantryClient.prototype.lists).mockImplementation(async (id) => { if (id === 5) throw new PantryError("forbidden"); return [list]; });
    await render(); expect(JSON.stringify(screen.toJSON())).toContain("Groceries, Home");
    expect(JSON.stringify(screen.toJSON())).toContain("permission");
    await choose(); expect(done).toHaveBeenCalledOnce();
  });
  it("keeps an accepted new list selectable after its migration fails", async () => {
    mocks.switchToPantry.mockRejectedValueOnce(new PantryError("network"));
    await render(); await press(en.translation.pantry.newList);
    await act(async () => { screen.root.findByType("Input" as never).props.onChangeText("Weekend"); });
    await press(en.translation.pantry.createList);
    expect(PantryClient.prototype.createList).toHaveBeenCalledWith(1, "Weekend");
    expect(done).not.toHaveBeenCalled(); await choose("Weekend, Home");
    expect(PantryClient.prototype.createList).toHaveBeenCalledOnce(); expect(done).toHaveBeenCalledOnce();
  });
  it("aborts discovery and ignores late responses after closing", async () => {
    let finish!: (houses: typeof house[]) => void;
    vi.mocked(PantryClient.prototype.houses).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const dispose = vi.spyOn(PantryClient.prototype, "dispose"); await render();
    await act(async () => { screen.unmount(); finish([house]); });
    expect(dispose).toHaveBeenCalledOnce(); expect(done).not.toHaveBeenCalled();
  });
  it("does not offer creation without household permission", async () => {
    vi.mocked(PantryClient.prototype.houses).mockResolvedValueOnce([{ ...house, permissions: { canCreateLists: false } }]);
    await render(); expect(button(en.translation.pantry.newList)).toBeUndefined();
  });
  it("explains an empty account without switching or creating anything", async () => {
    vi.mocked(PantryClient.prototype.houses).mockResolvedValueOnce([]); await render();
    expect(JSON.stringify(screen.toJSON())).toContain(en.translation.pantry.noHouses);
    expect(mocks.switchToPantry).not.toHaveBeenCalled(); expect(PantryClient.prototype.createList).not.toHaveBeenCalled();
  });
});
