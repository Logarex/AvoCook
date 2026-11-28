import { AlertCircle, ChevronDown, Cloud, RefreshCw, Smartphone } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { usePantryInventoryState } from "../features/pantry/usePantryInventory";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/colors";

/** Where the inventory lives and whether it is up to date; opens the inventory options. */
export function InventorySyncBar({ onPress }: { onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const sync = usePantryInventoryState();
  const active = Boolean(sync.config);
  const Icon = !active ? Smartphone : sync.error ? AlertCircle : sync.syncing ? RefreshCw : Cloud;
  const title = active && sync.config ? `${t("inventorySync.pantry")} · ${sync.config.house.name}` : t("inventorySync.local");
  const time = sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" }) : "";
  const status = !active
    ? t("inventorySync.localStatus")
    : sync.syncing
      ? t("inventorySync.syncing")
      : sync.error
        ? t("inventorySync.offlineStatus")
        : time ? t("inventorySync.syncedAt", { time }) : t("inventorySync.neverSynced");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("inventorySync.title")}
      accessibilityValue={{ text: `${title}, ${status}` }}
      onPress={onPress}
      style={({ pressed }) => [styles.bar, { backgroundColor: pressed ? colors.chip : colors.backgroundElevated, borderColor: sync.error && active ? colors.danger : colors.border }]}
    >
      <Icon size={20} color={sync.error && active ? colors.danger : colors.primaryStrong} />
      <View style={styles.copy}>
        <AppText variant="label" numberOfLines={1}>{title}</AppText>
        <AppText muted variant="caption" numberOfLines={1} accessibilityLiveRegion="polite">{status}</AppText>
      </View>
      <ChevronDown size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
