import { KitchenRecipeList } from "../components/KitchenRecipeList";
import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { AppSheet } from "../components/AppSheet";
import { ChoiceField } from "../components/ChoiceField";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import {
  localDate,
  newKitchenId,
  validDate,
  type Meal,
} from "../features/kitchen/kitchen";
import { suggestMenu, type SavedMenu } from "../features/kitchen/menus";
import { markdownToPlainText } from "../features/markdown/markdown";
export function KitchenMenusScreen() {
  const { t } = useTranslation();
  const kitchen = useKitchen();
  const { recipes } = useRecipes();
  const [occasion, setOccasion] = useState<
    "christmas" | "birthday" | "friends"
  >("friends");
  const [menu, setMenu] = useState<SavedMenu | null>(null);
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(localDate());
  const [portions, setPortions] = useState("4");
  const [slot, setSlot] = useState<Meal["slot"]>("dinner");
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch {
      Alert.alert(t("common.error"), t("kitchen.saveError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.panel}>
      <AppText muted>{t("kitchen.menuHelp")}</AppText>
      <ChoiceField
        label={t("kitchen.occasion")}
        value={occasion}
        options={(["christmas", "birthday", "friends"] as const).map(
          (value) => ({ value, label: t(`kitchen.${value}`) }),
        )}
        onChange={setOccasion}
      />
      <PrimaryButton
        label={t("kitchen.createMenu")}
        onPress={() =>
          setMenu({
            id: newKitchenId(),
            title: t(`kitchen.${occasion}`),
            recipeIds: suggestMenu(recipes, occasion),
          })
        }
      />
      {(kitchen.data.menus ?? []).map((saved) => (
        <GlassPanel key={saved.id} style={styles.panel}>
          <AppText variant="subtitle">{saved.title}</AppText>
          <PrimaryButton
            label={t("kitchen.edit")}
            variant="secondary"
            onPress={() => setMenu(saved)}
          />
          <PrimaryButton
            label={t("kitchen.remove")}
            variant="ghost"
            disabled={busy}
            onPress={() => {
              void run(() =>
                kitchen.update((data) => ({
                  ...data,
                  menus: (data.menus ?? []).filter(
                    (item) => item.id !== saved.id,
                  ),
                })),
              );
            }}
          />
        </GlassPanel>
      ))}
      <AppSheet
        visible={menu !== null}
        title={t("kitchen.menus")}
        busy={busy}
        onClose={() => {
          if (picker) setPicker(false);
          else setMenu(null);
        }}
      >
        {menu && (
          <View style={styles.panel}>
            {picker ? (
              <>
                <TextField
                  label={t("common.search")}
                  value={query}
                  onChangeText={setQuery}
                />
                <KitchenRecipeList
                  key={query}
                  recipes={recipes.filter((recipe) =>
                    markdownToPlainText(recipe.name)
                      .toLocaleLowerCase()
                      .includes(query.toLocaleLowerCase()),
                  )}
                >
                  {(recipe) => (
                    <PrimaryButton
                      compact
                      numberOfLines={0}
                      key={recipe.id}
                      label={`${menu.recipeIds.includes(recipe.id!) ? "✓ " : ""}${markdownToPlainText(recipe.name)}`}
                      variant="secondary"
                      onPress={() => {
                        if (recipe.id)
                          setMenu({
                            ...menu,
                            recipeIds: menu.recipeIds.includes(recipe.id)
                              ? menu.recipeIds.filter((id) => id !== recipe.id)
                              : [...menu.recipeIds, recipe.id],
                          });
                      }}
                    />
                  )}
                </KitchenRecipeList>
                <PrimaryButton
                  label={t("kitchen.done")}
                  onPress={() => setPicker(false)}
                />
              </>
            ) : (
              <>
                <TextField
                  label={t("kitchen.menuTitle")}
                  value={menu.title}
                  onChangeText={(title) => setMenu({ ...menu, title })}
                />
                {menu.recipeIds.map((id, index) => (
                  <AppText key={id}>
                    {index + 1}.{" "}
                    {markdownToPlainText(
                      recipes.find((recipe) => recipe.id === id)?.name ??
                        t("kitchen.unavailableRecipe"),
                    )}
                  </AppText>
                ))}
                <PrimaryButton
                  label={t("kitchen.chooseRecipes")}
                  variant="secondary"
                  onPress={() => {
                    setQuery("");
                    setPicker(true);
                  }}
                />
                <PrimaryButton
                  label={t("common.save")}
                  disabled={
                    busy || !menu.title.trim() || !menu.recipeIds.length
                  }
                  onPress={() => {
                    void run(async () => {
                      await kitchen.update((data) => ({
                        ...data,
                        menus: [
                          ...(data.menus ?? []).filter(
                            (saved) => saved.id !== menu.id,
                          ),
                          menu,
                        ],
                      }));
                      setMenu(null);
                    });
                  }}
                />
                <TextField
                  label={t("kitchen.date")}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                />
                <TextField
                  label={t("kitchen.servings")}
                  value={portions}
                  onChangeText={setPortions}
                  keyboardType="number-pad"
                />
                <View style={styles.row}>
                  {(["lunch", "dinner"] as const).map((value) => (
                    <PrimaryButton
                      compact
                      key={value}
                      label={t(`kitchen.${value}`)}
                      variant={slot === value ? "primary" : "secondary"}
                      onPress={() => setSlot(value)}
                    />
                  ))}
                </View>
                <PrimaryButton
                  label={t("kitchen.planMenu")}
                  disabled={
                    busy ||
                    !menu.title.trim() ||
                    !menu.recipeIds.length ||
                    menu.recipeIds.some(
                      (id) => !recipes.some((recipe) => recipe.id === id),
                    ) ||
                    !validDate(date) ||
                    !/^\d+$/.test(portions) ||
                    Number(portions) < 1 ||
                    Number(portions) > 1000
                  }
                  onPress={() => {
                    void run(async () => {
                      await kitchen.update((data) => ({
                        ...data,
                        menus: [
                          ...(data.menus ?? []).filter(
                            (saved) => saved.id !== menu.id,
                          ),
                          menu,
                        ],
                        meals: [
                          ...data.meals,
                          ...menu.recipeIds.map((recipeId) => ({
                            id: newKitchenId(),
                            recipeId,
                            date,
                            slot,
                            servings: Number(portions),
                            title: menu.title,
                          })),
                        ],
                      }));
                      setMenu(null);
                      Alert.alert(t("kitchen.menuPlanned"));
                    });
                  }}
                />
              </>
            )}
          </View>
        )}
      </AppSheet>
    </View>
  );
}
const styles = StyleSheet.create({
  panel: { gap: 16 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
