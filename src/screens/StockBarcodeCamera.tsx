import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "../components/PrimaryButton";
import { AppText } from "../components/AppText";

export default function StockBarcodeCamera({ onScan, onUnavailable }: { onScan: (code: string) => void; onUnavailable: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const { t } = useTranslation();
  const scanned = useRef(false);
  const requested = useRef(false);
  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain || requested.current) return;
    requested.current = true;
    void requestPermission();
  }, [permission, requestPermission]);
  if (!permission?.granted) {
    return permission?.canAskAgain ? (
      <PrimaryButton compact label={t("kitchen.cameraAccess")} onPress={() => { void requestPermission(); }} />
    ) : <AppText muted variant="caption">{t("kitchen.cameraUnavailable")}</AppText>;
  }
  return (
    <View style={styles.frame}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onMountError={onUnavailable}
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
        onBarcodeScanned={({ data }) => {
          if (scanned.current || !/^\d{8,14}$/.test(data)) return;
          scanned.current = true;
          onScan(data);
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({ frame: { height: 180, borderRadius: 16, overflow: "hidden" } });
