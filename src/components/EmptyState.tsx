import { ChefHat } from "lucide-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { GlassPanel } from "./GlassPanel";

export function EmptyState({
  title,
  body
}: {
  title: string;
  body: string;
}) {
  const { colors } = useAppTheme();
  return (
    <GlassPanel style={styles.panel}>
      <View style={[styles.icon, { backgroundColor: colors.chip }]}>
        <ChefHat color={colors.primary} size={30} />
      </View>
      <AppText variant="subtitle" style={styles.center}>
        {title}
      </AppText>
      <AppText muted style={styles.center}>
        {body}
      </AppText>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.xl
  },
  icon: {
    alignItems: "center",
    borderRadius: 24,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  center: {
    textAlign: "center"
  }
});
