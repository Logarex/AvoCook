import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { GlassSurface } from "./GlassSurface";

type GlassPanelProps = {
  children: React.ReactNode;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
  variant?: "surface" | "glass";
};

export function GlassPanel({
  children,
  intensity = 55,
  style,
  variant = "surface"
}: GlassPanelProps) {
  const { colors } = useAppTheme();
  const panelStyle = [
    styles.panel,
    { backgroundColor: colors.backgroundElevated, borderColor: colors.border },
    style
  ];

  if (variant === "glass") {
    return (
      <GlassSurface intensity={intensity} style={panelStyle}>
        {children}
      </GlassSurface>
    );
  }
  return <View style={panelStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: "continuous",
    overflow: "hidden",
    padding: spacing.md
  }
});
