import {
  BookOpen,
  Globe,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { getBottomNavigationPadding } from "../utils/safeArea";
import { AppText } from "./AppText";
import { GlassSurface } from "./GlassSurface";
import { NativeTabBar, useNativeGlassControls } from "./NativeGlassControls";

export type BottomNavigationTab = "recipes" | "community" | "shoppingList";

type BottomNavigationProps = {
  current: BottomNavigationTab;
  onNavigate: (tab: BottomNavigationTab) => void;
};

const tabs: { id: BottomNavigationTab; icon: LucideIcon; labelKey: string }[] =
  [
    { id: "recipes", icon: BookOpen, labelKey: "recipes.title" },
    { id: "community", icon: Globe, labelKey: "community.title" },
    { id: "shoppingList", icon: ShoppingCart, labelKey: "shoppingList.title" },
  ];

export function BottomNavigation({
  current,
  onNavigate,
}: BottomNavigationProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const nativeUI = useNativeGlassControls();

  if (nativeUI && NativeTabBar) {
    const symbols = {
      recipes: "book.closed",
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

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: getBottomNavigationPadding(insets.bottom) },
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
            onPress={() => onNavigate(tab.id)}
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
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
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
        {
          backgroundColor: active ? colors.chip : "transparent",
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Icon color={foreground} size={23} strokeWidth={active ? 2.3 : 1.8} />
      <AppText
        numberOfLines={1}
        variant="caption"
        style={[
          styles.label,
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
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  label: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
  },
});
