import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Archive, Check, ChevronDown, Pencil, Refrigerator, Snowflake, Utensils } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { shiftDate, type StockItem } from "../features/kitchen/kitchen";
import { stockGroups, stockLocations, type StockFilter } from "../features/kitchen/stockInventory";
import { useAppTheme } from "../theme/ThemeProvider";
import { StockProductScores } from "./StockProductScores";
const locationIcons = { fridge: Refrigerator, cupboard: Archive, freezer: Snowflake };

export function StockInventoryList({ items, today, busy, onEdit, onUse, onIdeas, onLocationChange, readOnly = false }: {
  readOnly?: boolean;
  items: StockItem[];
  today: string;
  busy: boolean;
  onLocationChange: (location: StockItem["location"]) => void;
  onEdit: (item: StockItem) => void;
  onUse: (item: StockItem) => void;
  onIdeas: (item: StockItem) => void;
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const [filter, setFilter] = useState<StockFilter>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const counts = useMemo(() => {
    const result = { fridge: 0, cupboard: 0, freezer: 0 };
    for (const item of items) result[item.location]++;
    return result;
  }, [items]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const groups = useMemo(() => stockGroups(items, query, filter, i18n.language), [items, query, filter, i18n.language]);
  if (!items.length) return <AppText muted>{t("kitchen.emptyStock")}</AppText>;
  return (
    <View style={styles.content}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {(["all", ...stockLocations] as const).map((location) => {
          const selected = filter === location;
          const count = location === "all" ? items.length : counts[location];
          return (
            <Pressable key={location} accessibilityRole="button" accessibilityState={{ selected }}
              accessibilityLabel={`${t(location === "all" ? "kitchen.allLocations" : `kitchen.${location}`)} · ${count}`}
              onPress={() => { setFilter(location); setLimit(20); setExpanded(null); if (location !== "all") onLocationChange(location); }}
              style={({ pressed }) => [styles.filter, { backgroundColor: selected ? colors.chip : colors.backgroundElevated, borderColor: selected ? colors.primary : colors.border, opacity: pressed ? 0.7 : 1 }]}>
              <AppText variant="caption" style={{ color: selected ? colors.primaryStrong : colors.textMuted }}>{t(location === "all" ? "kitchen.allLocations" : `kitchen.${location}`)}</AppText>
              <AppText muted variant="caption">{count}</AppText>
            </Pressable>
          );
        })}
      </ScrollView>
      {(items.length > 5 || query) && <TextField hideLabel label={t("common.search")} placeholder={t("common.search")} value={query} onChangeText={(value) => { setQuery(value); setLimit(20); setExpanded(null); }} />}
      {!groups.length && <AppText muted accessibilityLiveRegion="polite">{t("kitchen.noFoodFound")}</AppText>}
      {groups.map((group) => {
        const Icon = locationIcons[group.location];
        return (
          <View key={group.location} style={styles.group}>
            <View style={styles.groupHeading}>
              <Icon size={19} color={colors.primaryStrong} />
              <AppText variant="label" style={styles.flex}>{t(`kitchen.${group.location}`)}</AppText>
              <AppText muted variant="caption">{group.items.length}</AppText>
            </View>
            <View style={[styles.list, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
              {group.items.slice(0, limit).map((item, index) => {
                const open = expanded === item.id;
                const expired = !!item.expires && item.expires < today;
                const soon = !!item.expires && !expired && item.expires <= shiftDate(today, 3);
                const dateColor = expired ? colors.danger : soon ? colors.warning : colors.textMuted;
                const date = item.expires ? new Date(`${item.expires}T12:00:00`).toLocaleDateString(i18n.language, { day: "numeric", month: "short", ...(item.expires.slice(0, 4) !== today.slice(0, 4) ? { year: "numeric" as const } : {}) }) : t("kitchen.noExpiry");
                const status = expired ? `${t("kitchen.expiredShort")} · ${date}` : soon ? `${t("kitchen.soonShort")} · ${date}` : date;
                return (
                  <View key={item.id} style={index ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border } : undefined}>
                    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={[item.name, item.quantity, status].filter(Boolean).join(", ")}
                      onPress={() => setExpanded(open ? null : item.id)}
                      style={({ pressed }) => [styles.product, { opacity: pressed ? 0.65 : 1 }]}>
                      <View style={styles.productCopy}>
                        <AppText variant="label">{item.name}</AppText>
                        {!!item.quantity && <AppText muted variant="caption">{item.quantity}</AppText>}
                        <AppText variant="caption" style={{ color: dateColor }}>{status}</AppText>
                      </View>
                      <ChevronDown size={18} color={colors.textMuted} style={open ? { transform: [{ rotate: "180deg" }] } : undefined} />
                    </Pressable>
                    {open && <View style={styles.details}>
                      {expired && <AppText muted variant="caption">{t("kitchen.datePassed")}</AppText>}
                      <StockProductScores item={item} />
                      {!readOnly && <View style={styles.actions}>
                        {!expired && <PrimaryButton compact icon={Utensils} variant="ghost" label={t("kitchen.findUse")} onPress={() => onIdeas(item)} />}
                        <PrimaryButton compact icon={Pencil} variant="ghost" label={t("kitchen.edit")} onPress={() => onEdit(item)} />
                        <PrimaryButton compact icon={Check} variant="ghost" disabled={busy} label={t(expired ? "kitchen.remove" : "kitchen.usedUp")} onPress={() => onUse(item)} />
                      </View>}
                    </View>}
                  </View>
                );
              })}
            </View>
            {group.items.length > limit && <PrimaryButton compact variant="ghost" label={t("kitchen.moreFood")} onPress={() => setLimit((value) => value + 20)} />}
          </View>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  content: { gap: 20 }, filters: { flexDirection: "row", gap: 8 },
  filter: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth },
  group: { gap: 10 }, groupHeading: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 }, flex: { flex: 1 },
  list: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  product: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, minHeight: 76 }, productCopy: { flex: 1, minWidth: 0, gap: 4 },
  details: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 }, actions: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
});
