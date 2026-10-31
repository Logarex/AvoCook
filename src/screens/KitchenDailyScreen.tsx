import { Plus } from "lucide-react-native";
import { IconButton } from "../components/IconButton";
import { DisclosureSection } from "../components/DisclosureSection";
import { spacing } from "../theme/colors";
import React, { useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import {
  reusableMeals,
  repeatMeal,
  urgentStock,
} from "../features/kitchen/everyday";
import {
  localDate,
  mealRecipeId,
  type Meal,
  type StockItem,
} from "../features/kitchen/kitchen";
import { markdownToPlainText } from "../features/markdown/markdown";
import { useAdaptiveLayout } from "../hooks/useAdaptiveLayout";

export function KitchenDailyScreen({
  today = localDate(),
  onAdd,
  onEdit,
  onIdeas,
  onStock,
  onRecipe,
  onRecord,
}: {
  today?: string;
  onAdd: (slot: Meal["slot"], kind?: Meal["kind"]) => void;
  onEdit: (meal: Meal) => void;
  onIdeas: (ingredients?: string) => void;
  onStock: () => void;
  onRecipe: (id: string) => void;
  onRecord?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const kitchen = useKitchen();
  const { recipes } = useRecipes();
  const { columns } = useAdaptiveLayout();
  const meals = kitchen.data.meals.filter((meal) => meal.date === today);
  const urgent = urgentStock(kitchen.data.stock, today);
  const recent = reusableMeals(kitchen.data.meals.filter((meal) => meal.date < today));
  const decided = (["lunch", "dinner"] as const).filter((slot) => meals.some((meal) => meal.slot === slot)).length;
  const [used, setUsed] = useState<StockItem | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const pastDates = kitchen.data.stock.filter((item) => item.expires && item.expires < today).length;
  async function update(action: Parameters<typeof kitchen.update>[0]) {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    try {
      await kitchen.update(action);
      return true;
    } catch {
      Alert.alert(t("common.error"), t("kitchen.saveError"));
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <View style={styles.dayHeading}>
      <AppText variant="subtitle">{t("kitchen.todayMeals")}</AppText>
      <AppText muted variant="caption">
        {new Date(`${today}T12:00:00`).toLocaleDateString(i18n.language, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </AppText>
      <AppText muted variant="caption" accessibilityLiveRegion="polite">{t(decided === 2 ? "kitchen.dayReady" : "kitchen.dayToPlan", { count: 2 - decided })}</AppText>
      </View>
      <View testID="daily-meal-slots" style={[styles.mealSlots, { flexDirection: columns > 1 ? "row" : "column" }]}>
        {(["lunch", "dinner"] as const).map((slot) => (
          <GlassPanel key={slot} style={[styles.panel, columns > 1 && styles.mealColumn]}>
            <View style={styles.sectionHeader}>
              <AppText muted variant="label" style={styles.heading}>{t(`kitchen.${slot}`)}</AppText>
              {meals.some((meal) => meal.slot === slot) && <IconButton icon={Plus} label={`${t("kitchen.addMeal")} · ${t(`kitchen.${slot}`)}`} onPress={() => onAdd(slot, "simple")} tone="primary" />}
            </View>
            {meals
              .filter((meal) => meal.slot === slot)
              .map((meal) => {
                const recipe = recipes.find(
                  (recipe) => recipe.id === mealRecipeId(meal),
                );
                const title =
                  meal.kind && meal.kind !== "recipe"
                    ? meal.title
                    : (meal.title?.trim() || recipe?.name || t("kitchen.unavailableRecipe"));
                return (
                  <View key={meal.id} style={styles.panel}>
                    <AppText variant="subtitle">
                      {meal.completed ? "✓ " : ""}
                      {markdownToPlainText(title ?? "")}
                    </AppText>
                    <AppText muted variant="caption">{t(meal.completed ? "kitchen.alreadyEaten" : "kitchen.plannedMeal")}</AppText>
                    {!!meal.notes && <AppText muted>{meal.notes}</AppText>}
                    <View style={styles.row}>
                      {recipe && (
                        <PrimaryButton
                          compact
                          label={t("kitchen.cooking")}
                          onPress={() => recipe.id && onRecipe(recipe.id)}
                        />
                      )}
                      <PrimaryButton compact variant="ghost" label={t("kitchen.edit")} onPress={() => onEdit(meal)} />
                      <PrimaryButton
                        compact
                        variant="secondary"
                        disabled={busy}
                        label={t(
                          meal.completed
                            ? "kitchen.undoCooked"
                            : "kitchen.markDone",
                        )}
                        onPress={() => {
                          void update((data) => ({
                            ...data,
                            meals: data.meals.map((entry) =>
                              entry.id === meal.id
                                ? { ...entry, completed: !entry.completed }
                                : entry,
                            ),
                          }));
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            {!meals.some((meal) => meal.slot === slot) && (
              <View style={styles.panel}>
                <PrimaryButton variant="secondary" label={t("kitchen.planSlot", { slot: t(`kitchen.${slot}`).toLocaleLowerCase(i18n.language) })} onPress={() => onAdd(slot, "simple")} />
              </View>
            )}

          </GlassPanel>
        ))}
      </View>
      {!!pastDates && <PrimaryButton compact variant="secondary" label={t("kitchen.checkDates", { count: pastDates })} onPress={onStock} />}
      <View
        testID="daily-meal-actions"
        style={[styles.section, { flexDirection: columns > 1 ? "row" : "column" }]}
      >
        <PrimaryButton
          fillAvailableSpace
          numberOfLines={0}
          style={columns > 1 ? styles.mealColumn : undefined}
          variant={decided === 2 ? "secondary" : "primary"}
          label={t("kitchen.decideTonight")}
          onPress={() => onIdeas()}
        />
        {onRecord && <PrimaryButton fillAvailableSpace numberOfLines={0} variant="secondary" label={t("kitchen.recordMeal")} onPress={onRecord} />}
      </View>
      {(urgent.length > 0 || used) && (
        <AppText variant="subtitle">{t("kitchen.useFirst")}</AppText>
      )}
      {urgent.slice(0, 3).map((item) => (
        <GlassPanel key={item.id} style={styles.panel}>
          <AppText variant="label">
            {item.name}
            {item.quantity ? ` · ${item.quantity}` : ""}
          </AppText>
          <AppText muted variant="caption">
            {t("kitchen.enteredDate", {
              date: new Date(`${item.expires}T12:00:00`).toLocaleDateString(
                i18n.language,
              ),
            })}
          </AppText>
          <View style={styles.row}>
            <PrimaryButton
              compact
              label={t("kitchen.findUse")}
              onPress={() => onIdeas(item.name)}
            />
            <PrimaryButton
              compact
              variant="secondary"
              disabled={busy}
              label={t("kitchen.usedUp")}
              onPress={() => {
                void update((data) => ({
                  ...data,
                  stock: data.stock.filter((entry) => entry.id !== item.id),
                })).then((saved) => {
                  if (saved) setUsed(item);
                });
              }}
            />
          </View>
        </GlassPanel>
      ))}
      {used && (
        <PrimaryButton
          compact
          variant="secondary"
          disabled={busy}
          label={t("kitchen.undoUsed", { name: used.name })}
          onPress={() => {
            void update((data) => ({
              ...data,
              stock: data.stock.some((item) => item.id === used.id)
                ? data.stock
                : [...data.stock, used],
            })).then((saved) => {
              if (saved) setUsed(null);
            });
          }}
        />
      )}
      {urgent.length > 0 && (
        <PrimaryButton compact variant="ghost" label={t("kitchen.manageStock")} onPress={onStock} />
      )}
      {!!recent.length && (
        <DisclosureSection title={t("kitchen.mealsToRepeat")}>
          <AppText muted variant="caption">
            {t("kitchen.repeatHelp")}
          </AppText>
          {recent.map((meal) => (
            <PrimaryButton
              compact
              numberOfLines={0}
              key={meal.id}
              variant="secondary"
              label={meal.title!}
              onPress={() => onEdit(repeatMeal(meal, today))}
            />
          ))}
        </DisclosureSection>
      )}

    </>
  );
}
const styles = StyleSheet.create({
  dayHeading: { gap: 4 },
  mealSlots: { gap: spacing.md, alignItems: "stretch" },
  mealColumn: { flex: 1, minWidth: 0 },
  section: { gap: spacing.sm, marginVertical: spacing.sm, alignItems: "stretch" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  heading: { flex: 1, minWidth: 0 },
  panel: { gap: spacing.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
