import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  BookOpen,
  LayoutTemplate,
  Settings,
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react-native";
import { Image } from "expo-image";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import { useOnboarding } from "../features/onboarding/useOnboarding";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Update">;

export function UpdateScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { markUpdateSeen } = useOnboarding();

  const logo = isDark
    ? require("../../assets/logo-dark.png")
    : require("../../assets/logo.png");

  async function handleContinue() {
    await markUpdateSeen();
    navigation.replace("Recipes");
  }

  return (
    <View style={[styles.page, { paddingTop: Math.max(insets.top, spacing.xl), paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
      <View style={{ flex: 1, justifyContent: "center" }}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image
            accessible={false}
            source={logo}
            style={styles.logo}
            contentFit="contain"
          />
          <AppText variant="title" style={styles.center}>
            {t("update.title", "Quoi de neuf ?")}
          </AppText>
          <AppText muted style={styles.center}>
            {t("update.subtitle", "Découvrez les nouveautés de la version 3.2.0")}
          </AppText>
        </View>

        {/* Features list */}
        <View style={styles.featuresColumn}>
          <GlassPanel style={styles.featureCardHorizontal}>
            <View style={[styles.featureIconCircle, { backgroundColor: colors.chip }]}>
              <BookOpen color={colors.primary} size={24} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">{t("update.feat1Title", "Nouveaux tutoriels & écrans d'accueil")}</AppText>
              <AppText muted variant="caption">
                {t("update.feat1Body", "Un accueil repensé et des guides détaillés pour mieux découvrir l'application.")}
              </AppText>
            </View>
          </GlassPanel>

          <GlassPanel style={styles.featureCardHorizontal}>
            <View style={[styles.featureIconCircle, { backgroundColor: colors.chip }]}>
              <LayoutTemplate color={colors.primary} size={24} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">{t("update.feat2Title", "Nouvel écran d'import")}</AppText>
              <AppText muted variant="caption">
                {t("update.feat2Body", "Plus clair et plus aéré avec des sections distinctes pour scanner une recette.")}
              </AppText>
            </View>
          </GlassPanel>

          <GlassPanel style={styles.featureCardHorizontal}>
            <View style={[styles.featureIconCircle, { backgroundColor: colors.chip }]}>
              <Settings color={colors.primary} size={24} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">{t("update.feat3Title", "Nouveaux réglages")}</AppText>
              <AppText muted variant="caption">
                {t("update.feat3Body", "Un écran de réglages repensé en grandes sections claires.")}
              </AppText>
            </View>
          </GlassPanel>

          <GlassPanel style={styles.featureCardHorizontal}>
            <View style={[styles.featureIconCircle, { backgroundColor: colors.chip }]}>
              <SlidersHorizontal color={colors.primary} size={24} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">{t("update.feat4Title", "Nouvelles options & améliorations")}</AppText>
              <AppText muted variant="caption">
                {t("update.feat4Body", "Possibilité de cacher les catégories par défaut, meilleure gestion des copiés-collés, et divers correctifs.")}
              </AppText>
            </View>
          </GlassPanel>
        </View>
      </View>

      {/* CTA */}
      <View style={styles.pageActions}>
        <PrimaryButton
          icon={ArrowRight}
          label={t("update.continue", "Continuer vers mes recettes")}
          onPress={() => void handleContinue()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  logo: {
    height: 72,
    width: 72,
  },
  center: {
    textAlign: "center",
  },
  featuresColumn: {
    flexDirection: "column",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  featureCardHorizontal: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  featureIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  pageActions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
