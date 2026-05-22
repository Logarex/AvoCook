import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, Download, Upload } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { useRecipes } from "../features/recipes/RecipesProvider";
import type { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "ImportRecipe">;

export function ImportRecipeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { importBackup, importRecipe } = useRecipes();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState<"url" | "file" | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <Screen contentStyle={styles.screen}>
      <View style={styles.toolbar}>
        <IconButton
          icon={ArrowLeft}
          label={t("common.back")}
          onPress={() => navigation.goBack()}
        />
        <AppText variant="subtitle">{t("importRecipe.title")}</AppText>
        <View style={styles.toolbarSpacer} />
      </View>

      <GlassPanel style={styles.form}>
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
        {error ? (
          <AppText accessibilityRole="alert" style={{ color: colors.danger }}>
            {error}
          </AppText>
        ) : null}
        <PrimaryButton
          disabled={!url.trim() || submitting !== null}
          icon={Download}
          label={submitting === "url" ? t("common.loading") : t("importRecipe.action")}
          onPress={() => void handleImport()}
        />
        <View style={styles.divider} />
        <AppText muted variant="caption">
          {t("importRecipe.sharedFileHint")}
        </AppText>
        <PrimaryButton
          disabled={submitting !== null}
          icon={Upload}
          label={
            submitting === "file"
              ? t("common.loading")
              : t("importRecipe.fileAction")
          }
          onPress={() => void handlePickSharedFile()}
          variant="ghost"
        />
        {submitting ? <ActivityIndicator color={colors.primary} /> : null}
      </GlassPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.5
  },
  screen: {
    justifyContent: "center"
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  toolbarSpacer: {
    width: 44
  }
});

function isPickerCancel(error: unknown) {
  return (
    error instanceof Error &&
    /cancel|aborted|dismiss/i.test(error.message)
  );
}
