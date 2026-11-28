import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ImportRecipeScreen } from "../screens/ImportRecipeScreen";
import { createEmptyRecipe } from "../features/recipes/types";

const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  dismiss: vi.fn(),
  stop: vi.fn(),
  library: vi.fn(),
  camera: vi.fn(),
  pickFile: vi.fn(),
  photos: vi.fn(),
  pdf: vi.fn(),
  pasted: vi.fn(),
  status: vi.fn(),
  available: vi.fn(),
  apiKey: "",
}));
vi.mock("react-native", () => ({
  Alert: { alert: mocks.alert },
  Keyboard: { dismiss: mocks.dismiss },
  StyleSheet: { create: (value: unknown) => value },
}));
vi.mock("expo-image-picker", () => ({
  useCameraPermissions: () => [{ granted: true }, vi.fn(), vi.fn()],
  launchImageLibraryAsync: mocks.library,
  launchCameraAsync: mocks.camera,
}));
vi.mock("expo-file-system", () => ({ File: { pickFileAsync: mocks.pickFile } }));
vi.mock("../features/import/localRecipeScan", async (original) => ({
  ...(await original<typeof import("../features/import/localRecipeScan")>()),
  isDeviceScanAvailable: mocks.available,
  getLocalAiStatus: mocks.status,
  recipeFromPhotos: mocks.photos,
  recipeFromPdf: mocks.pdf,
  recipeFromPastedText: mocks.pasted,
}));
vi.mock("expo", () => ({ requireOptionalNativeModule: () => null }));
vi.mock("lucide-react-native", () => ({ Camera: "Camera", Download: "Download", FileJson: "FileJson", FileText: "FileText", Globe: "Globe", ScanText: "ScanText", Sparkles: "Sparkles", Upload: "Upload" }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("../i18n", () => ({ default: { language: "fr" } }));
vi.mock("../theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: { danger: "red" } }) }));
vi.mock("../features/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({ llmSettings: { apiKey: mocks.apiKey, providerId: "gemini", baseUrl: "", model: "" } }),
}));
vi.mock("../features/recipes/RecipesProvider", () => ({ useRecipes: () => ({ createRecipe: vi.fn() }) }));
vi.mock("../features/recipes/recipeImages", () => ({ persistRecipeImage: vi.fn() }));
vi.mock("../components/LongActionToast", () => ({ useLongActionToast: () => ({ watchLongAction: () => mocks.stop }) }));
vi.mock("../components/Screen", () => ({ Screen: ({ children }: { children: React.ReactNode }) => React.createElement("Screen", {}, children) }));
vi.mock("../components/ScreenHeader", () => ({ ScreenHeader: "Header" }));
vi.mock("../components/GlassPanel", () => ({ GlassPanel: "Panel" }));
vi.mock("../components/AppText", () => ({ AppText: "Text" }));
vi.mock("../components/SettingsRow", () => ({ SettingsRow: "Row" }));
vi.mock("../components/TextField", () => ({ TextField: "Input" }));
vi.mock("../components/PrimaryButton", () => ({ PrimaryButton: "Button" }));

let screen: ReactTestRenderer;
const navigation = { replace: vi.fn(), goBack: vi.fn(), navigate: vi.fn() };
const draft = { ...createEmptyRecipe(), name: "Crêpes", recipeIngredient: ["250 g de farine"], recipeInstructions: ["Mélangez."] };
const json = () => JSON.stringify(screen.toJSON());
const buttons = () => screen.root.findAllByType("Button" as never);
const button = (label: string) => buttons().find((item) => item.props.label === label)!;

async function open(row: string) {
  await act(async () => {
    screen = create(React.createElement(ImportRecipeScreen, { navigation, route: {} } as never));
  });
  await act(async () => screen.root.findAllByType("Row" as never).find((item) => item.props.title === row)!.props.onPress());
}
/** Presses an action in the last Alert shown. */
async function choose(text: string) {
  const actions = mocks.alert.mock.calls.at(-1)![2] as { text: string; onPress?: () => void }[];
  await act(async () => actions.find((action) => action.text === text)!.onPress!());
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.apiKey = "";
  mocks.available.mockReturnValue(true);
  mocks.status.mockResolvedValue("unavailable");
  mocks.photos.mockResolvedValue({ recipe: draft, usedLocalAi: false, complete: true });
  mocks.pdf.mockResolvedValue({ recipe: draft, usedLocalAi: false, complete: true });
  mocks.pasted.mockResolvedValue({ recipe: draft, usedLocalAi: false, complete: true });
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("scans library photos in order without any AI key and opens the draft for review", async () => {
  await open("ui.importPhoto");
  expect(json()).toContain("importRecipe.scanHint");
  expect(json()).toContain("importRecipe.scanNoKeyHint");
  mocks.library.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///p1.jpg" }, { uri: "file:///p2.jpg" }] });
  await act(async () => button("importRecipe.scanAction").props.onPress());
  await choose("importRecipe.photoSourceGallery");
  expect(mocks.library).toHaveBeenCalledWith(expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 5 }));
  expect(mocks.photos).toHaveBeenCalledWith(["file:///p1.jpg", "file:///p2.jpg"]);
  expect(navigation.replace).toHaveBeenCalledWith("RecipeEditor", { draft });
  expect(mocks.stop).toHaveBeenCalledOnce();
});

it("lets the camera add pages until the user is done", async () => {
  await open("ui.importPhoto");
  mocks.camera
    .mockResolvedValueOnce({ canceled: false, assets: [{ uri: "file:///page1.jpg" }] })
    .mockResolvedValueOnce({ canceled: false, assets: [{ uri: "file:///page2.jpg" }] });
  await act(async () => button("importRecipe.scanAction").props.onPress());
  await choose("importRecipe.photoSourceCamera");
  await choose("importRecipe.scanAddPage");
  expect(mocks.alert.mock.calls.at(-1)![1]).toBe("importRecipe.scanAddPageBody");
  await choose("importRecipe.scanDone");
  expect(mocks.photos).toHaveBeenCalledWith(["file:///page1.jpg", "file:///page2.jpg"]);
});

it("explains when no recipe is found in the photo", async () => {
  const { NoRecipeFoundError } = await import("../features/import/localRecipeScan");
  mocks.photos.mockRejectedValue(new NoRecipeFoundError());
  mocks.library.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///dish.jpg" }] });
  await open("ui.importPhoto");
  await act(async () => button("importRecipe.scanAction").props.onPress());
  await choose("importRecipe.photoSourceGallery");
  expect(json()).toContain("importRecipe.scanNoText");
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(button("importRecipe.scanAction").props.disabled).toBe(false);
});

it("offers the online AI as a second choice when a key exists, and says when the device's AI helps", async () => {
  mocks.apiKey = "key";
  mocks.status.mockResolvedValue("available");
  await open("ui.importPhoto");
  expect(json()).toContain("importRecipe.localAiOn");
  expect(button("importRecipe.cloudPhotoAction").props.variant).toBe("secondary");
});

it("asks to turn on Apple Intelligence when it is off", async () => {
  mocks.status.mockResolvedValue("disabled");
  await open("ui.importPhoto");
  expect(json()).toContain("importRecipe.localAiDisabled");
});

it("imports a PDF and reports a protected one", async () => {
  await open("ui.importPdf");
  mocks.pickFile.mockResolvedValue({ canceled: false, result: { uri: "file:///recette.pdf" } });
  await act(async () => button("importRecipe.pdfAction").props.onPress());
  expect(mocks.pickFile).toHaveBeenCalledWith({ mimeTypes: "application/pdf" });
  expect(mocks.pdf).toHaveBeenCalledWith("file:///recette.pdf");
  expect(navigation.replace).toHaveBeenCalledWith("RecipeEditor", { draft });

  const { PdfLockedError } = await import("../features/import/localRecipeScan");
  mocks.pdf.mockRejectedValue(new PdfLockedError());
  await act(async () => button("importRecipe.pdfAction").props.onPress());
  expect(json()).toContain("importRecipe.pdfLocked");
});

it("does nothing when the PDF picker is cancelled", async () => {
  await open("ui.importPdf");
  mocks.pickFile.mockResolvedValue({ canceled: true, result: null });
  await act(async () => button("importRecipe.pdfAction").props.onPress());
  expect(mocks.pdf).not.toHaveBeenCalled();
  expect(json()).not.toContain("importRecipe.pdfFailed");
});

it("arranges pasted text on the device without a key", async () => {
  await open("ui.importText");
  expect(json()).toContain("importRecipe.textLocalHint");
  await act(async () => screen.root.findByType("Input" as never).props.onChangeText("Crêpes\n250 g de farine"));
  await act(async () => button("importRecipe.textLocalAction").props.onPress());
  expect(mocks.pasted).toHaveBeenCalledWith("Crêpes\n250 g de farine");
  expect(navigation.replace).toHaveBeenCalledWith("RecipeEditor", { draft });
  await act(async () => button("importRecipe.textCloudLink").props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith("Settings", { section: "assistant" });
});

it("keeps the previous behaviour where the native scanner is not built in", async () => {
  mocks.available.mockReturnValue(false);
  await open("ui.importPhoto");
  expect(json()).not.toContain("importRecipe.scanAction");
  expect(json()).toContain("importRecipe.photoNoKeyHint");
  expect(screen.root.findAllByType("Row" as never).map((row) => row.props.title)).not.toContain("ui.importPdf");
});
