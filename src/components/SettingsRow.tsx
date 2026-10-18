import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

export function SettingsRow({
  icon: Icon,
  title,
  value,
  onPress,
  danger = false,
  disabled = false,
}: {
  icon?: LucideIcon;
  title: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, value].filter(Boolean).join(", ")}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.chip : "transparent",
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {Icon ? (
        <Icon size={22} color={danger ? colors.danger : colors.primary} />
      ) : null}
      <View style={styles.copy}>
        <AppText style={danger ? { color: colors.danger } : undefined}>
          {title}
        </AppText>
        {value ? (
          <AppText muted variant="caption" numberOfLines={2}>
            {value}
          </AppText>
        ) : null}
      </View>
      <ChevronRight size={17} color={colors.textMuted} accessible={false} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
