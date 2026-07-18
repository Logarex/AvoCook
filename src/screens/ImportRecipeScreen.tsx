import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, Camera, Download, Upload, Sparkles, Globe, FileJson } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import * as ImagePicker from "expo-image-picker";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { useRecipes } from "../features/recipes/RecipesProvider";
import { usePreferences } from "../features/preferences/PreferencesProvider";
import {
  extractRecipeFromPhoto,
  generateRecipeFromText,
  LlmApiError,
  LlmModelNotFoundError,
  LlmNotFoodError
} from "../features/import/photoRecipeImport";
import { persistRecipeImage } from "../features/recipes/recipeImages";
import { logError } from "../features/logging/appLogger";
import type { RootStackParamList } from "../navigation/types";
import { spacing, radius } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "ImportRecipe">;

export function ImportRecipeScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { importBackup, importRecipe, createRecipe } = useRecipes();
  const { llmSettings } = usePreferences();
  const [url, setUrl] = useState(route.params?.url ?? "");
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState<"url" | "file" | "photo" | "text" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission, getCameraPermission] = ImagePicker.useCameraPermissions({ get: false });

  const hasLlmKey = Boolean(llmSettings.apiKey.trim());

  React.useEffect(() => {
    if (route.params?.url) {
      void handleImport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.url]);

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
    } catch {
      setError(t("importRecipe.failed"));
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
            : t("importRecipe.fileFailed")
        );
      }
    } finally {
      setSubmitting(null);
    }
  }

  async function handleScanPhoto() {
    Alert.alert(
      t("importRecipe.photoSourceTitle", "Choose source"),
      "",
      [
        {
          text: t("common.cancel", "Cancel"),
          style: "cancel"
        },
        {
          text: t("importRecipe.photoSourceCamera", "Camera"),
          onPress: () => void processCamera()
        },
        {
          text: t("importRecipe.photoSourceGallery", "Photo Library"),
          onPress: () => void processImage(ImagePicker.launchImageLibraryAsync)
        }
      ]
    );
  }

  async function processCamera() {
    const currentPermission = cameraPermission ?? (await getCameraPermission());
    if (!currentPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          t("importRecipe.photoCameraPermissionTitle"),
          t("importRecipe.photoCameraPermissionBody")
        );
        return;
      }
    }
    void processImage(ImagePicker.launchCameraAsync);
  }

  async function processImage(
    pickerFn: (options: ImagePicker.ImagePickerOptions) => Promise<ImagePicker.ImagePickerResult>
  ) {
    setError(null);
    const result = await pickerFn({
      mediaTypes: ["images"],
      quality: 0.4,
      base64: true,
      allowsEditing: true
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
    try {
      const recipe = await extractRecipeFromPhoto(
        base64,
        llmSettings.apiKey,
        llmSettings.providerId,
        llmSettings.baseUrl,
        llmSettings.model,
        i18n.language
      );
      
      try {
        const photoLocalUri = await persistRecipeImage(asset.uri);
        recipe.image = photoLocalUri;
        recipe.imageUrl = photoLocalUri;
      } catch (imgErr) {
        logError("app", "Failed to persist recipe image", imgErr);
      }

      const saved = await createRecipe(recipe);
      if (saved.id) {
        navigation.replace("RecipeDetail", { id: saved.id });
      } else {
        navigation.goBack();
      }
    } catch (err) {
      logError("app", "Photo import failed in ImportRecipeScreen", err);
      if (err instanceof LlmModelNotFoundError) {
        setError(
          t("importRecipe.photoModelNotFound", { model: err.model }) +
          (err.modelDocsUrl ? "\n" + t("importRecipe.photoModelDocsHint") : "")
        );
      } else if (err instanceof LlmNotFoodError) {
        setError(t("importRecipe.notFoodError", "The provided content is not related to food or beverages."));
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
      setSubmitting(null);
    }
  }

  async function handleTextPromptSubmit() {
    setSubmitting("text");
    setError(null);
    try {
      const recipe = await generateRecipeFromText(
        prompt,
        llmSettings.apiKey,
        llmSettings.providerId,
        llmSettings.baseUrl,
        llmSettings.model,
        i18n.language
      );
      const saved = await createRecipe(recipe);
      if (saved.id) {
        navigation.replace("RecipeDetail", { id: saved.id });
      } else {
        navigation.goBack();
      }
    } catch (err) {
      logError("app", "Text import failed in ImportRecipeScreen", err);
      if (err instanceof LlmModelNotFoundError) {
        setError(
          t("importRecipe.photoModelNotFound", { model: err.model }) +
          (err.modelDocsUrl ? "\n" + t("importRecipe.photoModelDocsHint") : "")
        );
      } else if (err instanceof LlmNotFoodError) {
        setError(t("importRecipe.notFoodError", "The provided content is not related to food or beverages."));
      } else if (err instanceof LlmApiError && err.status === 401) {
        setError(t("importRecipe.photoApiKeyInvalid"));
      } else if (err instanceof LlmApiError && err.status === 403) {
        setError(t("importRecipe.photoApiNoCredits"));
      } else if (err instanceof LlmApiError && err.status === 429) {
        setError(t("importRecipe.photoApiKeyQuotaExceeded"));
      } else {
        setError(t("importRecipe.textFailed", "Failed to generate recipe."));
      }
    } finally {
      setSubmitting(null);
    }
  }

  const showImportSuccess = useCallback((result: {
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
        renamed: result.renamed
      })
    );
  }, [t]);

  return (
    <Screen>
      <View style={styles.toolbar}>
        <IconButton
          icon={ArrowLeft}
          label={t("common.back")}
          onPress={() => navigation.goBack()}
        />
        <AppText variant="subtitle">{t("importRecipe.title")}</AppText>
        <View style={styles.toolbarSpacer} />
      </View>

      {/* Error State */}
      {error ? (
        <GlassPanel style={styles.errorCard} intensity={80}>
          <AppText accessibilityRole="alert" style={{ color: colors.danger, textAlign: "center" }}>
            {error}
          </AppText>
        </GlassPanel>
      ) : null}

      {/* Global Loading Indicator */}
      {submitting ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : null}

      {/* Section 1: URL Import */}
      <GlassPanel style={styles.section}>
        <View style={styles.sectionHeader}>
          <Globe color={colors.primary} size={22} />
          <AppText variant="label">{t("importRecipe.action")}</AppText>
        </View>
        
        <TextField
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          label={t("importRecipe.url")}
          onChangeText={setUrl}
          placeholder={t("importRecipe.urlPlaceholder")}
          textContentType="URL"
          value={url}
        />
        <PrimaryButton
          disabled={!url.trim() || submitting !== null}
          icon={Download}
          label={submitting === "url" ? t("common.loading") : t("importRecipe.action")}
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onPress={handleImport}
        />
      </GlassPanel>

      {/* Section 2: AI Magic */}
      <GlassPanel style={styles.section}>
        <View style={styles.sectionHeader}>
          <Sparkles color={colors.primary} size={22} />
          <AppText variant="label">{t("importRecipe.aiTitle", "Intelligence Artificielle")}</AppText>
        </View>

        {hasLlmKey ? (
          <>
            <AppText muted variant="caption">
              {t("importRecipe.photoHint")}
            </AppText>
            <PrimaryButton
              disabled={submitting !== null}
              icon={Camera}
              label={submitting === "photo" ? t("common.loading") : t("importRecipe.photoAction")}
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onPress={handleScanPhoto}
              variant="ghost"
            />

            <View style={styles.divider} />

            <AppText muted variant="caption">
              {t("importRecipe.textHint", "Ou décrivez la recette avec du texte :")}
            </AppText>
            <TextField
              autoCapitalize="sentences"
              label={t("importRecipe.promptLabel", "Description de la recette")}
              onChangeText={setPrompt}
              placeholder={t("importRecipe.promptPlaceholder", "Ex: Une pizza vegan aux champignons...")}
              value={prompt}
              multiline
            />
            <PrimaryButton
              disabled={!prompt.trim() || submitting !== null}
              icon={Sparkles}
              label={submitting === "text" ? t("common.loading") : t("importRecipe.generateTextAction", "Générer la recette")}
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onPress={handleTextPromptSubmit}
              variant="ghost"
            />
          </>
        ) : (
          <AppText muted variant="caption">
            {t("importRecipe.photoNoKeyHint")}
          </AppText>
        )}
      </GlassPanel>

      {/* Section 3: File Backup */}
      <GlassPanel style={styles.section}>
        <View style={styles.sectionHeader}>
          <FileJson color={colors.primary} size={22} />
          <AppText variant="label">{t("importRecipe.fileAction")}</AppText>
        </View>
        
        <AppText muted variant="caption">
          {t("importRecipe.sharedFileHint")}
        </AppText>
        <PrimaryButton
          disabled={submitting !== null}
          icon={Upload}
          label={submitting === "file" ? t("common.loading") : t("importRecipe.fileAction")}
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onPress={handlePickSharedFile}
          variant="ghost"
        />
      </GlassPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  toolbarSpacer: {
    width: 44
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
    backgroundColor: "gray",
    marginVertical: spacing.xs,
  },
  errorCard: {
    padding: spacing.md,
    borderColor: "rgba(255, 59, 48, 0.3)",
    borderWidth: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: radius.lg,
  }
});

function isPickerCancel(error: unknown) {
  return (
    error instanceof Error &&
    /cancel|aborted|dismiss/i.test(error.message)
  );
}

