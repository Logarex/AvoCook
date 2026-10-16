import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowRight,
  Sparkles,
  FileText,
  ShoppingBasket,
  Bell,
  Languages,
  Users,
  RefreshCw,
  Image,
  Plug,
  Scale,
  Timer,
  Compass,
} from "lucide-react-native";
import { AppLogo } from "../components/AppLogo";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import { useOnboarding } from "../features/onboarding/useOnboarding";
import { RELEASE_NOTE_KEYS } from "../features/updates/releaseNotes";
import { APP_VERSION } from "../version";
import type { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

const featureIcons = {
  design: Sparkles,
  markdown: FileText,
  shopping: ShoppingBasket,
  reminders: Bell,
  translations: Languages,
  community: Users,
  sync: RefreshCw,
  photos: Image,
  connection: Plug,
  quantities: Scale,
  timers: Timer,
  tour: Compass,
};

type Props = NativeStackScreenProps<RootStackParamList, "Update">;

export function UpdateScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { markUpdateSeen } = useOnboarding();

  const backgroundColor = colors.background;

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
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.hero}>
          <AppLogo style={styles.logo} />
          <AppText variant="title" style={styles.center}>
            {t("update.title")}
          </AppText>
          <AppText muted style={styles.center}>
            {t("update.subtitle", { version: APP_VERSION })}
          </AppText>
        </View>

        <View style={styles.featuresColumn}>
          {RELEASE_NOTE_KEYS.map((key) => {
            const Icon = featureIcons[key];
            return (
              <GlassPanel key={key} style={styles.featureCardHorizontal}>
                <View style={[styles.featureIconCircle, { backgroundColor: colors.chip }]}>
                  <Icon color={colors.primary} size={22} />
                </View>
                <View style={styles.featureText}>
                  <AppText variant="label">{t(`update.${key}Title`)}</AppText>
                  <AppText muted>{t(`update.${key}Body`)}</AppText>
                </View>
              </GlassPanel>
            );
          })}
        </View>
      </ScrollView>

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
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  featureIconCircle: {
    flexShrink: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  pageActions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
