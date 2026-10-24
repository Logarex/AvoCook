import { Archive, ArrowRight, Check, Pencil, Plus } from "lucide-react-native";
import { IconButton } from "../components/IconButton";
import { DisclosureSection } from "../components/DisclosureSection";
import { useAppTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/colors";
import React, { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
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
  simpleMealIdeas,
} from "../features/kitchen/everyday";
import {
  localDate,
  mealRecipeId,
  normalizeFood,
  type Meal,
  type StockItem,
} from "../features/kitchen/kitchen";
import { markdownToPlainText } from "../features/markdown/markdown";

export function KitchenDailyScreen({
  today = localDate(),
  onAdd,
  onEdit,
  onIdeas,
  onStock,
  onRecipe,
}: {
  today?: string;
  onAdd: (slot: Meal["slot"], kind?: Meal["kind"]) => void;
  onEdit: (meal: Meal) => void;
  onIdeas: (ingredients?: string) => void;
  onStock: () => void;
  onRecipe: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const kitchen = useKitchen();
  const { colors } = useAppTheme();
  const { recipes } = useRecipes();
  const meals = kitchen.data.meals.filter((meal) => meal.date === today);
  const urgent = urgentStock(kitchen.data.stock, today);
  const recent = reusableMeals(kitchen.data.meals);
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
  const exclusions = (kitchen.data.excludedWords ?? "")
    .split(",")
    .map(normalizeFood)
    .filter(Boolean);
  const ideas = simpleMealIdeas.filter(
    (idea) =>
      kitchen.data.dietaryPreference !== "glutenFree" &&
      (kitchen.data.dietaryPreference !== "vegan" || idea.vegan) &&
      !exclusions.some((word) =>
        normalizeFood(
          idea.ingredients.map((food) => t(`kitchen.basic_${food}`)).join(" "),
        ).includes(word),
      ),
  );
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={t("kitchen.reserveAction")} onPress={onStock} style={({ pressed }) => [styles.reserveEntry, { backgroundColor: colors.chip, opacity: pressed ? 0.7 : 1 }]}>
        <Archive size={24} color={colors.primaryStrong} />
        <View style={styles.heading}>
          <AppText variant="label">{t("kitchen.reserveAction")}</AppText>
        </View>
        <ArrowRight size={20} color={colors.primaryStrong} />
      </Pressable>
      <AppText variant="subtitle">{t("kitchen.todayMeals")}</AppText>
      <AppText muted variant="caption">
        {new Date(`${today}T12:00:00`).toLocaleDateString(i18n.language, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </AppText>
      {(["lunch", "dinner"] as const).map((slot) => (
        <GlassPanel key={slot} style={styles.panel}>
          <View style={styles.sectionHeader}>
            <AppText muted variant="label" style={styles.heading}>{t(`kitchen.${slot}`)}</AppText>
            <IconButton icon={Plus} label={`${t("kitchen.addMeal")} · ${t(`kitchen.${slot}`)}`} onPress={() => onAdd(slot, recipes.length ? "recipe" : "simple")} tone="primary" />
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
                  : (recipe?.name ?? t("kitchen.unavailableRecipe"));
              return (
                <View key={meal.id} style={styles.panel}>
                  <AppText variant="subtitle">
                    {meal.completed ? "✓ " : ""}
                    {markdownToPlainText(title ?? "")}
                  </AppText>
                  {!!meal.notes && <AppText muted>{meal.notes}</AppText>}
                  <View style={styles.row}>
                    {recipe && (
                      <PrimaryButton
                        compact
                        label={t("kitchen.cooking")}
                        onPress={() => recipe.id && onRecipe(recipe.id)}
                      />
                    )}
                    <IconButton icon={Pencil} label={t("kitchen.edit")} onPress={() => onEdit(meal)} />
                    <IconButton
                      icon={Check}
                      tone={meal.completed ? "primary" : "default"}
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
            <AppText muted>{t("kitchen.notDecided")}</AppText>
          )}

        </GlassPanel>
      ))}
      {!!pastDates && <PrimaryButton compact variant="secondary" label={t("kitchen.checkDates", { count: pastDates })} onPress={onStock} />}
      <View style={styles.section}>
        <PrimaryButton
          compact
          label={t("kitchen.decideTonight")}
          onPress={() => onIdeas()}
        />
        <PrimaryButton compact variant="secondary" label={t("kitchen.simple")} onPress={() => onAdd("dinner", "simple")} />
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
      {!!ideas.length && (
        <DisclosureSection title={t("kitchen.withoutRecipe")}>
          <AppText muted variant="caption">
            {t("kitchen.simpleIdeasHelp")}
          </AppText>
          {ideas.map((idea) => (
            <GlassPanel key={idea.id} style={styles.panel}>
              <AppText variant="label">{t(`kitchen.idea_${idea.id}`)}</AppText>
              <AppText muted>
                {idea.ingredients
                  .map((food) => t(`kitchen.basic_${food}`))
                  .join(" · ")}
              </AppText>
              <PrimaryButton
                compact
                variant="secondary"
                label={t("kitchen.chooseMeal")}
                onPress={() =>
                  onEdit({
                    id: `${Date.now()}-${idea.id}`,
                    kind: "simple",
                    date: today,
                    slot: "dinner",
                    title: t(`kitchen.idea_${idea.id}`),
                    recipeId: "",
                    servings: 1,
                    ingredients: idea.ingredients.map((food) =>
                      t(`kitchen.basic_${food}`),
                    ),
                  })
                }
              />
            </GlassPanel>
          ))}
        </DisclosureSection>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  reserveEntry: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, minHeight: 48 },
  section: { gap: spacing.xs, marginVertical: spacing.sm },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  heading: { flex: 1, minWidth: 0 },
  panel: { gap: spacing.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
