import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowRight,
  ShieldCheck,
  Plug,
  Wrench,
  Sparkles,
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
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Update">;

// Background color matching the dark logo artwork
const DARK_BG = "#0D2B26";

export function UpdateScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { markUpdateSeen } = useOnboarding();

  const logo = isDark
    ? require("../../assets/logo-dark.png")
    : require("../../assets/logo.png");

  const backgroundColor = isDark ? DARK_BG : colors.background;

  async function handleContinue() {
    await markUpdateSeen();
    navigation.replace("Recipes");
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor,
          paddingTop: Math.max(insets.top, spacing.lg),
          paddingBottom: Math.max(insets.bottom, spacing.lg),
        },
      ]}
    >
      {/* Scrollable content — only scrolls on very small screens */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image
            accessible={false}
            source={logo}
            style={styles.logo}
            contentFit="contain"
          />
          <AppText variant="title" style={styles.center}>
            {t("update.title")}
          </AppText>
          <AppText muted style={styles.center}>
            {t("update.subtitle")}
          </AppText>
        </View>

        {/* Feature cards */}
        <View style={styles.featuresColumn}>
          <GlassPanel style={styles.featureCardHorizontal}>
            <View style={[styles.featureIconCircle, { backgroundColor: colors.chip }]}>
              <ShieldCheck color={colors.primary} size={22} />
            </View>
            <View style={styles.featureText}>
              <AppText variant="label">{t("update.feat1Title")}</AppText>
              <AppText muted variant="caption">
                {t("update.feat1Body")}
              </AppText>
            </View>
          </GlassPanel>

          <GlassPanel style={styles.featureCardHorizontal}>
            <View style={[styles.featureIconCircle, { backgroundColor: colors.chip }]}>
              <Plug color={colors.primary} size={22} />
            </View>
            <View style={styles.featureText}>
              <AppText variant="label">{t("update.feat2Title")}</AppText>
              <AppText muted variant="caption">
                {t("update.feat2Body")}
              </AppText>
            </View>
          </GlassPanel>

          <GlassPanel style={styles.featureCardHorizontal}>
            <View style={[styles.featureIconCircle, { backgroundColor: colors.chip }]}>
              <Sparkles color={colors.primary} size={22} />
            </View>
            <View style={styles.featureText}>
              <AppText variant="label">{t("update.feat3Title")}</AppText>
              <AppText muted variant="caption">
                {t("update.feat3Body")}
              </AppText>
            </View>
          </GlassPanel>

          <GlassPanel style={styles.featureCardHorizontal}>
            <View style={[styles.featureIconCircle, { backgroundColor: colors.chip }]}>
              <Wrench color={colors.primary} size={22} />
            </View>
            <View style={styles.featureText}>
              <AppText variant="label">{t("update.feat4Title")}</AppText>
              <AppText muted variant="caption">
                {t("update.feat4Body")}
              </AppText>
            </View>
          </GlassPanel>
        </View>
      </ScrollView>

      {/* CTA — always visible, pinned at bottom */}
      <View style={[styles.pageActions, { paddingHorizontal: spacing.xl }]}>
        <PrimaryButton
          icon={ArrowRight}
          label={t("update.continue")}
          onPress={() => void handleContinue()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  hero: {
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  logo: {
    height: 64,
    width: 64,
    marginBottom: spacing.xxs,
  },
  center: {
    textAlign: "center",
  },
  featuresColumn: {
    flexDirection: "column",
    gap: spacing.sm,
  },
  featureCardHorizontal: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  featureIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  pageActions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
