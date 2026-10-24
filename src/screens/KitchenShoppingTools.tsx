import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppSheet, useSheetActions } from "../components/AppSheet";
import { AppText } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import { SegmentedControl } from "../components/SegmentedControl";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import { useLocalDay } from "../features/kitchen/useLocalDay";
import type { FoodProduct } from "../features/kitchen/foodProducts";
import { StockInventoryList } from "./StockInventoryList";
import { StockProductLookup } from "./StockProductLookup";
import { StockProductScores } from "./StockProductScores";

export function KitchenShoppingTools({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (product: FoodProduct) => void }) {
  const { t } = useTranslation();
  const kitchen = useKitchen();
  const today = useLocalDay();
  const [tab, setTab] = useState("stock");
  const [product, setProduct] = useState<FoodProduct | null>(null);
  const sheet = useSheetActions(onClose);
  useEffect(() => { if (!visible) { setProduct(null); setTab("stock"); } }, [visible]);
  useEffect(() => { setProduct(null); setTab("stock"); }, [kitchen.account]);
  return <AppSheet visible={visible} title={t("kitchen.shoppingKitchen")} onClose={onClose} onDismiss={sheet.afterDismiss}>
    <View style={{ gap: 16 }}>
      <SegmentedControl options={[{ value: "stock", label: t("kitchen.nav_stock") }, { value: "scan", label: t("kitchen.scanShort") }]} value={tab} onChange={setTab} />
      {tab === "stock" ? <>
        <AppText muted variant="caption">{t("kitchen.shoppingStockHelp")}</AppText>
        {!kitchen.ready ? <AppText accessibilityRole="alert">{t("kitchen.loadError")}</AppText> : <StockInventoryList items={kitchen.data.stock} today={today} busy={false} readOnly onLocationChange={() => undefined} onEdit={() => undefined} onUse={() => undefined} onIdeas={() => undefined} />}
      </> : <>
        <StockProductLookup initiallyOpen onProduct={setProduct} />
        {product && <>
          <AppText variant="subtitle">{product.name}</AppText>
          {!!product.quantity && <AppText muted>{product.quantity}</AppText>}
          <StockProductScores item={{ ...product, id: "preview", location: "fridge", expires: "" }} />
          <PrimaryButton label={t("kitchen.storeProduct")} onPress={() => sheet.dismissThen(() => onAdd(product))} />
        </>}
      </>}
    </View>
  </AppSheet>;
}
