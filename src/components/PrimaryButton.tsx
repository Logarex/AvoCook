import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { GlassSurface } from "./GlassSurface";
import { useReducedMotion } from "../features/accessibility/useReducedMotion";
import { AppText } from "./AppText";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "danger-secondary";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  numberOfLines?: number;
};

export function PrimaryButton({
  label,
  onPress,
  icon: Icon,
  variant = "primary",
  disabled = false,
  style,
  numberOfLines = 2,
}: PrimaryButtonProps) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const tintColor = variant === "primary"
    ? colors.primary
    : variant === "danger" ? colors.danger : undefined;
  const foregroundColor = variant === "primary" || variant === "danger"
    ? colors.textInverted
    : variant === "danger-secondary" ? colors.danger
      : variant === "secondary" ? colors.primaryStrong : colors.text;

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
          transform: [{ scale: pressed && !reducedMotion ? 0.98 : 1 }]
        },
        style
      ]}
    >
      <GlassSurface
        pointerEvents="none"
        interactive={!disabled}
        tintColor={tintColor}
        style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
      />
      <View style={[styles.content, { opacity: disabled ? 0.45 : 1 }]}>
        {Icon ? <Icon color={foregroundColor} size={19} strokeWidth={2} /> : null}
        <AppText
          numberOfLines={numberOfLines}
          adjustsFontSizeToFit={false}
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
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  content: {
    maxWidth: "100%",
    flexShrink: 1,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center"
  },
  label: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600"
  }
});
