import { ChevronDown, Cloud, Smartphone, Users } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/colors";
import { GlassSurface } from "./GlassSurface";
import { AppText } from "./AppText";

export function ShoppingModeButton({ onPress, compact = false, disabled = false }: { onPress: () => void; compact?: boolean; disabled?: boolean }) {
  const { mode, switching } = useShoppingList();
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const Icon = mode.kind === "pantry" ? Cloud : mode.kind === "firebase" ? Users : Smartphone;
  return <Pressable accessibilityRole="button" accessibilityLabel={t("shoppingModes.choose")} disabled={switching || disabled}
    onPress={onPress} style={({ pressed }) => [styles.card, compact ? styles.compact : null, { opacity: switching ? 0.5 : pressed ? 0.75 : 1 }]}>
    <GlassSurface pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]} />
    <Icon size={compact ? 16 : 22} color={colors.primary} />
    <View style={compact ? styles.compactText : styles.text}>
      <AppText variant={compact ? "caption" : "label"} numberOfLines={compact ? 1 : undefined}>{t(`shoppingModes.${mode.kind}`)}</AppText>
      {!compact ? <AppText muted variant="caption">{switching ? t("shoppingModes.switching") : t("shoppingModes.choose")}</AppText> : null}
    </View>
    <ChevronDown size={compact ? 14 : 18} color={colors.primary} />
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md },
  text: { flex: 1, gap: spacing.xxs },
  compact: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md, gap: spacing.xs },
  compactText: { flexShrink: 1 }
});
