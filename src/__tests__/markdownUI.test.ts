import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppText } from "../components/AppText";
import { MarkdownText } from "../components/MarkdownText";
import { TextField } from "../components/TextField";
import { IngredientSection } from "../screens/recipeDetail/IngredientSection";
import { InstructionSection } from "../screens/recipeDetail/InstructionSection";
import { darkColors, lightColors } from "../theme/colors";

const mocks = vi.hoisted(() => ({
  openURL: vi.fn(async () => {}),
  copy: vi.fn(async () => {}),
  dark: false,
  platform: "ios",
}));
vi.mock("react-native", () => ({
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1, scale: 3 }),
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  TextInput: "Input",
  Platform: {
    get OS() {
      return mocks.platform;
    },
  },
  Linking: { openURL: mocks.openURL },
  StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1 },
}));
vi.mock("../theme/ThemeProvider", () => ({
  useAppTheme: () => ({ colors: mocks.dark ? darkColors : lightColors }),
}));
vi.mock("../components/GlassPanel", () => ({ GlassPanel: "Panel" }));
vi.mock("../components/IconButton", () => ({ IconButton: "IconButton" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("lucide-react-native", () => ({
  Check: "Check",
  ShoppingCart: "ShoppingCart",
  Copy: "Copy",
}));
vi.mock("expo-clipboard", () => ({ setStringAsync: mocks.copy }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

let screen: ReactTestRenderer;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  mocks.dark = false;
  mocks.platform = "ios";
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  vi.unstubAllGlobals();
});
async function render(element: React.ReactElement) {
  await act(async () => {
    screen = create(element);
  });
}
function markdownView(
  children: string,
  props: Omit<React.ComponentProps<typeof MarkdownText>, "children"> = {},
) {
  const completeProps = { ...props, children };
  return React.createElement(MarkdownText, completeProps);
}
function content(node: { children: unknown[] }): string {
  return node.children
    .map((child) =>
      typeof child === "string"
        ? child
        : content(child as { children: unknown[] }),
    )
    .join("");
}

describe("native Markdown display", () => {
  it("offers a preview only after optional Markdown is entered and retains the raw input", async () => {
    await render(
      React.createElement(TextField, {
        label: "Name",
        markdown: true,
        value: "Soup",
      }),
    );
    expect(
      screen.root.findAll((node) => String(node.type) === "Pressable"),
    ).toHaveLength(0);
    const input = screen.root.findAll(
      (node) => String(node.type) === "Input",
    )[0];
    await act(async () => input.props.onChangeText("**Soup**"));
    const preview = screen.root.findAll(
      (node) => String(node.type) === "Pressable",
    )[0];
    expect(preview.props.accessibilityState.expanded).toBe(false);
    await act(async () => preview.props.onPress());
    expect(screen.root.findAllByType(MarkdownText)).toHaveLength(1);
    expect(input.props.value).toBe("**Soup**");
    await act(async () => preview.props.onPress());
    expect(screen.root.findAllByType(MarkdownText)).toHaveLength(0);
  });

  it("retains plain text typography and native line limits", async () => {
    await render(
      React.createElement(
        AppText,
        { markdown: true, numberOfLines: 2, variant: "caption" },
        "Crème fraîche",
      ),
    );
    const text = screen.root.findAll((node) => String(node.type) === "Text")[0];
    expect(content(text)).toBe("Crème fraîche");
    expect(text.props.numberOfLines).toBe(2);
    expect(text.props.style[1]).toMatchObject({ fontSize: 13, lineHeight: 18 });
  });

  it("keeps single-line labels readable instead of automatically shrinking them", async () => {
    await render(
      React.createElement(
        AppText,
        { numberOfLines: 1, variant: "label" },
        "Français",
      ),
    );
    const text = screen.root.findAll((node) => String(node.type) === "Text")[0];
    expect(text.props.adjustsFontSizeToFit).toBe(false);
    expect(text.props.style[1].fontSize).toBeGreaterThanOrEqual(15);
  });

  it("bounds explicit font fitting while preserving accessibility text scaling", async () => {
    await render(
      React.createElement(
        AppText,
        { numberOfLines: 1, adjustsFontSizeToFit: true },
        "Long title",
      ),
    );
    const text = screen.root.findAll((node) => String(node.type) === "Text")[0];
    expect(text.props.adjustsFontSizeToFit).toBe(true);
    expect(text.props.minimumFontScale).toBe(0.85);
    expect(text.props.allowFontScaling).not.toBe(false);
  });

  it("keeps Android titles readable when Fabric cannot enforce the font-scale floor", async () => {
    mocks.platform = "android";
    await render(
      React.createElement(
        AppText,
        { numberOfLines: 1, adjustsFontSizeToFit: true },
        "Community",
      ),
    );
    const text = screen.root.findAll((node) => String(node.type) === "Text")[0];
    expect(text.props.adjustsFontSizeToFit).toBe(false);
    expect(text.props.allowFontScaling).not.toBe(false);
  });

  it("formats nested emphasis and keeps compact card links from intercepting navigation", async () => {
    await render(
      React.createElement(
        AppText,
        { markdown: true, numberOfLines: 1 },
        "**Mix *gently*** [Recipe](https://example.com)",
      ),
    );
    const texts = screen.root.findAll((node) => String(node.type) === "Text");
    expect(content(texts[0])).toBe("Mix gently Recipe");
    expect(texts.some((node) => node.props.style?.fontWeight === "700")).toBe(
      true,
    );
    expect(texts.some((node) => node.props.style?.fontStyle === "italic")).toBe(
      true,
    );
    expect(texts.every((node) => !node.props.onPress)).toBe(true);
  });

  it.each([false, true])(
    "uses theme colors, handles blocks and opens links safely (dark=%s)",
    async (dark) => {
      mocks.dark = dark;
      await render(
        markdownView(
          "## Sauce\n\n3. **Stir**\n   - *salt*\n\n> Cool\n\n| Tool | Use |\n| --- | --- |\n| Spoon | Mix |\n\n[Chef](https://example.com)\n\n`Mix`",
          { muted: true },
        ),
      );
      const texts = screen.root.findAll((node) => String(node.type) === "Text");
      expect(texts.some((node) => content(node) === "3.")).toBe(true);
      expect(
        screen.root.findAll((node) => String(node.type) === "ScrollView"),
      ).toHaveLength(1);
      const link = texts.find(
        (node) => node.props.accessibilityRole === "link",
      )!;
      expect(link.props.style.color).toBe(
        (dark ? darkColors : lightColors).primary,
      );
      const stopPropagation = vi.fn();
      await act(async () => link.props.onPress({ stopPropagation }));
      expect(stopPropagation).toHaveBeenCalledOnce();
      expect(mocks.openURL).toHaveBeenCalledWith("https://example.com");
    },
  );

  it("does not turn unsafe destinations into tappable links", async () => {
    await render(
      markdownView(
        "[bad](javascript:alert(1))\n\n<img src=x onerror=alert(1)>",
      ),
    );
    expect(
      screen.root.findAll((node) => node.props.accessibilityRole === "link"),
    ).toHaveLength(0);
    expect(mocks.openURL).not.toHaveBeenCalled();
  });

  it("keeps instruction checkboxes operable with nested Markdown and inherits checked styling", async () => {
    const toggle = vi.fn();
    await render(
      React.createElement(InstructionSection, {
        title: "Steps",
        items: ["**Mix**\n\n- salt\n- water"],
        checkedIndexes: new Set([0]),
        checkedCount: 1,
        onResetChecked: vi.fn(),
        onToggleItem: toggle,
      }),
    );
    const checkbox = screen.root.findAll(
      (node) =>
        String(node.type) === "Pressable" &&
        node.props.accessibilityRole === "checkbox",
    )[0];
    expect(checkbox.props.accessibilityState.checked).toBe(true);
    await act(async () => checkbox.props.onPress());
    expect(toggle).toHaveBeenCalledWith(0);
    const text = screen.root.findAll(
      (node) => String(node.type) === "Text" && content(node) === "Mix",
    )[0];
    expect(JSON.stringify(text.props.style)).toContain("line-through");
  });

  it("keeps ingredient actions and copies readable text", async () => {
    const toggle = vi.fn();
    const add = vi.fn();
    await render(
      React.createElement(IngredientSection, {
        title: "Ingredients",
        items: ["**200 g** flour", "*2* eggs"],
        checkedIndexes: new Set([1]),
        checkedCount: 1,
        onAddAll: vi.fn(),
        onAddItem: add,
        onResetChecked: vi.fn(),
        onToggleItem: toggle,
      }),
    );
    await act(async () =>
      screen.root
        .findAll((node) => String(node.type) === "Pressable")[0]
        .props.onPress(),
    );
    expect(toggle).toHaveBeenCalledWith(0);
    await act(async () =>
      screen.root
        .findAll((node) => String(node.type) === "IconButton" && node.props.label === "shoppingList.addIngredientFromRecipe")[0]
        .props.onPress(),
    );
    expect(add).toHaveBeenCalledWith("**200 g** flour");
    await act(async () =>
      screen.root
        .findAll((node) => String(node.type) === "IconButton" && node.props.label === "recipes.copyRemainingIngredients")[0]
        .props.onPress(),
    );
    expect(mocks.copy).toHaveBeenCalledWith("200 g flour");
  });
});
