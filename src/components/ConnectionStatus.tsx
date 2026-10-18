import { StyleSheet, View } from "react-native";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

type ConnectionStatusProps = {
  connected: boolean;
  label: string;
  detail?: string;
  loading?: boolean;
  neutral?: boolean;
};

export function ConnectionStatus({
  connected,
  label,
  detail,
  loading = false,
  neutral = false,
}: ConnectionStatusProps) {
  const { colors } = useAppTheme();
  const dotColor = neutral
    ? colors.textMuted
    : connected
      ? colors.success
      : colors.danger;

  return (
    <View
      accessibilityLabel={[label, detail].filter(Boolean).join(", ")}
      accessibilityLiveRegion={loading ? "polite" : "none"}
      style={styles.wrap}
    >
      <View style={styles.line}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: dotColor,
            },
          ]}
        />
        <AppText muted variant="caption" style={{ flexShrink: 1 }}>
          {label}
        </AppText>
      </View>
      {detail ? (
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
