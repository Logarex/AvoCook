import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KitchenDailyScreen } from "../screens/KitchenDailyScreen";
import {
  emptyKitchen,
  localDate,
  shiftDate,
  type KitchenData,
} from "../features/kitchen/kitchen";

const mocks = vi.hoisted(() => ({
  data: {} as KitchenData,
  update: vi.fn(),
  alert: vi.fn(),
  width: 390,
}));
vi.mock("react-native", () => ({
  View: "View",
  Pressable: "Pressable",
  Alert: { alert: mocks.alert },
  StyleSheet: { create: (styles: unknown) => styles },
  useWindowDimensions: () => ({ width: mocks.width, fontScale: 1 }),
}));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ left: 0, right: 0, bottom: 0, top: 0 }) }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, options?: { slot?: string }) => options?.slot ? `${key} · ${options.slot}` : key, i18n: { language: "fr" } }),
}));
vi.mock("lucide-react-native", () => ({ Archive: "Archive", ArrowRight: "ArrowRight", Check: "Check", Pencil: "Pencil", Plus: "Plus", ChevronDown: "ChevronDown" }));
vi.mock("../components/IconButton", () => ({ IconButton: "Button" }));
vi.mock("../theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: { textMuted: "gray" } }) }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/GlassPanel", () => ({ GlassPanel: "Panel" }));
vi.mock("../features/kitchen/KitchenProvider", () => ({
  useKitchen: () => ({ data: mocks.data, update: mocks.update }),
}));
vi.mock("../features/recipes/RecipesProvider", () => ({
  useRecipes: () => ({ recipes: [] }),
}));
let screen: ReactTestRenderer;
const actions = {
  onAdd: vi.fn(),
  onEdit: vi.fn(),
  onIdeas: vi.fn(),
  onStock: vi.fn(),
  onWeek: vi.fn(),
  onRecipe: vi.fn(),
  onFridge: vi.fn(),
};
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  mocks.data = emptyKitchen();
  mocks.width = 390;
  mocks.update.mockImplementation(
    async (update: (data: KitchenData) => KitchenData) => {
      mocks.data = update(mocks.data);
    },
  );
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  vi.unstubAllGlobals();
});
async function render() {
  await act(async () => {
    screen = create(React.createElement(KitchenDailyScreen, actions));
  });
}
function buttons(label: string) {
  return screen.root.findAll(
    (node) => String(node.type) === "Button" && node.props.label === label,
  );
}
describe("daily kitchen workflows", () => {
  it("shows lunch and dinner side by side on a wide window and stacks them when folded", async () => {
    mocks.width = 890;
    await render();
    const slots = () => screen.root.findByProps({ testID: "daily-meal-slots" });
    expect(slots().props.style).toContainEqual({ flexDirection: "row" });
    mocks.width = 390;
    await act(async () => screen.update(React.createElement(KitchenDailyScreen, actions)));
    expect(slots().props.style).toContainEqual({ flexDirection: "column" });
    await act(async () => buttons("kitchen.planSlot · kitchen.dinner")[0].props.onPress());
    expect(actions.onAdd).toHaveBeenCalledExactlyOnceWith("dinner", "simple");
  });
  it("keeps meal actions available when folding and removes the reserves shortcut from Planning", async () => {
    await render();
    for (const [width, direction] of [[320, "column"], [890, "row"], [390, "column"]] as const) {
      mocks.width = width;
      await act(async () => screen.update(React.createElement(KitchenDailyScreen, actions)));
      expect(screen.root.findByProps({ testID: "daily-meal-actions" }).props.style)
        .toContainEqual({ flexDirection: direction });
      for (const label of ["kitchen.decideTonight"]) {
        expect(buttons(label)[0].props.fillAvailableSpace).toBe(true);
        expect(buttons(label)[0].props.numberOfLines).toBe(0);
      }
      expect(screen.root.findAll((node) => node.props.accessibilityLabel === "kitchen.reserveAction"))
        .toHaveLength(0);
    }
    await act(async () => buttons("kitchen.decideTonight")[0].props.onPress());
    expect(actions.onIdeas).toHaveBeenCalledExactlyOnceWith();
    expect(buttons("kitchen.simple")).toHaveLength(0);
  });
  it("lets a new user note lunch without needing any saved recipe", async () => {
    await render();
    await act(async () => buttons("kitchen.planSlot · kitchen.lunch")[0].props.onPress());
    expect(actions.onAdd).toHaveBeenCalledWith("lunch", "simple");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(buttons("kitchen.chooseMeal")).toHaveLength(0);
  });
  it("keeps the daily page focused on planned meals without the generic meal ideas section", async () => {
    await render();
    expect(JSON.stringify(screen.toJSON())).not.toContain("kitchen.withoutRecipe");
    expect(buttons("kitchen.chooseMeal")).toHaveLength(0);
    expect(buttons("kitchen.decideTonight")).toHaveLength(1);
  });
  it("uses urgent food as the search input and offers undo after consuming it", async () => {
    const item = {
      id: "tomato",
      name: "Tomates",
      quantity: "2",
      location: "fridge" as const,
      expires: shiftDate(localDate(), 1),
    };
    mocks.data.stock = [item];
    await render();
    await act(async () => buttons("kitchen.findUse")[0].props.onPress());
    expect(actions.onIdeas).toHaveBeenCalledWith("Tomates");
    await act(async () => buttons("kitchen.usedUp")[0].props.onPress());
    expect(mocks.data.stock).toEqual([]);
    await act(async () => buttons("kitchen.undoUsed")[0].props.onPress());
    expect(mocks.data.stock).toEqual([item]);
  });
  it("keeps food present and reports failed persistence", async () => {
    mocks.data.stock = [
      {
        id: "tomato",
        name: "Tomates",
        quantity: "2",
        location: "fridge",
        expires: localDate(),
      },
    ];
    mocks.update.mockRejectedValueOnce(new Error("Disk full"));
    await render();
    await act(async () => buttons("kitchen.usedUp")[0].props.onPress());
    expect(mocks.data.stock).toHaveLength(1);
    expect(mocks.alert).toHaveBeenCalledWith(
      "common.error",
      "kitchen.saveError",
    );
    expect(buttons("kitchen.undoUsed")).toHaveLength(0);
  });
});
