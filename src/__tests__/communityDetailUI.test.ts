import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownText } from "../components/MarkdownText";
import type { CommunityRecipe } from "../features/community/communityClient";
import { CommunityDetailScreen } from "../screens/CommunityDetailScreen";
import { darkColors, lightColors } from "../theme/colors";

const mocks = vi.hoisted(() => ({
  dark: false,
  language: "en",
  recipe: null as CommunityRecipe | null,
}));
vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  Platform: { OS: "ios" },
  ActivityIndicator: "Spinner",
  Alert: { alert: vi.fn() },
  Linking: { openURL: vi.fn() },
  StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1 },
}));
vi.mock("expo-image", () => ({ Image: "Image" }));
vi.mock("lucide-react-native", () =>
  Object.fromEntries(
    [
      "ArrowLeft",
      "Clock",
      "Download",
      "Flag",
      "HeartPulse",
      "Languages",
      "Link",
      "Mail",
      "Trash2",
      "Users",
    ].map((name) => [name, name]),
  ),
);
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" }, t: (key: string) => key }),
}));
vi.mock("../theme/ThemeProvider", () => ({
  useAppTheme: () => ({ colors: mocks.dark ? darkColors : lightColors }),
}));
vi.mock("../features/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    communityTranslationLanguage: mocks.language,
    setCommunityTranslationLanguage: vi.fn(),
  }),
}));
vi.mock("../features/recipes/RecipesProvider", () => ({
  useRecipes: () => ({ createRecipe: vi.fn(), recipes: [] }),
}));
vi.mock("../features/firebase/firebaseClient", () => ({
  getAnonymousUid: () => null,
  waitForAuth: async () => null,
}));
vi.mock("../features/community/communityCache", () => ({
  getCachedCommunityRecipe: () => mocks.recipe,
  hydrateCommunityCache: async () => {},
}));
vi.mock("../features/community/communityClient", () => ({
  getCommunityRecipe: async () => mocks.recipe,
  deleteCommunityRecipe: vi.fn(),
  reportCommunityRecipe: vi.fn(),
  voteOnRecipe: vi.fn(),
}));
vi.mock("../features/community/communityTranslation", () => ({
  translateCommunityRecipe: async (recipe: CommunityRecipe) => ({
    ...recipe,
    ingredients: ["**200 g** de farine", "2 œufs"],
    steps: ["**Mélanger**.\n\nLaisser reposer.", "Cuire 20 minutes."],
  }),
}));
vi.mock("../components/Screen", async () => {
  const React = await import("react");
  return {
    Screen: ({
      children,
      header,
    }: {
      children: React.ReactNode;
      header: React.ReactNode;
    }) => React.createElement("Screen", {}, header, children),
  };
});
vi.mock("../components/ActionMenu", () => ({ ActionMenu: "Menu" }));
vi.mock("../components/AppSheet", () => ({ AppSheet: "Sheet" }));
vi.mock("../components/GlassPanel", () => ({ GlassPanel: "Panel" }));
vi.mock("../components/IconButton", () => ({ IconButton: "IconButton" }));
vi.mock("../components/LanguagePicker", () => ({
  LanguagePicker: "LanguagePicker",
}));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/StarRating", () => ({ StarRating: "Rating" }));

let screen: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.dark = false;
  mocks.language = "en";
  mocks.recipe = {
    id: "42",
    title: "Cake",
    description: "A long recipe description. " .repeat(12),
    ingredients: ["**200 g** flour", "2 eggs"],
    steps: ["**Mix**.\n\nLet it rest.", "Bake for 20 minutes."],
    language: "en",
    authorName: "Chef",
    avgRating: 0,
    ratingCount: 0,
    reportCount: 0,
    approved: true,
    createdAt: "2026-10-18",
  };
});
afterEach(async () => {
  if (screen) await act(async () => screen?.unmount());
  screen = undefined;
  vi.unstubAllGlobals();
});
function flatten(style: unknown): Record<string, unknown> {
  return Array.isArray(style)
    ? Object.assign({}, ...style.map(flatten))
    : style && typeof style === "object"
      ? (style as Record<string, unknown>)
      : {};
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

describe("community ingredients and instructions", () => {
  it.each([
    [false, "en"],
    [true, "en"],
    [false, "fr"],
    [true, "fr"],
  ] as const)(
    "preserves intrinsic text height in every list (dark=%s, language=%s)",
    async (dark, language) => {
      mocks.dark = dark;
      mocks.language = language;
      await act(async () => {
        screen = create(
          React.createElement(CommunityDetailScreen, {
            route: { params: { id: "42" } },
            navigation: { goBack: vi.fn() },
          } as never),
        );
      });
      const lines = screen!.root
        .findAllByType(MarkdownText)
        .filter((node) => flatten(node.props.containerStyle).flex === 1);
      expect(lines).toHaveLength(4);
      for (const line of lines) {
        expect(flatten(line.props.containerStyle)).toMatchObject({
          flex: 1,
          minWidth: 0,
        });
        const allTexts = line.findAll((node) => String(node.type) === "Text");
        expect(allTexts.length).toBeGreaterThan(0);
        for (const text of allTexts) {
          expect(flatten(text.props.style).flex).not.toBe(1);
          expect(flatten(text.props.style).height).not.toBe(0);
        }
        expect(content(line).length).toBeGreaterThan(0);
      }
      const rendered = content(screen!.root);
      expect(rendered).toContain(mocks.recipe!.description.trim());
      expect(rendered).not.toContain("ui.showAll");
      expect(rendered).toContain(
        language === "fr" ? "200 g de farine" : "200 g flour",
      );
      expect(rendered).toContain(
        language === "fr" ? "Laisser reposer." : "Let it rest.",
      );
    },
  );
});
