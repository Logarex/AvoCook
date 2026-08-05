import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertTriangle,
  ArrowUp,
  Check,
  Download,
  FileUp,
  ListFilter,
  ListPlus,
  Plus,
  Printer,
  RefreshCw,
  Settings,
  Share2,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  View,
} from "react-native";
import { CategoryChip } from "./recipeList/CategoryChip";
import { RecipeActionsModal } from "./recipeList/RecipeActionsModal";
import { CategoryPickerModal } from "./recipeList/CategoryPickerModal";
import { styles } from "./recipeList/recipeListStyles";
import {
  isUserDismissedShareOrPrint,
  getPrintLabels,
  safeTranslation,
  getRecipeSearchText,
  getRecipeSearchScore,
  normalizeSearchText,
} from "./recipeList/recipeListHelpers";

import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../components/AppText";
import { BottomNavigation } from "../components/BottomNavigation";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { EmptyState } from "../components/EmptyState";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { useLongActionToast } from "../components/LongActionToast";
import { PageSwipeGesture } from "../components/PageSwipeGesture";
import { PrimaryButton } from "../components/PrimaryButton";
import { RecipeCard } from "../components/RecipeCard";
import { Screen } from "../components/Screen";
import { SearchField } from "../components/SearchField";
import { TextField } from "../components/TextField";
import { useAuth } from "../features/auth/AuthProvider";
import { useReducedMotion } from "../features/accessibility/useReducedMotion";
import { useRecipes } from "../features/recipes/RecipesProvider";
import { useMilestoneReminders } from "../features/recipes/useMilestoneReminders";
import { getRecipeCategoryLabel } from "../features/recipes/categories";
import {
  printRecipe,
  shareRecipeFile,
  shareRecipePdf,
  type RecipePrintLabels,
} from "../features/recipes/recipeSharing";
import { canUseRemoteRecipeImageFallback } from "../features/recipes/recipeImageReferences";
import {
  checkForUpdates,
  type UpdateInfo,
} from "../features/updates/updateService";
import type { Recipe } from "../features/recipes/types";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { getScreenBottomPadding } from "../utils/safeArea";

type Props = NativeStackScreenProps<RootStackParamList, "Recipes">;

type CategoryOption = {
  count: number;
  id: string | null;
  label: string;
};

export function RecipeListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { watchLongAction } = useLongActionToast();
  const reducedMotion = useReducedMotion();
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
    toggleFavoriteCategory
  } = useRecipes();
  const { showBackupReminder, dismissBackupReminder, recordBackupDone, manualTriggerStoreReview } = useMilestoneReminders(recipes.length, isLocalMode);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [showListScrollTop, setShowListScrollTop] = useState(false);
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
        count
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const result: CategoryOption[] = [
      { id: null, label: t("recipes.allCategories"), count: recipes.length },
    ];

    if (uncategorizedCount > 0) {
      result.push({ id: "", label: t("recipes.uncategorized"), count: uncategorizedCount });
    }

    return [...result, ...options];
  }, [customCategories, recipes, t]);

  const visibleCategoryOptions = useMemo(() => {
    const allCategories = categoryOptions.find(c => c.id === null);
    const uncategorized = categoryOptions.find(c => c.id === "");
    const favorites = categoryOptions.filter(c => c.id !== null && c.id !== "" && favoriteCategories.includes(c.id));
    const selected = categoryOptions.find((item) => item.id === category);

    const nextOptions: CategoryOption[] = [];
    if (allCategories) nextOptions.push(allCategories);
    if (uncategorized) nextOptions.push(uncategorized);
    favorites.forEach(f => {
      if (!nextOptions.some(item => item.id === f.id)) {
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
      const recipeCategory = recipe.recipeCategory.trim();
      const matchesCategory =
        category === null ||
        (category === "" ? !recipeCategory : recipeCategory === category);
      const searchable = normalizeSearchText(getRecipeSearchText(recipe));
      return matchesCategory && searchable.includes(normalizedQuery);
    });

    if (!normalizedQuery) {
      return matchingRecipes.sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
      );
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

  const alphabet = useMemo(() => {
    const letters = new Set<string>();
    for (const r of filteredRecipes) {
      if (r.name) {
        const first = r.name.charAt(0).toUpperCase();
        const letter = first.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (letter >= 'A' && letter <= 'Z') {
          letters.add(letter);
        } else {
          letters.add('#');
        }
      }
    }
    return Array.from(letters).sort();
  }, [filteredRecipes]);

  const scrollToLetter = useCallback((letter: string) => {
    const index = filteredRecipes.findIndex(r => {
      if (!r.name) return false;
      const first = r.name.charAt(0).toUpperCase();
      const l = first.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (letter === '#') {
        return !(l >= 'A' && l <= 'Z');
      }
      return l === letter;
    });
    if (index !== -1) {
      recipeListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
    }
  }, [filteredRecipes]);

  const connected = Boolean(credentials || isLocalMode);
  const imageClient = credentials ? getClient() : null;
  const imageHeaders = imageClient?.getImageHeaders();
  const statusLabel = isLocalMode
    ? t("settings.localMode")
    : credentials
      ? t("common.online")
      : t("common.offline");
  const statusDetail = loading ? t("recipes.loadingRecipes") : undefined;

  const openShoppingList = React.useCallback(() => {
    navigation.navigate("ShoppingList", { tabTransition: "fromRecipes" });
  }, [navigation]);

  async function handleCreateCategory() {
    const normalized = newCategory.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return;
    }
    if (editingCategory) {
      await renameCategory(editingCategory, normalized);
    } else {
      await createCategory(normalized);
    }
    setCategory(normalized);
    setShowCategoryPicker(false);
    setNewCategory("");
    setEditingCategory(null);
    setShowCategoryCreator(false);
  }

  function handleStartRenameCategory(categoryName: string) {
    setEditingCategory(categoryName);
    setNewCategory(categoryName);
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
    } catch (error) {
      // Ignored (e.g. user cancelled file picker)
    }
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

  function handleRecipeListScroll(
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) {
    const nextShowListScrollTop = event.nativeEvent.contentOffset.y > 260;
    setShowListScrollTop((current) =>
      current === nextShowListScrollTop ? current : nextShowListScrollTop,
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

  async function handlePrintRecipe(recipe: Recipe) {
    setRecipeAction("print");
    const stopLongActionNotice = watchLongAction("longActions.printRecipe");
    try {
      const result = await printRecipe(recipe, getPrintLabels(t), getClient());
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
      <RecipeCard
        fallbackImageUri={
          imageClient && canUseRemoteRecipeImageFallback(item)
            ? imageClient.getRecipeImageUrl(item.id, "thumb")
            : undefined
        }
        imageHeaders={imageHeaders}
        recipe={item}
        onLongPress={() => handleRecipeLongPress(item)}
        onPress={() =>
          item.id &&
          navigation.navigate("RecipeDetail", { id: item.id })
        }
      />
    ),
    [imageClient, imageHeaders, handleRecipeLongPress, navigation]
  );

  return (
    <PageSwipeGesture onSwipeLeft={openShoppingList}>
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
                  category: category ? category : undefined,
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
              onPress={() => {
                if (showCategoryCreator && !editingCategory) {
                  handleCloseCategoryEditor();
                  return;
                }
                setEditingCategory(null);
                setNewCategory("");
                setShowCategoryCreator(true);
              }}
              tone="primary"
              style={styles.headerIcon}
            />
          </View>
        </View>

        {showCategoryCreator ? (
          <GlassPanel style={styles.inlineEditor}>
            <TextField
              label={
                editingCategory
                  ? t("recipes.renameCategory")
                  : t("recipes.categoryName")
              }
              onChangeText={setNewCategory}
              value={newCategory}
            />
            <View style={styles.inlineEditorActions}>
              <PrimaryButton
                disabled={!newCategory.trim()}
                icon={Check}
                label={
                  editingCategory ? t("common.save") : t("recipes.createCategory")
                }
                onPress={() => void handleCreateCategory()}
                style={styles.inlineEditorActionButton}
              />
              <PrimaryButton
                icon={X}
                label={t("common.cancel")}
                onPress={handleCloseCategoryEditor}
                style={styles.inlineEditorActionButton}
                variant="ghost"
              />
            </View>
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
            <AppText variant="caption" style={{ marginTop: 8, marginBottom: 12 }}>
              {t("recipes.backupReminderBody", { count: recipes.length })}
            </AppText>
            <View style={styles.updateActions}>
              <PrimaryButton
                label={t("settings.exportBackup")}
                onPress={() => void handleBackupReminderExport()}
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
          <View style={{ flex: 1 }}>
            <FlatList
              ref={recipeListRef}
              style={styles.recipeList}
              contentContainerStyle={[
                styles.listContent,
                filteredRecipes.length > 0 && { paddingRight: 24 }
              ]}
              data={filteredRecipes}
              keyExtractor={(item) => item.id ?? item.name}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
              getItemLayout={(data, index) => ({
                length: 124,
                offset: 124 * index,
                index,
              })}
              ListEmptyComponent={
                <EmptyState
                  title={t("recipes.emptyTitle")}
                  body={t("recipes.emptyBody")}
                />
              }
              renderItem={renderRecipeItem}
              showsVerticalScrollIndicator={false}
            />
            {!loading && filteredRecipes.length > 0 ? (
              <View style={[styles.alphabetSidebar, { borderLeftColor: colors.border }]}>
                {alphabet.map((letter) => (
                  <Pressable
                    key={letter}
                    onPress={() => scrollToLetter(letter)}
                    hitSlop={6}
                    style={styles.alphabetLetterButton}
                  >
                    <AppText style={[styles.alphabetLetter, { color: colors.primary }]}>
                      {letter}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        )}

        <CategoryPickerModal
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
          onPrint={(recipe) => void handlePrintRecipe(recipe)}
          onShareFile={(recipe) => void handleShareRecipeFile(recipe)}
          onSharePdf={(recipe) => void handleShareRecipePdf(recipe)}
          recipe={selectedRecipe}
          visible={Boolean(selectedRecipe)}
        />

        <BottomNavigation
          current="recipes"
          onNavigate={(tab) => {
            if (tab === "shoppingList") {
              openShoppingList();
            }
          }}
        />
      </Screen>
    </PageSwipeGesture>
  );
}
