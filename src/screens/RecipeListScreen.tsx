import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Download, Plus, RefreshCw, Settings } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { EmptyState } from "../components/EmptyState";
import { IconButton } from "../components/IconButton";
import { Pill } from "../components/Pill";
import { RecipeCard } from "../components/RecipeCard";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { useAuth } from "../features/auth/AuthProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import type { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Recipes">;

export function RecipeListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { credentials } = useAuth();
  const { recipes, loading, syncing, sync } = useRecipes();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(recipes.map((recipe) => recipe.recipeCategory).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [recipes]
  );

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return recipes.filter((recipe) => {
      const matchesCategory = !category || recipe.recipeCategory === category;
      const searchable = [
        recipe.name,
        recipe.description,
        recipe.recipeCategory,
        recipe.keywords
      ]
        .join(" ")
        .toLowerCase();
      return matchesCategory && searchable.includes(normalizedQuery);
    });
  }, [category, query, recipes]);

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <AppText variant="title">{t("recipes.title")}</AppText>
          <AppText muted variant="caption">
            {credentials ? t("common.online") : t("common.offline")}
          </AppText>
        </View>
        <View style={styles.actions}>
          <IconButton
            icon={RefreshCw}
            label={t("common.sync")}
            onPress={() => void sync()}
            disabled={syncing || !credentials}
          />
          <IconButton
            icon={Download}
            label={t("common.import")}
            onPress={() => navigation.navigate("ImportRecipe")}
            tone="primary"
          />
          <IconButton
            icon={Plus}
            label={t("common.add")}
            onPress={() => navigation.navigate("RecipeEditor", {})}
            tone="primary"
          />
          <IconButton
            icon={Settings}
            label={t("common.settings")}
            onPress={() => navigation.navigate("Settings")}
          />
        </View>
      </View>

      <TextField
        label={t("common.search")}
        onChangeText={setQuery}
        value={query}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
      >
        <View onTouchEnd={() => setCategory(null)}>
          <Pill label={t("recipes.noCategory")} />
        </View>
        {categories.map((item) => (
          <View key={item} onTouchEnd={() => setCategory(item)}>
            <Pill label={item} />
          </View>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredRecipes}
          keyExtractor={(item) => item.id ?? item.name}
          ListEmptyComponent={
            <EmptyState
              title={t("recipes.emptyTitle")}
              body={t("recipes.emptyBody")}
            />
          }
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() =>
                item.id && navigation.navigate("RecipeDetail", { id: item.id })
              }
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "flex-end"
  },
  categoryList: {
    gap: spacing.xs,
    paddingVertical: spacing.xs
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  titleBlock: {
    flex: 1,
    minWidth: 0
  }
});
