import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlassProvider } from "../theme/GlassProvider";
import { GlassSurface } from "../components/GlassSurface";
import { getTabBarContentInset } from "../utils/safeArea";

const mocks = vi.hoisted(() => ({
  platform: { OS: "ios" },
  available: vi.fn(), api: vi.fn(), preference: vi.fn(), remove: vi.fn(),
  changed: undefined as undefined | ((enabled: boolean) => void),
  dark: false
}));
vi.mock("react-native", () => ({
  View: "View", Platform: mocks.platform,
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  AccessibilityInfo: {
    isReduceTransparencyEnabled: mocks.preference,
    addEventListener: (_event: string, callback: (enabled: boolean) => void) => {
      mocks.changed = callback;
      return { remove: mocks.remove };
    }
  }
}));
vi.mock("expo-glass-effect", () => ({
  GlassView: "NativeGlass", isLiquidGlassAvailable: mocks.available, isGlassEffectAPIAvailable: mocks.api
}));
vi.mock("expo-blur", () => ({ BlurView: "Blur" }));
vi.mock("../theme/ThemeProvider", () => ({ useAppTheme: () => ({
  isDark: mocks.dark, colors: { backgroundElevated: "opaque", surfaceGlass: "translucent", border: "outline" }
}) }));
let screen: ReactTestRenderer;
async function render(children: React.ReactNode = React.createElement(GlassSurface, {}, "Content")) {
  await act(async () => { screen = create(React.createElement(GlassProvider, {}, children)); });
}
function nodes(type: string) { return screen.root.findAll((node) => String(node.type) === type); }

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  mocks.platform.OS = "ios";
  mocks.dark = false;
  mocks.available.mockReturnValue(true);
  mocks.api.mockReturnValue(true);
  mocks.preference.mockResolvedValue(false);
  mocks.changed = undefined;
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  vi.unstubAllGlobals();
});

describe("glass material compatibility", () => {
  it("uses native glass with the application's explicit theme and no opaque paint", async () => {
    mocks.dark = true;
    await render(React.createElement(GlassSurface, { style: { backgroundColor: "white" } }, "Content"));
    const glass = nodes("NativeGlass")[0];
    expect(glass.props.colorScheme).toBe("dark");
    expect(glass.props.style.at(-1)).toMatchObject({ backgroundColor: "transparent", borderWidth: 0 });
  });

  it("uses blur on older iOS and does not query unavailable glass components", async () => {
    mocks.api.mockReturnValue(false);
    await render();
    expect(nodes("NativeGlass")).toHaveLength(0);
    expect(nodes("Blur")).toHaveLength(1);
    expect(mocks.available).not.toHaveBeenCalled();
  });

  it("falls back when the compiled application has no Liquid Glass support", async () => {
    mocks.available.mockReturnValue(false);
    await render();
    expect(nodes("NativeGlass")).toHaveLength(0);
    expect(nodes("Blur")).toHaveLength(1);
  });

  it("survives a missing native module in an older development build", async () => {
    mocks.api.mockImplementationOnce(() => { throw new Error("Native module unavailable"); });
    await render();
    expect(nodes("Blur")).toHaveLength(1);
  });

  it("uses an opaque surface on Android without calling any iOS API", async () => {
    mocks.platform.OS = "android";
    await render();
    expect(nodes("NativeGlass")).toHaveLength(0);
    expect(nodes("Blur")).toHaveLength(0);
    expect(nodes("View")[0].props.style.at(-1).backgroundColor).toBe("opaque");
    expect(nodes("View")[0].props.style[0]).toMatchObject({ borderWidth: 1 });
    expect(nodes("View")[0].props.style[1]).toMatchObject({ borderColor: "outline" });
    expect(mocks.api).not.toHaveBeenCalled();
    expect(mocks.preference).not.toHaveBeenCalled();
  });

  it("does not stack native glass inside a glass sheet", async () => {
    await render(React.createElement(GlassSurface, {}, React.createElement(GlassSurface, {}, "Button")));
    expect(nodes("NativeGlass")).toHaveLength(1);
    expect(nodes("View")).toHaveLength(1);
  });
});

describe("reduce transparency", () => {
  it("removes glass and blur immediately when the system preference changes", async () => {
    await render();
    expect(nodes("NativeGlass")).toHaveLength(1);
    await act(async () => mocks.changed?.(true));
    expect(nodes("NativeGlass")).toHaveLength(0);
    expect(nodes("Blur")).toHaveLength(0);
    expect(nodes("View")[0].props.style.at(-1).backgroundColor).toBe("opaque");
    await act(async () => mocks.changed?.(false));
    expect(nodes("NativeGlass")).toHaveLength(1);
  });

  it("keeps tinted actions readable on the opaque fallback", async () => {
    mocks.preference.mockResolvedValue(true);
    await render(React.createElement(GlassSurface, { tintColor: "green" }, "Save"));
    expect(nodes("View")[0].props.style.at(-1).backgroundColor).toBe("green");
  });

  it("does not let an old async preference overwrite a more recent system change", async () => {
    let resolve: (value: boolean) => void = () => {};
    mocks.preference.mockReturnValue(new Promise<boolean>((done) => { resolve = done; }));
    await render();
    await act(async () => { mocks.changed?.(true); resolve(false); });
    expect(nodes("NativeGlass")).toHaveLength(0);
    expect(nodes("Blur")).toHaveLength(0);
  });

  it("stays opaque if reading the accessibility preference fails", async () => {
    mocks.preference.mockRejectedValue(new Error("Unavailable"));
    await render();
    expect(nodes("NativeGlass")).toHaveLength(0);
    expect(nodes("Blur")).toHaveLength(0);
  });

  it("removes the shared system subscription on unmount", async () => {
    await render();
    await act(async () => screen.unmount());
    expect(mocks.remove).toHaveBeenCalledOnce();
  });
});

it("reserves enough list space for the floating tabs, safe area and larger text", () => {
  expect(getTabBarContentInset(34)).toBeGreaterThanOrEqual(64 + 16);
  expect(getTabBarContentInset(34, 3)).toBeGreaterThan(getTabBarContentInset(34));
  mocks.platform.OS = "android";
  expect(getTabBarContentInset(48)).toBeGreaterThanOrEqual(64 + 48);
});
