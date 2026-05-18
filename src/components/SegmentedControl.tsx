import { Check } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

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
    <View
      style={[
        styles.container,
        { backgroundColor: colors.input, borderColor: colors.border }
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              selected ? { backgroundColor: colors.primary } : null
            ]}
          >
            {selected ? (
              <Check color={colors.textInverted} size={15} strokeWidth={3} />
            ) : null}
            <AppText
              variant="label"
              style={[
                styles.optionLabel,
                { color: selected ? colors.textInverted : colors.text }
              ]}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xxs,
    padding: spacing.xxs
  },
  option: {
    alignItems: "center",
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xxs,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  optionLabel: {
    flexShrink: 1,
    textAlign: "center"
  }
});
