import React from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import type { StockItem } from "../features/kitchen/kitchen";
import { DisclosureSection } from "../components/DisclosureSection";
import { nutrientFields } from "../features/kitchen/foodProducts";
import { useAppTheme } from "../theme/ThemeProvider";

export function StockProductScores({ item }: { item: StockItem }) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  if (!item.barcode) return null;
  return (
    <View style={styles.content}>
      {!item.nutriScore && !item.greenScore && <AppText muted variant="caption">{t("kitchen.scoresMissing")}</AppText>}
      <View style={styles.row}>
        {[["Nutri-Score", item.nutriScore], [t("kitchen.greenScore"), item.greenScore]].map(([label, grade]) => (
          <View key={label} style={[styles.badge, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
            <AppText variant="caption">{label}</AppText>
            <AppText variant="label" style={{ color: !grade ? colors.textMuted : grade === "A" || grade === "B" ? colors.success : grade === "C" ? colors.warning : colors.danger }}>{grade ?? "—"}</AppText>
          </View>
        ))}
      </View>
      <DisclosureSection title={t("kitchen.nutritionDetails")}>
        <AppText muted variant="caption">{t("kitchen.scoresHelp")}</AppText>
        <AppText muted variant="caption">{t("kitchen.nutritionBasis")}</AppText>
        {Object.keys(nutrientFields).map((key) => {
          const value = item.nutrients?.[key as keyof typeof nutrientFields];
          return value === undefined ? null : <View key={key} style={styles.nutrient}>
            <AppText style={{ flex: 1 }}>{t(`kitchen.nutrient_${key}`)}</AppText>
            <AppText>{value.toLocaleString(i18n.language, { maximumFractionDigits: 2 })} {key === "energy" ? "kcal" : "g"}</AppText>
          </View>;
        })}
      </DisclosureSection>
      <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(`https://world.openfoodfacts.org/product/${item.barcode}`).catch(() => undefined); }} style={styles.source}>
        <AppText muted variant="caption">{t("kitchen.scoresSource")}</AppText>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({ content: { gap: 4 }, nutrient: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 4 }, row: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, badge: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth }, source: { minHeight: 44, justifyContent: "center" } });
