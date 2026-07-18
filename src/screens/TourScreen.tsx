import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Bot,
  Bug,
  Camera,
  ChefHat,
  CheckCircle,
  Download,
  ExternalLink,
  HelpCircle,
  Mail,
  Plus,
  Settings,
  ShoppingCart,
  Smartphone,
  Timer,
} from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import { useOnboarding } from "../features/onboarding/useOnboarding";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

const { width: SW } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "Tour">;

type TourStep = {
  icon: React.ElementType;
  titleKey: string;
  bodyKey: string;
  /** Extra content rendered below the description */
  extra?: (colors: ReturnType<typeof useAppTheme>["colors"], t: ReturnType<typeof useTranslation>["t"]) => React.ReactNode;
};

const STEPS: TourStep[] = [
  // 1 — Overview / navigation
  {
    icon: Smartphone,
    titleKey: "tour.step1Title",
    bodyKey: "tour.step1Body",
  },
  // 2 — Create / edit recipe
  {
    icon: Plus,
    titleKey: "tour.step2Title",
    bodyKey: "tour.step2Body",
  },
  // 3 — Import (URL / file)
  {
    icon: Download,
    titleKey: "tour.step3Title",
    bodyKey: "tour.step3Body",
  },
  // 4 — AI scan (camera icon), with provider info
  {
    icon: Camera,
    titleKey: "tour.step4Title",
    bodyKey: "tour.step4Body",
    extra: (colors, t) => <AIGuide colors={colors} t={t} />,
  },
  // 5 — Categories + nutriscore
  {
    icon: ChefHat,
    titleKey: "tour.step5Title",
    bodyKey: "tour.step5Body",
  },
  // 6 — Shopping list
  {
    icon: ShoppingCart,
    titleKey: "tour.step6Title",
    bodyKey: "tour.step6Body",
  },
  // 7 — Timers
  {
    icon: Timer,
    titleKey: "tour.step7Title",
    bodyKey: "tour.step7Body",
  },
  // 8 — Settings / logs / backup
  {
    icon: Settings,
    titleKey: "tour.step8Title",
    bodyKey: "tour.step8Body",
  },
  // 9 — Contact
  {
    icon: HelpCircle,
    titleKey: "tour.step9Title",
    bodyKey: "tour.step9Body",
    extra: (colors, t) => <ContactLinks colors={colors} t={t} />,
  },
  // 10 — Final welcome
  {
    icon: CheckCircle,
    titleKey: "tour.step10Title",
    bodyKey: "tour.step10Body",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export function TourScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { markTourDone } = useOnboarding();
  const [step, setStep] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const animateProgress = useCallback(
    (toValue: number) => {
      Animated.spring(progress, {
        toValue,
        useNativeDriver: false,
        tension: 80,
        friction: 12,
      }).start();
    },
    [progress]
  );

  function goTo(nextStep: number) {
    animateProgress(nextStep / (STEPS.length - 1));
    setStep(nextStep);
  }

  function handleNext() {
    if (isLast) {
      void finish();
    } else {
      goTo(step + 1);
    }
  }

  async function finish() {
    await markTourDone();
    navigation.replace("Recipes");
  }

  async function handleSkip() {
    Alert.alert(
      t("tour.skipTitle"),
      t("tour.skipBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("tour.skipConfirm"),
          onPress: () => void finish(),
        },
      ]
    );
  }

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const Icon = current.icon;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      {/* Top Bar with Skip Button */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        {!isLast && (
          <Pressable
            onPress={() => void handleSkip()}
            style={styles.skipButton}
            hitSlop={8}
          >
            <AppText variant="label" style={{ color: colors.textMuted }}>
              {t("tour.skip")}
            </AppText>
          </Pressable>
        )}
      </View>

      {/* Progress bar */}
      <View
        style={[styles.progressTrack, { backgroundColor: colors.border }]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            { width: progressWidth, backgroundColor: colors.primary },
          ]}
        />
      </View>

      {/* Main Content Area */}
      <View style={styles.contentWrapper}>
        <View style={styles.centerContainer}>
          {/* Icon circle */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.chip },
            ]}
          >
            <Icon color={colors.primary} size={48} strokeWidth={1.5} />
          </View>

          {/* Texts */}
          <AppText variant="title" style={styles.stepTitle}>
            {t(current.titleKey as Parameters<typeof t>[0])}
          </AppText>

          <AppText style={styles.stepBody} muted>
            {t(current.bodyKey as Parameters<typeof t>[0])}
          </AppText>

          {/* Extra Elements (e.g. AI Guide) */}
          {current.extra?.(colors, t)}
        </View>
      </View>

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        {step > 0 && (
          <PrimaryButton
            label={t("common.back")}
            onPress={() => goTo(step - 1)}
            variant="ghost"
            style={styles.navBtn}
          />
        )}
        <PrimaryButton
          label={isLast ? t("tour.finish") : t("tour.next")}
          onPress={handleNext}
          style={[styles.navBtn, step === 0 && { flex: 1 }]}
        />
      </View>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <Pressable key={i} onPress={() => goTo(i)} hitSlop={6}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === step
                      ? colors.primary
                      : colors.border,
                  width: i === step ? 24 : 8,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Extra content: AI Guide
// ─────────────────────────────────────────────────────────────────────────────

function AIGuide({
  colors,
  t,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  t: ReturnType<typeof useTranslation>["t"];
}) {
  type Provider = {
    label: string;
    free: boolean;
    url: string;
    id: string;
  };

  const providers: Provider[] = [
    { id: "gemini", label: "Gemini", free: true, url: "https://aistudio.google.com/apikey" },
    { id: "groq", label: "Groq", free: true, url: "https://console.groq.com/keys" },
    { id: "openai", label: "OpenAI", free: false, url: "https://platform.openai.com/api-keys" },
    { id: "claude", label: "Anthropic", free: false, url: "https://console.anthropic.com/settings/keys" },
    { id: "mistral", label: "Mistral", free: false, url: "https://console.mistral.ai/api-keys" },
    { id: "grok", label: "Grok", free: false, url: "https://console.x.ai/" },
  ];

  return (
    <View style={styles.aiGuideContainer}>
      <AppText variant="label" style={{ marginBottom: spacing.sm, textAlign: "center" }}>
        {t("tour.aiGuideTitle")}
      </AppText>

      <View style={styles.providerGrid}>
        {providers.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => void Linking.openURL(p.url)}
            style={({ pressed }) => [
              styles.providerGridItem,
              {
                backgroundColor: pressed ? colors.chip : "transparent",
                borderColor: colors.border,
              },
            ]}
          >
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <AppText variant="label" style={{ fontSize: 13 }} numberOfLines={1}>
                {p.label}
              </AppText>
              {p.free && (
                <View style={[styles.freeBadgeCompact, { backgroundColor: colors.chip }]}>
                  <AppText variant="caption" style={{ color: colors.primary, fontWeight: "700", fontSize: 9 }}>
                    {t("tour.free")}
                  </AppText>
                </View>
              )}
            </View>
            <ExternalLink color={colors.textMuted} size={12} />
          </Pressable>
        ))}
      </View>

      <AppText
        muted
        variant="caption"
        style={{ marginTop: spacing.md, textAlign: "center" }}
      >
        {t("tour.aiGuideNote")}
      </AppText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Extra content: Contact links
// ─────────────────────────────────────────────────────────────────────────────

function ContactLinks({
  colors,
  t,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  t: ReturnType<typeof useTranslation>["t"];
}) {
  function openGithub() {
    void Linking.openURL("https://github.com/Logarex/AvoCook/issues");
  }
  function openEmail() {
    void Linking.openURL("mailto:louischabert.dev@gmail.com?subject=AvoCook");
  }

  return (
    <View style={styles.contactContainer}>
      <Pressable
        onPress={openGithub}
        style={({ pressed }) => [
          styles.contactCardHorizontal,
          {
            backgroundColor: pressed ? colors.chip : "transparent",
            borderColor: colors.border,
          },
        ]}
      >
        <Bug color={colors.primary} size={20} />
        <AppText variant="label" style={{ fontSize: 14 }}>
          GitHub
        </AppText>
        <ExternalLink color={colors.textMuted} size={14} />
      </Pressable>

      <Pressable
        onPress={openEmail}
        style={({ pressed }) => [
          styles.contactCardHorizontal,
          {
            backgroundColor: pressed ? colors.chip : "transparent",
            borderColor: colors.border,
          },
        ]}
      >
        <Mail color={colors.primary} size={20} />
        <AppText variant="label" style={{ fontSize: 14 }}>
          Email
        </AppText>
        <ExternalLink color={colors.textMuted} size={14} />
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  topBar: {
    flexDirection: "row",
    height: 44,
    alignItems: "center",
  },
  skipButton: {
    padding: spacing.xs,
  },
  progressTrack: {
    borderRadius: radius.pill,
    height: 4,
    marginTop: spacing.xs,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: {
    borderRadius: radius.pill,
    height: "100%",
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  centerContainer: {
    alignItems: "center",
    width: "100%",
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: 48,
    height: 96,
    justifyContent: "center",
    marginBottom: spacing.xl,
    width: 96,
  },
  stepTitle: {
    textAlign: "center",
    marginBottom: spacing.md,
    fontSize: 24,
  },
  stepBody: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  aiGuideContainer: {
    marginTop: spacing.xl,
    width: "100%",
  },
  providerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  providerGridItem: {
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    width: "48%", // 2 columns
  },
  freeBadgeCompact: {
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  contactContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
    width: "100%",
  },
  contactCardHorizontal: {
    flex: 1,
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  navRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: "100%",
  },
  navBtn: {
    flex: 1,
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  dot: {
    borderRadius: radius.pill,
    height: 8,
  },
});

