import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image, type ImageSource } from "expo-image";
import { useKeepAwake } from "expo-keep-awake";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Pencil,
  Trash2,
  Users
} from "lucide-react-native";
import React, { useMemo } from "react";
import { Alert, Linking, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { Pill } from "../components/Pill";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useAuth } from "../features/auth/AuthProvider";
import { usePreferences } from "../features/preferences/PreferencesProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import type { Nutrition } from "../features/recipes/types";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { humanDuration } from "../utils/duration";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeDetail">;

export function RecipeDetailScreen({ navigation, route }: Props) {
  const { getClient } = useAuth();
  const { keepScreenAwake } = usePreferences();
  const { deleteRecipe, getRecipe } = useRecipes();
  const recipe = getRecipe(route.params.id);

  if (keepScreenAwake) {
    return (
      <>
        <KeepAwake />
        <RecipeDetailContent
          navigation={navigation}
          recipeId={route.params.id}
          recipe={recipe}
          deleteRecipe={deleteRecipe}
          getImageSource={() => getImageSource(recipe, getClient())}
        />
      </>
    );
  }

  return (
    <RecipeDetailContent
      navigation={navigation}
      recipeId={route.params.id}
      recipe={recipe}
      deleteRecipe={deleteRecipe}
      getImageSource={() => getImageSource(recipe, getClient())}
    />
  );
}

function KeepAwake() {
  useKeepAwake("recipe-detail");
  return null;
}

function RecipeDetailContent({
  navigation,
  recipeId,
  recipe,
  deleteRecipe,
  getImageSource
}: {
  navigation: Props["navigation"];
  recipeId: string;
  recipe: ReturnType<typeof useRecipes>["recipes"][number] | undefined;
  deleteRecipe: (id: string) => Promise<void>;
  getImageSource: () => ImageSource | null;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const source = getImageSource();
  const nutrition = useMemo(
    () => normalizeNutrition(recipe?.nutrition),
    [recipe?.nutrition]
  );

  if (!recipe) {
    return (
      <Screen>
        <IconButton
          icon={ArrowLeft}
          label="Back"
          onPress={() => navigation.goBack()}
        />
        <AppText variant="subtitle">{t("recipes.emptyTitle")}</AppText>
      </Screen>
    );
  }

  async function handleDelete() {
    Alert.alert(t("common.delete"), t("recipes.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          void deleteRecipe(recipeId).then(() => navigation.goBack());
        }
      }
    ]);
  }

  return (
    <Screen>
      <View style={styles.toolbar}>
        <IconButton
          icon={ArrowLeft}
          label="Back"
          onPress={() => navigation.goBack()}
        />
        <View style={styles.toolbarActions}>
          <IconButton
            icon={Pencil}
            label={t("common.edit")}
            onPress={() => navigation.navigate("RecipeEditor", { id: recipeId })}
            tone="primary"
          />
          <IconButton
            icon={Trash2}
            label={t("common.delete")}
            onPress={() => void handleDelete()}
            tone="danger"
          />
        </View>
      </View>

      <View style={[styles.heroImage, { backgroundColor: colors.chip }]}>
        {source ? (
          <Image source={source} style={styles.image} contentFit="cover" />
        ) : (
          <AppText variant="title" style={{ color: colors.primary }}>
            {recipe.name.slice(0, 1).toUpperCase()}
          </AppText>
        )}
      </View>

      <View style={styles.titleBlock}>
        <AppText variant="title">{recipe.name}</AppText>
        {recipe.description ? <AppText muted>{recipe.description}</AppText> : null}
      </View>

      <View style={styles.pills}>
        {recipe.recipeCategory ? <Pill label={recipe.recipeCategory} /> : null}
        {recipe.recipeYield ? (
          <Pill label={`${recipe.recipeYield} ${t("recipes.yield")}`} />
        ) : null}
        {recipe.keywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean)
          .slice(0, 5)
          .map((keyword) => (
            <Pill key={keyword} label={keyword} />
          ))}
      </View>

      <View style={styles.metrics}>
        <Metric
          icon={Clock}
          label={t("recipes.prepTime")}
          value={humanDuration(recipe.prepTime) ?? "-"}
        />
        <Metric
          icon={Clock}
          label={t("recipes.cookTime")}
          value={humanDuration(recipe.cookTime) ?? "-"}
        />
        <Metric
          icon={Users}
          label={t("recipes.yield")}
          value={String(recipe.recipeYield || 1)}
        />
      </View>

      <RecipeSection title={t("recipes.ingredients")} items={recipe.recipeIngredient} />
      <RecipeSection
        ordered
        title={t("recipes.instructions")}
        items={recipe.recipeInstructions}
      />
      <RecipeSection title={t("recipes.tools")} items={recipe.tool} />

      {nutrition.length > 0 ? (
        <GlassPanel style={styles.section}>
          <AppText variant="subtitle">{t("recipes.nutrition")}</AppText>
          <View style={styles.nutritionGrid}>
            {nutrition.map(([label, value]) => (
              <View key={label} style={styles.nutritionItem}>
                <AppText muted variant="caption">
                  {label}
                </AppText>
                <AppText variant="label">{value}</AppText>
              </View>
            ))}
          </View>
        </GlassPanel>
      ) : null}

      {recipe.url ? (
        <PrimaryButton
          icon={ExternalLink}
          label={t("recipes.source")}
          onPress={() => void Linking.openURL(recipe.url)}
          variant="ghost"
        />
      ) : null}
    </Screen>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  const { colors } = useAppTheme();
  return (
    <GlassPanel style={styles.metric}>
      <Icon color={colors.primary} size={19} />
      <AppText muted variant="caption">
        {label}
      </AppText>
      <AppText variant="label">{value}</AppText>
    </GlassPanel>
  );
}

function RecipeSection({
  title,
  items,
  ordered = false
}: {
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <GlassPanel style={styles.section}>
      <AppText variant="subtitle">{title}</AppText>
      <View style={styles.sectionItems}>
        {items.map((item, index) => (
          <View key={`${item}-${index}`} style={styles.row}>
            <AppText muted variant="label" style={styles.rowIndex}>
              {ordered ? `${index + 1}` : "•"}
            </AppText>
            <AppText style={styles.rowText}>{item}</AppText>
          </View>
        ))}
      </View>
    </GlassPanel>
  );
}

function normalizeNutrition(
  nutrition?: Nutrition | Nutrition[] | null
): [string, string][] {
  const node = Array.isArray(nutrition) ? nutrition[0] : nutrition;
  if (!node || typeof node !== "object") {
    return [];
  }

  return Object.entries(node)
    .filter(([key, value]) => key !== "@type" && Boolean(value))
    .map(([key, value]) => [key.replace(/Content$/, ""), String(value)]);
}

function getImageSource(
  recipe: ReturnType<typeof useRecipes>["recipes"][number] | undefined,
  client: ReturnType<typeof useAuth>["getClient"] extends () => infer T ? T : never
): ImageSource | null {
  if (!recipe) {
    return null;
  }

  const publicImage = recipe.image || recipe.imageUrl || recipe.imagePlaceholderUrl;
  if (publicImage) {
    return { uri: publicImage };
  }

  if (recipe.id && client) {
    return {
      uri: client.getRecipeImageUrl(recipe.id, "full"),
      headers: client.getImageHeaders()
    };
  }

  return null;
}

const styles = StyleSheet.create({
  heroImage: {
    alignItems: "center",
    aspectRatio: 1.25,
    borderRadius: radius.lg,
    justifyContent: "center",
    overflow: "hidden"
  },
  image: {
    height: "100%",
    width: "100%"
  },
  metric: {
    alignItems: "flex-start",
    flex: 1,
    gap: spacing.xxs,
    minWidth: 104,
    padding: spacing.sm
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  nutritionItem: {
    minWidth: "44%"
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm
  },
  rowIndex: {
    width: 24
  },
  rowText: {
    flex: 1
  },
  section: {
    gap: spacing.md
  },
  sectionItems: {
    gap: spacing.sm
  },
  titleBlock: {
    gap: spacing.xs
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  toolbarActions: {
    flexDirection: "row",
    gap: spacing.xs
  }
});
