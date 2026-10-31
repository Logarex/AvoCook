import {
  BookOpen,
  Refrigerator,
  CalendarDays,
  Globe,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { getBottomNavigationPadding } from "../utils/safeArea";
import { AppText } from "./AppText";
import { GlassSurface } from "./GlassSurface";
import { NativeTabBar, useNativeGlassControls } from "./NativeGlassControls";

export type BottomNavigationTab = "recipes" | "kitchen" | "planning" | "community" | "shoppingList";

type BottomNavigationProps = {
  current: BottomNavigationTab;
  onNavigate: (tab: BottomNavigationTab) => void;
  rail?: boolean;
};

const tabs: { id: BottomNavigationTab; icon: LucideIcon; labelKey: string }[] =
  [
    { id: "recipes", icon: BookOpen, labelKey: "recipes.title" },
    { id: "kitchen", icon: Refrigerator, labelKey: "kitchen.title" },
    { id: "planning", icon: CalendarDays, labelKey: "kitchen.planningTitle" },
    { id: "community", icon: Globe, labelKey: "community.title" },
    { id: "shoppingList", icon: ShoppingCart, labelKey: "shoppingList.title" },
  ];

export function BottomNavigation({
  current,
  onNavigate,
  rail = false,
}: BottomNavigationProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const nativeUI = useNativeGlassControls();

  if (nativeUI && NativeTabBar && !rail) {
    const symbols = {
      recipes: "book.closed",
      kitchen: "refrigerator",
      planning: "calendar",
      community: "globe",
      shoppingList: "cart",
    } as const;
    return (
      <NativeTabBar
        colorScheme={isDark ? "dark" : "light"}
        style={[styles.nativeBar, { height: 64 + Math.max(insets.bottom, 0) }]}
        selected={current}
        tintColor={colors.primaryStrong}
        unselectedTintColor={colors.textMuted}
        items={tabs.map((tab) => ({
          id: tab.id,
          title: t(tab.labelKey),
          symbol: symbols[tab.id],
        }))}
        onSelect={({ nativeEvent: { id } }) => {
          if (id !== current && tabs.some((tab) => tab.id === id))
            onNavigate(id as BottomNavigationTab);
        }}
      />
    );
  }

  if (rail) {
    return (
      <View style={[styles.rail, { paddingTop: Math.max(insets.top, spacing.md), paddingBottom: Math.max(insets.bottom, spacing.md), paddingLeft: Math.max(insets.left, 0) + spacing.xs }]}>
        <GlassSurface interactive style={[styles.railSurface, { borderColor: colors.border }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.railContent}>
            {tabs.map((tab) => (
              <BottomNavigationItem key={tab.id} active={current === tab.id} icon={tab.icon} label={t(tab.labelKey)} rail onPress={() => { if (tab.id !== current) onNavigate(tab.id); }} />
            ))}
          </ScrollView>
        </GlassSurface>
      </View>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: getBottomNavigationPadding(insets.bottom), left: Math.max(insets.left, 0) + spacing.md, right: Math.max(insets.right, 0) + spacing.md },
        Platform.OS === "android" && styles.androidWrap,
      ]}
    >
      <GlassSurface
        style={[
          styles.bar,
          { borderColor: colors.border, shadowColor: colors.shadow },
          Platform.OS === "android" && [
            styles.androidBar,
            { paddingBottom: Math.max(insets.bottom, spacing.xs) },
          ],
        ]}
      >
        {tabs.map((tab) => (
          <BottomNavigationItem
            key={tab.id}
            active={current === tab.id}
            icon={tab.icon}
            label={t(tab.labelKey)}
            onPress={() => { if (tab.id !== current) onNavigate(tab.id); }}
          />
        ))}
      </GlassSurface>
    </View>
  );
}

function BottomNavigationItem({
  active,
  icon: Icon,
  label,
  onPress,
  rail = false,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  rail?: boolean;
}) {
  const { colors } = useAppTheme();
  const foreground = active ? colors.primaryStrong : colors.textMuted;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        rail && styles.railItem,
        {
          backgroundColor: active ? colors.chip : "transparent",
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Icon color={foreground} size={23} strokeWidth={active ? 2.3 : 1.8} />
      <AppText
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        variant="caption"
        style={[
          styles.label,
          rail && styles.railLabel,
          { color: foreground },
          Platform.OS === "android" && { fontSize: 12, lineHeight: 16 },
        ]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rail: { flex: 1, paddingRight: spacing.xs },
  railSurface: { flex: 1, borderRadius: 28, padding: spacing.xxs },
  railContent: { flexGrow: 1, justifyContent: "center", gap: spacing.xs },
  railItem: { flex: 0, minHeight: 68, paddingVertical: spacing.sm, paddingHorizontal: spacing.xxs, borderRadius: 22 },
  railLabel: { textAlign: "center", fontSize: 11, lineHeight: 15 },
  androidWrap: { left: 0, right: 0, bottom: 0 },
  androidBar: {
    borderRadius: 0,
    maxWidth: undefined,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.md,
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 0,
  },
  nativeBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  wrap: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    alignItems: "center",
  },
  bar: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xxs,
    padding: spacing.xxs,
    width: "100%",
    maxWidth: 520,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  item: {
    alignItems: "center",
    borderRadius: radius.pill,
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: 56,
    minWidth: 0,
    paddingHorizontal: spacing.xxs,
    paddingVertical: spacing.xxs,
  },
  label: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
  },
});
