import { BookOpen } from "lucide-react-native";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BottomNavigation } from "../components/BottomNavigation";
import { IconButton } from "../components/IconButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { KitchenRecipeList } from "../components/KitchenRecipeList";
import type { Recipe } from "../features/recipes/types";

const mocks = vi.hoisted(() => ({ native: true }));
vi.mock("expo", () => ({ requireOptionalNativeModule: () => null }));
vi.mock("react-native", () => ({
  View: "View",
  Pressable: "Pressable",
  Platform: { OS: "ios" },
  StyleSheet: {
    create: (value: unknown) => value,
    hairlineWidth: 1,
    absoluteFill: {},
  },
  Easing: { linear: (value: number) => value },
  Animated: {
    View: "AnimatedView",
    Value: class {
      setValue() {}
      interpolate() {
        return "0deg";
      }
    },
    timing: () => ({}),
    loop: () => ({ start() {}, stop() {} }),
  },
}));
vi.mock("../features/accessibility/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));
vi.mock("../theme/GlassProvider", () => ({
  useGlassSupport: () => ({ nativeGlass: mocks.native }),
}));
vi.mock("../theme/ThemeProvider", () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      primary: "green",
      primaryStrong: "darkgreen",
      textInverted: "white",
      text: "black",
      textMuted: "gray",
      backgroundElevated: "white",
    },
  }),
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 34 }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("lucide-react-native", () => ({
  BookOpen: "Book",
  ArrowLeft: "Back",
  CalendarDays: "Calendar",
  CookingPot: "CookingPot",
  Globe: "Globe",
  ShoppingCart: "Cart",
}));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/GlassSurface", () => ({ GlassSurface: "Glass" }));
vi.mock("../components/NativeGlassControls", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../components/NativeGlassControls")>();
  const modifier = (type: string) => (value: unknown) => ({ type, value });
  const ui = {
    views: {
      Host: "Host",
      Button: "NativeButton",
      RNHostView: "RNHost",
    },
    modifiers: Object.fromEntries(
      [
        "buttonStyle",
        "buttonBorderShape",
        "controlSize",
        "disabled",
        "accessibilityLabel",
        "tint",
      ].map((key) => [key, modifier(key)]),
    ),
  };
  return {
    ...actual,
    NativeTabBar: "NativeTabs",
    useNativeGlassControls: () => (mocks.native ? ui : null),
  };
});

let screen: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.native = true;
});
afterEach(async () => {
  if (screen) await act(async () => screen?.unmount());
  screen = undefined;
  vi.unstubAllGlobals();
});
async function render(node: React.ReactElement) {
  await act(async () => {
    screen = create(node);
  });
}
function nodes(type: string) {
  return screen!.root.findAll((node) => String(node.type) === type);
}

describe("native Liquid Glass controls", () => {
  it("omits back navigation for tab headers and preserves it on secondary screens", async () => {
    await render(React.createElement(ScreenHeader, { title: "Ma cuisine" }));
    expect(nodes("NativeButton")).toHaveLength(0);
    expect(nodes("Pressable")).toHaveLength(0);
    const onBack = vi.fn();
    await act(async () => screen!.update(React.createElement(ScreenHeader, { title: "Recipe", onBack })));
    expect(nodes("NativeButton")).toHaveLength(1);
    await act(async () => nodes("NativeButton")[0].props.onPress());
    expect(onBack).toHaveBeenCalledOnce();
  });
  it("uses native glass for compact secondary actions", async () => {
    await render(React.createElement(PrimaryButton, {
      label: "Change meal options", compact: true, variant: "secondary", onPress: vi.fn(),
    }));
    expect(nodes("NativeButton")[0].props.modifiers).toContainEqual({ type: "buttonStyle", value: "glass" });
    expect(nodes("Host")[0].props.matchContents).toBe(true);
  });

  it("keeps a large kitchen collection responsive while allowing access to later recipes", async () => {
    const recipes = Array.from({ length: 168 }, (_, index) => ({
      id: String(index),
      name: `Recipe ${index}`,
    })) as Recipe[];
    const onSelect = vi.fn();
    await render(
      // eslint-disable-next-line react/no-children-prop
      React.createElement(KitchenRecipeList, {
        recipes,
        children: (recipe: Recipe) =>
          React.createElement(PrimaryButton, {
            key: recipe.id,
            compact: true,
            label: recipe.name,
            onPress: () => onSelect(recipe.id),
          }),
      }),
    );
    expect(nodes("NativeButton")).toHaveLength(13);
    expect(
      nodes("NativeButton").some(
        (node) => node.props.modifiers.some((modifier: { value: unknown }) => modifier.value === "Recipe 12"),
      ),
    ).toBe(false);
    await act(async () =>
      nodes("NativeButton")
        .find((node) => node.props.modifiers.some((modifier: { value: unknown }) => modifier.value === "kitchen.showMore"))!
        .props.onPress(),
    );
    expect(nodes("NativeButton")).toHaveLength(25);
    await act(async () =>
      nodes("NativeButton")
        .find((node) => node.props.modifiers.some((modifier: { value: unknown }) => modifier.value === "Recipe 23"))!
        .props.onPress(),
    );
    expect(onSelect).toHaveBeenCalledWith("23");
  });
  it("keeps compact controls measurable in wrapped rows when native glass is enabled", async () => {
    const onPress = vi.fn();
    await render(
      React.createElement(PrimaryButton, {
        label: "Meal plan",
        onPress,
        compact: true,
      }),
    );
    const button = nodes("NativeButton")[0];
    expect(nodes("Host")[0].props.matchContents).toBe(true);
    expect(button.props.modifiers).toContainEqual({ type: "accessibilityLabel", value: "Meal plan" });
    await act(async () => button.props.onPress());
    expect(onPress).toHaveBeenCalledOnce();
  });
  it("lets the native button own presses, without an overlaid React Native press handler", async () => {
    const onPress = vi.fn();
    await render(
      React.createElement(PrimaryButton, { label: "Save", onPress }),
    );
    expect(nodes("Pressable")).toHaveLength(0);
    expect(nodes("Glass")).toHaveLength(0);
    const button = nodes("NativeButton")[0];
    expect(button.props.modifiers).toContainEqual({
      type: "buttonStyle",
      value: "glassProminent",
    });
    expect(button.props.modifiers).toContainEqual({
      type: "accessibilityLabel",
      value: "Save",
    });
    await act(async () => button.props.onPress());
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("disables native icon buttons during an operation", async () => {
    await render(
      React.createElement(IconButton, {
        icon: BookOpen,
        label: "Refresh",
        spinning: true,
        onPress: vi.fn(),
      }),
    );
    expect(nodes("NativeButton")[0].props.modifiers).toContainEqual({
      type: "disabled",
      value: true,
    });
    expect(nodes("Pressable")).toHaveLength(0);
  });

  it.each([true, false])(
    "keeps disabled action labels readable with native controls %s",
    async (native) => {
      mocks.native = native;
      await render(
        React.createElement(PrimaryButton, {
          label: "Save",
          disabled: true,
          onPress: vi.fn(),
        }),
      );
      expect(nodes("NativeButton")).toHaveLength(0);
      expect(nodes("Glass")).toHaveLength(0);
      expect(nodes("Text")[0].props.style).toContainEqual({ color: "gray" });
      expect(nodes("Pressable")[0].props.disabled).toBe(true);
      expect(nodes("Pressable")[0].props.style({ pressed: false })).toContainEqual({
        backgroundColor: "white", borderColor: "gray", borderWidth: 1,
      });
      const labelContainer = nodes("Text")[0].parent!;
      expect(labelContainer.props.style.opacity).toBeUndefined();
    },
  );

  it("measures a fixed, untransformed icon frame while refresh starts and stops", async () => {
    const props = { icon: BookOpen, label: "Refresh", onPress: vi.fn() };
    await render(React.createElement(IconButton, props));
    const frame = nodes("RNHost")[0].find(
      (node) => String(node.type) === "View",
    );
    expect(frame.props.collapsable).toBe(false);
    expect(frame.props.style).toMatchObject({ width: 21, height: 21 });
    expect(frame.props.style.transform).toBeUndefined();
    const initialStyle = frame.props.style;

    for (const spinning of [true, false]) {
      await act(async () =>
        screen!.update(React.createElement(IconButton, { ...props, spinning })),
      );
      expect(
        nodes("RNHost")[0].find((node) => String(node.type) === "View"),
      ).toBe(frame);
      expect(frame.props.style).toBe(initialStyle);
      expect(
        frame.find((node) => String(node.type) === "AnimatedView").props.style
          .transform,
      ).toEqual([{ rotate: "0deg" }]);
      expect(nodes("NativeButton")[0].props.modifiers).toContainEqual({
        type: "disabled",
        value: spinning,
      });
    }
  });

  it("keeps the native tab view mounted when the selected route changes", async () => {
    const onNavigate = vi.fn();
    await render(
      React.createElement(BottomNavigation, { current: "recipes", onNavigate }),
    );
    const tabs = nodes("NativeTabs")[0];
    expect(nodes("Pressable")).toHaveLength(0);
    expect(
      tabs.props.items.map((item: { title: string }) => item.title),
    ).toEqual([
      "recipes.title",
      "kitchen.title",
      "kitchen.planningTitle",
      "community.title",
      "shoppingList.title",
    ]);
    await act(async () =>
      tabs.props.onSelect({ nativeEvent: { id: "community" } }),
    );
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("community");
    await act(async () =>
      screen!.update(
        React.createElement(BottomNavigation, {
          current: "community",
          onNavigate,
        }),
      ),
    );
    expect(nodes("NativeTabs")[0]).toBe(tabs);
    expect(tabs.props.selected).toBe("community");
    await act(async () => {
      tabs.props.onSelect({ nativeEvent: { id: "community" } });
      tabs.props.onSelect({ nativeEvent: { id: "unknown" } });
    });
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("retains accessible buttons and tabs when native controls are unavailable", async () => {
    mocks.native = false;
    await render(
      React.createElement(
        React.Fragment,
        {},
        React.createElement(PrimaryButton, {
          label: "Save",
          disabled: true,
          onPress: vi.fn(),
        }),
        React.createElement(BottomNavigation, {
          current: "recipes",
          onNavigate: vi.fn(),
        }),
      ),
    );
    expect(nodes("NativeButton")).toHaveLength(0);
    expect(nodes("NativeTabs")).toHaveLength(0);
    expect(
      nodes("Pressable").filter(
        (node) => node.props.accessibilityRole === "tab",
      ),
    ).toHaveLength(5);
    const button = nodes("Pressable").find(
      (node) => node.props.accessibilityRole === "button",
    );
    expect(button?.props.accessibilityState).toEqual({ disabled: true });
  });
});
