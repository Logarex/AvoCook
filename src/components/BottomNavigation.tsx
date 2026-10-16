import { BookOpen, Globe, ShoppingCart, type LucideIcon } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { getBottomNavigationPadding } from "../utils/safeArea";
import { AppText } from "./AppText";
import { GlassSurface } from "./GlassSurface";

export type BottomNavigationTab = "recipes" | "community" | "shoppingList";

type BottomNavigationProps = {
  current: BottomNavigationTab;
  onNavigate: (tab: BottomNavigationTab) => void;
};

const tabs: { id: BottomNavigationTab; icon: LucideIcon; labelKey: string }[] = [
  { id: "recipes", icon: BookOpen, labelKey: "recipes.title" },
  { id: "community", icon: Globe, labelKey: "community.title" },
  { id: "shoppingList", icon: ShoppingCart, labelKey: "shoppingList.title" }
];

export function BottomNavigation({ current, onNavigate }: BottomNavigationProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: getBottomNavigationPadding(insets.bottom) }]}
    >
      <GlassSurface
        style={[styles.bar, { borderColor: colors.border, shadowColor: colors.shadow }]}
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

function BottomNavigationItem({ active, icon: Icon, label, onPress }: {
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
          opacity: pressed ? 0.7 : 1
        }
      ]}
    >
      <Icon color={foreground} size={23} strokeWidth={active ? 2.3 : 1.8} />
      <AppText
        numberOfLines={1}
        variant="caption"
        style={[styles.label, { color: foreground }]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    alignItems: "center"
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
    elevation: 4
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
    paddingVertical: spacing.xxs
  },
  label: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600"
  }
});
