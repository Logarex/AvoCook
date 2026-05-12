import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { radius } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type IconButtonProps = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon: Icon,
  label,
  onPress,
  tone = "default",
  disabled = false,
  style
}: IconButtonProps) {
  const { colors } = useAppTheme();
  const iconColor =
    tone === "primary"
      ? colors.primaryStrong
      : tone === "danger"
        ? colors.danger
        : colors.text;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.surfaceGlassStrong,
          borderColor: colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.72 : 1
        },
        style
      ]}
    >
      <Icon color={iconColor} size={21} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44
  }
});
