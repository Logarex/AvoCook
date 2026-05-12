import { BlurView } from "expo-blur";
import React from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle
} from "react-native";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type GlassPanelProps = {
  children: React.ReactNode;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
};

export function GlassPanel({
  children,
  intensity = 38,
  style
}: GlassPanelProps) {
  const { colors, isDark } = useAppTheme();
  const panelStyle = [
    styles.panel,
    {
      backgroundColor: colors.surfaceGlass,
      borderColor: colors.border,
      shadowColor: colors.shadow
    },
    style
  ];

  if (Platform.OS === "ios") {
    return (
      <BlurView
        intensity={intensity}
        tint={isDark ? "dark" : "light"}
        style={panelStyle}
      >
        {children}
      </BlurView>
    );
  }

  return <View style={panelStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    padding: spacing.md,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 4
  }
});
