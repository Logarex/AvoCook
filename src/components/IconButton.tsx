import type { LucideIcon } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { useReducedMotion } from "../features/accessibility/useReducedMotion";
import { radius } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type IconButtonProps = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
  spinning?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon: Icon,
  label,
  onPress,
  tone = "default",
  disabled = false,
  spinning = false,
  style
}: IconButtonProps) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (spinning && !reducedMotion) {
      spinValue.setValue(0);
      animation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true
        })
      );
      animation.start();
    } else {
      spinValue.setValue(0);
    }
    return () => {
      animation?.stop();
    };
  }, [reducedMotion, spinning, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"]
  });

  const iconColor =
    tone === "primary"
      ? colors.primaryStrong
      : tone === "danger"
        ? colors.danger
        : colors.text;

  const isButtonDisabled = disabled || spinning;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: spinning, disabled: isButtonDisabled }}
      disabled={isButtonDisabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.surfaceGlassStrong,
          borderColor: colors.border,
          opacity: disabled ? 0.45 : spinning ? 0.8 : pressed ? 0.72 : 1
        },
        style
      ]}
    >
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Icon color={iconColor} size={21} strokeWidth={2.4} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44
  }
});
