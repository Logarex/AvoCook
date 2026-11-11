import React, { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react-native";
import { AppSheet } from "../components/AppSheet";
import { AppText } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import { applyStockUses, type StockUse } from "../features/kitchen/stockFlows";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/colors";

/** After cooking, proposes which stock items to reduce or remove; nothing changes without confirmation. */
export function CookingStockSheet({ uses: initial, onDone }: { uses: StockUse[]; onDone: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const kitchen = useKitchen();
  const [uses, setUses] = useState(initial);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const selected = uses.filter((use) => use.selected).length;
  const save = () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    void kitchen
      .update((data) => ({ ...data, stock: applyStockUses(data.stock, uses) }))
      .then(onDone)
      .catch(() => Alert.alert(t("common.error"), t("kitchen.saveError")))
      .finally(() => {
        pending.current = false;
        setBusy(false);
      });
  };
  return (
    <AppSheet visible title={t("kitchen.cookedStockTitle")} busy={busy} onClose={onDone}>
      <View style={styles.content}>
        <AppText muted>{t("kitchen.cookedStockHelp")}</AppText>
        {uses.map((use, index) => {
          const change = use.after === null
            ? t("kitchen.cookedStockRemove")
            : t("kitchen.cookedStockReduce", { before: use.before, after: use.after });
          return (
            <Pressable
              key={use.stockId}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: use.selected }}
              accessibilityLabel={`${use.name}, ${change}`}
              onPress={() =>
                setUses((current) =>
                  current.map((entry, i) => (i === index ? { ...entry, selected: !entry.selected } : entry)),
                )
              }
              style={[styles.row, { borderColor: colors.border }]}
            >
              <View style={[styles.box, { borderColor: colors.primary }, use.selected && { backgroundColor: colors.primary }]}>
                {use.selected ? <Check size={16} color={colors.textInverted} /> : null}
              </View>
              <View style={styles.text}>
                <AppText variant="label">{use.name}</AppText>
                <AppText muted variant="caption">{use.ingredient}</AppText>
                <AppText variant="caption">{change}</AppText>
              </View>
            </Pressable>
          );
        })}
        <PrimaryButton
          label={t("kitchen.cookedStockApply", { count: selected })}
          disabled={busy || !selected || !kitchen.ready}
          onPress={save}
        />
        <PrimaryButton label={t("kitchen.cookedStockSkip")} variant="ghost" disabled={busy} onPress={onDone} />
      </View>
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "center", borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
});
