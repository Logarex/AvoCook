import React, { useState } from "react";
import { Switch, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
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
  const [ingredientsOpen, setIngredientsOpen] = useState(Boolean(ingredients));
  const isRecipe = !meal.kind || meal.kind === "recipe";

  const past = validDate(meal.date) && meal.date < today;
  const showCompleted = !past && (history || meal.date === today || Boolean(meal.completed));
  const recipe = recipes.find((entry) => entry.id === (isRecipe ? meal.recipeId : meal.linkedRecipeId));
  const usesIngredients = isRecipe && Boolean(recipe);
  const invalidFuture = Boolean(meal.completed) && meal.date > today;
  const canSave = !busy && !invalidFuture && Boolean(isRecipe ? meal.recipeId || meal.title?.trim() : meal.title?.trim() || recipe) && validDate(meal.date) && (!usesIngredients || (/^\d+$/.test(servings) && Number(servings) >= 1 && Number(servings) <= 1000));
  return <View style={{ gap: 12 }}>
    <AppText muted>{t(history ? "kitchen.recordHelp" : "kitchen.planHelp")}</AppText>
    <TextField label={t(history ? "kitchen.mealEatenName" : "kitchen.mealName")} placeholder={t(history ? "kitchen.mealEatenName" : "kitchen.mealName")} value={meal.title ?? (isRecipe ? recipe?.name : "") ?? ""} onChangeText={(title) => onChange({ ...meal, title, ...(isRecipe && !meal.recipeId ? { kind: "simple" as const } : {}) })} />
    <PrimaryButton fillAvailableSpace numberOfLines={0} variant="link" label={recipe ? t("kitchen.recipeSelected", { name: markdownToPlainText(recipe.name) }) : t(isRecipe ? "kitchen.chooseRecipe" : "kitchen.linkRecipe")} onPress={onChooseRecipe} />
    {recipe && <PrimaryButton fillAvailableSpace numberOfLines={0} variant="ghost" label={t("kitchen.unlinkRecipe")} onPress={() => onChange({ ...meal, kind: "simple", title: meal.title?.trim() || markdownToPlainText(recipe.name), recipeId: "", linkedRecipeId: undefined })} />}
    <View style={{ gap: 8 }}>
    <StockExpiryField label={t("kitchen.mealDate")} allowClear={false} value={meal.date} onChange={(date) => onChange({ ...meal, date, completed: validDate(date) && date < today ? true : past ? false : meal.completed })} />
    <AppText variant="label">{t("kitchen.mealSlot")}</AppText>
    <SegmentedControl variant="buttons" options={(["lunch", "dinner"] as const).map((value) => ({ value, label: t(`kitchen.${value}`) }))} value={meal.slot} onChange={(slot) => onChange({ ...meal, slot })} />
    </View>
    <View style={{ gap: 8 }}>
      {!noteOpen && <PrimaryButton fillAvailableSpace numberOfLines={0} variant="link" label={t("kitchen.addMealNote")} onPress={() => setNoteOpen(true)} />}
    </View>
    {noteOpen && <TextField label={t("kitchen.mealNotes")} placeholder={t("kitchen.shortMealNote")} value={meal.notes ?? ""} onChangeText={(notes) => onChange({ ...meal, notes })} multiline />}
    {meal.kind === "simple" && (!history || Boolean(ingredients)) && <View style={{ gap: 8 }}>
      {!ingredientsOpen && <PrimaryButton fillAvailableSpace numberOfLines={0} variant="link" label={t("kitchen.addMealIngredients")} onPress={() => setIngredientsOpen(true)} />}
      {ingredientsOpen && <TextField label={t("kitchen.simpleIngredients")} value={ingredients} onChangeText={onIngredients} multiline />}
    </View>}
    {invalidFuture && <AppText accessibilityRole="alert">{t("kitchen.futureEaten")}</AppText>}
    {(usesIngredients || showCompleted) && <View style={{ gap: 16, padding: 16, borderRadius: 16, backgroundColor: colors.backgroundElevated, borderWidth: 1, borderColor: colors.border }}>
      {usesIngredients && <TextField label={t("kitchen.servings")} value={servings} onChangeText={onServings} keyboardType="number-pad" />}

      {showCompleted && <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <AppText style={{ flex: 1 }}>{t("kitchen.alreadyEaten")}</AppText>
        <Switch accessibilityLabel={t("kitchen.alreadyEaten")} value={Boolean(meal.completed)} onValueChange={(completed) => onChange({ ...meal, completed })} trackColor={{ true: colors.primary }} />
      </View>}
    </View>}
    <PrimaryButton fillAvailableSpace numberOfLines={0} label={t("common.save")} disabled={!canSave} onPress={onSave} />
    {onDelete && <PrimaryButton fillAvailableSpace numberOfLines={0} variant="danger-secondary" label={t("kitchen.remove")} disabled={busy} onPress={onDelete} />}

  </View>;
}
