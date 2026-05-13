import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

type ConnectionStatusProps = {
  connected: boolean;
  label: string;
  detail?: string;
  loading?: boolean;
};

export function ConnectionStatus({
  connected,
  label,
  detail,
  loading = false
}: ConnectionStatusProps) {
  const { colors } = useAppTheme();
  const opacity = useRef(new Animated.Value(connected ? 0.45 : 1)).current;
  const dotColor = connected ? colors.success : colors.danger;

  useEffect(() => {
    if (!connected) {
      opacity.stopAnimation();
      opacity.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 1200,
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          duration: 1200,
          toValue: 0.45,
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [connected, opacity]);

  return (
    <View style={styles.wrap}>
      <View style={styles.line}>
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: dotColor,
              opacity,
              shadowColor: dotColor
            }
          ]}
        />
        <AppText muted variant="caption">
          {label}
        </AppText>
      </View>
      {detail || loading ? (
        <AppText muted variant="caption" style={styles.detail}>
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  detail: {
    paddingLeft: 18
  },
  dot: {
    borderRadius: 5,
    height: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    width: 10
  },
  line: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  wrap: {
    gap: spacing.xxs
  }
});
