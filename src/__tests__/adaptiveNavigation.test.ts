import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdaptiveNavigationLayout } from "../components/AdaptiveNavigationLayout";
import { useContentViewport } from "../hooks/contentViewport";
import { useAdaptiveLayout } from "../hooks/useAdaptiveLayout";
import { useNavigationContentInset } from "../hooks/useNavigationContentInset";
import { getNavigationLayout } from "../utils/adaptiveLayout";
import type { BottomNavigationTab } from "../components/BottomNavigation";

const mocks = vi.hoisted(() => ({
  width: 466, fontScale: 1, version: 27.1, mounts: 0, native: true,
  insets: { top: 0, bottom: 0, left: 0, right: 88 },
}));
vi.mock("react-native", () => ({
  View: "View", Pressable: "Pressable", ScrollView: "Scroll",
  StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1 },
  Platform: { OS: "ios", get Version() { return mocks.version; } },
  useWindowDimensions: () => ({ width: mocks.width, height: 626, fontScale: mocks.fontScale }),
}));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => mocks.insets }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("lucide-react-native", () => ({ BookOpen: "Book", CookingPot: "Pot", CalendarDays: "Calendar", Globe: "Globe", ShoppingCart: "Cart" }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/GlassSurface", () => ({ GlassSurface: "Glass" }));
vi.mock("../components/NativeGlassControls", () => ({ NativeTabBar: "NativeTabs", useNativeGlassControls: () => mocks.native ? {} : null }));
vi.mock("../theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: {}, isDark: false }) }));

function Probe() {
  const [count, setCount] = React.useState(0);
  const viewport = useContentViewport();
  const layout = useAdaptiveLayout();
  const bottom = useNavigationContentInset();
  React.useEffect(() => { mocks.mounts += 1; }, []);
  return React.createElement("Probe", { count, viewport, layout, bottom, increment: () => setCount((value) => value + 1) });
}
let screen: ReactTestRenderer;
let onNavigate = vi.fn<(tab: BottomNavigationTab) => void>();
const node = (current: BottomNavigationTab = "recipes") => React.createElement(AdaptiveNavigationLayout, {
  current, onNavigate,
}, React.createElement(Probe));
const probe = () => screen.root.findByType("Probe" as never).props;
const tabs = () => screen.root.findAll((item) => item.props.accessibilityRole === "tab");
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.native = true; mocks.width = 466; mocks.fontScale = 1; mocks.version = 27.1; mocks.mounts = 0;
  mocks.insets = { top: 0, bottom: 0, left: 0, right: 88 };
  onNavigate = vi.fn();
});
afterEach(async () => { await act(async () => screen?.unmount()); vi.unstubAllGlobals(); });

it("preserves the current screen state and all five destinations when folding and unfolding", async () => {
  await act(async () => { screen = create(node()); });
  await act(async () => probe().increment());
  expect(probe().layout.columns).toBe(1);
  expect(screen.root.findAllByType("NativeTabs" as never)).toHaveLength(1);
  const compactBottom = probe().bottom;
  mocks.width = 890;
  await act(async () => screen.update(node()));
  expect(probe().viewport).toEqual({ width: 778, navigationRail: true });
  expect(probe().layout.columns).toBe(2);
  expect(probe().bottom).toBeLessThan(compactBottom);
  expect(tabs()).toHaveLength(5);
  await act(async () => tabs()[2].props.onPress());
  expect(onNavigate).toHaveBeenCalledExactlyOnceWith("planning");
  mocks.width = 466;
  await act(async () => screen.update(node("planning")));
  expect(probe().layout.columns).toBe(1);
  expect(probe().count).toBe(1);
  expect(mocks.mounts).toBe(1);
  expect(screen.root.findByType("NativeTabs" as never).props.selected).toBe("planning");
});

it("keeps a fallback compact bar clear of asymmetric camera insets", async () => {
  mocks.native = false;
  await act(async () => { screen = create(node()); });
  const wrapper = screen.root.findAllByType("View" as never).find((item) => item.props.pointerEvents === "box-none")!;
  expect(wrapper.props.style).toContainEqual(expect.objectContaining({ left: 16, right: 104 }));
  await act(async () => tabs()[0].props.onPress());
  expect(onNavigate).not.toHaveBeenCalled();
});

it.each([26.5, 27.1])("keeps the native bar on iOS %s", async (version) => {
  mocks.version = version;
  await act(async () => { screen = create(node()); });
  expect(screen.root.findAllByType("NativeTabs" as never)).toHaveLength(1);
});

it("bases the rail on usable space and reserves no rail for secondary screens", () => {
  expect(getNavigationLayout(890, 1, 88, 88).navigationRail).toBe(false);
  expect(getNavigationLayout(890, 1.5, 0, 88).navigationRail).toBe(false);
  expect(getNavigationLayout(1800, 2, 0, 88).railWidth).toBe(224);
  expect(getNavigationLayout(890, 1, 0, 88, false)).toEqual({ navigationRail: false, railWidth: 0, contentWidth: 890 });
});
