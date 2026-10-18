import { Bell, BellOff } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet, View } from "react-native";
import { AppText } from "../components/AppText";
import { DisclosureSection } from "../components/DisclosureSection";
import { PrimaryButton } from "../components/PrimaryButton";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/colors";

// Apple Reminders accompanies every mode; configuring it never opens a backend.
export function ShoppingRemindersControls({
  onBusyChange,
}: {
  onBusyChange: (busy: boolean) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { sync, items } = useShoppingList();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  if (!sync.available) return null;
  async function toggle() {
    if (pending.current || sync.syncing) return;
    pending.current = true;
    setBusy(true);
    try {
      if (sync.linked) await sync.disableSync();
      else await sync.enableSync(items);
    } catch {
      Alert.alert(
        t("shoppingList.syncErrorTitle"),
        t("shoppingList.syncErrorBody"),
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={[styles.section, { borderColor: colors.border }]}>
      <DisclosureSection title={t("shoppingList.syncBannerTitle")}>
        <AppText muted variant="caption">
          {t("shoppingList.syncBannerBody")}
        </AppText>
        <PrimaryButton
          icon={sync.linked ? BellOff : Bell}
          label={t(
            sync.linked
              ? "shoppingList.syncDisable"
              : "shoppingList.syncEnable",
          )}
          variant="secondary"
          disabled={busy || sync.syncing}
          onPress={() => {
            void toggle();
          }}
        />
      </DisclosureSection>
    </View>
  );
}
const styles = StyleSheet.create({
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
});
