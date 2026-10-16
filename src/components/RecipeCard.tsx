import { markdownToPlainText } from "../features/markdown/markdown";
import { RecipeImage } from "./RecipeImage";
import { useTranslation } from "react-i18next";
import { getRecipeCategoryLabel } from "../features/recipes/categories";
import { Clock, Tag } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import {
  getPreferredDisplayRecipeImage
} from "../features/recipes/recipeImageReferences";
import type { CookbookClient } from "../features/nextcloud/cookbookClient";
import { Recipe } from "../features/recipes/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { humanDuration } from "../utils/duration";
import { getRecipeCardHeight } from "./recipeCardLayout";
import { AppText } from "./AppText";

export const RecipeCard = React.memo(function RecipeCard({
  fallbackImageUri,
  imageClient,
  recipe,
  onLongPress,
  onPress
}: {
  fallbackImageUri?: string;
  imageClient?: CookbookClient | null;
  recipe: Recipe;
  onLongPress?: () => void;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const { t } = useTranslation();
  const categoryLabel = getRecipeCategoryLabel(recipe.recipeCategory, t);
  const imageUri = getPreferredDisplayRecipeImage(recipe) || fallbackImageUri;
  const imageSource = imageUri
    ? {
        uri: imageUri,
        headers: imageClient?.getImageHeaders(imageUri)
      }
    : null;
  const totalTime = humanDuration(recipe.totalTime || recipe.prepTime);
  const accessibilityParts = [
    recipe.name,
    recipe.description,
    totalTime,
    categoryLabel
  ].filter((value): value is string => Boolean(value));

  return (
    <Pressable
      accessibilityLabel={accessibilityParts.map(markdownToPlainText).join(", ")}
      accessibilityRole="button"
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          height: getRecipeCardHeight(fontScale),
          backgroundColor: colors.backgroundElevated,
          borderColor: colors.border,
          opacity: pressed ? 0.82 : 1
        }
      ]}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors.chip }]}>
        <RecipeImage
          key={`${imageUri}-${fallbackImageUri}`}
          fallbackSource={fallbackImageUri ? { uri: fallbackImageUri, headers: imageClient?.getImageHeaders(fallbackImageUri) } : null}
          accessible={false}
          source={imageSource}
          style={styles.image}
          contentFit="cover"
        >
          <AppText
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            variant="subtitle"
            style={{ color: colors.primary }}
          >
            {markdownToPlainText(recipe.name).slice(0, 1).toUpperCase()}
          </AppText>
        </RecipeImage>
      </View>
      <View style={styles.body}>
        <AppText markdown variant="label" numberOfLines={1} adjustsFontSizeToFit={false}>
          {recipe.name}
        </AppText>
        {recipe.description ? (
          <AppText markdown muted variant="caption" numberOfLines={2}>
            {recipe.description}
          </AppText>
        ) : null}
        <View style={styles.meta}>
          {totalTime ? (
            <View style={[styles.metaItem, { flexShrink: 0 }]}>
              <Clock color={colors.textMuted} size={14} />
              <AppText muted variant="caption">
                {totalTime}
              </AppText>
            </View>
          ) : null}
          {recipe.recipeCategory ? (
            <View style={styles.metaItem}>
              <Tag color={colors.textMuted} size={14} />
              <AppText markdown muted variant="caption" numberOfLines={1} adjustsFontSizeToFit={false} style={{ flexShrink: 1 }}>
                {categoryLabel}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    overflow: "hidden",
    padding: spacing.sm
  },
  imageWrap: {
    alignSelf: "center",
    alignItems: "center",
    aspectRatio: 1,
    borderRadius: radius.sm,
    justifyContent: "center",
    overflow: "hidden",
    width: 76
  },
  image: {
    height: "100%",
    width: "100%"
  },
  body: {
    flex: 1,
    gap: spacing.xs,
    justifyContent: "center",
    minWidth: 0
  },
  meta: {
    flexDirection: "row",
    gap: spacing.sm,
    overflow: "hidden"
  },
  metaItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xxs,
    maxWidth: "100%",
    flexShrink: 1
  }
});
