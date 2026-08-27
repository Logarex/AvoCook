import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
  Image,
  Linking
} from "react-native";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Flag, Star, Clock, Globe, Users, Mail, Link as LinkIcon } from "lucide-react-native";

import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StarRating } from "../components/StarRating";
import {
  getCommunityRecipe,
  voteOnRecipe,
  reportCommunityRecipe,
  type CommunityRecipe
} from "../features/community/communityClient";
import { useRecipes } from "../features/recipes/RecipesProvider";
import { normalizeRecipe } from "../features/recipes/types";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "CommunityDetail">;

export function CommunityDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { createRecipe } = useRecipes();

  const [recipe, setRecipe] = useState<CommunityRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<number>(0);
  const [voting, setVoting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      const data = await getCommunityRecipe(route.params.id);
      if (active) {
        setRecipe(data);
        if (data?.userVote) setUserVote(data.userVote);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [route.params.id]);

  const handleVote = async (stars: number) => {
    if (!recipe) return;
    setVoting(true);
    try {
      await voteOnRecipe(recipe.id, stars);
      setUserVote(stars);
      // Reload recipe to update average
      const updated = await getCommunityRecipe(recipe.id);
      if (updated) setRecipe(updated);
    } catch {
      Alert.alert(t("community.voteFailedTitle"), t("community.voteFailedBody"));
    } finally {
      setVoting(false);
    }
  };

  const handleImport = async () => {
    if (!recipe) return;
    setImporting(true);
    try {
      const localRecipe = normalizeRecipe({
        name: recipe.title,
        description: recipe.description,
        recipeCategory: "Communauté",
        recipeIngredient: recipe.ingredients,
        recipeInstructions: recipe.steps,
        keywords: `communauté, ${recipe.language}`,
        sourceName: recipe.authorName || "Communauté AvoCook"
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

  const handleReport = () => {
    Alert.alert(
      t("community.reportTitle"),
      t("community.reportConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("community.reportAction"),
          style: "destructive",
          onPress: async () => {
            if (recipe) await reportCommunityRecipe(recipe.id);
            Alert.alert(t("community.reportedTitle"), t("community.reportedBody"));
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleProposeChange = () => {
    if (!recipe) return;
    const subject = `Proposition de modification - Recette: ${recipe.title}`;
    const body = `Bonjour,\n\nJe souhaite proposer une modification pour la recette communautaire "${recipe.title}" (ID: ${recipe.id}).\n\nVoici ce que je suggère de modifier :\n\n`;
    const url = `mailto:avocook@nephoos.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    void Linking.openURL(url).catch(() => {
      Alert.alert(
        t("support.emailFailedTitle", "Aucune application d'e-mail trouvée"),
        t("support.emailFailedBody", "Nous n'avons pas pu ouvrir d'application d'e-mail. Vous pouvez nous écrire à avocook@nephoos.com")
      );
    });
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (!recipe) {
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
      {/* Header bar */}
      <View style={styles.header}>
        <IconButton
          icon={ArrowLeft}
          label={t("common.back")}
          onPress={() => navigation.goBack()}
        />
        <IconButton
          icon={Flag}
          label={t("community.reportAction")}
          onPress={handleReport}
          tone="danger"
        />
      </View>

      {/* Hero Title */}
      <GlassPanel style={styles.hero}>
        <AppText variant="title">{recipe.title}</AppText>
        {recipe.description ? (
          <AppText muted style={styles.desc}>
            {recipe.description}
          </AppText>
        ) : null}
        {recipe.authorName ? (
          <AppText muted variant="caption">
            {t("community.byAuthor", { author: recipe.authorName })}
          </AppText>
        ) : null}
      </GlassPanel>

      {recipe.imageUrl ? (
        <Image
          source={{ uri: recipe.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : null}

      <View style={styles.metricsRow}>
        {recipe.prepTime ? (
           <Metric icon={Clock} label={t("recipes.prepTime")} value={recipe.prepTime} />
        ) : null}
        {recipe.cookTime ? (
           <Metric icon={Clock} label={t("recipes.cookTime")} value={recipe.cookTime} />
        ) : null}
        {recipe.servings ? (
           <Metric icon={Users} label={t("recipes.servings.title")} value={`${recipe.servings}`} />
        ) : null}
      </View>

      {/* Vote section */}
      <GlassPanel style={styles.votePanel}>
        <AppText variant="label">{t("community.rateThisRecipe")}</AppText>
        <StarRating
          rating={userVote || recipe.avgRating}
          interactive
          size={28}
          onRatingChange={(stars) => void handleVote(stars)}
        />
        <AppText muted variant="caption">
          {recipe.avgRating.toFixed(1)} / 5 ({t("community.voteCount", { count: recipe.ratingCount })})
        </AppText>
      </GlassPanel>

      {/* Import to my recipes CTA */}
      <PrimaryButton
        icon={Download}
        label={t("community.importToMyRecipes")}
        onPress={() => void handleImport()}
        disabled={importing}
        style={styles.importBtn}
      />

      {/* Ingredients */}
      <GlassPanel style={styles.section}>
        <AppText variant="subtitle">{t("editor.ingredients")}</AppText>
        {recipe.ingredients.map((ing, idx) => (
          <View key={idx} style={styles.lineRow}>
            <AppText style={styles.bullet}>•</AppText>
            <AppText style={styles.lineText}>{ing}</AppText>
          </View>
        ))}
      </GlassPanel>

      {/* Instructions */}
      <GlassPanel style={styles.section}>
        <AppText variant="subtitle">{t("editor.instructions")}</AppText>
        {recipe.steps.map((step, idx) => (
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

      {recipe.sourceUrl ? (
        <PrimaryButton
          icon={LinkIcon}
          label={t("recipes.sourceLink", { defaultValue: "Lien source" })}
          onPress={() => void Linking.openURL(recipe.sourceUrl!)}
          variant="secondary"
          style={styles.actionBtn}
        />
      ) : null}

      <PrimaryButton
        icon={Mail}
        label={t("community.proposeChange", { defaultValue: "Proposer une modification" })}
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
  hero: {
    gap: spacing.xs,
    padding: spacing.lg
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
  image: {
    width: "100%",
    height: 240,
    borderRadius: radius.md,
    backgroundColor: "rgba(0,0,0,0.05)"
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
