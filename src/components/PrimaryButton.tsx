import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  onPress,
  icon: Icon,
  variant = "primary",
  disabled = false,
  style
}: PrimaryButtonProps) {
  const { colors } = useAppTheme();
  const backgroundColor =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.danger
        : variant === "secondary"
          ? colors.secondary
          : colors.surfaceGlassStrong;
  const foregroundColor =
    variant === "ghost" ? colors.text : colors.textInverted;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor: variant === "ghost" ? colors.border : backgroundColor,
          opacity: disabled ? 0.45 : pressed ? 0.78 : 1
        },
        style
      ]}
    >
      <View style={styles.content}>
        {Icon ? <Icon color={foregroundColor} size={18} strokeWidth={2.5} /> : null}
        <AppText
          variant="label"
          style={[styles.label, { color: foregroundColor }]}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  content: {
    alignItems: "center",
    flexShrink: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center"
  },
  label: {
    textAlign: "center"
  }
});
