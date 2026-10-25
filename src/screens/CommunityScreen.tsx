import { useAdaptiveLayout } from "../hooks/useAdaptiveLayout";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { Plus } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useNavigationContentInset } from "../hooks/useNavigationContentInset";

import { AppText } from "../components/AppText";
import { IconButton } from "../components/IconButton";
import { LanguagePicker } from "../components/LanguagePicker";
import { PageSwipeGesture } from "../components/PageSwipeGesture";
import { PrimaryButton } from "../components/PrimaryButton";
import { getRecipeCardHeight } from "../components/recipeCardLayout";
import { Screen } from "../components/Screen";
import { SearchField } from "../components/SearchField";
import { StarRating } from "../components/StarRating";
import {
  cacheCommunityFeed,
  COMMUNITY_CACHE_TTL_MS,
  getCachedCommunityFeed,
  hydrateCommunityCache,
  type CommunityFeed,
} from "../features/community/communityCache";
import {
  fetchCommunityRecipes,
  type CommunityRecipe,
  type CommunityRecipeCursor,
  type RecipeLanguage,
} from "../features/community/communityClient";
import {
  COMMUNITY_LANGUAGES,
  resolveCommunityLanguage,
} from "../features/community/communityLanguages";
import {
  getCachedCommunityRecipePreviews,
  hydrateTranslationCache,
  translateCommunityRecipePreviews,
} from "../features/community/communityTranslation";
import { markdownToPlainText } from "../features/markdown/markdown";
import { usePreferences } from "../features/preferences/PreferencesProvider";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { SelectRecipeToShareModal } from "./SelectRecipeToShareModal";

type Props = NativeStackScreenProps<RootStackParamList, "Community">;
const RAW_LANGUAGES = COMMUNITY_LANGUAGES.map((option) => ({
  id: option.value,
  label: option.nativeName,
  code: option.shortLabel,
}));

export function CommunityScreen({ navigation }: Props) {
  const { i18n, t } = useTranslation();
  const { colors } = useAppTheme();
  const { fontScale, width } = useWindowDimensions();
  const navigationContentInset = useNavigationContentInset(fontScale);
  const { columns } = useAdaptiveLayout();
  const { communityTranslationLanguage, setCommunityTranslationLanguage } =
    usePreferences();
  const targetLanguage =
    communityTranslationLanguage ??
    resolveCommunityLanguage(i18n.resolvedLanguage ?? i18n.language);

  const sortedLanguages = React.useMemo(() => {
    const allItem = { id: "all" as const, label: t("common.all"), code: "ALL" };
    const sorted = [...RAW_LANGUAGES].sort((a, b) =>
      a.label.localeCompare(b.label),
    );
    return [allItem, ...sorted];
  }, [t]);

  const [recipes, setRecipes] = useState<CommunityRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<
    RecipeLanguage | "all"
  >("all");
  const [minRating] = useState<number>(0);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<CommunityRecipeCursor | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const sourceRecipes = useRef(new Map<string, CommunityRecipe>());
  const loadRequest = useRef(0);
  const loadingMoreRef = useRef(false);
  const loadScope = JSON.stringify([
    selectedLanguage,
    targetLanguage,
    minRating,
  ]);
  const feedScope = JSON.stringify([
    selectedLanguage,
    minRating,
    "alphabetical",
  ]);
  const lastLoadedLang = useRef<string | null>(null);
  const refreshingRef = useRef(false);

  const loadData = useCallback(
    async (isRefresh = false) => {
      const request = ++loadRequest.current;
      const langChanged = lastLoadedLang.current !== loadScope;
      setLoading(langChanged && !getCachedCommunityFeed(feedScope));
      setRefreshing(isRefresh);
      refreshingRef.current = true;
      setLoadFailed(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
      const displayFeed = (feed: CommunityFeed) => {
        if (request !== loadRequest.current) return;
        sourceRecipes.current = new Map(
          feed.recipes.map((recipe) => [recipe.id, recipe]),
        );
        setRecipes(
          getCachedCommunityRecipePreviews(feed.recipes, targetLanguage),
        );
        setLastDoc(feed.lastDoc);
        setHasMore(feed.hasMore);
        lastLoadedLang.current = loadScope;
        setLoading(false);
      };
      const translatePreviews = (originals: CommunityRecipe[]) => {
        void translateCommunityRecipePreviews(originals, targetLanguage)
          .then((translated) => {
            if (request === loadRequest.current)
              setRecipes((current) => {
                const previews = new Map(
                  translated.map((recipe) => [recipe.id, recipe]),
                );
                return current.map(
                  (recipe) => previews.get(recipe.id) ?? recipe,
                );
              });
          })
          .catch((err: unknown) =>
            console.warn("community", "Preview translation failed", err),
          );
      };
      try {
        await Promise.all([hydrateCommunityCache(), hydrateTranslationCache()]);
        if (request !== loadRequest.current) return;
        const cached = getCachedCommunityFeed(feedScope);
        if (cached) displayFeed(cached);
        if (
          !isRefresh &&
          cached &&
          Date.now() - cached.fetchedAt < COMMUNITY_CACHE_TTL_MS
        ) {
          translatePreviews(cached.recipes);
          return;
        }
        const res = await fetchCommunityRecipes({
          language: selectedLanguage,
          minRating,
          sortBy: "alphabetical",
          pageSize: 24,
        });
        if (request !== loadRequest.current) return;
        const feed = { ...res, fetchedAt: Date.now() };
        cacheCommunityFeed(feedScope, feed);
        displayFeed(feed);
        translatePreviews(feed.recipes);
      } catch (err) {
        console.warn("community", "Failed to fetch community recipes", err);
        if (request === loadRequest.current) {
          setLoadFailed(true);
          translatePreviews([...sourceRecipes.current.values()]);
          if (lastLoadedLang.current !== loadScope) {
            sourceRecipes.current.clear();
            setRecipes([]);
            setHasMore(false);
          }
        }
      } finally {
        if (request === loadRequest.current) {
          lastLoadedLang.current = loadScope;
          setLoading(false);
          setRefreshing(false);
          refreshingRef.current = false;
        }
      }
    },
    [selectedLanguage, minRating, targetLanguage, loadScope, feedScope],
  );

  React.useEffect(() => {
    const requests = loadRequest;
    return () => {
      requests.current++;
    };
  }, [loadScope]);

  const loadMore = useCallback(async () => {
    if (
      loading ||
      loadingMoreRef.current ||
      refreshingRef.current ||
      !hasMore ||
      refreshing ||
      loadFailed ||
      lastLoadedLang.current !== loadScope
    )
      return;
    const request = loadRequest.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadFailed(false);
    try {
      const res = await fetchCommunityRecipes({
        language: selectedLanguage,
        minRating,
        sortBy: "alphabetical",
        pageSize: 24,
        after: lastDoc || undefined,
      });
      if (request !== loadRequest.current) return;
      res.recipes.forEach((recipe) =>
        sourceRecipes.current.set(recipe.id, recipe),
      );
      const originals = [...sourceRecipes.current.values()];
      cacheCommunityFeed(feedScope, {
        ...res,
        recipes: originals,
        fetchedAt: getCachedCommunityFeed(feedScope)?.fetchedAt ?? Date.now(),
      });
      const previews = getCachedCommunityRecipePreviews(
        res.recipes,
        targetLanguage,
      );
      setRecipes((prev) => [
        ...new Map(
          [...prev, ...previews].map((recipe) => [recipe.id, recipe]),
        ).values(),
      ]);
      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
      void translateCommunityRecipePreviews(res.recipes, targetLanguage)
        .then((translated) => {
          if (request === loadRequest.current)
            setRecipes((current) => {
              const previews = new Map(
                translated.map((recipe) => [recipe.id, recipe]),
              );
              return current.map((recipe) => previews.get(recipe.id) ?? recipe);
            });
        })
        .catch((err: unknown) =>
          console.warn("community", "Preview translation failed", err),
        );
    } catch (err) {
      console.warn("community", "Failed to fetch more community recipes", err);
      if (request === loadRequest.current) setLoadFailed(true);
    } finally {
      if (request === loadRequest.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [
    loading,
    hasMore,
    refreshing,
    loadFailed,
    selectedLanguage,
    minRating,
    lastDoc,
    targetLanguage,
    loadScope,
    feedScope,
  ]);

  React.useEffect(() => {
    if (searchQuery.trim()) void loadMore();
  }, [searchQuery, loadMore]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const filteredRecipes = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const matches = !q
      ? recipes
      : recipes.filter((r) => {
          const original = sourceRecipes.current.get(r.id);
          const titleMatch = Boolean(
            r.title && r.title.toLowerCase().includes(q),
          );
          const descMatch = Boolean(
            r.description && r.description.toLowerCase().includes(q),
          );
          const originalMatch = Boolean(
            original &&
              [original.title, original.description].some((text) =>
                text.toLowerCase().includes(q),
              ),
          );
          const authorMatch = Boolean(
            r.authorName && r.authorName.toLowerCase().includes(q),
          );
          const ingredientMatch =
            Array.isArray(r.ingredients) &&
            r.ingredients.some((ing) => String(ing).toLowerCase().includes(q));
          return (
            titleMatch ||
            descMatch ||
            originalMatch ||
            authorMatch ||
            ingredientMatch
          );
        });
    return matches;
  }, [recipes, searchQuery]);

  const renderRecipeItem = useCallback(
    ({ item }: { item: CommunityRecipe }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={markdownToPlainText(item.title)}
        onPress={() => navigation.navigate("CommunityDetail", { id: item.id })}
        style={({ pressed }) => [
          {
            opacity: pressed ? 0.82 : 1,
            flex: 1,
            maxWidth: columns > 1 ? "50%" : undefined,
          },
        ]}
      >
        <View
          style={[
            styles.card,
            {
              height: getRecipeCardHeight(fontScale),
              backgroundColor: colors.backgroundElevated,
            },
          ]}
        >
          <View style={styles.cardInner}>
            <View style={[styles.imageWrap, { backgroundColor: colors.chip }]}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.cardImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={item.id}
                />
              ) : (
                <AppText variant="subtitle" style={{ color: colors.primary }}>
                  {markdownToPlainText(item.title).slice(0, 1).toUpperCase()}
                </AppText>
              )}
            </View>
            <View style={styles.cardContent}>
              <AppText
                markdown
                variant="label"
                style={styles.cardTitle}
                numberOfLines={2}
              >
                {item.title}
              </AppText>
              {item.authorName ? (
                <AppText muted variant="caption" numberOfLines={1}>
                  {t("community.byAuthor", { author: item.authorName })}
                </AppText>
              ) : null}
              <View style={styles.cardFooter}>
                <StarRating
                  rating={item.avgRating}
                  size={14}
                  showCount
                  count={item.ratingCount}
                />
                <AppText muted variant="caption">
                  {sortedLanguages.find(
                    (language) => language.id === item.language,
                  )?.code ?? item.language?.toUpperCase()}
                </AppText>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    ),
    [navigation, colors, t, sortedLanguages, fontScale, columns],
  );

  return (
    <PageSwipeGesture
      onSwipeRight={() =>
        navigation.navigate("Planning", { section: "today", tabTransition: "slide_from_left" })
      }
      onSwipeLeft={() =>
        navigation.navigate("ShoppingList", {
          tabTransition: "slide_from_right",
        })
      }
    >
      <Screen
        scroll={false}
        contentWidth={1120}
        contentStyle={styles.container}
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
            <View style={styles.titleRow}>
              <AppText
                variant="title"
                style={styles.title}
                numberOfLines={fontScale > 1.3 ? undefined : 1}
                adjustsFontSizeToFit={fontScale <= 1.3}
              >
                {t("community.title")}
              </AppText>
            </View>
          </View>
          <View style={[styles.headerActions, { alignSelf: "flex-end" }]}>
            <LanguagePicker
              variant="minimal"
              value={targetLanguage}
              options={COMMUNITY_LANGUAGES}
              label={t("community.translationLanguage")}
              onChange={(value) => void setCommunityTranslationLanguage(value)}
            />
            <IconButton
              icon={Plus}
              label={t("community.submitRecipe")}
              onPress={() => setShowSelectModal(true)}
              tone="primary"
              style={styles.headerIcon}
            />
          </View>
        </View>

        <View style={styles.searchRow}>
          <SearchField
            placeholder={t("common.search")}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchField}
          />
        </View>

        <View style={styles.sourceFilter}>
          <AppText muted variant="caption">
            {t("ui.sourceLanguage")}
          </AppText>
          <LanguagePicker
            variant="compact"
            value={selectedLanguage}
            label={t("ui.sourceLanguage")}
            options={sortedLanguages.map((language) => ({
              value: language.id,
              nativeName:
                language.id === "all" ? t("ui.allLanguages") : language.label,
              shortLabel: language.code,
            }))}
            onChange={setSelectedLanguage}
          />
        </View>

        {loadFailed ? (
          <Pressable
            onPress={() => void loadData(true)}
            accessibilityRole="button"
            style={{ paddingHorizontal: spacing.md }}
          >
            <AppText muted>{t("community.loadFailed")}</AppText>
          </Pressable>
        ) : null}

        {loading || lastLoadedLang.current !== loadScope ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            key={`community-${columns}`}
            numColumns={columns}
            columnWrapperStyle={columns > 1 ? { gap: spacing.xs } : undefined}
            style={{ flex: 1 }}
            data={filteredRecipes}
            keyExtractor={(item) => item.id}
            renderItem={renderRecipeItem}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom: navigationContentInset,
              },
            ]}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews={false}
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={2}
            ListFooterComponent={
              <View style={styles.listFooter}>
                {loadingMore ? (
                  <ActivityIndicator color={colors.primary} />
                ) : null}
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadData(true)}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <AppText variant="subtitle" style={{ textAlign: "center" }}>
                  {t(
                    searchQuery.trim() || selectedLanguage !== "all"
                      ? "ui.noResults"
                      : "community.emptyTitle",
                  )}
                </AppText>
                <AppText muted style={styles.emptyBody}>
                  {t(
                    searchQuery.trim() || selectedLanguage !== "all"
                      ? "ui.noResultsBody"
                      : "community.emptyBody",
                  )}
                </AppText>
                <PrimaryButton
                  icon={Plus}
                  label={t(
                    searchQuery.trim() || selectedLanguage !== "all"
                      ? "common.clear"
                      : "community.submitFirst",
                  )}
                  onPress={() => {
                    if (searchQuery.trim() || selectedLanguage !== "all") {
                      setSearchQuery("");
                      setSelectedLanguage("all");
                    } else setShowSelectModal(true);
                  }}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            }
          />
        )}

        <SelectRecipeToShareModal
          visible={showSelectModal}
          onClose={() => setShowSelectModal(false)}
          onSuccess={() => {
            setShowSelectModal(false);
            void loadData(true);
          }}
        />
      </Screen>
    </PageSwipeGesture>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
    paddingBottom: 0,
    paddingHorizontal: 0,
    paddingTop: spacing.sm,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.xxs,
  },
  headerIcon: {
    height: 40,
    width: 40,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  title: {
    flex: 1,
    lineHeight: 36,
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  searchField: {
    flex: 1,
    minHeight: 48,
  },
  listContent: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: 0,
  },
  listFooter: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: radius.md,
    borderWidth: 0,
    overflow: "hidden",
    padding: spacing.sm,
    minHeight: 132,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  cardContent: {
    flex: 1,
    gap: spacing.xs,
    justifyContent: "space-between",
    minWidth: 0,
  },
  sourceFilter: {
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  cardTitle: { fontSize: 17, lineHeight: 22 },
  imageWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.sm,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  cardImage: { width: "100%", height: "100%" },
  cardFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    textAlign: "center",
  },
  emptyBody: {
    textAlign: "center",
    marginTop: spacing.xs,
  },
});
