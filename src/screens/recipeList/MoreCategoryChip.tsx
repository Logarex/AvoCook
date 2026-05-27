import { safeTranslation } from "./recipeListHelpers";
import { MoreHorizontal, ListFilter } from "lucide-react-native";
import React from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../../components/AppText";
import { useAppTheme } from "../../theme/ThemeProvider";
import { styles } from "./recipeListStyles";

export function MoreCategoryChip({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const label = safeTranslation(t("recipes.moreCategories"), "Plus");
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryChip,
        {
          backgroundColor: colors.surfaceGlassStrong,
          borderColor: colors.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <ListFilter color={colors.primary} size={17} strokeWidth={2.5} />
      <AppText variant="label">{label}</AppText>
    </Pressable>
  );
}
