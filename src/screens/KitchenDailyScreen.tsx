import React, { useState } from "react";
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
  simpleMealIdeas,
} from "../features/kitchen/everyday";
import {
  localDate,
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
  onWeek,
  onRecipe,
  onFridge,
}: {
  today?: string;
  onAdd: (slot: Meal["slot"], kind?: Meal["kind"]) => void;
  onEdit: (meal: Meal) => void;
  onIdeas: (ingredients?: string) => void;
  onStock: () => void;
  onWeek: () => void;
  onRecipe: (id: string) => void;
  onFridge: () => void;
}) {
  const { t, i18n } = useTranslation();
  const kitchen = useKitchen();
  const { recipes } = useRecipes();
  const meals = kitchen.data.meals.filter((meal) => meal.date === today);
  const urgent = urgentStock(kitchen.data.stock, today);
  const recent = reusableMeals(kitchen.data.meals);
  const [used, setUsed] = useState<StockItem | null>(null);
  const [busy, setBusy] = useState(false);
  async function update(action: Parameters<typeof kitchen.update>[0]) {
    if (busy) return false;
    setBusy(true);
    try {
      await kitchen.update(action);
      return true;
    } catch {
      Alert.alert(t("common.error"), t("kitchen.saveError"));
      return false;
    } finally {
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
          <AppText variant="label">{t(`kitchen.${slot}`)}</AppText>
          {meals
            .filter((meal) => meal.slot === slot)
            .map((meal) => {
              const recipe = recipes.find(
                (recipe) => recipe.id === meal.recipeId,
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
                  <View style={styles.row}>
                    {recipe && (
                      <PrimaryButton
                        compact
                        label={t("kitchen.cooking")}
                        onPress={() => recipe.id && onRecipe(recipe.id)}
                      />
                    )}
                    <PrimaryButton
                      compact
                      variant="secondary"
                      label={t("kitchen.edit")}
                      onPress={() => onEdit(meal)}
                    />
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
            <AppText muted>{t("kitchen.notDecided")}</AppText>
          )}
          <View style={styles.row}>
            <PrimaryButton
              compact
              variant="secondary"
              label={t("kitchen.quickMeal")}
              onPress={() => onAdd(slot, "simple")}
            />
            <PrimaryButton
              compact
              variant="secondary"
              label={t("kitchen.recipe")}
              onPress={() => onAdd(slot, "recipe")}
            />
          </View>
        </GlassPanel>
      ))}
      <PrimaryButton
        compact
        variant="secondary"
        label={t("kitchen.decideTonight")}
        onPress={() => onIdeas()}
      />
    <PrimaryButton compact variant="secondary" label={t("kitchen.fridgeAction")} onPress={onFridge} />
      <PrimaryButton
        compact
        variant="ghost"
        label={t("kitchen.viewWeek")}
        onPress={onWeek}
      />
      <AppText variant="subtitle">{t("kitchen.useFirst")}</AppText>
      {!urgent.length && (
        <AppText muted>
          {t(
            kitchen.data.stock.length
              ? "kitchen.noUrgentStock"
              : "kitchen.startStock",
          )}
        </AppText>
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
            <PrimaryButton
              compact
              variant="secondary"
              label={t("kitchen.planLeftover")}
              onPress={() =>
                onEdit({
                  id: `${Date.now()}-leftover`,
                  kind: "leftovers",
                  date: today,
                  slot: "dinner",
                  title: item.name,
                  recipeId: "",
                  servings: 1,
                })
              }
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
      <PrimaryButton
        compact
        variant="secondary"
        label={t("kitchen.manageStock")}
        onPress={onStock}
      />
      {!!recent.length && (
        <>
          <AppText variant="subtitle">{t("kitchen.mealsToRepeat")}</AppText>
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
        </>
      )}
      {!!ideas.length && (
        <>
          <AppText variant="subtitle">{t("kitchen.withoutRecipe")}</AppText>
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
        </>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  panel: { gap: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
