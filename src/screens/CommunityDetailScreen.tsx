import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
  Linking
} from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Flag, Clock, Users, Mail, Link as LinkIcon, HeartPulse, Trash2, Languages } from "lucide-react-native";

import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StarRating } from "../components/StarRating";
import { LanguagePicker } from "../components/LanguagePicker";
import {
  getCommunityRecipe,
  deleteCommunityRecipe,
  voteOnRecipe,
  reportCommunityRecipe,
  type CommunityRecipe
} from "../features/community/communityClient";
import { translateCommunityRecipe } from "../features/community/communityTranslation";
import { COMMUNITY_LANGUAGES, resolveCommunityLanguage } from "../features/community/communityLanguages";
import { getCachedCommunityRecipe, hydrateCommunityCache } from "../features/community/communityCache";
import { usePreferences } from "../features/preferences/PreferencesProvider";
import { getAnonymousUid, waitForAuth } from "../features/firebase/firebaseClient";
import { useRecipes } from "../features/recipes/RecipesProvider";
import { normalizeRecipe } from "../features/recipes/types";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { humanDuration } from "../utils/duration";

type Props = NativeStackScreenProps<RootStackParamList, "CommunityDetail">;

export function CommunityDetailScreen({ navigation, route }: Props) {
  const { i18n, t } = useTranslation();
  const { colors } = useAppTheme();
  const { createRecipe, recipes } = useRecipes();
  const { communityTranslationLanguage, setCommunityTranslationLanguage } = usePreferences();

  const [recipe, setRecipe] = useState<CommunityRecipe | null>(() => getCachedCommunityRecipe(route.params.id) ?? null);
  const [loading, setLoading] = useState(() => !getCachedCommunityRecipe(route.params.id));
  const [userVote, setUserVote] = useState<number>(0);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(getAnonymousUid());

  const [translation, setTranslation] = useState<{
    source: CommunityRecipe;
    target: string;
    value: CommunityRecipe | null;
    failed: boolean;
  } | null>(null);
  const translationRequest = useRef(0);
  const [originalView, setOriginalView] = useState<string | null>(null);
  const targetLang = communityTranslationLanguage ?? resolveCommunityLanguage(i18n.resolvedLanguage ?? i18n.language);
  const viewScope = JSON.stringify([route.params.id, targetLang]);
  const showOriginal = originalView === viewScope;
  const currentTranslation = translation?.source === recipe && translation?.target === targetLang ? translation : null;
  const isDifferentLang = Boolean(recipe && resolveCommunityLanguage(recipe.language) !== targetLang);
  const isTranslating = isDifferentLang && !currentTranslation?.value && !currentTranslation?.failed;
  const showTranslated = !showOriginal && Boolean(currentTranslation?.value);
  const activeRecipe = showTranslated ? currentTranslation!.value : recipe;

  const isAuthor = Boolean(
    recipe?.authorUid && currentUid && recipe.authorUid === currentUid
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      const initial = getCachedCommunityRecipe(route.params.id) ?? null;
      setLoading(!initial);
      setRecipe(initial);
      setUserVote(0);
      try {
        await hydrateCommunityCache();
        const cached = getCachedCommunityRecipe(route.params.id);
        if (active && cached) {
          setRecipe(cached);
          setLoading(false);
        }
        const user = await waitForAuth();
        if (active && user?.uid) setCurrentUid(user.uid);
        const data = await getCommunityRecipe(route.params.id);
        if (active) {
          setRecipe(data);
          setUserVote(data?.userVote ?? 0);
        }
      } catch (err) {
        console.warn("community", "Failed to fetch community recipe", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [route.params.id]);

  const requestTranslation = useCallback(async () => {
    if (!recipe || recipe.id !== route.params.id || resolveCommunityLanguage(recipe.language) === targetLang) return;
    const request = ++translationRequest.current;
    setTranslation({ source: recipe, target: targetLang, value: null, failed: false });
    try {
      const value = await translateCommunityRecipe(recipe, targetLang);
      if (request === translationRequest.current) {
        setTranslation({ source: recipe, target: targetLang, value, failed: false });
      }
    } catch (err) {
      console.warn("community", "Translation failed", err);
      if (request === translationRequest.current) {
        setTranslation({ source: recipe, target: targetLang, value: null, failed: true });
      }
    }
  }, [recipe, targetLang, route.params.id]);

  useEffect(() => {
    void requestTranslation();
    const requests = translationRequest;
    return () => { requests.current++; };
  }, [requestTranslation]);

  const handleVote = async (stars: number) => {
    if (!recipe) return;
    try {
      await voteOnRecipe(recipe.id, stars);
      setUserVote(stars);
      const updated = await getCommunityRecipe(recipe.id);
      if (updated) setRecipe(updated);
    } catch {
      Alert.alert(t("community.voteFailedTitle"), t("community.voteFailedBody"));
    }
  };

  const handleToggleTranslate = () => {
    if (showTranslated) {
      setOriginalView(viewScope);
      return;
    }
    setOriginalView(null);
    if (!currentTranslation?.value) void requestTranslation();
  };

  const handleImport = async () => {
    if (!activeRecipe) return;

    const titleNorm = activeRecipe.title.trim().toLowerCase();
    const alreadyExists = recipes.some(
      (r) => r.name.trim().toLowerCase() === titleNorm
    );
    if (alreadyExists) {
      Alert.alert(
        t("common.error"),
        t("community.importDuplicateError")
      );
      return;
    }

    setImporting(true);
    try {
      const localRecipe = normalizeRecipe({
        name: activeRecipe.title,
        description: activeRecipe.description,
        recipeCategory: t("community.importCategoryLabel"),
        recipeIngredient: activeRecipe.ingredients,
        recipeInstructions: activeRecipe.steps,
        keywords: `${t("community.importKeyword")}, ${activeRecipe.language}`,
        sourceName: activeRecipe.authorName || t("community.anonymousAuthor"),
        image: activeRecipe.imageUrl || "",
        imageUrl: activeRecipe.imageUrl || ""
      });
      await createRecipe(localRecipe);
      Alert.alert(
        t("community.importSuccessTitle"),
        t("community.importSuccessBody"),
        [
          {
            text: t("community.viewMyRecipes"),
            onPress: () => navigation.navigate("Recipes")
          },
          { text: t("common.continue"), style: "cancel" }
        ]
      );
    } catch (err) {
      console.warn("community", "Import failed", err);
      Alert.alert(t("common.error"), t("community.importFailedBody"));
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = () => {
    if (!recipe || !currentUid) return;
    Alert.alert(
      t("community.deleteTitle"),
      t("community.deleteConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            setDeleting(true);
            void deleteCommunityRecipe(recipe.id, currentUid)
              .then(() => {
                Alert.alert(t("community.deletedTitle"), t("community.deletedBody"));
                navigation.goBack();
              })
              .catch((err) => {
                console.warn("community", "Delete failed", err);
                Alert.alert(t("common.error"), t("community.deleteFailedBody"));
              })
              .finally(() => setDeleting(false));
          }
        }
      ]
    );
  };

  const handleReport = () => {
    Alert.alert(
      t("community.reportTitle"),
      t("community.reportConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("community.reportAction"),
          style: "destructive",
          onPress: () => {
            if (recipe) void reportCommunityRecipe(recipe.id);
            Alert.alert(t("community.reportedTitle"), t("community.reportedBody"));
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleProposeChange = () => {
    if (!recipe) return;
    const subject = t("community.recipeChangeSubject", { title: recipe.title });
    const body = t("community.recipeChangeBody", { title: recipe.title, id: recipe.id });
    const url = `mailto:avocook@nephoos.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    void Linking.openURL(url).catch(() => {
      Alert.alert(
        t("support.emailFailedTitle"),
        t("support.emailFailedBody")
      );
    });
  };

  if (loading || (recipe && recipe.id !== route.params.id) || (isTranslating && !showOriginal)) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          {isTranslating ? <AppText muted>{t("community.translating")}</AppText> : null}
        </View>
      </Screen>
    );
  }

  if (!recipe || !activeRecipe) {
    return (
      <Screen>
        <IconButton
          icon={ArrowLeft}
          label={t("common.back")}
          onPress={() => navigation.goBack()}
        />
        <AppText variant="subtitle">{t("community.notFoundTitle")}</AppText>
      </Screen>
    );
  }

  return (
    <Screen showScrollTop={false}>
      <View style={styles.header}>
        <IconButton
          icon={ArrowLeft}
          label={t("common.back")}
          onPress={() => navigation.goBack()}
        />
        <View style={styles.headerActions}>
          {isAuthor ? (
            <IconButton
              icon={Trash2}
              label={t("community.deleteTitle")}
              onPress={handleDelete}
              disabled={deleting}
              tone="danger"
            />
          ) : null}
          <IconButton
            icon={Flag}
            label={t("community.reportAction")}
            onPress={handleReport}
            tone="danger"
          />
        </View>
      </View>

      <GlassPanel style={styles.hero}>
        <AppText variant="title">{activeRecipe.title}</AppText>
        {activeRecipe.description ? (
          <AppText muted style={styles.desc}>
            {activeRecipe.description}
          </AppText>
        ) : null}
        {activeRecipe.authorName ? (
          <AppText muted variant="caption">
            {t("community.byAuthor", { author: activeRecipe.authorName })}
          </AppText>
        ) : null}
        {showTranslated ? (
          <View style={[styles.translatedBadge, { backgroundColor: colors.chip }]}>
            <Languages color={colors.primary} size={14} />
            <AppText variant="caption" style={{ color: colors.primary, fontWeight: "600" }}>
              {t("community.translatedNotice", { defaultValue: "Traduit automatiquement" })}
            </AppText>
          </View>
        ) : null}
      </GlassPanel>

      <LanguagePicker
        value={targetLang}
        options={COMMUNITY_LANGUAGES}
        label={t("community.translationLanguage")}
        onChange={(value) => void setCommunityTranslationLanguage(value)}
      />

      {isDifferentLang ? (
        <PrimaryButton
          icon={Languages}
          label={
            isTranslating
              ? t("community.translating")
              : showTranslated
                ? t("community.showOriginal")
                : t("community.translateRecipe")
          }
          disabled={isTranslating}
          onPress={handleToggleTranslate}
          variant="secondary"
          style={styles.actionBtn}
        />
      ) : null}

      {currentTranslation?.failed ? (
        <AppText muted>{t("community.translationFailed")}</AppText>
      ) : null}

      {activeRecipe.imageUrl ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: activeRecipe.imageUrl }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </View>
      ) : null}

      <View style={styles.metricsRow}>
        {activeRecipe.prepTime ? (
           <Metric icon={Clock} label={t("recipes.prepTime")} value={humanDuration(activeRecipe.prepTime) || activeRecipe.prepTime} />
        ) : null}
        {activeRecipe.cookTime ? (
           <Metric icon={Clock} label={t("recipes.cookTime")} value={humanDuration(activeRecipe.cookTime) || activeRecipe.cookTime} />
        ) : null}
        {activeRecipe.servings ? (
           <Metric icon={Users} label={t("recipes.servings.title")} value={`${activeRecipe.servings}`} />
        ) : null}
        {activeRecipe.nutriScore ? (
           <Metric icon={HeartPulse} label={t("recipes.health.nutriScore", { defaultValue: "Nutri-Score" })} value={activeRecipe.nutriScore} />
        ) : null}
      </View>

      <GlassPanel style={styles.votePanel}>
        <AppText variant="label">{t("community.rateThisRecipe")}</AppText>
        <StarRating
          rating={userVote || activeRecipe.avgRating}
          interactive
          size={28}
          onRatingChange={(stars) => void handleVote(stars)}
        />
        <AppText muted variant="caption">
          {activeRecipe.avgRating.toFixed(1)} / 5 ({t("community.voteCount", { count: activeRecipe.ratingCount })})
        </AppText>
      </GlassPanel>

      <PrimaryButton
        icon={Download}
        label={t("community.importToMyRecipes")}
        onPress={() => void handleImport()}
        disabled={importing}
        style={styles.importBtn}
      />

      <GlassPanel style={styles.section}>
        <AppText variant="subtitle">{t("editor.ingredients")}</AppText>
        {activeRecipe.ingredients.map((ing, idx) => (
          <View key={idx} style={styles.lineRow}>
            <AppText style={styles.bullet}>•</AppText>
            <AppText style={styles.lineText}>{ing}</AppText>
          </View>
        ))}
      </GlassPanel>

      <GlassPanel style={styles.section}>
        <AppText variant="subtitle">{t("editor.instructions")}</AppText>
        {activeRecipe.steps.map((step, idx) => (
          <View key={idx} style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: colors.chip }]}>
              <AppText variant="caption" style={{ fontWeight: "bold" }}>
                {idx + 1}
              </AppText>
            </View>
            <AppText style={styles.lineText}>{step}</AppText>
          </View>
        ))}
      </GlassPanel>

      {activeRecipe.sourceUrl ? (
        <PrimaryButton
          icon={LinkIcon}
          label={t("recipes.sourceLink", { defaultValue: "Lien source" })}
          onPress={() => void Linking.openURL(activeRecipe.sourceUrl!)}
          variant="secondary"
          style={styles.actionBtn}
        />
      ) : null}

      <PrimaryButton
        icon={Mail}
        label={t("community.proposeChange")}
        onPress={handleProposeChange}
        variant="ghost"
        style={styles.actionBtn}
      />
    </Screen>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <GlassPanel style={styles.metric}>
      <Icon color={colors.primary} size={19} />
      <AppText muted variant="caption">{label}</AppText>
      <AppText variant="label">{value}</AppText>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.xs
  },
  hero: {
    gap: spacing.xs,
    padding: spacing.lg
  },
  translatedBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.xxs,
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4
  },
  desc: {
    lineHeight: 20
  },
  votePanel: {
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.md
  },
  importBtn: {
    marginVertical: spacing.xs
  },
  actionBtn: {
    marginBottom: spacing.xs
  },
  imageContainer: {
    width: "100%",
    height: 240,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.05)",
    marginVertical: spacing.xs
  },
  image: {
    width: "100%",
    height: "100%"
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metric: {
    flex: 1,
    minWidth: 90,
    alignItems: "center",
    padding: spacing.sm,
    gap: spacing.xs
  },
  section: {
    gap: spacing.sm,
    padding: spacing.md
  },
  lineRow: {
    flexDirection: "row",
    gap: spacing.xs
  },
  bullet: {
    fontSize: 16,
    fontWeight: "bold"
  },
  lineText: {
    flex: 1,
    lineHeight: 20
  },
  stepRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start"
  },
  stepNum: {
    borderRadius: radius.pill,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center"
  }
});
