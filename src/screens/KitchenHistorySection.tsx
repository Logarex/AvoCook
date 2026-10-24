import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { DisclosureSection } from "../components/DisclosureSection";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import { SegmentedControl } from "../components/SegmentedControl";
import { TextField } from "../components/TextField";
import { filterKitchenHistory, parseHistorySearch, type KitchenHistoryEntry } from "../features/kitchen/history";
import type { Meal } from "../features/kitchen/kitchen";
import { markdownToPlainText } from "../features/markdown/markdown";
import { StockExpiryField } from "./StockExpiryField";

export function KitchenHistorySection({ entries, onAdd, onEdit, onRepeat, onRecipe, onJournal }: {
  entries: KitchenHistoryEntry[];
  onAdd: () => void;
  onEdit: (meal: Meal) => void;
  onRepeat: (meal: Meal) => void;
  onRecipe: (id: string) => void;
  onJournal: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<Meal["slot"] | "all">("all");
  const [limit, setLimit] = useState(20);
  const results = useMemo(() => filterKitchenHistory(entries, query, date, slot), [entries, query, date, slot]);
  return <>
    <PrimaryButton label={t("kitchen.recordMeal")} onPress={onAdd} />
    {!!entries.length && <View style={{ gap: 12 }}>
      <TextField hideLabel label={t("kitchen.searchHistory")} placeholder={t("kitchen.historySearchExample")} value={query} onChangeText={(value) => { setQuery(value); setLimit(20); }} />
      <DisclosureSection title={t("kitchen.showFilters")}>
      <StockExpiryField label={t("kitchen.historyDate")} value={date} onChange={(value) => { setDate(value); setLimit(20); }} />
      <SegmentedControl options={[{ value: "all", label: t("kitchen.allMeals") }, { value: "lunch", label: t("kitchen.lunch") }, { value: "dinner", label: t("kitchen.dinner") }]} value={slot} onChange={(value) => { setSlot(value); setLimit(20); }} />
      </DisclosureSection>
      {parseHistorySearch(query).invalidDate && <AppText accessibilityRole="alert">{t("kitchen.historyInvalidDate")}</AppText>}
      {(query || date || slot !== "all") && <PrimaryButton compact variant="ghost" label={t("kitchen.clearHistorySearch")} onPress={() => { setQuery(""); setDate(""); setSlot("all"); setLimit(20); }} />}
    </View>}
    {!entries.length && <AppText muted>{t("kitchen.emptyHistory")}</AppText>}
    {!!entries.length && !results.length && <AppText muted accessibilityLiveRegion="polite">{t("kitchen.noResults")}</AppText>}
    {results.slice(0, limit).map(({ id, recipe, recipeId, meal, date: mealDate }) => <GlassPanel key={id} style={{ gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t(meal ? "kitchen.editMemory" : "kitchen.journal")} onPress={() => meal ? onEdit(meal) : recipeId && onJournal(recipeId)} style={{ gap: 6 }}>
      <AppText variant="subtitle">{markdownToPlainText(meal?.kind && meal.kind !== "recipe" ? meal.title || t(`kitchen.${meal.kind}`) : recipe?.name ?? t("kitchen.unavailableRecipe"))}</AppText>
      <AppText muted>{new Date(`${mealDate}T12:00:00`).toLocaleDateString(i18n.language, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}{meal ? ` · ${t(`kitchen.${meal.slot}`)}` : ""}</AppText>
      </Pressable>
      {!!meal?.notes && <AppText numberOfLines={3}>{meal.notes}</AppText>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {meal && <PrimaryButton compact variant="ghost" label={t("kitchen.repeatMeal")} onPress={() => onRepeat(meal)} />}
        {recipeId && recipe && <PrimaryButton compact variant="ghost" label={t("kitchen.recipe")} onPress={() => onRecipe(recipeId)} />}
      </View>
    </GlassPanel>)}
    {results.length > limit && <PrimaryButton compact variant="secondary" label={t("kitchen.showMore")} onPress={() => setLimit((value) => value + 20)} />}
  </>;
}
