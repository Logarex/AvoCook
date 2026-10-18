import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PantryClient } from "../features/pantry/pantryClient";
import en from "../i18n/locales/en";
import { ShoppingListScreen } from "../screens/ShoppingListScreen";
import { ShoppingModeModal } from "../screens/ShoppingModeModal";
const mocks = vi.hoisted(() => ({
  credentials: {
    serverUrl: "https://cloud.example",
    username: "alice",
    appPassword: "test-only",
  } as { serverUrl: string; username: string; appPassword: string } | null,
  state: {} as Record<string, unknown>,
  local: vi.fn(async () => {}),
  refresh: vi.fn(async () => {}),
  toggle: vi.fn(async () => {}),
  update: vi.fn(async () => {}),
  alert: vi.fn(),
  remove: vi.fn(),
  move: vi.fn(),
  pull: vi.fn(async () => null),
  add: vi.fn(async () => ({ added: [{ id: "new" }], skipped: [] })),
  enableReminders: vi.fn(async () => {}),
  disableReminders: vi.fn(async () => {}),
  createShare: vi.fn(async () => "ABC123"),
  switchPantry: vi.fn(async () => {}),
}));
vi.mock("react-native", async () => {
  const React = await import("react");
  return {
    useWindowDimensions: () => ({ fontScale: 1 }),
    View: "View",
    Pressable: "Pressable",
    Modal: "Modal",
    KeyboardAvoidingView: "KeyboardView",
    ScrollView: "ScrollView",
    Switch: "Switch",
    TextInput: "TextInput",
    Platform: { OS: "ios" },
    ActivityIndicator: "Spinner",
    RefreshControl: "Refresh",
    StyleSheet: {
      create: (value: unknown) => value,
      hairlineWidth: 1,
      absoluteFill: {},
    },
    AppState: {
      currentState: "active",
      addEventListener: () => ({
        remove: vi.fn(),
        pull: vi.fn(async () => null),
        add: vi.fn(async () => ({ added: [{ id: "new" }], skipped: [] })),
        enableReminders: vi.fn(async () => {}),
        disableReminders: vi.fn(async () => {}),
        createShare: vi.fn(async () => "ABC123"),
        switchPantry: vi.fn(async () => {}),
      }),
    },
    Alert: { alert: mocks.alert },
    Share: { share: vi.fn() },
    FlatList: ({
      data,
      renderItem,
      ListEmptyComponent,
    }: {
      data: unknown[];
      renderItem: (args: { item: unknown; index: number }) => React.ReactNode;
      ListEmptyComponent: React.ReactNode;
    }) =>
      React.createElement(
        "FlatList",
        {},
        data.length
          ? data.map((item, index) =>
              React.createElement(
                React.Fragment,
                { key: index },
                renderItem({ item, index }),
              ),
            )
          : ListEmptyComponent,
      ),
  };
});
vi.mock("lucide-react-native", () =>
  Object.fromEntries(
    [
      "Check",
      "Cloud",
      "Smartphone",
      "Users",
      "X",
      "ChevronDown",
      "ChevronUp",
      "Pencil",
      "Plus",
      "RefreshCw",
      "Repeat",
      "Share2",
      "ShoppingCart",
      "Trash2",
      "BookOpen",
      "ListChecks",
      "ShoppingBag",
      "ArrowLeft",
      "ChevronRight",
      "Share",
      "Bell",
      "BellOff",
      "LogOut",
      "Sparkles",
    ].map((name) => [name, name]),
  ),
);
vi.mock("@react-navigation/native", async () => {
  const React = await import("react");
  return {
    useFocusEffect: (callback: () => void) =>
      React.useEffect(callback, [callback]),
  };
});
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
  SafeAreaProvider: "SafeAreaProvider",
  SafeAreaView: "SafeAreaView",
}));
vi.mock("../features/accessibility/haptics", () => ({
  selectionFeedback: vi.fn(),
}));
vi.mock("../features/accessibility/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));
vi.mock("../features/auth/AuthProvider", () => ({
  useAuth: () => ({ credentials: mocks.credentials }),
}));
vi.mock("../features/shopping/ShoppingListProvider", () => ({
  useShoppingList: () => mocks.state,
}));
vi.mock("../theme/ThemeProvider", () => ({
  useAppTheme: () => ({ colors: { primary: "green" } }),
}));
vi.mock("../components/Screen", () => ({ Screen: "Screen" }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/GlassSurface", () => ({ GlassSurface: "GlassSurface" }));
vi.mock("../components/NativeGlassControls", () => ({
  useNativeGlassControls: () => null,
  useNativeControls: () => null,
  NativeGlassButton: "NativeButton",
}));
vi.mock("../components/GlassPanel", () => ({ GlassPanel: "Panel" }));
vi.mock("../components/IconButton", () => ({ IconButton: "IconButton" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../components/EmptyState", () => ({ EmptyState: "Empty" }));
vi.mock("../components/PageSwipeGesture", () => ({
  PageSwipeGesture: "Swipe",
}));
vi.mock("../components/ConnectionStatus", () => ({
  ConnectionStatus: "Status",
}));
vi.mock("../features/shopping/remindersSync", () => ({
  registerReminderMappings: vi.fn(),
}));
vi.mock("../screens/ShoppingListActionsModal", () => ({
  ShoppingListActionsModal: "Actions",
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params: Record<string, unknown> = {}) => {
      const value = key
        .split(".")
        .reduce<unknown>(
          (value, part) => (value as Record<string, unknown>)?.[part],
          en.translation,
        );
      return typeof value === "string"
        ? value.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
            String(params[name] ?? ""),
          )
        : key;
    },
  }),
}));
let screen: ReactTestRenderer;
const house = { id: 1, name: "Home", isAdmin: true };
const list = { id: 2, houseId: 1, name: "Groceries", canEdit: true };
const item = {
  id: 3,
  listId: 2,
  name: "Tomatoes",
  quantity: "500 g",
  description: "Pasta",
  done: false,
  rrule: "FREQ=WEEKLY;BYDAY=MO",
  categoryId: 8,
};
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  navigate.mockClear();
  mocks.credentials = {
    serverUrl: "https://cloud.example",
    username: "alice",
    appPassword: "test-only",
  };
  mocks.state = baseState();
  vi.spyOn(PantryClient.prototype, "houses").mockResolvedValue([house]);
  vi.spyOn(PantryClient.prototype, "lists").mockResolvedValue([list]);
  vi.spyOn(PantryClient.prototype, "categories").mockResolvedValue([
    { id: 8, houseId: 1, name: "Produce" },
  ]);
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function baseState() {
  return {
    mode: { kind: "local" },
    switching: false,
    loading: false,
    items: [],
    pantry: null,
    sync: {
      available: false,
      linked: false,
      pullFromSystem: mocks.pull,
      enableSync: mocks.enableReminders,
      disableSync: mocks.disableReminders,
    },
    sharedList: {
      active: false,
      createList: mocks.createShare,
      joinList: vi.fn(),
      syncing: false,
    },
    addIngredients: vi.fn(),
    addItem: mocks.add,
    toggleItem: mocks.toggle,
    removeItem: mocks.remove,
    moveItem: mocks.move,
    updateItem: vi.fn(),
    refreshItems: mocks.refresh,
    clearChecked: vi.fn(),
    clearAll: vi.fn(),
    updatePantryItem: mocks.update,
    switchToLocal: mocks.local,
    switchToPantry: mocks.switchPantry,
  };
}
const navigate = vi.fn();
async function shoppingScreen(fresh = true) {
  mocks.state = {
    ...baseState(),
    mode: { kind: "pantry", selection: { house, list }, accountKey: "alice" },
    items: [{ id: "pantry-1-2-3", label: "500 g Tomatoes", checked: false }],
    pantry: {
      ready: true,
      selection: { house, list },
      items: [item],
      fresh,
      busy: false,
      error: fresh ? null : "network",
    },
  };
  await act(async () => {
    screen = create(
      React.createElement(ShoppingListScreen, {
        navigation: { navigate },
      } as never),
    );
  });
}
function host(label: string) {
  return screen.root.findAll(
    (node) => typeof node.type === "string" && node.props.label === label,
  )[0];
}
function accessible(label: string) {
  return screen.root.findAll(
    (node) =>
      typeof node.type === "string" && node.props.accessibilityLabel === label,
  )[0];
}
function radio(label: string) {
  return screen.root.findAll(
    (node) =>
      String(node.type) === "Pressable" &&
      node.props.accessibilityRole === "radio" &&
      node.props.accessibilityLabel === label,
  )[0];
}
async function sheet(close = vi.fn()) {
  await act(async () => {
    screen = create(
      React.createElement(ShoppingModeModal, { visible: true, onClose: close }),
    );
  });
  return close;
}
describe("one shopping screen and one configuration sheet", () => {
  it("offers exactly three exclusive modes and moves to local through the provider", async () => {
    const close = await sheet();
    const choices = screen.root.findAll(
      (node) =>
        String(node.type) === "Pressable" &&
        node.props.accessibilityRole === "radio",
    );
    expect(choices.map((node) => node.props.accessibilityLabel)).toEqual([
      "Local only",
      "AvoCook sharing",
      "Nextcloud Pantry",
    ]);
    expect(
      choices.filter((node) => node.props.accessibilityState.checked),
    ).toHaveLength(1);
    await act(async () => {
      choices[0].props.onPress();
    });
    expect(mocks.local).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
  it("offers sharing without Nextcloud inside the same native modal", async () => {
    mocks.credentials = null;
    const close = await sheet();
    expect(radio("Nextcloud Pantry").props.disabled).toBe(true);
    await act(async () => {
      radio("AvoCook sharing").props.onPress();
    });
    expect(close).not.toHaveBeenCalled();
    expect(screen.root.findAllByType("Modal" as never)).toHaveLength(1);
    await act(async () => {
      host(en.translation.shoppingList.sharedCreateBtn).props.onPress();
    });
    expect(mocks.createShare).toHaveBeenCalledOnce();
  });
  it("keeps Pantry choices in that modal; hardware Back returns to modes, then closes", async () => {
    const close = await sheet();
    await act(async () => {
      radio("Nextcloud Pantry").props.onPress();
    });
    expect(accessible("Groceries, Home")).toBeDefined();
    expect(screen.root.findAllByType("Modal" as never)).toHaveLength(1);
    expect(close).not.toHaveBeenCalled();
    await act(async () => {
      screen.root.findByType("Modal" as never).props.onRequestClose();
    });
    expect(radio("Local only")).toBeDefined();
    expect(close).not.toHaveBeenCalled();
    await act(async () => {
      screen.root.findByType("Modal" as never).props.onRequestClose();
    });
    expect(close).toHaveBeenCalledOnce();
    expect(mocks.switchPantry).not.toHaveBeenCalled();
  });
  it("starts afresh after closing/reopening and never restores an old nested page", async () => {
    const close = await sheet();
    await act(async () => {
      radio("Nextcloud Pantry").props.onPress();
    });
    await act(async () => {
      screen.update(
        React.createElement(ShoppingModeModal, {
          visible: false,
          onClose: close,
        }),
      );
    });
    expect(screen.toJSON()).toBeNull();
    await act(async () => {
      screen.update(
        React.createElement(ShoppingModeModal, {
          visible: true,
          onClose: close,
        }),
      );
    });
    expect(radio("Local only")).toBeDefined();
    expect(accessible("Groceries, Home")).toBeUndefined();
  });
  it("blocks hardware Back and closing during a transfer and closes only after success", async () => {
    let finish!: () => void;
    mocks.switchPantry.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const close = await sheet();
    await act(async () => {
      radio("Nextcloud Pantry").props.onPress();
    });
    await act(async () => {
      accessible("Groceries, Home").props.onPress();
    });
    await act(async () => {
      screen.root.findByType("Modal" as never).props.onRequestClose();
    });
    expect(host(en.translation.common.close).props.disabled).toBe(true);
    expect(close).not.toHaveBeenCalled();
    await act(async () => {
      finish();
    });
    expect(close).toHaveBeenCalledOnce();
  });
  it("retains the usual title, input, rows and actions in Pantry", async () => {
    await shoppingScreen();
    expect(screen.root.findAllByType("Screen" as never)).toHaveLength(1);
    expect(screen.root.findAllByType("Swipe" as never)).toHaveLength(1);
    expect(
      host(en.translation.shoppingList.manualItemLabel).props.placeholder,
    ).toBe(en.translation.shoppingList.itemPlaceholder);
    expect(host(en.translation.shoppingList.sharedTitle)).toBeUndefined();
    expect(JSON.stringify(screen.toJSON())).toContain("500 g Tomatoes");
    expect(screen.root.findByType("Status" as never).props.connected).toBe(
      true,
    );
    await act(async () => {
      accessible("500 g Tomatoes").props.onPress();
    });
    expect(mocks.toggle).toHaveBeenCalledWith("pantry-1-2-3");
    expect(mocks.pull).not.toHaveBeenCalled();
  });
  it("uses the same empty state in all modes", async () => {
    await shoppingScreen();
    const pantry = mocks.state.pantry;
    for (const mode of [
      { kind: "local" },
      { kind: "firebase", code: "ABC123" },
      { kind: "pantry", selection: { house, list }, accountKey: "alice" },
    ]) {
      mocks.state = {
        ...baseState(),
        mode,
        pantry: mode.kind === "pantry" ? pantry : null,
      };
      await act(async () => {
        screen.update(
          React.createElement(ShoppingListScreen, {
            navigation: { navigate },
          } as never),
        );
      });
      const empty = screen.root.findByType("Empty" as never);
      expect(empty.props.title).toBe(en.translation.shoppingList.emptyTitle);
      expect(empty.props.body).toBe(en.translation.shoppingList.emptyBody);
    }
  });
  it("keeps cached Pantry items visible offline and disables mutations", async () => {
    await shoppingScreen(false);
    expect(JSON.stringify(screen.toJSON())).toContain("500 g Tomatoes");
    expect(JSON.stringify(screen.toJSON())).toContain("Could not reach Pantry");
    expect(screen.root.findByType("Status" as never).props.connected).toBe(
      false,
    );
    expect(accessible("500 g Tomatoes").props.disabled).toBe(true);
    expect(
      accessible(en.translation.shoppingList.editItem).props.disabled,
    ).toBe(true);
    expect(
      host(en.translation.shoppingList.manualItemLabel).props.editable,
    ).toBe(false);
    expect(host(en.translation.common.delete).props.disabled).toBe(true);
    expect(accessible(en.translation.shoppingModes.choose).props.disabled).toBe(
      false,
    );
  });
  it("handles a failed add without losing the draft or raising an unhandled rejection", async () => {
    mocks.add.mockRejectedValueOnce(new Error("offline"));
    await shoppingScreen();
    await act(async () => {
      host(en.translation.shoppingList.manualItemLabel).props.onChangeText(
        "Flour",
      );
    });
    await act(async () => {
      host(en.translation.shoppingList.addItem).props.onPress();
    });
    expect(mocks.alert).toHaveBeenCalled();
    expect(host(en.translation.shoppingList.manualItemLabel).props.value).toBe(
      "Flour",
    );
  });
  it("respects check-only household permissions", async () => {
    await shoppingScreen();
    const checkOnly = {
      ...house,
      isAdmin: false,
      permissions: { canCheckItems: true },
    };
    mocks.state = {
      ...mocks.state,
      mode: {
        kind: "pantry",
        selection: { house: checkOnly, list },
        accountKey: "alice",
      },
      pantry: {
        ...(mocks.state.pantry as object),
        selection: { house: checkOnly, list },
      },
    };
    await act(async () => {
      screen.update(
        React.createElement(ShoppingListScreen, {
          navigation: { navigate },
        } as never),
      );
    });
    expect(accessible("500 g Tomatoes").props.disabled).toBe(false);
    expect(
      accessible(en.translation.shoppingList.editItem).props.disabled,
    ).toBe(true);
    expect(host(en.translation.shoppingList.addItem).props.disabled).toBe(true);
    expect(host(en.translation.common.delete).props.disabled).toBe(true);
  });
  it("returns from Pantry to local within the same screen with no old modal reopening", async () => {
    await shoppingScreen();
    await act(async () => {
      accessible(en.translation.shoppingModes.choose).props.onPress();
    });
    await act(async () => {
      radio("Local only").props.onPress();
    });
    mocks.state = baseState();
    await act(async () => {
      screen.update(
        React.createElement(ShoppingListScreen, {
          navigation: { navigate },
        } as never),
      );
    });
    expect(screen.root.findAllByType("Modal" as never)).toHaveLength(0);
    expect(navigate).not.toHaveBeenCalled();
    await act(async () => {
      accessible(en.translation.shoppingModes.choose).props.onPress();
    });
    expect(radio("Local only").props.accessibilityState.checked).toBe(true);
  });
  it("edits quantity while preserving the recurrence and category metadata", async () => {
    await shoppingScreen();
    await act(async () => {
      accessible(en.translation.shoppingList.editItem).props.onPress();
    });
    const quantity = host("Quantity");
    await act(async () => {
      quantity.props.onChangeText("1 kg");
    });
    await act(async () => {
      host(en.translation.common.save).props.onPress();
    });
    expect(mocks.update).toHaveBeenCalledWith(item, { quantity: "1 kg" });
  });
  it("closes an item editor when switching list/account rather than leaving a stale item open", async () => {
    await shoppingScreen();
    await act(async () => {
      accessible(en.translation.shoppingList.editItem).props.onPress();
    });
    expect(host("Quantity")).toBeDefined();
    mocks.state = { ...baseState(), mode: { kind: "local" } };
    await act(async () => {
      screen.update(
        React.createElement(ShoppingListScreen, {
          navigation: { navigate },
        } as never),
      );
    });
    expect(host("Quantity")).toBeUndefined();
  });
  it("allows canceling discovery immediately, aborting the pending request", async () => {
    let finish!: (houses: (typeof house)[]) => void;
    vi.mocked(PantryClient.prototype.houses).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const close = await sheet();
    await act(async () => {
      radio("Nextcloud Pantry").props.onPress();
    });
    expect(host(en.translation.common.close).props.disabled).toBe(false);
    await act(async () => {
      host(en.translation.common.back).props.onPress();
    });
    expect(radio("Local only")).toBeDefined();
    await act(async () => {
      finish([house]);
    });
    expect(PantryClient.prototype.lists).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
  it("resets the configuration when the account changes", async () => {
    const close = await sheet();
    await act(async () => {
      radio("Nextcloud Pantry").props.onPress();
    });
    expect(accessible("Groceries, Home")).toBeDefined();
    mocks.credentials = { ...mocks.credentials!, username: "bob" };
    await act(async () => {
      screen.update(
        React.createElement(ShoppingModeModal, {
          visible: true,
          onClose: close,
        }),
      );
    });
    expect(radio("Local only")).toBeDefined();
    expect(accessible("Groceries, Home")).toBeUndefined();
  });
  it("leaves the backend unchanged when returning from Firebase setup", async () => {
    const close = await sheet();
    await act(async () => {
      radio("AvoCook sharing").props.onPress();
    });
    await act(async () => {
      screen.root.findByType("Modal" as never).props.onRequestClose();
    });
    expect(radio("Local only").props.accessibilityState.checked).toBe(true);
    expect(mocks.createShare).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
  it("refreshes Pantry while visible, pauses during typing, and stops after returning to local", async () => {
    vi.useFakeTimers();
    await shoppingScreen();
    expect(mocks.refresh).toHaveBeenCalledOnce();
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });
    expect(mocks.refresh).toHaveBeenCalledTimes(2);
    await act(async () => {
      host(en.translation.shoppingList.manualItemLabel).props.onChangeText(
        "Flour",
      );
    });
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });
    expect(mocks.refresh).toHaveBeenCalledTimes(2);
    mocks.state = baseState();
    await act(async () => {
      screen.update(
        React.createElement(ShoppingListScreen, {
          navigation: { navigate },
        } as never),
      );
    });
    await act(async () => {
      vi.advanceTimersByTime(60000);
    });
    expect(mocks.refresh).toHaveBeenCalledTimes(3);
  });
  it("lets a delete-only member remove individual articles without editing rights", async () => {
    await shoppingScreen();
    const deleteOnly = {
      ...house,
      isAdmin: false,
      permissions: { canDeleteItems: true },
    };
    mocks.state = {
      ...mocks.state,
      mode: {
        kind: "pantry",
        selection: { house: deleteOnly, list },
        accountKey: "alice",
      },
      pantry: {
        ...(mocks.state.pantry as object),
        selection: { house: deleteOnly, list },
      },
    };
    await act(async () => {
      screen.update(
        React.createElement(ShoppingListScreen, {
          navigation: { navigate },
        } as never),
      );
    });
    expect(
      accessible(en.translation.shoppingList.editItem).props.disabled,
    ).toBe(true);
    await act(async () => {
      host(en.translation.shoppingList.deleteItem).props.onPress();
    });
    const confirm = mocks.alert.mock.calls.at(-1)![2] as {
      style: string;
      onPress?: () => void;
    }[];
    await act(async () => {
      confirm.find((choice) => choice.style === "destructive")!.onPress!();
    });
    expect(mocks.remove).toHaveBeenCalledWith("pantry-1-2-3");
  });

  it("uses permissions returned by refresh rather than stale permissions saved in the mode", async () => {
    await shoppingScreen();
    const readOnly = {
      ...house,
      isAdmin: false,
      permissions: {
        canCheckItems: false,
        canEditLists: false,
        canAddItems: false,
        canDeleteItems: false,
      },
    };
    mocks.state = {
      ...mocks.state,
      pantry: {
        ...(mocks.state.pantry as object),
        selection: { house: readOnly, list },
      },
    };
    await act(async () => {
      screen.update(
        React.createElement(ShoppingListScreen, {
          navigation: { navigate },
        } as never),
      );
    });
    expect(accessible("500 g Tomatoes").props.disabled).toBe(true);
    expect(
      accessible(en.translation.shoppingList.editItem).props.disabled,
    ).toBe(true);
    expect(host(en.translation.shoppingList.addItem).props.disabled).toBe(true);
    expect(host(en.translation.common.delete).props.disabled).toBe(true);
  });

  it.each(["local", "firebase", "pantry"])(
    "has a single mode control in %s and no shortcut to a different backend",
    async (kind) => {
      await shoppingScreen();
      mocks.state = {
        ...mocks.state,
        mode:
          kind === "pantry"
            ? mocks.state.mode
            : kind === "firebase"
              ? { kind, code: "ABC123" }
              : { kind },
      };
      await act(async () => {
        screen.update(
          React.createElement(ShoppingListScreen, {
            navigation: { navigate },
          } as never),
        );
      });
      expect(host(en.translation.shoppingList.sharedTitle)).toBeUndefined();
      const controls = screen.root.findAll(
        (node) =>
          typeof node.type === "string" &&
          node.props.accessibilityLabel === en.translation.shoppingModes.choose,
      );
      expect(controls).toHaveLength(1);
      await act(async () => {
        controls[0].props.onPress();
      });
      expect(radio("Local only")).toBeDefined();
      expect(radio("AvoCook sharing")).toBeDefined();
      expect(radio("Nextcloud Pantry")).toBeDefined();
      expect(mocks.createShare).not.toHaveBeenCalled();
      expect(mocks.switchPantry).not.toHaveBeenCalled();
      expect(mocks.local).not.toHaveBeenCalled();
    },
  );
  it.each(["local", "firebase", "pantry"])(
    "configures Apple Reminders from the common menu in %s without opening Firebase",
    async (kind) => {
      const mode =
        kind === "pantry"
          ? { kind, accountKey: "alice", selection: { house, list } }
          : kind === "firebase"
            ? { kind, code: "ABC123" }
            : { kind };
      const items = [{ id: "milk", label: "Milk", checked: false }];
      mocks.state = {
        ...baseState(),
        mode,
        items,
        sync: {
          available: true,
          linked: false,
          syncing: false,
          enableSync: mocks.enableReminders,
          disableSync: mocks.disableReminders,
        },
      };
      await sheet();
      expect(host(en.translation.shoppingList.sharedCreateBtn)).toBeUndefined();
      expect(host(en.translation.shoppingList.syncEnable)).toBeUndefined();
      const reminders = screen.root.findAll(
        (node) =>
          typeof node.type === "function" &&
          node.type.name === "DisclosureSection" &&
          node.props.title === en.translation.shoppingList.syncBannerTitle,
      )[0];
      await act(async () => {
        reminders
          .findAll((node) => String(node.type) === "Pressable")[0]
          .props.onPress();
      });
      await act(async () => {
        host(en.translation.shoppingList.syncEnable).props.onPress();
      });
      expect(mocks.enableReminders).toHaveBeenCalledWith(items);
      expect(mocks.createShare).not.toHaveBeenCalled();
      expect(mocks.switchPantry).not.toHaveBeenCalled();
      expect(mocks.local).not.toHaveBeenCalled();
      expect(radio("Local only")).toBeDefined();
    },
  );
  it("keeps the common native controls hidden when Apple Reminders is unavailable", async () => {
    await sheet();
    expect(host(en.translation.shoppingList.syncEnable)).toBeUndefined();
    expect(host(en.translation.shoppingList.syncDisable)).toBeUndefined();
  });
});
