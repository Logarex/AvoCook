import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShoppingModeModal } from "../screens/ShoppingModeModal";
import { PantryShoppingList } from "../screens/PantryShoppingList";
import { PantryClient } from "../features/pantry/pantryClient";
import en from "../i18n/locales/en";
const mocks = vi.hoisted(() => ({
  credentials: { serverUrl: "https://cloud.example", username: "alice", appPassword: "test-only" } as { serverUrl: string; username: string; appPassword: string } | null,
  state: {} as Record<string, unknown>, local: vi.fn(async () => {}), refresh: vi.fn(async () => {}), toggle: vi.fn(async () => {}), update: vi.fn(async () => {}), alert: vi.fn(), remove: vi.fn(), move: vi.fn()
}));
vi.mock("react-native", async () => {
  const React = await import("react");
  return { View: "View", Pressable: "Pressable", Modal: "Modal", ScrollView: "ScrollView", Switch: "Switch", ActivityIndicator: "Spinner", RefreshControl: "Refresh", StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1, absoluteFill: {} },
    AppState: { currentState: "active", addEventListener: () => ({ remove: vi.fn() }) }, Alert: { alert: mocks.alert }, Share: { share: vi.fn() },
    FlatList: ({ data, renderItem, ListEmptyComponent }: { data: unknown[]; renderItem: (args: { item: unknown; index: number }) => React.ReactNode; ListEmptyComponent: React.ReactNode }) => React.createElement("FlatList", {}, data.length ? data.map((item, index) => React.createElement(React.Fragment, { key: index }, renderItem({ item, index }))) : ListEmptyComponent) };
});
vi.mock("lucide-react-native", () => Object.fromEntries(["Check", "Cloud", "Smartphone", "Users", "X", "ChevronDown", "ChevronUp", "Pencil", "Plus", "RefreshCw", "Repeat", "Share2", "ShoppingCart", "Trash2", "BookOpen", "ListChecks", "ShoppingBag"].map((name) => [name, name])));
vi.mock("@react-navigation/native", async () => { const React = await import("react"); return { useFocusEffect: (callback: () => void) => React.useEffect(callback, [callback]) }; });
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
vi.mock("../features/auth/AuthProvider", () => ({ useAuth: () => ({ credentials: mocks.credentials }) }));
vi.mock("../features/shopping/ShoppingListProvider", () => ({ useShoppingList: () => mocks.state }));
vi.mock("../theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: { primary: "green" } }) }));
vi.mock("../components/Screen", () => ({ Screen: "Screen" }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/GlassPanel", () => ({ GlassPanel: "Panel" }));
vi.mock("../components/IconButton", () => ({ IconButton: "IconButton" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../components/EmptyState", () => ({ EmptyState: "Empty" }));
vi.mock("../components/BottomNavigation", () => ({ BottomNavigation: "Navigation" }));
vi.mock("../screens/ShoppingListShareModal", () => ({ ShoppingListShareModal: "Sharing" }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string, params: Record<string, unknown> = {}) => {
  const value = key.split(".").reduce<unknown>((value, part) => (value as Record<string, unknown>)?.[part], en.translation);
  return typeof value === "string" ? value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(params[name] ?? "")) : key;
} }) }));
let screen: ReactTestRenderer;
const house = { id: 1, name: "Home", isAdmin: true }; const list = { id: 2, houseId: 1, name: "Groceries", canEdit: true };
const item = { id: 3, listId: 2, name: "Tomatoes", quantity: "500 g", description: "Pasta", done: false, rrule: "FREQ=WEEKLY;BYDAY=MO", categoryId: 8 };
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.clearAllMocks();
  mocks.credentials = { serverUrl: "https://cloud.example", username: "alice", appPassword: "test-only" };
  mocks.state = { mode: { kind: "local" }, switching: false, switchToLocal: mocks.local };
  vi.spyOn(PantryClient.prototype, "categories").mockResolvedValue([{ id: 8, houseId: 1, name: "Produce" }]);
});
afterEach(async () => { if (screen) await act(async () => screen.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function pantryScreen(fresh = true) {
  mocks.state = { mode: { kind: "pantry", selection: { house, list }, accountKey: "alice" }, items: [{ id: "pantry-1-2-3", label: "500 g Tomatoes", checked: false }],
    pantry: { ready: true, selection: { house, list }, items: [item], fresh, busy: false, error: fresh ? null : "network" }, switching: false,
    refreshItems: mocks.refresh, addItem: vi.fn(), toggleItem: mocks.toggle, removeItem: mocks.remove, moveItem: mocks.move,
    clearChecked: vi.fn(), clearAll: vi.fn(), updatePantryItem: mocks.update, switchToLocal: mocks.local };
  await act(async () => { screen = create(React.createElement(PantryShoppingList, { navigation: { navigate: vi.fn() } } as never)); });
}
function host(label: string) { return screen.root.findAll((node) => typeof node.type === "string" && node.props.label === label)[0]; }
describe("exclusive shopping-mode interface", () => {
  it("offers exactly local, AvoCook sharing and Pantry; selecting local carries the list through the provider", async () => {
    const close = vi.fn();
    await act(async () => { screen = create(React.createElement(ShoppingModeModal, { visible: true, onClose: close, onPantry: vi.fn(), onFirebase: vi.fn() })); });
    const choices = screen.root.findAll((node) => String(node.type) === "Pressable" && node.props.accessibilityRole === "radio");
    expect(choices.map((node) => node.props.accessibilityLabel)).toEqual(["Local only", "AvoCook sharing", "Nextcloud Pantry"]);
    expect(choices.filter((node) => node.props.accessibilityState.checked)).toHaveLength(1);
    await act(async () => { choices[0].props.onPress(); });
    expect(mocks.local).toHaveBeenCalledOnce(); expect(close).toHaveBeenCalledOnce();
  });
  it("keeps Firebase available without Nextcloud and disables Pantry for those accounts", async () => {
    mocks.credentials = null; const firebase = vi.fn();
    await act(async () => { screen = create(React.createElement(ShoppingModeModal, { visible: true, onClose: vi.fn(), onPantry: vi.fn(), onFirebase: firebase })); });
    const choices = screen.root.findAll((node) => String(node.type) === "Pressable" && node.props.accessibilityRole === "radio");
    expect(choices[2].props.disabled).toBe(true); expect(choices[1].props.disabled).toBe(false);
    await act(async () => { choices[1].props.onPress(); }); expect(firebase).toHaveBeenCalledOnce();
  });
  it("shows Pantry as the main shopping list and checks directly in that mode", async () => {
    await pantryScreen(); expect(JSON.stringify(screen.toJSON())).toContain("500 g Tomatoes");
    expect(JSON.stringify(screen.toJSON())).not.toContain("Send items");
    const checkbox = screen.root.findAll((node) => String(node.type) === "Pressable" && node.props.accessibilityRole === "checkbox")[0];
    await act(async () => { checkbox.props.onPress(); }); expect(mocks.toggle).toHaveBeenCalledWith("pantry-1-2-3");
  });
  it("keeps cached Pantry articles visible offline and disables mutations", async () => {
    await pantryScreen(false);
    expect(JSON.stringify(screen.toJSON())).toContain("500 g Tomatoes");
    expect(JSON.stringify(screen.toJSON())).toContain("Could not reach Pantry");
    const checkbox = screen.root.findAll((node) => String(node.type) === "Pressable" && node.props.accessibilityRole === "checkbox")[0];
    expect(checkbox.props.disabled).toBe(true); expect(host(en.translation.shoppingList.editItem).props.disabled).toBe(true);
  });
  it("uses a compact empty state with a direct recipe action and no obsolete send instruction", async () => {
    await pantryScreen();
    mocks.state = { ...mocks.state, items: [], pantry: { ready: true, selection: { house, list }, items: [], fresh: true, busy: false, error: null } };
    const navigate = vi.fn();
    await act(async () => { screen.update(React.createElement(PantryShoppingList, { navigation: { navigate } } as never)); });
    const content = JSON.stringify(screen.toJSON());
    expect(content).toContain("Your list is empty"); expect(content).not.toContain("send your AvoCook");
    expect(host(en.translation.shoppingList.shareList)).toBeUndefined();
    await act(async () => { host(en.translation.pantry.browseRecipes).props.onPress(); });
    expect(navigate).toHaveBeenCalledWith("Recipes");
  });
  it("opens the list selector directly from the active Pantry context", async () => {
    await pantryScreen(); const navigate = vi.fn();
    await act(async () => { screen.update(React.createElement(PantryShoppingList, { navigation: { navigate } } as never)); });
    const selector = screen.root.findAll((node) => String(node.type) === "Pressable" && node.props.accessibilityLabel === en.translation.pantry.chooseActiveList)[0];
    await act(async () => { selector.props.onPress(); }); expect(navigate).toHaveBeenCalledWith("Pantry");
  });
  it("edits quantity with a narrow patch while preserving Pantry recurrence and category metadata", async () => {
    await pantryScreen();
    await act(async () => { host(en.translation.shoppingList.editItem).props.onPress(); });
    const quantity = screen.root.findAll((node) => String(node.type) === "Input" && node.props.label === "Quantity")[0];
    await act(async () => { quantity.props.onChangeText("1 kg"); });
    await act(async () => { host(en.translation.common.save).props.onPress(); });
    expect(mocks.update).toHaveBeenCalledWith(item, { quantity: "1 kg" });
  });
});
