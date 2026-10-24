import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { ScanBarcode } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { AppText } from "../components/AppText";
import { lookupFoodProduct, type FoodProduct } from "../features/kitchen/foodProducts";
import { useAppTheme } from "../theme/ThemeProvider";
const BarcodeCamera = lazy(() => import("./StockBarcodeCamera"));

export function StockProductLookup({ onProduct, initiallyOpen = false }: { onProduct: (product: FoodProduct) => void; initiallyOpen?: boolean }) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(initiallyOpen);
  const cameraAvailable = Boolean(requireOptionalNativeModule("ExpoCamera"));
  const [camera, setCamera] = useState(initiallyOpen && cameraAvailable);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; operation.current?.abort(); };
  }, []);
  async function lookup(barcode: string) {
    if (operation.current) return;
    setCamera(false);
    setCode(barcode);
    setError("");
    setBusy(true);
    const controller = new AbortController();
    operation.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const product = await lookupFoodProduct(barcode, i18n.language, controller.signal);
      if (!alive.current) return;
      if (controller.signal.aborted) throw new Error("productNetworkError");
      if (product) { onProduct(product); setOpen(false); }
      else setError("productNotFound");
    } catch {
      if (alive.current) setError(/^\d{8,14}$/.test(barcode) ? "productNetworkError" : "invalidBarcode");
    } finally {
      clearTimeout(timeout);
      operation.current = null;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <View style={styles.content}>
      <PrimaryButton
        compact icon={ScanBarcode} variant="secondary"
        label={t("kitchen.scanProduct")} disabled={busy}
        onPress={() => {
          setOpen(!open); setError("");
          setCamera(!open && cameraAvailable); setCameraFailed(false);
        }}
      />
      {open && (
        <>
          {camera && <Suspense fallback={<ActivityIndicator color={colors.primary} />}><BarcodeCamera onUnavailable={() => { setCamera(false); setCameraFailed(true); }} onScan={(barcode) => { void lookup(barcode); }} /></Suspense>}
          {(!cameraAvailable || cameraFailed) && !busy && <AppText muted variant="caption">{t("kitchen.cameraUnavailable")}</AppText>}
          <TextField label={t("kitchen.barcode")} value={code} onChangeText={setCode} keyboardType="number-pad" editable={!busy} onSubmitEditing={() => { void lookup(code.trim()); }} />
          {busy ? <ActivityIndicator color={colors.primary} /> : <PrimaryButton compact label={t("kitchen.findProduct")} disabled={!code.trim()} onPress={() => { void lookup(code.trim()); }} />}
          {!!error && <AppText accessibilityRole="alert" style={{ color: colors.danger }}>{t(`kitchen.${error}`)}</AppText>}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({ content: { gap: 12 } });
