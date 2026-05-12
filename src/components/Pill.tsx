import React from "react";
import { StyleSheet, View } from "react-native";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

export function Pill({ label }: { label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.pill, { backgroundColor: colors.chip }]}>
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  }
});
