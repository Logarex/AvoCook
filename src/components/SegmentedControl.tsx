import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { GlassSurface } from "./GlassSurface";

type SegmentedOption<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange
}: SegmentedControlProps<T>) {
  const { colors } = useAppTheme();
  return (
    <GlassSurface style={styles.container}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: selected ? colors.chip : "transparent",
                opacity: pressed ? 0.7 : 1
              }
            ]}
          >
            <AppText
              numberOfLines={2}
              variant="label"
              style={[styles.optionLabel, { color: selected ? colors.primaryStrong : colors.text }]}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.xxs,
    padding: spacing.xxs
  },
  option: {
    alignItems: "center",
    borderRadius: radius.pill,
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs
  },
  optionLabel: {
    flexShrink: 1,
    textAlign: "center"
  }
});
