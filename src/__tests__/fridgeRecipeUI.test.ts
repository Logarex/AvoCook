import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FridgeRecipeScreen } from "../screens/FridgeRecipeScreen";
import { createEmptyRecipe } from "../features/recipes/types";
import { emptyKitchen, type KitchenData } from "../features/kitchen/kitchen";
import {
  LlmApiError,
  type LlmRequestSettings,
} from "../features/import/photoRecipeImport";
import fr from "../i18n/locales/fr";
import en from "../i18n/locales/en";
import de from "../i18n/locales/de";
import es from "../i18n/locales/es";
import itLocale from "../i18n/locales/it";
import da from "../i18n/locales/da";

const resources: Record<string, { translation: unknown }> = {
  fr,
  en,
  de,
  es,
  it: itLocale,
  da,
};
const mocks = vi.hoisted(() => ({
  language: "fr",
  account: "local",
  data: {} as KitchenData,
  settings: {} as LlmRequestSettings,
  generate: vi.fn(),
  analyze: vi.fn(),
  gallery: vi.fn(),
  camera: vi.fn(),
  permission: vi.fn(),
  prevent: vi.fn(),
  alert: vi.fn(),
  missing: new Set<string>(),
}));
function translate(key: string, params: Record<string, unknown> = {}) {
  let value: unknown = resources[mocks.language].translation;
  for (const part of key.split("."))
    value =
      value && typeof value === "object"
        ? (value as Record<string, unknown>)[part]
        : undefined;
  if (typeof value !== "string") {
    mocks.missing.add(key);
    return key;
  }
  return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(params[name] ?? ""),
  );
}
vi.mock("react-native", () => ({
  View: "View",
  Alert: { alert: mocks.alert },
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock("@react-navigation/native", () => ({
  usePreventRemove: mocks.prevent,
}));
vi.mock("expo-image", () => ({ Image: "Photo" }));
vi.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: mocks.gallery,
  launchCameraAsync: mocks.camera,
  requestCameraPermissionsAsync: mocks.permission,
}));
vi.mock("lucide-react-native", () => ({
  Camera: "Camera",
  ImagePlus: "ImagePlus",
  Sparkles: "Sparkles",
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: translate, i18n: { language: mocks.language } }),
}));
vi.mock("../features/kitchen/KitchenProvider", () => ({
  useKitchen: () => ({ account: mocks.account, data: mocks.data, ready: true }),
}));
vi.mock("../features/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({ llmSettings: mocks.settings }),
}));
vi.mock("../features/kitchen/fridgeAssistant", async (original) => ({
  ...(await original<typeof import("../features/kitchen/fridgeAssistant")>()),
  analyzeFridgePhoto: mocks.analyze,
  generateFridgeRecipe: mocks.generate,
}));
vi.mock("../components/Screen", () => ({
  Screen: ({
    children,
    header,
  }: {
    children: React.ReactNode;
    header: React.ReactNode;
  }) => React.createElement("Screen", {}, header, children),
}));
vi.mock("../components/ScreenHeader", () => ({ ScreenHeader: "Header" }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));
vi.mock("../components/GlassPanel", () => ({ GlassPanel: "Panel" }));
let screen: ReactTestRenderer | undefined;
const navigation = {
  navigate: vi.fn(),
  goBack: vi.fn(),
  replace: vi.fn(),
  dispatch: vi.fn(),
};
const draft = {
  ...createEmptyRecipe(),
  name: "Test omelette",
  recipeYield: 2,
  recipeIngredient: ["2 eggs"],
  recipeInstructions: ["Whisk", "Cook"],
};
const props = { navigation, route: { params: undefined } };
async function render() {
  await act(async () => {
    screen = create(React.createElement(FridgeRecipeScreen, props as never));
  });
}
async function refresh() {
  await act(async () => {
    screen!.update(React.createElement(FridgeRecipeScreen, props as never));
  });
}
function buttons(key: string) {
  return screen!.root.findAll(
    (node) =>
      String(node.type) === "Button" && node.props.label === translate(key),
  );
}
function input(key: string) {
  return screen!.root.findAll(
    (node) =>
      String(node.type) === "Input" && node.props.label === translate(key),
  )[0];
}
async function enter(key: string, text: string) {
  await act(async () => input(key).props.onChangeText(text));
}
async function press(key: string) {
  const button = buttons(key)[0];
  expect(button).toBeDefined();
  expect(button.props.disabled).not.toBe(true);
  await act(async () => button.props.onPress());
}
function text() {
  return JSON.stringify(screen!.toJSON());
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  mocks.missing.clear();
  mocks.language = "fr";
  mocks.account = "local";
  mocks.data = emptyKitchen();
  mocks.settings = {
    apiKey: "fake-secret-key",
    providerId: "openai",
    baseUrl: "",
    model: "chosen-model",
  };
  mocks.generate.mockResolvedValue(draft);
  mocks.analyze.mockResolvedValue({
    ingredients: ["Eggs", "Cheese"],
    uncertain: ["a jar"],
  });
  mocks.gallery.mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///test.jpg", base64: "/9j/AA==" }],
  });
  mocks.permission.mockResolvedValue({ granted: true });
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  screen = undefined;
  vi.unstubAllGlobals();
});

describe("fridge recipe workflow", () => {
  it.each(["fr", "en", "de", "es", "it", "da"])(
    "renders and completes the text-to-editable-draft path in %s without missing labels",
    async (language) => {
      mocks.language = language;
      await render();
      expect(buttons("kitchen.fridgeGenerate")[0].props.disabled).toBe(true);
      await enter("kitchen.fridgeText", "eggs, cheese");
      await press("kitchen.fridgeGenerate");
      expect(mocks.generate).toHaveBeenCalledWith(
        { ingredients: "eggs, cheese", wishes: "", servings: 2, minutes: 20 },
        mocks.settings,
        language,
        expect.any(AbortSignal),
      );
      expect(text()).toContain(translate("kitchen.fridgeDraft"));
      expect(text()).not.toContain(mocks.settings.apiKey);
      expect(navigation.replace).not.toHaveBeenCalled();
      await press("kitchen.fridgeEditDraft");
      expect(navigation.replace).toHaveBeenCalledWith("RecipeEditor", {
        draft,
      });
      expect(mocks.data).toEqual(emptyKitchen());
      expect(mocks.missing.size).toBe(0);
    },
  );
  it("offers assistant setup without a key, makes no network call and does not warn about an untouched draft", async () => {
    mocks.settings.apiKey = "";
    await render();
    expect(buttons("kitchen.fridgeGenerate")).toHaveLength(0);
    expect(mocks.prevent).toHaveBeenLastCalledWith(false, expect.any(Function));
    await press("ui.assistant");
    expect(navigation.navigate).toHaveBeenCalledWith("Settings", {
      section: "assistant",
    });
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.analyze).not.toHaveBeenCalled();
  });
  it("sends a selected photo only after explicit analysis, then requires a second explicit generation action", async () => {
    await render();
    await press("importRecipe.photoSourceGallery");
    expect(mocks.gallery).toHaveBeenCalledWith(
      expect.objectContaining({ allowsEditing: false, base64: true, exif: false }),
    );
    expect(mocks.analyze).not.toHaveBeenCalled();
    expect(buttons("kitchen.fridgeGenerate")[0].props.disabled).toBe(true);
    await press("kitchen.fridgeAnalyze");
    expect(mocks.analyze).toHaveBeenCalledWith(
      "/9j/AA==",
      mocks.settings,
      "fr",
      expect.any(AbortSignal),
    );
    expect(input("kitchen.fridgeText").props.value).toBe("Eggs\nCheese");
    expect(input("kitchen.fridgeText").props.value).not.toContain("jar");
    expect(text()).toContain(translate("kitchen.fridgeCheckPhoto"));
    expect(text()).toContain("a jar");
    expect(buttons("kitchen.fridgeAnalyze")).toHaveLength(0);
    expect(mocks.generate).not.toHaveBeenCalled();
    await enter("kitchen.fridgeText", "Eggs, tomatoes");
    await press("kitchen.fridgeGenerate");
    expect(mocks.generate.mock.calls[0][0].ingredients).toBe("Eggs, tomatoes");
  });
  it("keeps text intact when the picker is cancelled or camera access is denied", async () => {
    mocks.gallery.mockResolvedValueOnce({ canceled: true });
    mocks.permission.mockResolvedValueOnce({ granted: false });
    await render();
    await enter("kitchen.fridgeText", "Tomatoes");
    await press("importRecipe.photoSourceGallery");
    await press("importRecipe.photoSourceCamera");
    expect(input("kitchen.fridgeText").props.value).toBe("Tomatoes");
    expect(mocks.camera).not.toHaveBeenCalled();
    expect(mocks.analyze).not.toHaveBeenCalled();
    expect(text()).toContain(
      translate("importRecipe.photoCameraPermissionBody"),
    );
  });
  it("does not send photos whose base64 data is unavailable", async () => {
    mocks.gallery.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///bad.jpg", base64: null }],
    });
    await render();
    await press("importRecipe.photoSourceGallery");
    expect(text()).toContain(translate("kitchen.fridgePhotoError"));
    expect(mocks.analyze).not.toHaveBeenCalled();
  });
  it("prevents duplicate requests and ignores a cancelled result after a new request succeeds", async () => {
    let finish: (value: typeof draft) => void = () => {};
    mocks.generate.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await render();
    await enter("kitchen.fridgeText", "Eggs");
    const onPress = buttons("kitchen.fridgeGenerate")[0].props.onPress;
    await act(async () => {
      onPress();
      onPress();
    });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    const signal: AbortSignal = mocks.generate.mock.calls[0][3];
    await press("common.cancel");
    expect(signal.aborted).toBe(true);
    await press("kitchen.fridgeGenerate");
    await act(async () => finish({ ...draft, name: "Late cancelled recipe" }));
    expect(text()).not.toContain("Late cancelled recipe");
    expect(text()).toContain("Test omelette");
  });
  it("aborts on provider changes and prevents an older result from reappearing", async () => {
    let finish: (value: typeof draft) => void = () => {};
    mocks.generate.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await render();
    await enter("kitchen.fridgeText", "Eggs");
    await press("kitchen.fridgeGenerate");
    const signal: AbortSignal = mocks.generate.mock.calls[0][3];
    mocks.settings = { ...mocks.settings, model: "different-model" };
    await refresh();
    expect(signal.aborted).toBe(true);
    await act(async () => finish({ ...draft, name: "Old provider result" }));
    expect(text()).not.toContain("Old provider result");
    expect(input("kitchen.fridgeText").props.value).toBe("Eggs");
  });
  it("clears account-specific inputs and aborts on account changes", async () => {
    mocks.generate.mockReturnValueOnce(new Promise(() => {}));
    await render();
    await enter("kitchen.fridgeText", "Private ingredients");
    await press("kitchen.fridgeGenerate");
    const signal: AbortSignal = mocks.generate.mock.calls[0][3];
    mocks.account = "another-account";
    await refresh();
    expect(signal.aborted).toBe(true);
    expect(input("kitchen.fridgeText").props.value).toBe("");
  });
  it("keeps input on a translated provider error and does not expose raw response data", async () => {
    mocks.generate.mockRejectedValueOnce(
      new LlmApiError(401, "private response: fake-secret-key"),
    );
    await render();
    await enter("kitchen.fridgeText", "Eggs");
    await press("kitchen.fridgeGenerate");
    expect(input("kitchen.fridgeText").props.value).toBe("Eggs");
    expect(text()).toContain(translate("kitchen.fridgeKeyError"));
    expect(text()).not.toContain("private response");
    expect(text()).not.toContain("fake-secret-key");
  });
  it("blocks invalid portions and time and imports stock only when requested", async () => {
    mocks.data.stock = [
      {
        id: "1",
        name: "Rice",
        quantity: "200 g",
        location: "cupboard",
        expires: "",
      },
      {
        id: "2",
        name: "Expired",
        quantity: "",
        location: "fridge",
        expires: "2000-01-01",
      },
    ];
    await render();
    expect(input("kitchen.fridgeText").props.value).toBe("");
    await press("kitchen.fridgeUseStock");
    expect(input("kitchen.fridgeText").props.value).toBe("Rice");
    await enter("kitchen.servings", "0");
    await enter("kitchen.fridgeTime", "3");
    expect(buttons("kitchen.fridgeGenerate")[0].props.disabled).toBe(true);
    expect(text()).toContain(translate("kitchen.fridgeNumbers"));
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
