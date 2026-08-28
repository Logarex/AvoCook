import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Globe, Plus } from "lucide-react-native";

import { AppText } from "../components/AppText";
import { BottomNavigation } from "../components/BottomNavigation";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StarRating } from "../components/StarRating";
import { SearchField } from "../components/SearchField";
import { PageSwipeGesture } from "../components/PageSwipeGesture";
import {
  fetchCommunityRecipes,
  type CommunityRecipe,
  type RecipeLanguage
} from "../features/community/communityClient";
import { SelectRecipeToShareModal } from "./SelectRecipeToShareModal";
import type { RootStackParamList } from "../navigation/types";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Community">;

const LANGUAGES: { id: RecipeLanguage | "all"; label: string; code: string }[] = [
  { id: "all", label: "Tous", code: "ALL" },
  { id: "fr", label: "Français", code: "FR" },
  { id: "de", label: "Deutsch", code: "DE" },
  { id: "en", label: "English", code: "EN" },
  { id: "es", label: "Español", code: "ES" },
  { id: "it", label: "Italiano", code: "IT" },
  { id: "da", label: "Dansk", code: "DA" }
];

export function CommunityScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const [recipes, setRecipes] = useState<CommunityRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<RecipeLanguage | "all">("all");
  const [minRating] = useState<number>(0);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  
  // Search cache to optimize full-text search without heavy operations
  const [searchCache, setSearchCache] = useState<CommunityRecipe[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Clear search cache when filters change
  React.useEffect(() => {
    setSearchCache(null);
  }, [selectedLanguage, minRating]);

  // Load search cache when user starts typing
  React.useEffect(() => {
    if (searchQuery.trim().length > 0 && searchCache === null && !isSearching) {
      const loadSearchCache = async () => {
        setIsSearching(true);
        try {
          const res = await fetchCommunityRecipes({
            language: selectedLanguage,
            minRating,
            sortBy: "alphabetical",
            pageSize: 200 // Fetch a large batch once for local search
          });
          setSearchCache(res.recipes);
        } catch (err) {
          console.warn("community", "Failed to fetch search cache", err);
        } finally {
          setIsSearching(false);
        }
      };
      void loadSearchCache();
    }
  }, [searchQuery, searchCache, isSearching, selectedLanguage, minRating]);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await fetchCommunityRecipes({
          language: selectedLanguage,
          minRating,
          sortBy: "alphabetical",
          pageSize: 20
        });
        setRecipes(res.recipes);
        setLastDoc(res.lastDoc);
        setHasMore(res.hasMore);
      } catch (err) {
        console.warn("community", "Failed to fetch community recipes", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedLanguage, minRating]
  );

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || refreshing) return;
    setLoadingMore(true);
    try {
      const res = await fetchCommunityRecipes({
        language: selectedLanguage,
        minRating,
        sortBy: "alphabetical",
        pageSize: 20,
        after: lastDoc || undefined
      });
      setRecipes((prev) => [...prev, ...res.recipes]);
      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
    } catch (err) {
      console.warn("community", "Failed to fetch more community recipes", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, refreshing, selectedLanguage, minRating, lastDoc]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const filteredRecipes = React.useMemo(() => {
    const source = searchQuery.trim() ? (searchCache || recipes) : recipes;
    return source.filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.authorName.toLowerCase().includes(q)
      );
    });
  }, [recipes, searchCache, searchQuery]);

  const renderRecipeItem = useCallback(({ item }: { item: CommunityRecipe }) => (
    <Pressable
      onPress={() => navigation.navigate("CommunityDetail", { id: item.id })}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <GlassPanel style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <AppText variant="label" numberOfLines={1} adjustsFontSizeToFit={false}>
              {item.title}
            </AppText>
            {item.authorName ? (
              <AppText muted variant="caption" numberOfLines={1} adjustsFontSizeToFit={false}>
                {t("community.byAuthor", { author: item.authorName })}
              </AppText>
            ) : null}
          </View>
          <View style={[styles.langChip, { backgroundColor: colors.chip }]}>
            <AppText variant="caption" style={{ fontWeight: "600" }}>
              {LANGUAGES.find((l) => l.id === item.language)?.code || "ALL"}
            </AppText>
          </View>
        </View>

        {item.description ? (
          <AppText muted variant="caption" numberOfLines={2} style={styles.desc}>
            {item.description}
          </AppText>
        ) : null}

        <View style={styles.cardFooter}>
          <StarRating
            rating={item.avgRating}
            size={16}
            showCount
            count={item.ratingCount}
          />
          <AppText variant="caption" muted>
            {item.ingredients.length} {t("editor.ingredients").toLowerCase()}
          </AppText>
        </View>
      </GlassPanel>
    </Pressable>
  ), [navigation, colors, t]);

  return (
    <PageSwipeGesture
      onSwipeRight={() => navigation.navigate("Recipes", { tabTransition: "slide_from_left" })}
      onSwipeLeft={() => navigation.navigate("ShoppingList", { tabTransition: "slide_from_right" })}
    >
      <Screen scroll={false} contentStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <Globe color={colors.primary} size={25} strokeWidth={2.5} />
              <AppText variant="title" style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
                {t("community.title")}
              </AppText>
            </View>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon={Plus}
              label={t("community.submitRecipe")}
              onPress={() => setShowSelectModal(true)}
              tone="primary"
              style={styles.headerIcon}
            />
          </View>
        </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <SearchField
          placeholder={t("common.search")}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchField}
        />
      </View>

      {/* Language filter pills */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={LANGUAGES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.filterList}
        style={{ flexGrow: 0 }}
        renderItem={({ item }) => {
          const active = selectedLanguage === item.id;
          return (
            <Pressable
              onPress={() => setSelectedLanguage(item.id)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : colors.surfaceGlass,
                  borderColor: active ? colors.primary : colors.border
                }
              ]}
            >
              <AppText
                variant="caption"
                style={{
                  color: active ? colors.textInverted : colors.text,
                  fontWeight: active ? "600" : "normal"
                }}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        }}
      />

      {/* Recipe list */}
      {loading || (searchQuery.trim().length > 0 && isSearching) ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          renderItem={renderRecipeItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ padding: spacing.md, alignItems: "center" }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
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
              <AppText variant="subtitle" style={{ textAlign: "center" }}>{t("community.emptyTitle")}</AppText>
              <AppText muted style={styles.emptyBody}>
                {t("community.emptyBody")}
              </AppText>
              <PrimaryButton
                icon={Plus}
                label={t("community.submitFirst")}
                onPress={() => setShowSelectModal(true)}
                style={{ marginTop: spacing.md }}
              />
            </View>
          }
        />
      )}

      {/* Bottom navigation */}
      <BottomNavigation
        current="community"
        onNavigate={(tab) => {
          if (tab === "recipes") navigation.navigate("Recipes", { tabTransition: "slide_from_left" });
          if (tab === "shoppingList") navigation.navigate("ShoppingList", { tabTransition: "slide_from_right" });
        }}
      />

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
    paddingTop: spacing.sm
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingHorizontal: spacing.md
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.xxs
  },
  headerIcon: {
    height: 40,
    width: 40
  },
  titleBlock: {
    flex: 1,
    minWidth: 0
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  title: {
    flex: 1,
    lineHeight: 36
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md
  },
  searchField: {
    flex: 1,
    minHeight: 48
  },
  filterList: {
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  filterChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  listContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: 0
  },
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    height: 116,
    justifyContent: "space-between"
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  cardTitleWrap: {
    flex: 1,
    gap: 2
  },
  langChip: {
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  desc: {
    lineHeight: 18
  },
  cardFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    textAlign: "center"
  },
  emptyBody: {
    textAlign: "center",
    marginTop: spacing.xs
  }
});
