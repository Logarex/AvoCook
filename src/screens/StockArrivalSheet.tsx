import React, { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react-native";
import { AppSheet } from "../components/AppSheet";
import { AppText } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import { SegmentedControl } from "../components/SegmentedControl";
import { TextField } from "../components/TextField";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import { stockLocations } from "../features/kitchen/stockInventory";
import {
  applyStockArrivals,
  stockArrivalsFromShopping,
  type StockArrival,
} from "../features/kitchen/stockFlows";
import type { ShoppingListItem } from "../features/shopping/shoppingList";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/colors";
import { StockExpiryField } from "./StockExpiryField";

/** Lets the cook put checked groceries away in the fridge, cupboard or freezer. */
export function StockArrivalSheet({
  items,
  onClose,
  onStored,
}: {
  items: ShoppingListItem[];
  onClose: () => void;
  onStored: (sourceIds: string[], result: { added: number; merged: number }) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const kitchen = useKitchen();
  const [drafts, setDrafts] = useState<StockArrival[]>(() =>
    stockArrivalsFromShopping(items, kitchen.data.stock),
  );
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const selected = drafts.filter((draft) => draft.selected && draft.name.trim());
  const change = (index: number, patch: Partial<StockArrival>) =>
    setDrafts((current) =>
      current.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)),
    );
  const save = () => {
    if (pending.current || !selected.length) return;
    pending.current = true;
    setBusy(true);
    let result: ReturnType<typeof applyStockArrivals> | null = null;
    void kitchen
      .update((data) => {
        result = applyStockArrivals(data.stock, drafts);
        return { ...data, stock: result.stock };
      })
      .then(() => {
        const { added, merged } = result ?? { added: 0, merged: 0 };
        onStored(selected.map((draft) => draft.sourceId), { added, merged });
      })
      .catch(() => Alert.alert(t("common.error"), t("kitchen.saveError")))
      .finally(() => {
        pending.current = false;
        setBusy(false);
      });
  };
  return (
    <AppSheet visible title={t("kitchen.storeGroceries")} busy={busy} onClose={onClose}>
      <View style={styles.content}>
        <AppText muted>{t("kitchen.storeGroceriesHelp")}</AppText>
        {drafts.map((draft, index) => (
          <View
            key={draft.sourceId}
            style={[styles.card, { borderColor: colors.border }, !draft.selected && styles.unselected]}
          >
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: draft.selected }}
              accessibilityLabel={draft.name}
              onPress={() => change(index, { selected: !draft.selected })}
              style={styles.header}
            >
              <View
                style={[
                  styles.box,
                  { borderColor: colors.primary },
                  draft.selected && { backgroundColor: colors.primary },
                ]}
              >
                {draft.selected ? <Check size={16} color={colors.textInverted} /> : null}
              </View>
              <AppText variant="label" style={styles.flex} numberOfLines={2}>
                {draft.name}
              </AppText>
            </Pressable>
            {draft.selected ? (
              <>
                {draft.mergeWith ? (
                  <AppText muted variant="caption">{t("kitchen.storeMerge")}</AppText>
                ) : null}
                <TextField
                  label={t("kitchen.foodName")}
                  value={draft.name}
                  onChangeText={(name) => change(index, { name })}
                  editable={!busy}
                />
                <TextField
                  label={t("kitchen.quantity")}
                  value={draft.quantity}
                  placeholder={t("kitchen.quantityExample")}
                  onChangeText={(quantity) => change(index, { quantity })}
                  editable={!busy}
                />
                {!draft.mergeWith ? (
                  <SegmentedControl
                    options={stockLocations.map((value) => ({ value, label: t(`kitchen.${value}`) }))}
                    value={draft.location}
                    onChange={(location) => change(index, { location })}
                  />
                ) : null}
                <StockExpiryField value={draft.expires} onChange={(expires) => change(index, { expires })} />
              </>
            ) : null}
          </View>
        ))}
        <PrimaryButton
          label={t("kitchen.storeGroceriesAction", { count: selected.length })}
          disabled={busy || !selected.length || !kitchen.ready}
          onPress={save}
        />
      </View>
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  card: { gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md },
  unselected: { opacity: 0.6 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
});
