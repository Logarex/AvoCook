import type { LucideIcon } from "lucide-react-native";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useReducedMotion } from "../features/accessibility/useReducedMotion";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { GlassSurface } from "./GlassSurface";
import {
  NativeGlassButton,
  useNativeGlassControls,
} from "./NativeGlassControls";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "danger-secondary" | "link";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  numberOfLines?: number;
  compact?: boolean;
  fillAvailableSpace?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  icon: Icon,
  variant = "primary",
  disabled = false,
  style,
  numberOfLines = 2,
  compact = false,
  fillAvailableSpace = false,
}: PrimaryButtonProps) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const nativeUI = useNativeGlassControls();
  const tintColor =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.danger
        : undefined;
  const foregroundColor = disabled
    ? colors.textMuted
    : variant === "primary" || variant === "danger"
      ? colors.textInverted
      : variant === "danger-secondary"
        ? colors.danger
        : colors.primaryStrong;

  const content = (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.content}
    >
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
  );

  const plain = variant === "ghost" || variant === "danger-secondary" || variant === "link";
  // SwiftUI's intrinsic measurement does not expand reliably inside flex rows.
  // Keep the native glass surface, with React Native owning the flexible layout.
  if (nativeUI && !plain && !disabled && !fillAvailableSpace) {
    return (
      <NativeGlassButton
        ui={nativeUI}
        fitContent={compact}
        label={label}
        onPress={onPress}
        disabled={disabled}
        prominent={variant === "primary" || variant === "danger"}
        tintColor={tintColor}
        style={[styles.nativeButton, style]}
      >
        {content}
      </NativeGlassButton>
    );
  }

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
        compact && { flexShrink: 1 },
        variant === "link" && { minHeight: 44, paddingHorizontal: 4, paddingVertical: 4 },
        plain && variant !== "link" && {
          backgroundColor:
            pressed || variant === "danger-secondary"
              ? colors.backgroundElevated
              : colors.chip,
          borderColor:
            variant === "danger-secondary" ? colors.danger : colors.primary,
          borderWidth: 1,
        },
        !plain && !disabled && variant === "secondary"
          ? { borderColor: colors.primary, borderWidth: 1 }
          : undefined,
        disabled
          ? {
              backgroundColor: colors.backgroundElevated,
              borderColor: colors.textMuted,
              borderWidth: 1,
            }
          : undefined,
        {
          transform: [{ scale: pressed && !reducedMotion ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {!plain && !disabled ? (
        <GlassSurface
          pointerEvents="none"
          interactive={!disabled}
          tintColor={tintColor}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
        />
      ) : null}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nativeButton: {
    minHeight: 48,
    alignSelf: "stretch",
  },
  button: {
    alignItems: "center",
    borderRadius: radius.pill,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  content: {
    maxWidth: "100%",
    flexShrink: 1,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
  },
  label: {
    flexShrink: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
  },
});
