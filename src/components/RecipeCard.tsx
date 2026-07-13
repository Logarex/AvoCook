import { Image } from "expo-image";
import { Clock, Tag } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  getPreferredDisplayRecipeImage,
  isCookbookImageEndpoint
} from "../features/recipes/recipeImageReferences";
import { Recipe } from "../features/recipes/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { humanDuration } from "../utils/duration";
import { AppText } from "./AppText";

export const RecipeCard = React.memo(function RecipeCard({
  fallbackImageUri,
  imageHeaders,
  recipe,
  onLongPress,
  onPress
}: {
  fallbackImageUri?: string;
  imageHeaders?: Record<string, string>;
  recipe: Recipe;
  onLongPress?: () => void;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const imageUri = getPreferredDisplayRecipeImage(recipe) || fallbackImageUri;
  const imageSource = imageUri
    ? {
        uri: imageUri,
        headers: isCookbookImageEndpoint(imageUri) ? imageHeaders : undefined
      }
    : null;
  const totalTime = humanDuration(recipe.totalTime || recipe.prepTime);
  const accessibilityParts = [
    recipe.name,
    recipe.description,
    totalTime,
    recipe.recipeCategory
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityLabel={accessibilityParts.join(", ")}
      accessibilityRole="button"
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surfaceGlassStrong,
          borderColor: colors.border,
          opacity: pressed ? 0.82 : 1
        }
      ]}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors.chip }]}>
        {imageSource ? (
          <Image
            accessible={false}
            source={imageSource}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <AppText
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            variant="subtitle"
            style={{ color: colors.primary }}
          >
            {recipe.name.slice(0, 1).toUpperCase()}
          </AppText>
        )}
      </View>
      <View style={styles.body}>
        <AppText variant="label" numberOfLines={2}>
          {recipe.name}
        </AppText>
        {recipe.description ? (
          <AppText muted variant="caption" numberOfLines={2}>
            {recipe.description}
          </AppText>
        ) : null}
        <View style={styles.meta}>
          {totalTime ? (
            <View style={styles.metaItem}>
              <Clock color={colors.textMuted} size={14} />
              <AppText muted variant="caption">
                {totalTime}
              </AppText>
            </View>
          ) : null}
          {recipe.recipeCategory ? (
            <View style={styles.metaItem}>
              <Tag color={colors.textMuted} size={14} />
              <AppText muted variant="caption" numberOfLines={1}>
                {recipe.recipeCategory}
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
    minHeight: 96,
    overflow: "hidden",
    padding: spacing.sm
  },
  imageWrap: {
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
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metaItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xxs,
    maxWidth: "100%"
  }
});
