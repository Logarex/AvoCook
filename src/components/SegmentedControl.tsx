import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { selectionFeedback } from "../features/accessibility/haptics";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { GlassSurface } from "./GlassSurface";
import { useNativeControls } from "./NativeGlassControls";

type SegmentedOption<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  variant?: "native" | "buttons";
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = "native",
}: SegmentedControlProps<T>) {
  const { colors } = useAppTheme();
  const { isDark } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const nativeUI = useNativeControls();
  if (variant === "native" && nativeUI && fontScale <= 1.3) {
    const { Host, Picker, Text } = nativeUI.views;
    const { pickerStyle, tag, tint } = nativeUI.modifiers;
    return (
      <Host
        colorScheme={isDark ? "dark" : "light"}
        style={styles.native}
        ignoreSafeArea="all"
      >
        <Picker
          selection={value}
          onSelectionChange={(next) => {
            if (
              next !== value &&
              options.some((option) => option.value === next)
            ) {
              selectionFeedback();
              onChange(next);
            }
          }}
          modifiers={[pickerStyle("segmented"), tint(colors.primary)]}
        >
          {options.map((option) => (
            <Text key={option.value} modifiers={[tag(option.value)]}>
              {option.label}
            </Text>
          ))}
        </Picker>
      </Host>
    );
  }
  const Container = variant === "buttons" ? View : GlassSurface;
  return (
    <Container style={variant === "buttons" ? styles.buttons : styles.container}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => {
              if (value !== option.value) {
                selectionFeedback();
                onChange(option.value);
              }
            }}
            style={({ pressed }) => [
              styles.option,
              variant === "buttons" && { flex: options.length > 3 ? undefined : 1, flexBasis: options.length > 3 ? "47%" : undefined, flexGrow: 1, minWidth: 0, borderRadius: 14, borderWidth: 1, borderColor: selected ? colors.primary : colors.border },
              {
                backgroundColor: variant === "buttons" ? (selected ? colors.primary : colors.backgroundElevated) : (selected ? colors.chip : "transparent"),
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <AppText
              numberOfLines={2}
              variant="label"
              style={[
                styles.optionLabel,
                { color: selected ? (variant === "buttons" ? colors.textInverted : colors.primaryStrong) : colors.text },
              ]}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </Container>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  native: { height: 48, alignSelf: "stretch" },
  container: {
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.xxs,
    padding: spacing.xxs,
  },
  option: {
    alignItems: "center",
    borderRadius: radius.pill,
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  optionLabel: {
    flexShrink: 1,
    textAlign: "center",
  },
});
