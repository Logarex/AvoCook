import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Bot,
  Bug,
  Camera,
  ChefHat,
  CheckCircle,
  Download,
  ExternalLink,
  FileText,
  Globe,
  HelpCircle,
  Mail,
  Plus,
  Settings,
  ShoppingCart,
  Smartphone,
  Timer,
  X,
} from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import { useOnboarding } from "../features/onboarding/useOnboarding";
import { LLM_PROVIDERS } from "../features/import/photoRecipeImport";
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
    extra: (colors, t) => <AIProviderList colors={colors} t={t} />,
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
  // 9 — Contact buttons
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
        styles.overlay,
        {
          backgroundColor: "rgba(0,0,0,0.65)",
          paddingTop: insets.top,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      {/* Skip button */}
      {!isLast && (
        <Pressable
          onPress={() => void handleSkip()}
          style={[styles.skipButton, { paddingTop: spacing.xs }]}
          hitSlop={8}
        >
          <AppText
            variant="caption"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            {t("tour.skip")}
          </AppText>
        </Pressable>
      )}

      {/* Progress bar */}
      <View
        style={[styles.progressTrack, { backgroundColor: "rgba(255,255,255,0.2)" }]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            { width: progressWidth, backgroundColor: colors.primary },
          ]}
        />
      </View>

      {/* Step counter */}
      <AppText
        variant="caption"
        style={styles.stepCounter}
      >
        {t("tour.stepCounter", { current: step + 1, total: STEPS.length })}
      </AppText>

      {/* Card */}
      <View style={styles.cardWrapper}>
        <GlassPanel style={styles.card} intensity={55}>
          {/* Icon circle */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.chip },
            ]}
          >
            <Icon color={colors.primary} size={32} strokeWidth={1.8} />
          </View>

          <AppText variant="subtitle" style={styles.stepTitle}>
            {t(current.titleKey as Parameters<typeof t>[0])}
          </AppText>

          <ScrollView
            style={{ maxHeight: 240 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <AppText style={styles.stepBody}>
              {t(current.bodyKey as Parameters<typeof t>[0])}
            </AppText>
            {current.extra?.(colors, t)}
          </ScrollView>
        </GlassPanel>
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
                      : "rgba(255,255,255,0.35)",
                  width: i === step ? 20 : 8,
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
// Extra content: AI Providers
// ─────────────────────────────────────────────────────────────────────────────

function AIProviderList({
  colors,
  t,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  t: ReturnType<typeof useTranslation>["t"];
}) {
  type Provider = {
    label: string;
    free: boolean;
    freeNote?: string;
    url: string;
    id: string;
  };

  const providers: Provider[] = [
    {
      id: "gemini",
      label: "Google Gemini",
      free: true,
      freeNote: t("tour.geminiNote"),
      url: "https://aistudio.google.com/apikey",
    },
    {
      id: "openai",
      label: "OpenAI (ChatGPT)",
      free: false,
      url: "https://platform.openai.com/api-keys",
    },
    {
      id: "groq",
      label: "Groq",
      free: true,
      freeNote: t("tour.groqNote"),
      url: "https://console.groq.com/keys",
    },
    {
      id: "mistral",
      label: "Mistral (Le Chat)",
      free: false,
      url: "https://console.mistral.ai/api-keys",
    },
    {
      id: "claude",
      label: "Anthropic (Claude)",
      free: false,
      url: "https://console.anthropic.com/settings/keys",
    },
    {
      id: "grok",
      label: "Grok (xAI)",
      free: false,
      url: "https://console.x.ai/",
    },
  ];

  return (
    <View style={{ marginTop: spacing.md }}>
      <AppText
        variant="label"
        style={{ marginBottom: spacing.sm }}
      >
        {t("tour.aiProvidersTitle")}
      </AppText>
      {providers.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => void Linking.openURL(p.url)}
          style={({ pressed }) => [
            styles.providerRow,
            {
              backgroundColor: pressed
                ? colors.chip
                : "transparent",
              borderColor: colors.border,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <AppText variant="label" style={{ fontSize: 14 }}>
                {p.label}
              </AppText>
              {p.free && (
                <View
                  style={[
                    styles.freeBadge,
                    { backgroundColor: colors.chip },
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={{ color: colors.primary, fontWeight: "700" }}
                  >
                    {t("tour.free")}
                  </AppText>
                </View>
              )}
            </View>
            {p.freeNote && (
              <AppText
                muted
                variant="caption"
                style={{ marginTop: 2 }}
              >
                {p.freeNote}
              </AppText>
            )}
          </View>
          <ExternalLink color={colors.textMuted} size={14} />
        </Pressable>
      ))}
      <AppText
        muted
        variant="caption"
        style={{ marginTop: spacing.sm }}
      >
        {t("tour.aiHowToNote")}
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
    <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
      <Pressable
        onPress={openGithub}
        style={({ pressed }) => [
          styles.contactRow,
          {
            backgroundColor: pressed ? colors.chip : "transparent",
            borderColor: colors.border,
          },
        ]}
      >
        <Bug color={colors.primary} size={18} />
        <View style={{ flex: 1 }}>
          <AppText variant="label" style={{ fontSize: 14 }}>
            {t("support.github")}
          </AppText>
          <AppText muted variant="caption">
            {t("tour.githubNote")}
          </AppText>
        </View>
        <ExternalLink color={colors.textMuted} size={14} />
      </Pressable>

      <Pressable
        onPress={openEmail}
        style={({ pressed }) => [
          styles.contactRow,
          {
            backgroundColor: pressed ? colors.chip : "transparent",
            borderColor: colors.border,
          },
        ]}
      >
        <Mail color={colors.primary} size={18} />
        <View style={{ flex: 1 }}>
          <AppText variant="label" style={{ fontSize: 14 }}>
            {t("support.email")}
          </AppText>
          <AppText muted variant="caption">
            {t("tour.emailNote")}
          </AppText>
        </View>
        <ExternalLink color={colors.textMuted} size={14} />
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  skipButton: {
    alignSelf: "flex-end",
    padding: spacing.xs,
  },
  progressTrack: {
    borderRadius: radius.pill,
    height: 4,
    marginTop: spacing.sm,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: {
    borderRadius: radius.pill,
    height: "100%",
  },
  stepCounter: {
    color: "rgba(255,255,255,0.55)",
    marginTop: spacing.sm,
  },
  cardWrapper: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
  },
  card: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  iconCircle: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 72,
  },
  stepTitle: {
    textAlign: "center",
  },
  stepBody: {
    lineHeight: 22,
    textAlign: "center",
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
    gap: spacing.xs,
    justifyContent: "center",
    marginTop: spacing.md,
  },
  dot: {
    borderRadius: radius.pill,
    height: 8,
  },
  providerRow: {
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  freeBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  contactRow: {
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
