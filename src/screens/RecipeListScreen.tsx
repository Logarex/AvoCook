import { useAdaptiveLayout } from "../hooks/useAdaptiveLayout";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import { matchesDietPreference, matchesFoodPreferences } from "../features/kitchen/kitchen";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertTriangle,
  ArrowDownAZ,
  Download,
  ListFilter,
  Plus,
  RefreshCw,
  Settings,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { markdownToPlainText } from "../features/markdown/markdown";
import { spacing } from "../theme/colors";
import { useNavigationContentInset } from "../hooks/useNavigationContentInset";
import { AddRecipeModal } from "./recipeList/AddRecipeModal";
import { CategoryChip } from "./recipeList/CategoryChip";
import { CategoryEditorModal } from "./recipeList/CategoryEditorModal";
import { CategoryPickerModal } from "./recipeList/CategoryPickerModal";
import { RecipeActionsModal } from "./recipeList/RecipeActionsModal";
import {
  getPrintLabels,
  getRecipeAlphabetLetter,
  getRecipeSearchScore,
  getRecipeSearchText,
  isUserDismissedShareOrPrint,
  normalizeSearchText,
  safeTranslation,
} from "./recipeList/recipeListHelpers";
import { styles } from "./recipeList/recipeListStyles";

import { useTranslation } from "react-i18next";
import { ActionMenu } from "../components/ActionMenu";
import { AppText } from "../components/AppText";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { EmptyState } from "../components/EmptyState";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { useLongActionToast } from "../components/LongActionToast";
import { PageSwipeGesture } from "../components/PageSwipeGesture";
import { PrimaryButton } from "../components/PrimaryButton";
import { RecipeCard } from "../components/RecipeCard";
import { getRecipeCardHeight } from "../components/recipeCardLayout";
import { Screen } from "../components/Screen";
import { SearchField } from "../components/SearchField";
import { useAuth } from "../features/auth/AuthProvider";
import { getRecipeCategoryLabel } from "../features/recipes/categories";
import { canUseRemoteRecipeImageFallback } from "../features/recipes/recipeImageReferences";
import {
  shareRecipeFile,
  shareRecipePdf,
} from "../features/recipes/recipeSharing";
import { useRecipes } from "../features/recipes/RecipesProvider";
import type { Recipe } from "../features/recipes/types";
import { useMilestoneReminders } from "../features/recipes/useMilestoneReminders";
import {
  checkForUpdates,
  type UpdateInfo,
} from "../features/updates/updateService";
import type { RootStackParamList } from "../navigation/types";
import { useAppTheme } from "../theme/ThemeProvider";
type Props = NativeStackScreenProps<RootStackParamList, "Recipes">;

type CategoryOption = {
  count: number;
  id: string | null;
  label: string;
};

export function RecipeListScreen({ navigation }: Props) {
  const kitchen = useKitchen();
  const { t } = useTranslation();
  const { fontScale, width } = useWindowDimensions();
  const navigationContentInset = useNavigationContentInset(fontScale);
  const { columns } = useAdaptiveLayout();
  const { colors } = useAppTheme();
  const { watchLongAction } = useLongActionToast();
  const { credentials, getClient, isLocalMode } = useAuth();
  const {
    createCategory,
    customCategories,
    deleteCategory,
    deleteRecipe,
    recipes,
    renameCategory,
    loading,
    syncing,
    sync,
    exportBackup,
    favoriteCategories,
    toggleFavoriteCategory,
  } = useRecipes();
  const {
    showBackupReminder,
    dismissBackupReminder,
    recordBackupDone,
    manualTriggerStoreReview,
  } = useMilestoneReminders(recipes.length, isLocalMode);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeAction, setRecipeAction] = useState<
    "print" | "pdf" | "file" | "delete" | null
  >(null);
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
    t("recipes.categories"),
  );

  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const counts = new Map<string, number>();
    let uncategorizedCount = 0;

    for (const recipe of recipes) {
      const recipeCategory = recipe.recipeCategory.trim();
      if (!recipeCategory) {
        uncategorizedCount++;
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
      .map(([id, count]) => ({
        id,
        label: getRecipeCategoryLabel(id, t),
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const result: CategoryOption[] = [
      { id: null, label: t("recipes.allCategories"), count: recipes.length },
    ];

    if (uncategorizedCount > 0) {
      result.push({
        id: "",
        label: t("recipes.uncategorized"),
        count: uncategorizedCount,
      });
    }

    return [...result, ...options];
  }, [customCategories, recipes, t]);

  const visibleCategoryOptions = useMemo(() => {
    const allCategories = categoryOptions.find((c) => c.id === null);
    const uncategorized = categoryOptions.find((c) => c.id === "");
    const favorites = categoryOptions.filter(
      (c) => c.id !== null && c.id !== "" && favoriteCategories.includes(c.id),
    );
    const selected = categoryOptions.find((item) => item.id === category);

    const nextOptions: CategoryOption[] = [];
    if (allCategories) nextOptions.push(allCategories);
    if (uncategorized) nextOptions.push(uncategorized);
    favorites.forEach((f) => {
      if (!nextOptions.some((item) => item.id === f.id)) {
        nextOptions.push(f);
      }
    });
    if (selected && !nextOptions.some((item) => item.id === selected.id)) {
      nextOptions.push(selected);
    }

    return nextOptions;
  }, [category, categoryOptions, favoriteCategories]);

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    const matchingRecipes = recipes.filter((recipe) => {
      if (!matchesDietPreference(recipe.id, kitchen.data) || !matchesFoodPreferences(recipe, kitchen.data.excludedWords)) return false;
      const recipeCategory = recipe.recipeCategory.trim();
      const matchesCategory =
        category === null ||
        (category === "" ? !recipeCategory : recipeCategory === category);
      const searchable = normalizeSearchText(getRecipeSearchText(recipe));
      return matchesCategory && searchable.includes(normalizedQuery);
    });

    if (!normalizedQuery) {
      return matchingRecipes.sort((left, right) =>
        markdownToPlainText(left.name).localeCompare(
          markdownToPlainText(right.name),
          undefined,
          { sensitivity: "base" },
        ),
      );
    }

    return matchingRecipes.sort((left, right) => {
      const leftScore = getRecipeSearchScore(left, normalizedQuery);
      const rightScore = getRecipeSearchScore(right, normalizedQuery);
      return (
        leftScore - rightScore ||
        markdownToPlainText(left.name).localeCompare(
          markdownToPlainText(right.name),
          undefined,
          { sensitivity: "base" },
        )
      );
    });
  }, [category, query, recipes, kitchen.data]);

  const alphabet = useMemo(() => {
    const letters = new Set<string>();
    for (const r of filteredRecipes) {
      if (r.name) {
        letters.add(getRecipeAlphabetLetter(r.name));
      }
    }
    return Array.from(letters).sort();
  }, [filteredRecipes]);

  const scrollToLetter = useCallback(
    (letter: string) => {
      const index = filteredRecipes.findIndex((r) => {
        if (!r.name) return false;
        return getRecipeAlphabetLetter(r.name) === letter;
      });
      if (index !== -1) {
        recipeListRef.current?.scrollToIndex({
          index: Math.floor(index / columns),
          animated: true,
          viewPosition: 0,
        });
      }
    },
    [filteredRecipes, columns],
  );

  const connected = Boolean(credentials || isLocalMode);
  const imageClient = credentials ? getClient() : null;
  const statusLabel = isLocalMode
    ? t("settings.localMode")
    : credentials
      ? t("common.online")
      : t("common.offline");
  const statusDetail = loading ? t("recipes.loadingRecipes") : undefined;

  async function handleSaveCategory(name: string, isFavorite: boolean) {
    const normalized = name.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return;
    }
    if (editingCategory) {
      await renameCategory(editingCategory, normalized);
    } else {
      await createCategory(normalized);
    }

    const currentlyFavorite = favoriteCategories.includes(normalized);
    if (isFavorite && !currentlyFavorite) {
      void toggleFavoriteCategory(normalized);
    } else if (!isFavorite && currentlyFavorite) {
      void toggleFavoriteCategory(normalized);
    }

    setCategory(normalized);
    setShowCategoryPicker(false);
    setNewCategory("");
    setEditingCategory(null);
    setShowCategoryCreator(false);
  }

  function handleStartRenameCategory(categoryName: string) {
    setEditingCategory(categoryName);
    setNewCategory(getRecipeCategoryLabel(categoryName, t));
    setShowCategoryCreator(true);
    setShowCategoryPicker(false);
  }

  function handleCloseCategoryEditor() {
    setShowCategoryCreator(false);
    setNewCategory("");
    setEditingCategory(null);
  }

  async function handleBackupReminderExport() {
    try {
      await exportBackup();
      await recordBackupDone();
      void manualTriggerStoreReview();
    } catch {}
  }

  function handleDeleteCategory(categoryName: string, count: number) {
    const categoryLabel = getRecipeCategoryLabel(categoryName, t);
    if (count > 0) {
      Alert.alert(
        t("recipes.categoryHasRecipesTitle"),
        t("recipes.categoryHasRecipesBody", { category: categoryLabel, count }),
      );
      return;
    }

    Alert.alert(
      t("recipes.deleteCategoryConfirmTitle"),
      t("recipes.deleteCategoryConfirmBody", { category: categoryLabel }),
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
          },
        },
      ],
    );
  }

  const handleRecipeLongPress = useCallback((recipe: Recipe) => {
    setSelectedRecipe(recipe);
  }, []);

  function handleCloseRecipeActions() {
    if (recipeAction) {
      return;
    }
    setSelectedRecipe(null);
  }

  async function handleShareRecipePdf(recipe: Recipe) {
    setRecipeAction("pdf");
    const stopLongActionNotice = watchLongAction("longActions.exportRecipe");
    try {
      const result = await shareRecipePdf(
        recipe,
        getPrintLabels(t),
        getClient(),
      );
      showShareWarning(result.skippedImageCount);
    } catch (error) {
      if (isUserDismissedShareOrPrint(error)) {
        return;
      }
      Alert.alert(
        t("recipes.share.failedTitle"),
        t("recipes.share.failedBody"),
      );
    } finally {
      stopLongActionNotice();
      setRecipeAction(null);
      setSelectedRecipe(null);
    }
  }

  async function handleShareRecipeFile(recipe: Recipe) {
    setRecipeAction("file");
    const stopLongActionNotice = watchLongAction("longActions.shareRecipe");
    try {
      const result = await shareRecipeFile(recipe, getClient());
      showShareWarning(result.skippedImageCount);
    } catch (error) {
      if (isUserDismissedShareOrPrint(error)) {
        return;
      }
      Alert.alert(
        t("recipes.share.failedTitle"),
        t("recipes.share.failedBody"),
      );
    } finally {
      stopLongActionNotice();
      setRecipeAction(null);
      setSelectedRecipe(null);
    }
  }

  function handleDeleteRecipe(recipe: Recipe) {
    if (!recipe.id) {
      return;
    }
    setRecipeAction("delete");
    Alert.alert(t("common.delete"), t("recipes.deleteConfirm"), [
      {
        text: t("common.cancel"),
        style: "cancel",
        onPress: () => setRecipeAction(null),
      },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          setSelectedRecipe(null);
          void deleteRecipe(recipe.id ?? "").finally(() =>
            setRecipeAction(null),
          );
        },
      },
    ]);
  }

  function showShareWarning(skippedImageCount: number) {
    if (skippedImageCount > 0) {
      Alert.alert(
        t("recipes.share.partialTitle"),
        t("recipes.share.partialBody", { count: skippedImageCount }),
      );
    }
  }

  const renderRecipeItem = useCallback(
    ({ item }: { item: Recipe }) => (
      <View style={{ flex: 1, maxWidth: columns > 1 ? "50%" : undefined }}>
        <RecipeCard
          fallbackImageUri={
            imageClient && canUseRemoteRecipeImageFallback(item)
              ? imageClient.getRecipeImageUrl(item.id, "thumb")
              : undefined
          }
          imageClient={imageClient}
          recipe={item}
          onLongPress={() => handleRecipeLongPress(item)}
          onPress={() =>
            item.id && navigation.navigate("RecipeDetail", { id: item.id })
          }
        />
      </View>
    ),
    [imageClient, handleRecipeLongPress, navigation, columns],
  );

  return (
    <PageSwipeGesture
      onSwipeLeft={() =>
        navigation.navigate("Kitchen", { tabTransition: "slide_from_right" })
      }
    >
      <Screen
        scroll={false}
        contentWidth={1120}
        contentStyle={styles.screenContent}
      >
        <View
          style={[
            styles.header,
            fontScale > 1.3 || width < 360
              ? { flexDirection: "column", alignItems: "stretch" }
              : undefined,
          ]}
        >
          <View style={styles.titleBlock}>
            <AppText
              adjustsFontSizeToFit={fontScale <= 1.3}
              minimumFontScale={0.84}
              numberOfLines={fontScale > 1.3 ? undefined : 1}
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
              neutral={isLocalMode}
            />
          </View>
          <View style={[styles.actions, { alignSelf: "flex-end" }]}>
            {!isLocalMode ? (
              <IconButton
                icon={RefreshCw}
                label={t("common.sync")}
                onPress={() => void sync()}
                spinning={syncing}
                disabled={!credentials}
                style={styles.headerIcon}
              />
            ) : null}
            <IconButton
              icon={Plus}
              label={t("common.add")}
              onPress={() => setShowAddMenu(true)}
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

        {(!!kitchen.data.excludedWords || !!kitchen.data.dietaryPreference) && <PrimaryButton label={t("kitchen.profileActive")} variant="ghost" onPress={() => navigation.navigate("Kitchen", { section: "profiles" })} />}
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

            {filteredRecipes.length > 30 ? (
              <ActionMenu
                icon={ArrowDownAZ}
                label={t("ui.jumpTo")}
                actions={alphabet.map((letter) => ({
                  id: letter,
                  label: letter,
                  onPress: () => scrollToLetter(letter),
                }))}
              />
            ) : null}
          </View>
        </View>

        <CategoryEditorModal
          editingCategory={editingCategory}
          initialCategoryName={newCategory}
          initialIsFavorite={favoriteCategories.includes(
            editingCategory || newCategory,
          )}
          onClose={handleCloseCategoryEditor}
          onSave={(name, isFavorite) =>
            void handleSaveCategory(name, isFavorite)
          }
          visible={showCategoryCreator}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[
            styles.categoryScroller,
            { height: Math.max(44, 22 * fontScale + 12) },
          ]}
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
        </ScrollView>

        {updateInfo && !dismissedUpdate ? (
          <GlassPanel style={styles.updateBanner}>
            <View style={styles.updateBannerHeader}>
              <View style={styles.updateBannerTitleRow}>
                <View
                  style={[
                    styles.updateIconWrapper,
                    { backgroundColor: colors.chip },
                  ]}
                >
                  <Download
                    color={colors.primary}
                    size={20}
                    strokeWidth={2.4}
                  />
                </View>
                <AppText variant="subtitle" style={styles.updateTitle}>
                  {t("updates.bannerTitle", {
                    version: updateInfo.latestVersion,
                  })}
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
                <AppText
                  variant="caption"
                  style={[styles.updateWarningText, { color: colors.danger }]}
                >
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
                  numberOfLines={2}
                />
              ) : null}
              <PrimaryButton
                label={t("updates.download")}
                onPress={() => {
                  const url = updateInfo.apkUrl || updateInfo.releaseUrl;
                  void Linking.openURL(url);
                }}
                style={styles.updateActionButton}
                numberOfLines={2}
              />
            </View>
          </GlassPanel>
        ) : null}

        {showBackupReminder ? (
          <GlassPanel style={styles.updateBanner}>
            <View style={styles.updateBannerHeader}>
              <View style={styles.updateBannerTitleRow}>
                <View
                  style={[
                    styles.updateIconWrapper,
                    { backgroundColor: colors.chip },
                  ]}
                >
                  <Download
                    color={colors.primary}
                    size={20}
                    strokeWidth={2.4}
                  />
                </View>
                <AppText variant="subtitle" style={styles.updateTitle}>
                  {t("recipes.backupReminderTitle")}
                </AppText>
              </View>
              <IconButton
                icon={X}
                label={t("common.close")}
                onPress={() => void dismissBackupReminder()}
                style={styles.closeIcon}
              />
            </View>
            <AppText
              variant="caption"
              style={{ marginTop: 8, marginBottom: 12 }}
            >
              {t("recipes.backupReminderBody", { count: recipes.length })}
            </AppText>
            <View style={styles.updateActions}>
              <PrimaryButton
                label={t("settings.exportBackup")}
                onPress={() => void handleBackupReminderExport()}
                style={styles.updateActionButton}
                numberOfLines={2}
              />
            </View>
          </GlassPanel>
        ) : null}

        {loading && !syncing ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              key={`recipes-${columns}`}
              numColumns={columns}
              columnWrapperStyle={columns > 1 ? { gap: spacing.xs } : undefined}
              refreshControl={
                !isLocalMode ? (
                  <RefreshControl
                    refreshing={pullRefreshing}
                    onRefresh={() => {
                      if (!syncing) {
                        setPullRefreshing(true);
                        void sync()
                          .catch((error: unknown) =>
                            console.warn("sync", "Refresh failed", error),
                          )
                          .finally(() => setPullRefreshing(false));
                      }
                    }}
                    tintColor={colors.primary}
                  />
                ) : undefined
              }
              ref={recipeListRef}
              style={styles.recipeList}
              contentContainerStyle={[
                styles.listContent,
                {
                  paddingBottom: navigationContentInset,
                },
                { paddingRight: spacing.md },
              ]}
              data={filteredRecipes}
              keyExtractor={(item) => item.id ?? item.name}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
              getItemLayout={(data, index) => ({
                length: getRecipeCardHeight(fontScale) + spacing.xs,
                offset: (getRecipeCardHeight(fontScale) + spacing.xs) * index,
                index,
              })}
              ListEmptyComponent={
                <EmptyState
                  title={t(
                    query.trim() || category !== null
                      ? "ui.noResults"
                      : "recipes.emptyTitle",
                  )}
                  body={t(
                    query.trim() || category !== null
                      ? "ui.noResultsBody"
                      : "recipes.emptyBody",
                  )}
                />
              }
              renderItem={renderRecipeItem}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        <CategoryPickerModal
          onCreateCategory={() => {
            setEditingCategory(null);
            setNewCategory("");
            setShowCategoryCreator(true);
          }}
          category={category}
          categoryOptions={categoryOptions}
          favoriteCategories={favoriteCategories}
          onClose={() => setShowCategoryPicker(false)}
          onDeleteCategory={handleDeleteCategory}
          onRenameCategory={handleStartRenameCategory}
          onSelect={(nextCategory) => {
            setCategory(nextCategory);
            setShowCategoryPicker(false);
          }}
          onToggleFavorite={(cat) => void toggleFavoriteCategory(cat)}
          title={categoryPickerLabel}
          visible={showCategoryPicker}
        />

        <RecipeActionsModal
          action={recipeAction}
          onClose={handleCloseRecipeActions}
          onDelete={handleDeleteRecipe}
          onShareFile={(recipe) => void handleShareRecipeFile(recipe)}
          onSharePdf={(recipe) => void handleShareRecipePdf(recipe)}
          recipe={selectedRecipe}
          visible={!!selectedRecipe}
        />

        <AddRecipeModal
          visible={showAddMenu}
          onClose={() => setShowAddMenu(false)}
          onNewRecipe={() =>
            navigation.navigate("RecipeEditor", {
              category: category ? category : undefined,
            })
          }
          onImportRecipe={() => navigation.navigate("ImportRecipe")}
        />
      </Screen>
    </PageSwipeGesture>
  );
}
