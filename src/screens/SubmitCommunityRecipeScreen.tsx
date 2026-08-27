import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Send, ShieldAlert } from "lucide-react-native";

import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import {
  submitCommunityRecipe,
  type RecipeLanguage
} from "../features/community/communityClient";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "SubmitCommunityRecipe">;

const LANG_OPTIONS: { id: RecipeLanguage; label: string }[] = [
  { id: "fr", label: "🇫🇷 Français" },
  { id: "de", label: "🇩🇪 Deutsch" },
  { id: "en", label: "🇬🇧 English" },
  { id: "es", label: "🇪🇸 Español" },
  { id: "it", label: "🇮🇹 Italiano" },
  { id: "da", label: "🇩🇰 Dansk" }
];

import { usePreferences } from "../features/preferences/PreferencesProvider";
import { containsProfanity } from "../utils/profanityFilter";

export function SubmitCommunityRecipeScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const { communityPseudonym } = usePreferences();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [authorName, setAuthorName] = useState(communityPseudonym || "");
  const [language, setLanguage] = useState<RecipeLanguage>(
    (i18n.language.slice(0, 2) as RecipeLanguage) || "en"
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert(t("common.error"), t("community.missingTitleError"));
      return;
    }
    const ingredients = ingredientsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const steps = stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ingredients.length === 0) {
      Alert.alert(t("common.error"), t("community.missingIngredientsError"));
      return;
    }

    if (
      containsProfanity(title) ||
      containsProfanity(description) ||
      containsProfanity(authorName) ||
      ingredients.some(containsProfanity) ||
      steps.some(containsProfanity)
    ) {
      Alert.alert(t("common.error"), t("community.profanityError"));
      return;
    }

    setSubmitting(true);
    try {
      await submitCommunityRecipe({
        title: title.trim(),
        description: description.trim(),
        ingredients,
        steps,
        language,
        authorName: authorName.trim() || t("community.anonymousAuthor")
      });
      Alert.alert(
        t("community.submitSuccessTitle"),
        t("community.submitSuccessBody"),
        [
          {
            text: t("common.continue"),
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (err) {
      console.warn("community", "Submit recipe failed", err);
      Alert.alert(t("common.error"), t("community.submitFailedBody"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          icon={ArrowLeft}
          label={t("common.back")}
          onPress={() => navigation.goBack()}
        />
        <AppText variant="subtitle">{t("community.submitTitle")}</AppText>
        <View style={{ width: 44 }} />
      </View>

      <GlassPanel style={styles.privacyNotice}>
        <ShieldAlert color={colors.primary} size={20} />
        <AppText muted variant="caption" style={styles.privacyText}>
          {t("community.submitPrivacyNotice")}
        </AppText>
      </GlassPanel>

      <GlassPanel style={styles.form}>
        <TextField
          label={t("editor.name")}
          placeholder={t("community.titlePlaceholder")}
          value={title}
          onChangeText={setTitle}
        />

        <TextField
          label={t("editor.description")}
          placeholder={t("community.descPlaceholder")}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
        />

        <TextField
          label={t("community.authorLabel")}
          placeholder={t("community.authorPlaceholder")}
          value={authorName}
          onChangeText={setAuthorName}
        />

        {/* Language Selection */}
        <View style={styles.langSelect}>
          <AppText variant="label">{t("community.selectLanguage")}</AppText>
          <View style={styles.langGrid}>
            {LANG_OPTIONS.map((opt) => {
              const selected = language === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setLanguage(opt.id)}
                  style={[
                    styles.langBtn,
                    {
                      backgroundColor: selected ? colors.primary : colors.chip,
                      borderColor: selected ? colors.primary : colors.border
                    }
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={{
                      color: selected ? colors.textInverted : colors.text,
                      fontWeight: selected ? "600" : "normal"
                    }}
                  >
                    {opt.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField
          label={t("community.ingredientsInputLabel")}
          placeholder={t("community.onePerLinePlaceholder")}
          value={ingredientsText}
          onChangeText={setIngredientsText}
          multiline
          numberOfLines={4}
        />

        <TextField
          label={t("community.stepsInputLabel")}
          placeholder={t("community.onePerLinePlaceholder")}
          value={stepsText}
          onChangeText={setStepsText}
          multiline
          numberOfLines={6}
        />

        <PrimaryButton
          icon={Send}
          label={t("community.publishBtn")}
          disabled={submitting}
          onPress={() => void handleSubmit()}
          style={styles.submitBtn}
        />
      </GlassPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  privacyNotice: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  privacyText: {
    flex: 1,
    lineHeight: 18
  },
  form: {
    gap: spacing.md,
    padding: spacing.lg
  },
  langSelect: {
    gap: spacing.xs
  },
  langGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  langBtn: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm
  },
  submitBtn: {
    marginTop: spacing.md
  }
});
