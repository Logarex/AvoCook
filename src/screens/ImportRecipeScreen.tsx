import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  Download,
  FileJson,
  Globe,
  Sparkles,
  Upload,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet } from "react-native";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { useLongActionToast } from "../components/LongActionToast";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { SettingsRow } from "../components/SettingsRow";
import { TextField } from "../components/TextField";
import {
  extractRecipeFromPhoto,
  generateRecipeFromText,
  LlmApiError,
  LlmModelNotFoundError,
  LlmNotFoodError,
} from "../features/import/photoRecipeImport";
import { usePreferences } from "../features/preferences/PreferencesProvider";
import { persistRecipeImage } from "../features/recipes/recipeImages";
import { useRecipes } from "../features/recipes/RecipesProvider";
import i18n from "../i18n";
import type { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "ImportRecipe">;

export function ImportRecipeScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { importBackup, importBackupFile, importRecipe, createRecipe } =
    useRecipes();
  const { llmSettings } = usePreferences();
  const [method, setMethod] = useState<
    "url" | "photo" | "text" | "file" | null
  >(route.params?.url ? "url" : route.params?.fileUri ? "file" : null);
  const [url, setUrl] = useState(route.params?.url ?? "");
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState<
    "url" | "file" | "photo" | "text" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const { watchLongAction } = useLongActionToast();
  const [cameraPermission, requestCameraPermission, getCameraPermission] =
    ImagePicker.useCameraPermissions({ get: false });

  const hasLlmKey = Boolean(llmSettings.apiKey.trim());

  React.useEffect(() => {
    if (route.params?.url) {
      void handleImportUrl(route.params.url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.url]);

  React.useEffect(() => {
    if (route.params?.fileUri) {
      void handleImportSharedFile(route.params.fileUri);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.fileUri]);

  async function handleImport() {
    setSubmitting("url");
    setError(null);
    try {
      const recipe = await importRecipe(url);
      if (recipe.id) {
        navigation.replace("RecipeDetail", { id: recipe.id });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      if (error instanceof Error && error.message === "PAPILLES_BLOCKED") {
        setError(t("importRecipe.papillesBlocked"));
      } else if (
        error instanceof Error &&
        (error.message === "INCOMPLETE_RECIPE" ||
          error.message.includes("No schema.org Recipe") ||
          error.message.includes("Recipe page returned"))
      ) {
        setError(t("importRecipe.incompleteRecipe"));
      } else {
        setError(t("importRecipe.failed"));
      }
    } finally {
      setSubmitting(null);
    }
  }

  async function handleImportUrl(targetUrl: string) {
    setUrl(targetUrl);
    setSubmitting("url");
    setError(null);
    try {
      const recipe = await importRecipe(targetUrl);
      if (recipe.id) {
        navigation.replace("RecipeDetail", { id: recipe.id });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      if (error instanceof Error && error.message === "PAPILLES_BLOCKED") {
        setError(t("importRecipe.papillesBlocked"));
      } else if (
        error instanceof Error &&
        (error.message === "INCOMPLETE_RECIPE" ||
          error.message.includes("No schema.org Recipe") ||
          error.message.includes("Recipe page returned"))
      ) {
        setError(t("importRecipe.incompleteRecipe"));
      } else {
        setError(t("importRecipe.failed"));
      }
    } finally {
      setSubmitting(null);
    }
  }

  async function handleImportSharedFile(fileUri: string) {
    setSubmitting("file");
    setError(null);
    try {
      const result = await importBackupFile(fileUri);
      showImportSuccess(result);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace("Recipes");
      }
    } catch (error) {
      setError(
        error instanceof Error && error.message === "INVALID_RECIPE_BACKUP"
          ? t("importRecipe.invalidFile")
          : t("importRecipe.fileFailed"),
      );
    } finally {
      setSubmitting(null);
    }
  }

  async function handlePickSharedFile() {
    setSubmitting("file");
    setError(null);
    try {
      const result = await importBackup();
      showImportSuccess(result);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace("Recipes");
      }
    } catch (error) {
      if (!isPickerCancel(error)) {
        setError(
          error instanceof Error && error.message === "INVALID_RECIPE_BACKUP"
            ? t("importRecipe.invalidFile")
            : t("importRecipe.fileFailed"),
        );
      }
    } finally {
      setSubmitting(null);
    }
  }

  async function handleScanPhoto() {
    Alert.alert(t("importRecipe.photoSourceTitle"), "", [
      {
        text: t("common.cancel"),
        style: "cancel",
      },
      {
        text: t("importRecipe.photoSourceCamera"),
        onPress: () => void processCamera(),
      },
      {
        text: t("importRecipe.photoSourceGallery"),
        onPress: () => void processImage(ImagePicker.launchImageLibraryAsync),
      },
    ]);
  }

  async function processCamera() {
    const currentPermission = cameraPermission ?? (await getCameraPermission());
    if (!currentPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          t("importRecipe.photoCameraPermissionTitle"),
          t("importRecipe.photoCameraPermissionBody"),
        );
        return;
      }
    }
    void processImage(ImagePicker.launchCameraAsync);
  }

  async function processImage(
    pickerFn: (
      options: ImagePicker.ImagePickerOptions,
    ) => Promise<ImagePicker.ImagePickerResult>,
  ) {
    setError(null);

    await new Promise<void>((resolve) => {
      Alert.alert(
        t("importRecipe.cropInstructionsTitle"),
        t("importRecipe.cropInstructionsBody"),
        [{ text: t("common.continue"), onPress: () => resolve() }],
      );
    });

    const result = await pickerFn({
      mediaTypes: ["images"],
      quality: 0.4,
      base64: true,
      allowsEditing: true,
    }).catch(() => null);

    if (!result || result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const base64 = asset.base64;
    if (!base64) {
      setError(t("importRecipe.photoFailed"));
      return;
    }

    setSubmitting("photo");
    const stopLongActionNotice = watchLongAction("longActions.importRecipe");
    try {
      const recipe = await extractRecipeFromPhoto(
        base64,
        llmSettings.apiKey,
        llmSettings.providerId,
        llmSettings.baseUrl,
        llmSettings.model,
        i18n.language,
      );

      let recipePhotoUri: string | null = null;
      try {
        recipePhotoUri = await persistRecipeImage(asset.uri);
        recipe.image = recipePhotoUri;
        recipe.imageUrl = recipePhotoUri;
      } catch (imgErr) {
        console.error("app", "Failed to persist recipe image", imgErr);
      }

      stopLongActionNotice();
      setSubmitting(null);

      await new Promise<void>((resolve) => {
        Alert.alert(
          t("importRecipe.mealPhotoTitle"),
          t("importRecipe.mealPhotoBody"),
          [
            {
              text: t("importRecipe.mealPhotoPickNew"),
              onPress: () => {
                void (async () => {
                  try {
                    const mealResult =
                      await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ["images"],
                        quality: 0.7,
                        allowsEditing: true,
                        aspect: [4, 3],
                      });
                    if (!mealResult.canceled && mealResult.assets[0]) {
                      const mealUri = await persistRecipeImage(
                        mealResult.assets[0].uri,
                      );
                      recipe.image = mealUri;
                      recipe.imageUrl = mealUri;
                    }
                  } catch {}
                  resolve();
                })();
              },
            },
            {
              text: t("importRecipe.mealPhotoUseCurrent"),
              onPress: () => resolve(),
            },
            {
              text: t("importRecipe.mealPhotoSkip"),
              style: "cancel",
              onPress: () => {
                recipe.image = "";
                recipe.imageUrl = "";
                resolve();
              },
            },
          ],
        );
      });

      setSubmitting("photo");
      const stopLongActionNotice2 = watchLongAction("longActions.importRecipe");
      const saved = await createRecipe(recipe);
      stopLongActionNotice2();
      if (saved.id) {
        navigation.replace("RecipeDetail", { id: saved.id });
      } else {
        navigation.goBack();
      }
    } catch (err) {
      console.error("app", "Photo import failed in ImportRecipeScreen", err);
      if (err instanceof LlmModelNotFoundError) {
        setError(
          t("importRecipe.photoModelNotFound", { model: err.model }) +
            (err.modelDocsUrl
              ? "\n" + t("importRecipe.photoModelDocsHint")
              : ""),
        );
      } else if (err instanceof LlmNotFoodError) {
        setError(t("importRecipe.notFoodError"));
      } else if (err instanceof LlmApiError && err.status === 401) {
        setError(t("importRecipe.photoApiKeyInvalid"));
      } else if (err instanceof LlmApiError && err.status === 403) {
        setError(t("importRecipe.photoApiNoCredits"));
      } else if (err instanceof LlmApiError && err.status === 429) {
        setError(t("importRecipe.photoApiKeyQuotaExceeded"));
      } else {
        setError(t("importRecipe.photoFailed"));
      }
    } finally {
      stopLongActionNotice();
      setSubmitting(null);
    }
  }

  async function handleTextPromptSubmit() {
    setSubmitting("text");
    setError(null);
    const stopLongActionNotice = watchLongAction("longActions.importRecipe");
    try {
      const recipe = await generateRecipeFromText(
        prompt,
        llmSettings.apiKey,
        llmSettings.providerId,
        llmSettings.baseUrl,
        llmSettings.model,
        i18n.language,
      );
      const saved = await createRecipe(recipe);
      if (saved.id) {
        navigation.replace("RecipeDetail", { id: saved.id });
      } else {
        navigation.goBack();
      }
    } catch (err) {
      console.error("app", "Text import failed in ImportRecipeScreen", err);
      if (err instanceof LlmModelNotFoundError) {
        setError(
          t("importRecipe.photoModelNotFound", { model: err.model }) +
            (err.modelDocsUrl
              ? "\n" + t("importRecipe.photoModelDocsHint")
              : ""),
        );
      } else if (err instanceof LlmNotFoodError) {
        setError(t("importRecipe.notFoodError"));
      } else if (err instanceof LlmApiError && err.status === 401) {
        setError(t("importRecipe.photoApiKeyInvalid"));
      } else if (err instanceof LlmApiError && err.status === 403) {
        setError(t("importRecipe.photoApiNoCredits"));
      } else if (err instanceof LlmApiError && err.status === 429) {
        setError(t("importRecipe.photoApiKeyQuotaExceeded"));
      } else {
        setError(t("importRecipe.textFailed"));
      }
    } finally {
      stopLongActionNotice();
      setSubmitting(null);
    }
  }

  const showImportSuccess = useCallback(
    (result: {
      created: number;
      updated: number;
      skipped: number;
      renamed: number;
    }) => {
      Alert.alert(
        t("importRecipe.fileImportedTitle"),
        t("importRecipe.fileImportedBody", {
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
          renamed: result.renamed,
        }),
      );
    },
    [t],
  );

  const methodTitle =
    method === "url"
      ? t("ui.importLink")
      : method === "photo"
        ? t("ui.importPhoto")
        : method === "text"
          ? t("ui.importText")
          : t("ui.importFile");
  return (
    <Screen
      showScrollTop={false}
      contentWidth={640}
      header={
        <ScreenHeader
          title={method ? methodTitle : t("importRecipe.title")}
          onBack={() => {
            if (submitting) return;
            if (method) {
              setMethod(null);
              setError(null);
            } else navigation.goBack();
          }}
        />
      }
    >
      {error ? (
        <GlassPanel style={styles.errorCard} intensity={80}>
          <AppText
            accessibilityRole="alert"
            style={{ color: colors.danger, textAlign: "center" }}
          >
            {error}
          </AppText>
        </GlassPanel>
      ) : null}
      {!method ? (
        <>
          <AppText muted>{t("ui.importMethod")}</AppText>
          <GlassPanel style={{ padding: 0 }}>
            <SettingsRow
              icon={Globe}
              title={t("ui.importLink")}
              onPress={() => setMethod("url")}
            />
            <SettingsRow
              icon={Camera}
              title={t("ui.importPhoto")}
              onPress={() => setMethod("photo")}
            />
            <SettingsRow
              icon={Sparkles}
              title={t("ui.importText")}
              onPress={() => setMethod("text")}
            />
            <SettingsRow
              icon={FileJson}
              title={t("ui.importFile")}
              onPress={() => setMethod("file")}
            />
          </GlassPanel>
        </>
      ) : null}
      {method === "url" ? (
        <GlassPanel style={styles.section}>
          <TextField
            label={t("importRecipe.url")}
            value={url}
            onChangeText={setUrl}
            placeholder={t("importRecipe.urlPlaceholder")}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            textContentType="URL"
            returnKeyType="go"
            editable={submitting === null}
            onSubmitEditing={() => {
              if (url.trim() && submitting === null) void handleImport();
            }}
          />
          <PrimaryButton
            label={
              submitting === "url"
                ? t("common.loading")
                : t("importRecipe.action")
            }
            icon={Download}
            disabled={!url.trim() || submitting !== null}
            onPress={() => void handleImport()}
          />
        </GlassPanel>
      ) : null}
      {method === "photo" || method === "text" ? (
        <GlassPanel style={styles.section}>
          {hasLlmKey ? (
            method === "photo" ? (
              <>
                <AppText muted>{t("importRecipe.photoHint")}</AppText>
                <PrimaryButton
                  icon={Camera}
                  label={
                    submitting === "photo"
                      ? t("common.loading")
                      : t("importRecipe.photoAction")
                  }
                  disabled={submitting !== null}
                  onPress={() => void handleScanPhoto()}
                />
              </>
            ) : (
              <>
                <TextField
                  label={t("importRecipe.promptLabel")}
                  value={prompt}
                  onChangeText={setPrompt}
                  multiline
                  autoCapitalize="sentences"
                  editable={submitting === null}
                />
                <PrimaryButton
                  icon={Sparkles}
                  label={
                    submitting === "text"
                      ? t("common.loading")
                      : t("importRecipe.generateTextAction")
                  }
                  disabled={!prompt.trim() || submitting !== null}
                  onPress={() => void handleTextPromptSubmit()}
                />
              </>
            )
          ) : (
            <>
              <AppText muted>{t("importRecipe.photoNoKeyHint")}</AppText>
              <PrimaryButton
                label={t("ui.assistant")}
                onPress={() =>
                  navigation.navigate("Settings", { section: "assistant" })
                }
              />
            </>
          )}
        </GlassPanel>
      ) : null}
      {method === "file" ? (
        <GlassPanel style={styles.section}>
          <AppText muted>{t("importRecipe.sharedFileHint")}</AppText>
          <PrimaryButton
            icon={Upload}
            label={
              submitting === "file"
                ? t("common.loading")
                : t("importRecipe.fileAction")
            }
            disabled={submitting !== null}
            onPress={() => void handlePickSharedFile()}
          />
        </GlassPanel>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  errorCard: {
    padding: spacing.md,
    borderColor: "rgba(255, 59, 48, 0.3)",
    borderWidth: 1,
  },
});

function isPickerCancel(error: unknown) {
  return (
    error instanceof Error && /cancel|aborted|dismiss/i.test(error.message)
  );
}
