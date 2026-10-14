import { Bell, BellOff } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/colors";

// Apple Reminders accompanies every mode; configuring it never opens a backend.
export function ShoppingRemindersControls({ onBusyChange }: { onBusyChange: (busy: boolean) => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { sync, items } = useShoppingList();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
  if (!sync.available) return null;
  async function toggle() {
    if (pending.current || sync.syncing) return;
    pending.current = true; setBusy(true);
    try { if (sync.linked) await sync.disableSync(); else await sync.enableSync(items); }
    catch { Alert.alert(t("shoppingList.syncErrorTitle"), t("shoppingList.syncErrorBody")); }
    finally { pending.current = false; setBusy(false); }
  }
  return <View style={[styles.section, { borderColor: colors.border }]}>
    <View style={styles.title}>
      <Bell size={22} color={colors.primary} />
      <AppText variant="label" style={styles.flex}>{t("shoppingList.syncBannerTitle")}</AppText>
    </View>
    <AppText muted variant="caption">{t("shoppingList.syncBannerBody")}</AppText>
    <PrimaryButton
      icon={sync.linked ? BellOff : Bell}
      label={t(sync.linked ? "shoppingList.syncDisable" : "shoppingList.syncEnable")}
      variant={sync.linked ? "danger" : "secondary"}
      disabled={busy || sync.syncing}
      onPress={() => { void toggle(); }}
    />
  </View>;
}
const styles = StyleSheet.create({
  section: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, gap: spacing.sm },
  title: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1 }
});
