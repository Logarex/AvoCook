import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowUp,
  Check,
  Download,
  ListFilter,
  ListPlus,
  Plus,
  RefreshCw,
  Settings,
  X
} from "lucide-react-native";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import type { Recipe } from "../features/recipes/types";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Recipes">;

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
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const recipeListRef = useRef<FlatList<Recipe>>(null);
  const categoryPickerLabel = safeTranslation(
    t("recipes.chooseCategory"),
    t("recipes.categories")
  );

  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const counts = new Map<string, number>();

    for (const recipe of recipes) {
      const recipeCategory = recipe.recipeCategory.trim();
      if (!recipeCategory) {
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
      ...options
    ];
  }, [customCategories, recipes, t]);

  const visibleCategoryOptions = useMemo(() => {
    const [allCategories, ...remaining] = categoryOptions;
    const selectedCategory = categoryOptions.find((item) => item.id === category);
    const activeCategories = remaining
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 6);

    const nextOptions = [allCategories, ...activeCategories];
    if (
      selectedCategory &&
      !nextOptions.some((item) => item.id === selectedCategory.id)
    ) {
      nextOptions.push(selectedCategory);
    }

    return nextOptions.filter((item): item is CategoryOption => Boolean(item));
  }, [category, categoryOptions]);

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return recipes.filter((recipe) => {
      const matchesCategory =
        !category || recipe.recipeCategory === category;
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
      : t(
          recipes.length <= 1
            ? "recipes.loadedRecipes_one"
            : "recipes.loadedRecipes_other",
          { count: recipes.length }
        );

  async function handleCreateCategory() {
    const normalized = newCategory.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return;
    }
    await createCategory(normalized);
    setCategory(normalized);
    setShowCategoryPicker(false);
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
                category: category ? category : undefined
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

      <View style={styles.categoryToolbar}>
        <View style={styles.categoryToolbarText}>
          <AppText variant="label">{t("recipes.categories")}</AppText>
          {category ? (
            <AppText muted variant="caption" numberOfLines={1}>
              {category}
            </AppText>
          ) : null}
        </View>
        <View style={styles.organizerActions}>
          <IconButton
            icon={ListFilter}
            label={categoryPickerLabel}
            onPress={() => setShowCategoryPicker(true)}
          />
          <IconButton
            icon={ListPlus}
            label={t("recipes.newCategory")}
            onPress={() => setShowCategoryCreator((visible) => !visible)}
            tone="primary"
          />
        </View>
      </View>

      {showCategoryCreator ? (
        <GlassPanel style={styles.inlineEditor}>
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
        </GlassPanel>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroller}
        contentContainerStyle={styles.categoryList}
      >
        {visibleCategoryOptions.map((item) => (
          <CategoryChip
            key={item.id ?? "all"}
            count={item.count}
            label={item.label}
            selected={category === item.id}
            onPress={() => setCategory(item.id)}
          />
        ))}
        {categoryOptions.length > visibleCategoryOptions.length ? (
          <MoreCategoryChip onPress={() => setShowCategoryPicker(true)} />
        ) : null}
      </ScrollView>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={recipeListRef}
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

      {!loading && filteredRecipes.length > 0 ? (
        <Pressable
          accessibilityLabel={t("common.backToTop")}
          accessibilityRole="button"
          onPress={() =>
            recipeListRef.current?.scrollToOffset({
              animated: true,
              offset: 0
            })
          }
          style={({ pressed }) => [
            styles.scrollTopButton,
            {
              backgroundColor: colors.surfaceGlassStrong,
              borderColor: colors.border,
              opacity: pressed ? 0.74 : 0.92,
              shadowColor: colors.shadow
            }
          ]}
        >
          <ArrowUp color={colors.primary} size={19} strokeWidth={2.6} />
        </Pressable>
      ) : null}

      <CategoryPickerModal
        category={category}
        categoryOptions={categoryOptions}
        onClose={() => setShowCategoryPicker(false)}
        onSelect={(nextCategory) => {
          setCategory(nextCategory);
          setShowCategoryPicker(false);
        }}
        title={categoryPickerLabel}
        visible={showCategoryPicker}
      />
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

function MoreCategoryChip({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const label = safeTranslation(t("recipes.moreCategories"), "Plus");
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryChip,
        {
          backgroundColor: colors.surfaceGlassStrong,
          borderColor: colors.border,
          opacity: pressed ? 0.78 : 1
        }
      ]}
    >
      <ListFilter color={colors.primary} size={17} strokeWidth={2.5} />
      <AppText variant="label">{label}</AppText>
    </Pressable>
  );
}

function CategoryPickerModal({
  category,
  categoryOptions,
  onClose,
  onSelect,
  title,
  visible
}: {
  category: string | null;
  categoryOptions: CategoryOption[];
  onClose: () => void;
  onSelect: (category: string | null) => void;
  title: string;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <GlassPanel style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <AppText variant="subtitle">{title}</AppText>
            <IconButton icon={X} label={t("common.close")} onPress={onClose} />
          </View>
          <ScrollView
            contentContainerStyle={styles.categoryGrid}
            showsVerticalScrollIndicator={false}
          >
            {categoryOptions.map((item) => (
              <Pressable
                key={item.id ?? "all"}
                accessibilityRole="button"
                onPress={() => onSelect(item.id)}
                style={({ pressed }) => [
                  styles.categoryGridItem,
                  {
                    backgroundColor:
                      category === item.id ? colors.primary : colors.chip,
                    borderColor:
                      category === item.id ? colors.primary : colors.border,
                    opacity: pressed ? 0.78 : 1
                  }
                ]}
              >
                <AppText
                  variant="label"
                  style={{
                    color:
                      category === item.id ? colors.textInverted : colors.text
                  }}
                >
                  {item.label}
                </AppText>
                <AppText
                  variant="caption"
                  style={{
                    color:
                      category === item.id
                        ? colors.textInverted
                        : colors.textMuted
                  }}
                >
                  {item.count}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </GlassPanel>
      </View>
    </Modal>
  );
}

function safeTranslation(value: string, fallback: string) {
  return value.includes(".") ? fallback : value;
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
    paddingBottom: spacing.xs,
    paddingTop: spacing.xxs,
    paddingRight: spacing.md
  },
  categoryScroller: {
    flexGrow: 0,
    height: 48,
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
    minHeight: 36,
    paddingHorizontal: spacing.sm
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingBottom: spacing.md
  },
  categoryGridItem: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xxs,
    minHeight: 58,
    padding: spacing.sm,
    width: "48%"
  },
  categoryToolbar: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 44
  },
  categoryToolbarText: {
    flex: 1,
    minWidth: 0
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: 88
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  inlineEditor: {
    gap: spacing.sm,
    padding: spacing.sm
  },
  organizerActions: {
    flexDirection: "row",
    gap: spacing.xs
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.24)"
  },
  modalSheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: spacing.md,
    maxHeight: "72%"
  },
  recipeList: {
    flex: 1
  },
  scrollTopButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: spacing.md,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    right: spacing.md,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    width: 42,
    elevation: 4
  },
  titleBlock: {
    flex: 1,
    minWidth: 0
  }
});
