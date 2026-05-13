import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Check,
  Download,
  ListPlus,
  Plus,
  RefreshCw,
  Settings
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { EmptyState } from "../components/EmptyState";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { RecipeCard } from "../components/RecipeCard";
import { Screen } from "../components/Screen";
import { SearchField } from "../components/SearchField";
import { TextField } from "../components/TextField";
import { useAuth } from "../features/auth/AuthProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Recipes">;
const UNCATEGORIZED = "__uncategorized__";

type CategoryOption = {
  count: number;
  id: string | null;
  label: string;
};

export function RecipeListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { credentials, isLocalMode } = useAuth();
  const {
    createCategory,
    customCategories,
    recipes,
    loading,
    syncing,
    sync
  } = useRecipes();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const counts = new Map<string, number>();
    let uncategorizedCount = 0;

    for (const recipe of recipes) {
      const recipeCategory = recipe.recipeCategory.trim();
      if (!recipeCategory) {
        uncategorizedCount += 1;
        continue;
      }
      counts.set(recipeCategory, (counts.get(recipeCategory) ?? 0) + 1);
    }

    for (const customCategory of customCategories) {
      if (!counts.has(customCategory)) {
        counts.set(customCategory, 0);
      }
    }

    const options = Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, count]) => ({ id: label, label, count }));

    return [
      { id: null, label: t("recipes.allCategories"), count: recipes.length },
      {
        id: UNCATEGORIZED,
        label: t("recipes.uncategorized"),
        count: uncategorizedCount
      },
      ...options
    ];
  }, [customCategories, recipes, t]);

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return recipes.filter((recipe) => {
      const matchesCategory =
        !category ||
        (category === UNCATEGORIZED
          ? !recipe.recipeCategory.trim()
          : recipe.recipeCategory === category);
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

  const connected = Boolean(credentials || isLocalMode);
  const statusLabel = isLocalMode
    ? t("settings.localMode")
    : credentials
      ? t("common.online")
      : t("common.offline");
  const statusDetail = syncing
    ? t("recipes.syncingRecipes")
    : loading
      ? t("recipes.loadingRecipes")
      : t("recipes.loadedRecipes", { count: recipes.length });

  async function handleCreateCategory() {
    const normalized = newCategory.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return;
    }
    await createCategory(normalized);
    setCategory(normalized);
    setNewCategory("");
    setShowCategoryCreator(false);
  }

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <AppText variant="title">{t("recipes.title")}</AppText>
          <ConnectionStatus
            connected={connected}
            detail={statusDetail}
            label={statusLabel}
            loading={loading || syncing}
          />
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
            onPress={() =>
              navigation.navigate("RecipeEditor", {
                category:
                  category && category !== UNCATEGORIZED ? category : undefined
              })
            }
            tone="primary"
          />
          <IconButton
            icon={Settings}
            label={t("common.settings")}
            onPress={() => navigation.navigate("Settings")}
          />
        </View>
      </View>

      <SearchField
        onChangeText={setQuery}
        placeholder={t("common.search")}
        value={query}
      />

      <GlassPanel style={styles.organizer}>
        <View style={styles.organizerHeader}>
          <View style={styles.titleBlock}>
            <AppText variant="label">{t("recipes.categories")}</AppText>
            {category && category !== UNCATEGORIZED ? (
              <AppText muted variant="caption">
                {t("recipes.selectedCategory", { category })}
              </AppText>
            ) : null}
          </View>
          <View style={styles.organizerActions}>
            <IconButton
              icon={ListPlus}
              label={t("recipes.newCategory")}
              onPress={() => setShowCategoryCreator((visible) => !visible)}
              tone="primary"
            />
          </View>
        </View>

        {showCategoryCreator ? (
          <View style={styles.inlineEditor}>
            <TextField
              label={t("recipes.categoryName")}
              onChangeText={setNewCategory}
              value={newCategory}
            />
            <PrimaryButton
              disabled={!newCategory.trim()}
              icon={Check}
              label={t("recipes.createCategory")}
              onPress={() => void handleCreateCategory()}
            />
          </View>
        ) : null}

      </GlassPanel>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroller}
        contentContainerStyle={styles.categoryList}
      >
        {categoryOptions.map((item) => (
          <CategoryChip
            key={item.id ?? "all"}
            count={item.count}
            label={item.label}
            selected={category === item.id}
            onPress={() => setCategory(item.id)}
          />
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          style={styles.recipeList}
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

function CategoryChip({
  count,
  label,
  selected,
  onPress
}: {
  count: number;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryChip,
        {
          backgroundColor: selected ? colors.primary : colors.surfaceGlassStrong,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.78 : 1
        }
      ]}
    >
      <AppText
        variant="label"
        style={{ color: selected ? colors.textInverted : colors.text }}
      >
        {label}
      </AppText>
      <View
        style={[
          styles.categoryBadge,
          {
            backgroundColor: selected ? "rgba(255,255,255,0.22)" : colors.chip
          }
        ]}
      >
        <AppText
          variant="caption"
          style={{ color: selected ? colors.textInverted : colors.textMuted }}
        >
          {count}
        </AppText>
      </View>
    </Pressable>
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
    alignItems: "center",
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
    paddingRight: spacing.md
  },
  categoryScroller: {
    flexGrow: 0,
    height: 62,
    marginBottom: spacing.xs,
    overflow: "visible"
  },
  categoryBadge: {
    alignItems: "center",
    borderRadius: radius.pill,
    minWidth: 26,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2
  },
  categoryChip: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md
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
  inlineEditor: {
    gap: spacing.sm
  },
  organizer: {
    gap: spacing.md,
    padding: spacing.md
  },
  organizerActions: {
    flexDirection: "row",
    gap: spacing.xs
  },
  organizerHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  recipeList: {
    flex: 1
  },
  titleBlock: {
    flex: 1,
    minWidth: 0
  }
});
