import { KitchenRecipeList } from "../components/KitchenRecipeList";
import {
  substitutionAmount,
  EGG_SUBSTITUTION_SOURCE,
  BAKING_SUBSTITUTION_SOURCE,
} from "../features/kitchen/substitutions";
import React, { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { AppText } from "../components/AppText";
import { AppSheet } from "../components/AppSheet";
import { ChoiceField } from "../components/ChoiceField";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import { useAuth } from "../features/auth/AuthProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { markdownToPlainText } from "../features/markdown/markdown";
import { KitchenSeasonalSection } from "./KitchenSeasonalSection";
import { createIllustratedRecipeBookHtml } from "../features/kitchen/recipeBookExport";

type Props = {
  section: "seasonal" | "substitutions" | "book" | "profiles";
  openRecipe: (id: string) => void;
};
export function KitchenToolsScreen({ section, openRecipe }: Props) {
  const { t } = useTranslation();
  const kitchen = useKitchen();
  const { recipes } = useRecipes();
  const { getClient } = useAuth();
  const { colors } = useAppTheme();
  const [context, setContext] = useState("muffins");
  const [eggs, setEggs] = useState("1");
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState(t("kitchen.myBook"));
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [excluded, setExcluded] = useState(kitchen.data.excludedWords ?? "");
  const replacement =
    eggs.trim() && /^\d+(?:[.,]\d+)?$/.test(eggs.trim())
      ? substitutionAmount(context, Number(eggs.replace(",", ".")))
      : null;
  const fail = () => Alert.alert(t("common.error"), t("kitchen.saveError"));
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch {
      fail();
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.panel}>
      {section === "seasonal" && <KitchenSeasonalSection openRecipe={openRecipe} />}
      {section === "substitutions" && (
        <>
          <AppText muted>{t("kitchen.substitutionHelp")}</AppText>
          <ChoiceField
            label={t("kitchen.preparation")}
            value={context}
            options={[
              { value: "muffins", label: t("kitchen.muffins") },
              { value: "white", label: t("kitchen.liquidWhite") },
              { value: "flax", label: t("kitchen.flaxBinding") },
              { value: "butter", label: t("kitchen.meltedButter") },
              { value: "other", label: t("kitchen.otherPreparation") },
            ]}
            onChange={(value) => {
              setContext(value);
              setEggs(value === "butter" ? "100" : "1");
            }}
          />
          {context === "other" ? (
            <AppText>{t("kitchen.noSubstitution")}</AppText>
          ) : (
            <GlassPanel style={styles.panel}>
              <TextField
                label={t(
                  context === "butter"
                    ? "kitchen.butterVolume"
                    : context === "white"
                      ? "kitchen.eggWhites"
                      : "kitchen.wholeEggs",
                )}
                value={eggs}
                onChangeText={setEggs}
                keyboardType="number-pad"
              />
              {replacement ? (
                <AppText variant="subtitle">
                  {context === "butter"
                    ? t("kitchen.oilAmount", { amount: replacement.amount })
                    : context === "flax"
                      ? t("kitchen.flaxAmount", {
                          flax: replacement.amount,
                          water: replacement.water,
                        })
                      : `${replacement.amount} g ${t("kitchen.aquafaba")}`}
                </AppText>
              ) : (
                <AppText>{t("kitchen.invalidSubstitutionAmount")}</AppText>
              )}
              <AppText>
                {t(
                  context === "butter"
                    ? "kitchen.butterRule"
                    : context === "flax"
                      ? "kitchen.flaxRule"
                      : context === "muffins"
                        ? "kitchen.muffinRule"
                        : "kitchen.whiteRule",
                )}
              </AppText>
              <AppText muted>{t("kitchen.substitutionCaution")}</AppText>
            </GlassPanel>
          )}
          <PrimaryButton
            label={t("kitchen.source")}
            variant="ghost"
            onPress={() => {
              void Linking.openURL(
                context === "butter" || context === "flax"
                  ? BAKING_SUBSTITUTION_SOURCE
                  : EGG_SUBSTITUTION_SOURCE,
              ).catch(fail);
            }}
          />
        </>
      )}
      {section === "profiles" && (
        <GlassPanel style={styles.panel}>
          <AppText muted>{t("kitchen.profileHelp")}</AppText>
          <ChoiceField
            label={t("kitchen.dietPreference")}
            value={kitchen.data.dietaryPreference ?? ""}
            disabled={busy}
            options={[
              { value: "", label: t("common.all") },
              ...(["vegetarian", "vegan", "glutenFree"] as const).map(
                (value) => ({ value, label: t(`kitchen.${value}`) }),
              ),
            ]}
            onChange={(dietaryPreference) => {
              void run(() =>
                kitchen.update((data) => ({ ...data, dietaryPreference })),
              );
            }}
          />
          <AppText muted>{t("kitchen.dietTagHelp")}</AppText>
          <TextField
            label={t("kitchen.exclude")}
            value={excluded}
            onChangeText={setExcluded}
          />
          <AppText muted>{t("kitchen.allergyNotice")}</AppText>
          <PrimaryButton
            label={t("common.save")}
            disabled={busy}
            onPress={() => {
              void run(async () => {
                await kitchen.update((data) => ({
                  ...data,
                  excludedWords: excluded.trim(),
                }));
                Alert.alert(t("kitchen.saved"));
              });
            }}
          />
        </GlassPanel>
      )}
      {section === "book" && (
        <>
          <AppText muted>{t("kitchen.bookHelp")}</AppText>
          <TextField
            label={t("kitchen.bookTitle")}
            value={title}
            onChangeText={setTitle}
          />
          <PrimaryButton
            label={`${t("kitchen.chooseRecipes")} · ${selected.length}`}
            variant="secondary"
            onPress={() => setPicking(true)}
          />
          <PrimaryButton
            label={t("kitchen.exportBook")}
            disabled={busy || !selected.length || !title.trim()}
            onPress={() => {
              void run(async () => {
                const chosen = selected.flatMap(
                  (id) => recipes.find((recipe) => recipe.id === id) ?? [],
                );
                if (!chosen.length) return;
                const html = await createIllustratedRecipeBookHtml(chosen, {
                  title,
                  contents: t("kitchen.bookContents"),
                  recipes: t("recipes.title"),
                  prepTime: t("recipes.prepTime"),
                  cookTime: t("recipes.cookTime"),
                  ingredients: t("recipes.ingredients"),
                  instructions: t("recipes.instructions"),
                  servings: t("kitchen.servings"),
                }, getClient());
                const printOptions = {
                  html,
                  width: 595,
                  height: 842,
                  margins: { top: 62, bottom: 68, left: 62, right: 62 },
                };
                if (await Sharing.isAvailableAsync()) {
                  const result = await Print.printToFileAsync(printOptions);
                  await Sharing.shareAsync(result.uri, {
                    mimeType: "application/pdf",
                    UTI: "com.adobe.pdf",
                    dialogTitle: title,
                  });
                } else await Print.printAsync(printOptions);
              });
            }}
          />
          {selected
            .flatMap((id) => recipes.find((recipe) => recipe.id === id) ?? [])
            .map((recipe) => (
              <GlassPanel key={recipe.id} style={styles.panel}>
                <AppText>{markdownToPlainText(recipe.name)}</AppText>
                <PrimaryButton
                  label={t("kitchen.remove")}
                  variant="ghost"
                  onPress={() =>
                    setSelected((current) =>
                      current.filter((id) => id !== recipe.id),
                    )
                  }
                />
              </GlassPanel>
            ))}
          <AppSheet
            visible={picking}
            title={t("kitchen.chooseRecipes")}
            onClose={() => setPicking(false)}
            headerAction={
              <PrimaryButton
                compact
                label={t("kitchen.done")}
                onPress={() => setPicking(false)}
              />
            }
          >
            <View style={styles.panel}>
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
                  <Pressable
                    key={recipe.id}
                    accessibilityRole="checkbox"
                    accessibilityLabel={markdownToPlainText(recipe.name)}
                    accessibilityState={{
                      checked: selected.includes(recipe.id!),
                      disabled: selected.length >= 50 && !selected.includes(recipe.id!),
                    }}
                    style={({ pressed }) => [styles.recipeButton, {
                      backgroundColor: pressed || selected.includes(recipe.id!) ? colors.chip : colors.backgroundElevated,
                      borderColor: selected.includes(recipe.id!) ? colors.primary : colors.border,
                    }]}
                    disabled={
                      selected.length >= 50 && !selected.includes(recipe.id!)
                    }
                    onPress={() => {
                      if (recipe.id)
                        setSelected((current) =>
                          current.includes(recipe.id!)
                            ? current.filter((id) => id !== recipe.id)
                            : [...current, recipe.id!],
                        );
                    }}
                  >
                    <View style={[styles.recipeCheck, { borderColor: colors.primary }]}>
                      {selected.includes(recipe.id!) ? <Check size={17} color={colors.primaryStrong} /> : null}
                    </View>
                    <AppText style={styles.recipeName}>{markdownToPlainText(recipe.name)}</AppText>
                  </Pressable>
                )}
              </KitchenRecipeList>
              <PrimaryButton
                label={t("kitchen.done")}
                onPress={() => setPicking(false)}
              />
            </View>
          </AppSheet>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  panel: { gap: 16 },
  recipeButton: { width: "100%", minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1, borderRadius: 16, minHeight: 56 },
  recipeCheck: { width: 24, height: 24, borderWidth: 1.5, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  recipeName: { flex: 1, minWidth: 0 },
});
