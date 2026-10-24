import React, { useRef, useState } from "react";
import { Alert, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppSheet } from "../components/AppSheet";
import { AppText } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import { SegmentedControl } from "../components/SegmentedControl";
import { TextField } from "../components/TextField";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import { newKitchenId, type StockItem } from "../features/kitchen/kitchen";
import { stockDuplicates, stockLocations } from "../features/kitchen/stockInventory";

export function StockQuickAdd({ location: initialLocation, onClose }: { location: StockItem["location"]; onClose: () => void }) {
  const { t } = useTranslation();
  const kitchen = useKitchen();
  const [text, setText] = useState("");
  const [location, setLocation] = useState(initialLocation);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const names = text.split(/[,\n]/).map((name) => name.trim()).filter(Boolean);
  const duplicates = names.length > 100 ? [] : names.filter((name, index) => stockDuplicates([
    ...kitchen.data.stock,
    ...names.slice(0, index).map((previous, i) => ({ id: `draft:${i}`, name: previous, quantity: "", expires: "", location })),
  ], { name }).length > 0);
  return <AppSheet visible title={t("kitchen.quickStock")} busy={busy} onClose={onClose}>
    <View style={{ gap: 16 }}>
      <TextField label={t("kitchen.foodNames")} placeholder={t("kitchen.foodNamesExample")} value={text} onChangeText={setText} multiline autoFocus maxLength={10000} editable={!busy} />
      <SegmentedControl options={stockLocations.map((value) => ({ value, label: t(`kitchen.${value}`) }))} value={location} onChange={setLocation} />
      {!!duplicates.length && <AppText accessibilityLiveRegion="polite">{t("kitchen.quickStockDuplicates", { names: [...new Set(duplicates)].join(", ") })}</AppText>}
      {names.length > 100 && <AppText accessibilityRole="alert">{t("kitchen.quickStockLimit")}</AppText>}
      <PrimaryButton label={t("kitchen.saveFoods", { count: names.length })} disabled={busy || !names.length || names.length > 100 || !kitchen.ready} onPress={() => {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        void kitchen.update((data) => ({ ...data, stock: [...data.stock, ...names.map((name) => ({ id: newKitchenId(), name, quantity: "", expires: "", location }))] }))
          .then(onClose)
          .catch(() => Alert.alert(t("common.error"), t("kitchen.saveError")))
          .finally(() => { pending.current = false; setBusy(false); });
      }} />
    </View>
  </AppSheet>;
}
