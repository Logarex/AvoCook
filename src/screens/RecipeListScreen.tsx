import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertTriangle,
  ArrowUp,
  Check,
  Download,
  ListFilter,
  ListPlus,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  X
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { BottomNavigation } from "../components/BottomNavigation";
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
import { useReducedMotion } from "../features/accessibility/useReducedMotion";
import { useRecipes } from "../features/recipes/RecipesProvider";
import { checkForUpdates, type UpdateInfo } from "../features/updates/updateService";
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
  const reducedMotion = useReducedMotion();
  const { credentials, getClient, isLocalMode } = useAuth();
  const {
    createCategory,
    customCategories,
    deleteCategory,
    recipes,
    loading,
    syncing,
    sync
  } = useRecipes();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [showListScrollTop, setShowListScrollTop] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const recipeListRef = useRef<FlatList<Recipe>>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissedUpdate, setDismissedUpdate] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }
    let active = true;
    void checkForUpdates().then((info) => {
      if (active && info && info.updateAvailable) {
        setUpdateInfo(info);
      }
    });
    return () => {
      active = false;
    };
  }, []);

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
    const normalizedQuery = normalizeSearchText(query);
    const matchingRecipes = recipes.filter((recipe) => {
      const matchesCategory =
        !category || recipe.recipeCategory === category;
      const searchable = normalizeSearchText(getRecipeSearchText(recipe));
      return matchesCategory && searchable.includes(normalizedQuery);
    });

    if (!normalizedQuery) {
      return matchingRecipes;
    }

    return matchingRecipes.sort((left, right) => {
      const leftScore = getRecipeSearchScore(left, normalizedQuery);
      const rightScore = getRecipeSearchScore(right, normalizedQuery);
      return (
        leftScore - rightScore ||
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
      );
    });
  }, [category, query, recipes]);

  const connected = Boolean(credentials || isLocalMode);
  const imageHeaders = credentials ? getClient()?.getImageHeaders() : undefined;
  const statusLabel = isLocalMode
    ? t("settings.localMode")
    : credentials
      ? t("common.online")
      : t("common.offline");
  const statusDetail = loading
    ? t("recipes.loadingRecipes")
    : undefined;

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

  function handleDeleteCategory(categoryName: string, count: number) {
    if (count > 0) {
      Alert.alert(
        t("recipes.categoryHasRecipesTitle"),
        t("recipes.categoryHasRecipesBody", { category: categoryName, count })
      );
      return;
    }

    Alert.alert(
      t("recipes.deleteCategoryConfirmTitle"),
      t("recipes.deleteCategoryConfirmBody", { category: categoryName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            if (category === categoryName) {
              setCategory(null);
            }
            void deleteCategory(categoryName);
          }
        }
      ]
    );
  }

  function handleRecipeListScroll(
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) {
    const nextShowListScrollTop = event.nativeEvent.contentOffset.y > 260;
    setShowListScrollTop((current) =>
      current === nextShowListScrollTop ? current : nextShowListScrollTop
    );
  }

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <AppText
            adjustsFontSizeToFit
            minimumFontScale={0.84}
            numberOfLines={1}
            variant="title"
            style={styles.listTitle}
          >
            {t("recipes.title")}
          </AppText>
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
            spinning={syncing}
            disabled={!credentials}
            style={styles.headerIcon}
          />
          <IconButton
            icon={Download}
            label={t("common.import")}
            onPress={() => navigation.navigate("ImportRecipe")}
            tone="primary"
            style={styles.headerIcon}
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
            style={styles.headerIcon}
          />
          <IconButton
            icon={Settings}
            label={t("common.settings")}
            onPress={() => navigation.navigate("Settings")}
            style={styles.headerIcon}
          />
        </View>
      </View>

      <View style={styles.searchRow}>
        <SearchField
          onChangeText={setQuery}
          placeholder={t("common.search")}
          value={query}
          style={styles.searchField}
        />
        <View style={styles.organizerActions}>
          <IconButton
            icon={ListFilter}
            label={categoryPickerLabel}
            onPress={() => setShowCategoryPicker(true)}
            style={styles.headerIcon}
          />
          <IconButton
            icon={ListPlus}
            label={t("recipes.newCategory")}
            onPress={() => setShowCategoryCreator((visible) => !visible)}
            tone="primary"
            style={styles.headerIcon}
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

      {updateInfo && !dismissedUpdate ? (
        <GlassPanel style={styles.updateBanner}>
          <View style={styles.updateBannerHeader}>
            <View style={styles.updateBannerTitleRow}>
              <View style={[styles.updateIconWrapper, { backgroundColor: colors.chip }]}>
                <Download color={colors.primary} size={20} strokeWidth={2.4} />
              </View>
              <AppText variant="subtitle" style={styles.updateTitle}>
                {t("updates.bannerTitle", { version: updateInfo.latestVersion })}
              </AppText>
            </View>
            <IconButton
              icon={X}
              label={t("updates.dismiss")}
              onPress={() => setDismissedUpdate(true)}
              style={styles.closeIcon}
            />
          </View>
          
          {isLocalMode ? (
            <View style={styles.updateWarningRow}>
              <AlertTriangle color={colors.danger} size={18} />
              <AppText variant="caption" style={[styles.updateWarningText, { color: colors.danger }]}>
                {t("updates.localBackupWarning")}
              </AppText>
            </View>
          ) : null}

          <View style={styles.updateActions}>
            {isLocalMode ? (
              <PrimaryButton
                label={t("settings.exportBackup")}
                onPress={() => {
                  setDismissedUpdate(true);
                  navigation.navigate("Settings");
                }}
                style={styles.updateActionButton}
                variant="ghost"
              />
            ) : null}
            <PrimaryButton
              label={t("updates.download")}
              onPress={() => {
                const url = updateInfo.apkUrl || updateInfo.releaseUrl;
                void Linking.openURL(url);
              }}
              style={styles.updateActionButton}
            />
          </View>
        </GlassPanel>
      ) : null}

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
          onScroll={handleRecipeListScroll}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <EmptyState
              title={t("recipes.emptyTitle")}
              body={t("recipes.emptyBody")}
            />
          }
          renderItem={({ item }) => (
            <RecipeCard
              imageHeaders={imageHeaders}
              recipe={item}
              onPress={() =>
                item.id && navigation.navigate("RecipeDetail", { id: item.id })
              }
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {!loading && filteredRecipes.length > 0 && showListScrollTop ? (
        <Pressable
          accessibilityLabel={t("common.backToTop")}
          accessibilityRole="button"
          onPress={() =>
            recipeListRef.current?.scrollToOffset({
              animated: !reducedMotion,
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
        customCategories={customCategories}
        onClose={() => setShowCategoryPicker(false)}
        onDeleteCategory={handleDeleteCategory}
        onSelect={(nextCategory) => {
          setCategory(nextCategory);
          setShowCategoryPicker(false);
        }}
        title={categoryPickerLabel}
        visible={showCategoryPicker}
      />

      <BottomNavigation
        current="recipes"
        onNavigate={(tab) => {
          if (tab === "shoppingList") {
            navigation.replace("ShoppingList", { tabTransition: "fromRecipes" });
          }
        }}
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
      accessibilityLabel={`${label}, ${count}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
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
      {selected ? (
        <Check color={colors.textInverted} size={16} strokeWidth={3} />
      ) : null}
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
      accessibilityLabel={label}
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
  customCategories,
  onClose,
  onDeleteCategory,
  onSelect,
  title,
  visible
}: {
  category: string | null;
  categoryOptions: CategoryOption[];
  customCategories: string[];
  onClose: () => void;
  onDeleteCategory: (category: string, count: number) => void;
  onSelect: (category: string | null) => void;
  title: string;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const customCategorySet = useMemo(
    () => new Set(customCategories),
    [customCategories]
  );
  return (
    <Modal
      animationType={reducedMotion ? "none" : "slide"}
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          style={styles.modalScrim}
          onPress={onClose}
        />
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
              <View
                key={item.id ?? "all"}
                style={[
                  styles.categoryGridItem,
                  {
                    backgroundColor:
                      category === item.id ? colors.primary : colors.chip,
                    borderColor:
                      category === item.id ? colors.primary : colors.border
                  }
                ]}
              >
                <Pressable
                  accessibilityLabel={`${item.label}, ${item.count}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: category === item.id }}
                  onPress={() => onSelect(item.id)}
                  style={({ pressed }) => [
                    styles.categoryGridSelect,
                    { opacity: pressed ? 0.78 : 1 }
                  ]}
                >
                  {category === item.id ? (
                    <Check
                      color={colors.textInverted}
                      size={17}
                      strokeWidth={3}
                    />
                  ) : null}
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
                {item.id && customCategorySet.has(item.id) ? (
                  <IconButton
                    icon={Trash2}
                    label={t("recipes.deleteCategory")}
                    onPress={() => onDeleteCategory(item.id ?? "", item.count)}
                    tone="danger"
                    style={styles.categoryDeleteButton}
                  />
                ) : null}
              </View>
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

function getRecipeSearchText(recipe: Recipe) {
  return [
    recipe.name,
    recipe.description,
    recipe.recipeCategory,
    recipe.keywords,
    recipe.recipeIngredient.join(" "),
    recipe.recipeInstructions.join(" "),
    recipe.tool.join(" ")
  ].join(" ");
}

function getRecipeSearchScore(recipe: Recipe, normalizedQuery: string) {
  const normalizedName = normalizeSearchText(recipe.name);
  if (normalizedName === normalizedQuery) {
    return 0;
  }
  if (normalizedName.startsWith(normalizedQuery)) {
    return 1;
  }
  if (normalizedName.includes(normalizedQuery)) {
    return 2;
  }
  return 3;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    flexShrink: 0,
    gap: spacing.xxs,
    justifyContent: "flex-end",
    maxWidth: 172
  },
  categoryList: {
    alignItems: "center",
    gap: spacing.xs,
    paddingBottom: spacing.xxs,
    paddingRight: spacing.md
  },
  categoryScroller: {
    flexGrow: 0,
    height: 40,
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
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 58,
    padding: spacing.xs,
    width: "48%"
  },
  categoryGridSelect: {
    flex: 1,
    gap: spacing.xxs,
    justifyContent: "center",
    minWidth: 0
  },
  categoryDeleteButton: {
    height: 38,
    width: 38
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  headerIcon: {
    height: 40,
    width: 40
  },
  listContent: {
    gap: spacing.xs,
    paddingBottom: spacing.sm
  },
  listTitle: {
    lineHeight: 36
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
    flexShrink: 0,
    gap: spacing.xxs
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
  screenContent: {
    gap: spacing.sm,
    paddingBottom: 0,
    paddingTop: spacing.sm
  },
  scrollTopButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 104,
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
  searchField: {
    flex: 1,
    minHeight: 48
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  titleBlock: {
    flex: 1,
    minWidth: 0
  },
  updateBanner: {
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.xs
  },
  updateBannerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  updateBannerTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    flex: 1
  },
  updateIconWrapper: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1
  },
  closeIcon: {
    height: 32,
    width: 32
  },
  updateWarningRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    backgroundColor: "rgba(219, 68, 85, 0.08)",
    padding: spacing.sm,
    borderRadius: radius.sm
  },
  updateWarningText: {
    flex: 1,
    lineHeight: 18,
    fontWeight: "500"
  },
  updateActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xxs
  },
  updateActionButton: {
    flex: 1,
    minHeight: 38
  }
});
