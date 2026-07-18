import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  BookOpen,
  Camera,
  ChefHat,
  Cloud,
  Download,
  ExternalLink,
  Heart,
  HelpCircle,
  Mail,
  Smartphone,
  ShoppingCart,
  Star,
  Timer,
  Wifi,
} from "lucide-react-native";
import { Image } from "expo-image";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { LanguagePicker } from "../components/LanguagePicker";
import { PrimaryButton } from "../components/PrimaryButton";
import { useOnboarding } from "../features/onboarding/useOnboarding";
import { usePreferences } from "../features/preferences/PreferencesProvider";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

type FeatureRow = {
  icon: React.ElementType;
  titleKey: string;
  bodyKey: string;
};

const FEATURES: FeatureRow[] = [
  { icon: BookOpen, titleKey: "feature1Title", bodyKey: "feature1Body" },
  { icon: Download, titleKey: "feature2Title", bodyKey: "feature2Body" },
  { icon: Camera, titleKey: "feature3Title", bodyKey: "feature3Body" },
  { icon: ShoppingCart, titleKey: "feature4Title", bodyKey: "feature4Body" },
  { icon: Timer, titleKey: "feature5Title", bodyKey: "feature5Body" },
  { icon: Star, titleKey: "feature6Title", bodyKey: "feature6Body" },
  { icon: ExternalLink, titleKey: "feature7Title", bodyKey: "feature7Body" },
  { icon: Cloud, titleKey: "feature8Title", bodyKey: "feature8Body" },
  { icon: HelpCircle, titleKey: "feature9Title", bodyKey: "feature9Body" },
];

export function OnboardingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = usePreferences();
  const { markIntroDone } = useOnboarding();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const logo = isDark
    ? require("../../assets/logo-dark.png")
    : require("../../assets/logo.png");

  function goToPage(index: number) {
    scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH * index, animated: true });
    setCurrentPage(index);
  }

  async function handleStart() {
    await markIntroDone();
    navigation.replace("Login");
  }

  const dotInputRange = [0, SCREEN_WIDTH];
  const dot0Scale = scrollX.interpolate({
    inputRange: dotInputRange,
    outputRange: [1.3, 0.9],
    extrapolate: "clamp",
  });
  const dot1Scale = scrollX.interpolate({
    inputRange: dotInputRange,
    outputRange: [0.9, 1.3],
    extrapolate: "clamp",
  });

  const pages = [
    <Page1
      key="page1"
      logo={logo}
      colors={colors}
      t={t}
      onNext={() => goToPage(1)}
    />,
    <Page2
      key="page2"
      colors={colors}
      t={t}
      onStart={() => void handleStart()}
    />,
  ];

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {/* Language picker top-right */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <LanguagePicker
          variant="minimal"
          value={language}
          onChange={(v) => void setLanguage(v)}
        />
      </View>

      {/* Pages — horizontal paged ScrollView */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const page = Math.round(
            e.nativeEvent.contentOffset.x / SCREEN_WIDTH
          );
          setCurrentPage(page);
        }}
        style={{ flex: 1 }}
      >
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>{pages[0]}</View>
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>{pages[1]}</View>
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {[dot0Scale, dot1Scale].map((scale, i) => (
          <Pressable key={i} onPress={() => goToPage(i)} hitSlop={8}>
            <Animated.View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    currentPage === i ? colors.primary : colors.border,
                  transform: [{ scale }],
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
// Page 1 — Presentation
// ─────────────────────────────────────────────────────────────────────────────

function Page1({
  logo,
  colors,
  t,
  onNext,
}: {
  logo: ReturnType<typeof require>;
  colors: ReturnType<typeof useAppTheme>["colors"];
  t: ReturnType<typeof useTranslation>["t"];
  onNext: () => void;
}) {
  return (
    <View style={styles.page}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
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
            AvoCook
          </AppText>
          <GlassPanel style={styles.valueBadge}>
            <View style={styles.valueBadgeRow}>
              <Heart color={colors.primary} size={15} />
              <AppText
                variant="caption"
                style={{ color: colors.primary, fontWeight: "600" }}
              >
                {t("onboarding.values")}
              </AppText>
            </View>
          </GlassPanel>
        </View>

        {/* Who made it */}
        <GlassPanel style={styles.card}>
          <AppText variant="label" style={{ marginBottom: spacing.xs }}>
            {t("onboarding.aboutTitle")}
          </AppText>
          <AppText muted>{t("onboarding.aboutBody")}</AppText>
        </GlassPanel>

        {/* Local vs Nextcloud */}
        <View style={styles.modesRow}>
          <GlassPanel style={styles.modeCard}>
            <View style={styles.modeHeader}>
              <Smartphone color={colors.primary} size={20} />
              <AppText variant="label">{t("onboarding.localTitle")}</AppText>
            </View>
            <AppText muted variant="caption">
              {t("onboarding.localBody")}
            </AppText>
          </GlassPanel>
          <GlassPanel style={styles.modeCard}>
            <View style={styles.modeHeader}>
              <Cloud color={colors.primary} size={20} />
              <AppText variant="label">{t("onboarding.nextcloudTitle")}</AppText>
            </View>
            <AppText muted variant="caption">
              {t("onboarding.nextcloudBody")}
            </AppText>
          </GlassPanel>
        </View>

        {/* Contact notice */}
        <GlassPanel style={styles.contactCard}>
          <View style={styles.modeHeader}>
            <Wifi color={colors.primary} size={18} />
            <AppText variant="label">{t("onboarding.contactTitle")}</AppText>
          </View>
          <AppText muted variant="caption">
            {t("onboarding.contactBody")}
          </AppText>
        </GlassPanel>
      </ScrollView>

      {/* CTA */}
      <View style={styles.pageActions}>
        <PrimaryButton
          icon={ChefHat}
          label={t("onboarding.next")}
          onPress={onNext}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page 2 — Features
// ─────────────────────────────────────────────────────────────────────────────

function Page2({
  colors,
  t,
  onStart,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  t: ReturnType<typeof useTranslation>["t"];
  onStart: () => void;
}) {
  return (
    <View style={styles.page}>
      <AppText variant="subtitle" style={[styles.center, { marginBottom: spacing.md }]}>
        {t("onboarding.featuresTitle")}
      </AppText>
      <AppText muted style={[styles.center, { marginBottom: spacing.lg }]}>
        {t("onboarding.featuresSubtitle")}
      </AppText>

      <FlatList
        data={FEATURES}
        keyExtractor={(item) => item.titleKey}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.md }}
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <View style={styles.featureRow}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: colors.chip },
                ]}
              >
                <Icon color={colors.primary} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label">
                  {t(`onboarding.${item.titleKey}`)}
                </AppText>
                <AppText muted variant="caption" style={{ marginTop: 2, lineHeight: 17 }}>
                  {t(`onboarding.${item.bodyKey}`)}
                </AppText>
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => (
          <View
            style={[styles.separator, { backgroundColor: colors.border }]}
          />
        )}
      />

      <View style={styles.pageActions}>
        <PrimaryButton
          icon={ChefHat}
          label={t("onboarding.start")}
          onPress={onStart}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  hero: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  logo: {
    height: 72,
    width: 72,
  },
  center: {
    textAlign: "center",
  },
  valueBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  valueBadgeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  card: {
    marginBottom: spacing.sm,
  },
  modesRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modeCard: {
    flex: 1,
    gap: spacing.xs,
  },
  modeHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  contactCard: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  pageActions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  dot: {
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  featureRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  featureIcon: {
    alignItems: "center",
    borderRadius: radius.sm,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
