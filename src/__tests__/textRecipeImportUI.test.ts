import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ImportRecipeScreen } from "../screens/ImportRecipeScreen";
import { LlmApiError } from "../features/import/photoRecipeImport";
import { createEmptyRecipe } from "../features/recipes/types";

const mocks = vi.hoisted(() => ({
  generate: vi.fn(), save: vi.fn(), dismiss: vi.fn(), stop: vi.fn(),
}));
vi.mock("react-native", () => ({
  Alert: { alert: vi.fn() }, Keyboard: { dismiss: mocks.dismiss },
  StyleSheet: { create: (value: unknown) => value },
}));
vi.mock("expo-image-picker", () => ({ useCameraPermissions: () => [null, vi.fn(), vi.fn()] }));
vi.mock("expo-file-system", () => ({ File: { pickFileAsync: vi.fn() } }));
vi.mock("expo", () => ({ requireOptionalNativeModule: () => null }));
vi.mock("lucide-react-native", () => ({ Camera: "Camera", Download: "Download", FileJson: "FileJson", FileText: "FileText", Globe: "Globe", ScanText: "ScanText", Sparkles: "Sparkles", Upload: "Upload" }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("../i18n", () => ({ default: { language: "en" } }));
vi.mock("../theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: { danger: "red" } }) }));
vi.mock("../features/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({ llmSettings: { apiKey: "test-key", providerId: "openai", baseUrl: "", model: "test-model" } }),
}));
vi.mock("../features/recipes/RecipesProvider", () => ({ useRecipes: () => ({ createRecipe: mocks.save }) }));
vi.mock("../features/recipes/recipeImages", () => ({ persistRecipeImage: vi.fn() }));
vi.mock("../features/import/photoRecipeImport", async (original) => ({
  ...(await original<typeof import("../features/import/photoRecipeImport")>()),
  generateRecipeFromText: mocks.generate,
}));
vi.mock("../components/LongActionToast", () => ({ useLongActionToast: () => ({ watchLongAction: () => mocks.stop }) }));
vi.mock("../components/Screen", () => ({ Screen: ({ children }: { children: React.ReactNode }) => React.createElement("Screen", {}, children) }));
vi.mock("../components/ScreenHeader", () => ({ ScreenHeader: "Header" }));
vi.mock("../components/GlassPanel", () => ({ GlassPanel: "Panel" }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/SettingsRow", () => ({ SettingsRow: "Row" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));

let screen: ReactTestRenderer;
const navigation = { replace: vi.fn(), goBack: vi.fn() };
const recipe = { ...createEmptyRecipe(), name: "Omelette", recipeIngredient: ["2 eggs"], recipeInstructions: ["Cook the eggs."] };
const text = "Omelette\nIngredients\n2 eggs\nInstructions\nCook the eggs.";
const button = () => screen.root.findByType("Button" as never);
async function openImport() {
  await act(async () => { screen = create(React.createElement(ImportRecipeScreen, { navigation, route: {} } as never)); });
  await act(async () => screen.root.findAllByType("Row" as never).find(row => row.props.title === "ui.importText")!.props.onPress());
  await act(async () => screen.root.findByType("Input" as never).props.onChangeText(text));
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  mocks.generate.mockResolvedValue(recipe);
  mocks.save.mockResolvedValue({ ...recipe, id: "42" });
});
afterEach(async () => { await act(async () => screen?.unmount()); vi.unstubAllGlobals(); });

it("submits pasted multiline text with a React Native button and opens the saved recipe", async () => {
  await openImport();
  expect(button().props.fillAvailableSpace).toBe(true);
  await act(async () => button().props.onPress());
  expect(mocks.dismiss).toHaveBeenCalledOnce();
  expect(mocks.generate).toHaveBeenCalledWith(text, "test-key", "openai", "", "test-model", "en");
  expect(mocks.save).toHaveBeenCalledWith(recipe);
  expect(navigation.replace).toHaveBeenCalledWith("RecipeDetail", { id: "42" });
  expect(mocks.stop).toHaveBeenCalledOnce();
});

it("prevents repeated presses from generating duplicate recipes", async () => {
  await openImport();
  let resolve!: (value: typeof recipe) => void;
  mocks.generate.mockReturnValue(new Promise(done => { resolve = done; }));
  const press = button().props.onPress;
  await act(async () => { press(); press(); });
  expect(mocks.generate).toHaveBeenCalledOnce();
  expect(button().props.disabled).toBe(true);
  await act(async () => resolve(recipe));
  expect(mocks.save).toHaveBeenCalledOnce();
});

it("shows failures and allows retrying the same text", async () => {
  await openImport();
  mocks.generate.mockRejectedValueOnce(new Error("Network request failed"));
  await act(async () => button().props.onPress());
  expect(JSON.stringify(screen.toJSON())).toContain("importRecipe.textFailed");
  expect(mocks.save).not.toHaveBeenCalled();
  expect(button().props.disabled).toBe(false);
  await act(async () => button().props.onPress());
  expect(mocks.save).toHaveBeenCalledOnce();
});

it("shows the provider status without exposing its response", async () => {
  await openImport();
  mocks.generate.mockRejectedValueOnce(new LlmApiError(400, "private response"));
  await act(async () => button().props.onPress());
  expect(JSON.stringify(screen.toJSON())).toContain("importRecipe.textFailed (HTTP 400)");
  expect(JSON.stringify(screen.toJSON())).not.toContain("private response");
});

it("reports an exhausted AI balance", async () => {
  await openImport();
  mocks.generate.mockRejectedValueOnce(new LlmApiError(400, "Your credit balance is too low"));
  await act(async () => button().props.onPress());
  expect(JSON.stringify(screen.toJSON())).toContain("importRecipe.photoApiNoCredits");
});
