import React, { useState } from "react";
import { Switch, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { DisclosureSection } from "../components/DisclosureSection";
import { PrimaryButton } from "../components/PrimaryButton";
import { SegmentedControl } from "../components/SegmentedControl";
import { TextField } from "../components/TextField";
import { validDate, type Meal } from "../features/kitchen/kitchen";
import type { Recipe } from "../features/recipes/types";
import { markdownToPlainText } from "../features/markdown/markdown";
import { useAppTheme } from "../theme/ThemeProvider";
import { StockExpiryField } from "./StockExpiryField";

export function KitchenMealEditor({ meal, onChange, recipes, servings, onServings, ingredients, onIngredients, history, today, busy, onChooseRecipe, onSave, onDelete }: {
  meal: Meal; onChange: (meal: Meal) => void; recipes: Recipe[];
  servings: string; onServings: (value: string) => void;
  ingredients: string; onIngredients: (value: string) => void;
  history: boolean; today: string; busy: boolean;
  onChooseRecipe: () => void; onSave: () => void; onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [noteOpen, setNoteOpen] = useState(Boolean(meal.notes));
  const isRecipe = !meal.kind || meal.kind === "recipe";
  const recipe = recipes.find((entry) => entry.id === (isRecipe ? meal.recipeId : meal.linkedRecipeId));
  const invalidFuture = Boolean(meal.completed) && meal.date > today;
  const canSave = !busy && !invalidFuture && (isRecipe ? Boolean(meal.recipeId) : Boolean(meal.title?.trim())) && validDate(meal.date) && /^\d+$/.test(servings) && Number(servings) >= 1 && Number(servings) <= 1000;
  return <View style={{ gap: 16 }}>
    {isRecipe ? <PrimaryButton variant="secondary" numberOfLines={0} label={recipe ? markdownToPlainText(recipe.name) : t("kitchen.chooseRecipes")} onPress={onChooseRecipe} /> :
      <TextField hideLabel label={t(history ? "kitchen.mealEatenName" : "kitchen.mealName")} placeholder={t(history ? "kitchen.mealEatenName" : "kitchen.mealName")} value={meal.title ?? ""} onChangeText={(title) => onChange({ ...meal, title })} />}
    <StockExpiryField label={t("kitchen.mealDate")} allowClear={false} value={meal.date} onChange={(date) => onChange({ ...meal, date })} />
    <SegmentedControl options={(["lunch", "dinner"] as const).map((value) => ({ value, label: t(`kitchen.${value}`) }))} value={meal.slot} onChange={(slot) => onChange({ ...meal, slot })} />
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {!isRecipe && <PrimaryButton compact variant="ghost" label={t("kitchen.recipe")} onPress={() => { onChange({ ...meal, kind: "recipe", recipeId: meal.linkedRecipeId ?? "" }); onChooseRecipe(); }} />}
      {!noteOpen && <PrimaryButton compact variant="ghost" label={t("kitchen.addMealNote")} onPress={() => setNoteOpen(true)} />}
    </View>
    {noteOpen && <TextField hideLabel label={t("kitchen.mealNotes")} placeholder={t("kitchen.shortMealNote")} value={meal.notes ?? ""} onChangeText={(notes) => onChange({ ...meal, notes })} multiline />}
    {invalidFuture && <AppText accessibilityRole="alert">{t("kitchen.futureEaten")}</AppText>}
    <PrimaryButton label={t("common.save")} disabled={!canSave} onPress={onSave} />
    <DisclosureSection title={t("kitchen.moreOptions")}>
      <SegmentedControl options={(["recipe", "simple", "leftovers", "out"] as const).map((value) => ({ value, label: t(`kitchen.${value}`) }))} value={meal.kind ?? "recipe"} onChange={(kind) => onChange({
        ...meal, kind,
        title: meal.title || (kind === "out" || kind === "leftovers" ? t(`kitchen.${kind}`) : ""),
        recipeId: kind === "recipe" ? meal.recipeId || meal.linkedRecipeId || "" : "",
        linkedRecipeId: kind === "recipe" ? undefined : meal.linkedRecipeId || meal.recipeId || undefined,
      })} />
      {!isRecipe && <>
        <PrimaryButton compact variant="ghost" label={recipe ? markdownToPlainText(recipe.name) : t("kitchen.linkRecipe")} onPress={onChooseRecipe} />
        {!!meal.linkedRecipeId && <PrimaryButton compact variant="ghost" label={t("kitchen.unlinkRecipe")} onPress={() => onChange({ ...meal, linkedRecipeId: undefined })} />}
      </>}
      <TextField label={t("kitchen.servings")} value={servings} onChangeText={onServings} keyboardType="number-pad" />
      {meal.kind === "simple" && <TextField label={t("kitchen.simpleIngredients")} value={ingredients} onChangeText={onIngredients} multiline />}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <AppText style={{ flex: 1 }}>{t("kitchen.alreadyEaten")}</AppText>
        <Switch accessibilityLabel={t("kitchen.alreadyEaten")} value={Boolean(meal.completed)} onValueChange={(completed) => onChange({ ...meal, completed })} trackColor={{ true: colors.primary }} />
      </View>
      {onDelete && <PrimaryButton compact variant="ghost" label={t("kitchen.remove")} disabled={busy} onPress={onDelete} />}
    </DisclosureSection>
  </View>;
}
