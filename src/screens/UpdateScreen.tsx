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
import { StyleSheet, View } from "react-native";
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
            {t("update.title")}
          </AppText>
          <AppText muted style={styles.center}>
            {t("update.subtitle")}
          </AppText>
        </View>

        {/* Features list */}
        <View style={styles.featuresColumn}>
          <GlassPanel style={styles.featureCardHorizontal}>
            <View style={[styles.featureIconCircle, { backgroundColor: colors.chip }]}>
              <ShieldCheck color={colors.primary} size={24} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">{t("update.feat1Title")}</AppText>
              <AppText muted variant="caption">
                {t("update.feat1Body")}
              </AppText>
            </View>
          </GlassPanel>

          <GlassPanel style={styles.featureCardHorizontal}>
            <View style={[styles.featureIconCircle, { backgroundColor: colors.chip }]}>
              <Plug color={colors.primary} size={24} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">{t("update.feat2Title")}</AppText>
              <AppText muted variant="caption">
                {t("update.feat2Body")}
              </AppText>
            </View>
          </GlassPanel>

          <GlassPanel style={styles.featureCardHorizontal}>
            <View style={[styles.featureIconCircle, { backgroundColor: colors.chip }]}>
              <Sparkles color={colors.primary} size={24} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">{t("update.feat3Title")}</AppText>
              <AppText muted variant="caption">
                {t("update.feat3Body")}
              </AppText>
            </View>
          </GlassPanel>

          <GlassPanel style={styles.featureCardHorizontal}>
            <View style={[styles.featureIconCircle, { backgroundColor: colors.chip }]}>
              <Wrench color={colors.primary} size={24} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">{t("update.feat4Title")}</AppText>
              <AppText muted variant="caption">
                {t("update.feat4Body")}
              </AppText>
            </View>
          </GlassPanel>
        </View>
      </View>

      {/* CTA */}
      <View style={styles.pageActions}>
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
