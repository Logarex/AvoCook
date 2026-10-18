import type { LucideIcon } from "lucide-react-native";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useReducedMotion } from "../features/accessibility/useReducedMotion";
import { radius } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { GlassSurface } from "./GlassSurface";
import {
  NativeGlassButton,
  useNativeGlassControls,
} from "./NativeGlassControls";

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
  style,
}: IconButtonProps) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const nativeUI = useNativeGlassControls();

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
          useNativeDriver: true,
        }),
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
    outputRange: ["0deg", "360deg"],
  });

  const iconColor =
    tone === "primary"
      ? colors.primaryStrong
      : tone === "danger"
        ? colors.danger
        : colors.text;

  const isButtonDisabled = disabled || spinning;
  const content = (
    <View
      collapsable={false}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.iconFrame}
    >
      <Animated.View
        style={{
          opacity: disabled ? 0.45 : spinning ? 0.8 : 1,
          transform: [{ rotate: spin }],
        }}
      >
        <Icon color={iconColor} size={21} strokeWidth={2} />
      </Animated.View>
    </View>
  );

  if (nativeUI) {
    return (
      <NativeGlassButton
        ui={nativeUI}
        label={label}
        onPress={onPress}
        disabled={isButtonDisabled}
        square
        style={[styles.button, style]}
      >
        {content}
      </NativeGlassButton>
    );
  }

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
          transform: [{ scale: pressed && !reducedMotion ? 0.94 : 1 }],
        },
        style,
      ]}
    >
      <GlassSurface
        pointerEvents="none"
        interactive={!isButtonDisabled}
        style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
      />
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconFrame: {
    alignItems: "center",
    height: 21,
    justifyContent: "center",
    width: 21,
  },
  button: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
});
