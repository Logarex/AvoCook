import React from "react";
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";

type AppTextProps = TextProps & {
  variant?: "title" | "subtitle" | "body" | "caption" | "label";
  muted?: boolean;
  style?: StyleProp<TextStyle>;
};

export function AppText({
  variant = "body",
  muted = false,
  style,
  ...props
}: AppTextProps) {
  const { colors } = useAppTheme();
  return (
    <Text
      {...props}
      style={[
        styles.base,
        styles[variant],
        { color: muted ? colors.textMuted : colors.text },
        style
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    letterSpacing: 0
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40
  },
  subtitle: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28
  },
  body: {
    fontSize: 16,
    lineHeight: 22
  },
  caption: {
    fontSize: 13,
    lineHeight: 18
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18
  }
});
