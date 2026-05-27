import { Minus, Plus, RotateCcw, Users } from "lucide-react-native";
import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../../components/AppText";
import { GlassPanel } from "../../components/GlassPanel";
import { IconButton } from "../../components/IconButton";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAppTheme } from "../../theme/ThemeProvider";
import { styles } from "./recipeDetailStyles";

export function ServingsControl({
  baseServings,
  selectedServings,
  onChange,
}: {
  baseServings: number;
  selectedServings: number;
  onChange: (servings: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <GlassPanel style={styles.section}>
      <View style={styles.sectionHeader}>
        <Users color={colors.primary} size={21} />
        <AppText variant="subtitle">{t("recipes.servings.title")}</AppText>
      </View>
      <View style={styles.servingsRow}>
        <IconButton
          disabled={selectedServings <= 1}
          icon={Minus}
          label={t("recipes.servings.decrease")}
          onPress={() => onChange(selectedServings - 1)}
        />
        <View style={styles.servingValue}>
          <AppText variant="title">{selectedServings}</AppText>
          <AppText muted variant="caption">
            {t("recipes.servings.people")}
          </AppText>
        </View>
        <IconButton
          icon={Plus}
          label={t("recipes.servings.increase")}
          onPress={() => onChange(selectedServings + 1)}
          tone="primary"
        />
      </View>
      <View style={styles.servingFooter}>
        <AppText muted variant="caption">
          {t("recipes.servings.original", { count: baseServings })}
        </AppText>
        {selectedServings !== baseServings ? (
          <PrimaryButton
            icon={RotateCcw}
            label={t("recipes.servings.reset")}
            onPress={() => onChange(baseServings)}
            variant="ghost"
          />
        ) : null}
      </View>
    </GlassPanel>
  );
}
