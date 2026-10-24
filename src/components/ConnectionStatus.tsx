import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useReducedMotion } from "../features/accessibility/useReducedMotion";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

type ConnectionStatusProps = {
  connected: boolean;
  label: string;
  detail?: string;
  loading?: boolean;
  neutral?: boolean;
  compact?: boolean;
};

export function ConnectionStatus({
  connected,
  label,
  detail,
  loading = false,
  neutral = false,
  compact = false,
}: ConnectionStatusProps) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!compact || !connected || neutral || reducedMotion) {
      opacity.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [compact, connected, neutral, reducedMotion, opacity]);
  const dotColor = neutral
    ? colors.textMuted
    : connected
      ? colors.success
      : colors.danger;

  return (
    <View
      accessible
      accessibilityLabel={[label, detail].filter(Boolean).join(", ")}
      accessibilityLiveRegion={loading ? "polite" : "none"}
      style={styles.wrap}
    >
      <View style={styles.line}>
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: dotColor,
              opacity,
            },
          ]}
        />
        {!compact ? (
          <AppText muted variant="caption" style={{ flexShrink: 1 }}>
            {label}
          </AppText>
        ) : null}
      </View>
      {detail && !compact ? (
        <AppText
          muted
          variant="caption"
          style={[styles.detail, { flexShrink: 1 }]}
        >
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  detail: {
    paddingLeft: 18,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  line: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  wrap: {
    gap: spacing.xxs,
    minWidth: 0,
  },
});
