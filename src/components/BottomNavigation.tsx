import { BookOpen, ShoppingCart } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

export type BottomNavigationTab = "recipes" | "shoppingList";

type BottomNavigationProps = {
  current: BottomNavigationTab;
  onNavigate: (tab: BottomNavigationTab) => void;
};

const tabs: { id: BottomNavigationTab; icon: LucideIcon; labelKey: string }[] = [
  { id: "recipes", icon: BookOpen, labelKey: "recipes.title" },
  { id: "shoppingList", icon: ShoppingCart, labelKey: "shoppingList.title" }
];

export function BottomNavigation({
  current,
  onNavigate
}: BottomNavigationProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.background,
          paddingBottom: Math.max(
            insets.bottom > 0 ? insets.bottom - 18 : 0,
            spacing.xxs
          )
        }
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surfaceGlassStrong,
            borderColor: colors.border,
            shadowColor: colors.shadow
          }
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
      </View>
    </View>
  );
}

function BottomNavigationItem({
  active,
  icon: Icon,
  label,
  onPress
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: active ? colors.primary : "transparent",
          opacity: pressed ? 0.76 : 1
        }
      ]}
    >
      <Icon
        color={active ? colors.textInverted : colors.textMuted}
        size={19}
        strokeWidth={2.5}
      />
      <AppText
        numberOfLines={1}
        variant="caption"
        style={[
          styles.label,
          { color: active ? colors.textInverted : colors.textMuted }
        ]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.sm,
    paddingTop: 0
  },
  bar: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xxs,
    padding: spacing.xxs,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3
  },
  item: {
    alignItems: "center",
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xxs,
    justifyContent: "center",
    minHeight: 38,
    minWidth: 0,
    paddingHorizontal: spacing.xs
  },
  label: {
    flexShrink: 1
  }
});
