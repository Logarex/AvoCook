import { ChevronDown, Cloud, Smartphone, Users } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/colors";
import { AppText } from "./AppText";

export function ShoppingModeButton({ onPress, compact = false }: { onPress: () => void; compact?: boolean }) {
  const { mode, switching } = useShoppingList();
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const Icon = mode.kind === "pantry" ? Cloud : mode.kind === "firebase" ? Users : Smartphone;
  return <Pressable accessibilityRole="button" accessibilityLabel={t("shoppingModes.choose")} disabled={switching}
    onPress={onPress} style={({ pressed }) => [styles.card, compact ? styles.compact : null, { backgroundColor: colors.chip, borderColor: colors.border, opacity: switching ? 0.5 : pressed ? 0.75 : 1 }]}>
    <Icon size={compact ? 16 : 22} color={colors.primary} />
    <View style={compact ? styles.compactText : styles.text}>
      <AppText variant={compact ? "caption" : "label"}>{t(`shoppingModes.${mode.kind}`)}</AppText>
      {!compact ? <AppText muted variant="caption">{switching ? t("shoppingModes.switching") : t("shoppingModes.choose")}</AppText> : null}
    </View>
    <ChevronDown size={compact ? 14 : 18} color={colors.primary} />
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  text: { flex: 1, gap: spacing.xxs },
  compact: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, gap: spacing.xs },
  compactText: { flexShrink: 1 }
});
