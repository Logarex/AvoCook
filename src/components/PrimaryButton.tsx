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
  variant?: "primary" | "secondary" | "ghost" | "danger" | "danger-secondary";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  numberOfLines?: number;
  compact?: boolean;
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
        : variant === "secondary"
          ? colors.primaryStrong
          : colors.text;

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

  const plain = variant === "ghost" || variant === "danger-secondary";
  if (nativeUI && !plain && !disabled && !compact) {
    return (
      <NativeGlassButton
        ui={nativeUI}
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
        !plain && !disabled && variant === "secondary"
          ? { borderColor: colors.primary, borderWidth: 1 }
          : undefined,
        disabled && !plain
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
