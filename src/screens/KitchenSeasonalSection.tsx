import React, { useMemo, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { ChoiceField } from "../components/ChoiceField";
import { GlassPanel } from "../components/GlassPanel";
import { KitchenRecipeList } from "../components/KitchenRecipeList";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import { normalizeFood } from "../features/kitchen/kitchen";
import { useLocalDay } from "../features/kitchen/useLocalDay";
import { foodsInSeason, seasonalRecipes } from "../features/kitchen/seasonal";
import {
  isSeasonalArea,
  seasonalArea,
  seasonalAreas,
} from "../features/kitchen/seasonalAreas";
import { useRecipes } from "../features/recipes/RecipesProvider";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import { markdownToPlainText } from "../features/markdown/markdown";
import { useAppTheme } from "../theme/ThemeProvider";
export function KitchenSeasonalSection(props: {
  openRecipe: (id: string) => void;
}) {
  const { account } = useKitchen();
  return <SeasonalForm key={account} {...props} />;
}
function SeasonalForm({ openRecipe }: { openRecipe: (id: string) => void }) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const kitchen = useKitchen();
  const { recipes } = useRecipes();
  const shopping = useShoppingList();
  const day = useLocalDay();
  const currentMonth = Number(day.slice(5, 7));
  const [chosenMonth, setChosenMonth] = useState<number | null>(null);
  const month = chosenMonth ?? currentMonth;
  const [selection, setSelection] = useState<{
    context: string;
    ids: string[];
  }>({ context: "", ids: [] });
  const [query, setQuery] = useState("");
  const [showSources, setShowSources] = useState(false);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const context = `${kitchen.data.country}:${month}:${i18n.language}`;
  const contextRef = useRef(context);
  contextRef.current = context;
  const area = seasonalArea(kitchen.data.country);
  const available = useMemo(
    () => foodsInSeason(area?.id, month),
    [area?.id, month],
  );
  const ids = useMemo(
    () => (selection.context === context ? selection.ids : []),
    [selection, context],
  );
  const matches = useMemo(
    () => seasonalRecipes(recipes, area?.id, month, ids),
    [recipes, area?.id, month, ids],
  );
  const name = (id: string) => t(`kitchen.food_${id}`);
  const visible = available
    .filter(
      (food) =>
        (filter === "all" || food.category === filter) &&
        (normalizeFood(name(food.id)).includes(normalizeFood(query)) ||
          food.names.some(
            (alias) => normalizeFood(alias) === normalizeFood(query),
          )),
    )
    .sort((a, b) => name(a.id).localeCompare(name(b.id), i18n.language));
  async function changeArea(value: string) {
    if ((!isSeasonalArea(value) && value !== "other") || lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      await kitchen.update((data) => ({ ...data, country: value }));
      setQuery("");
      setFilter("all");
      setSelection({ context: "", ids: [] });
    } catch {
      setMessage(t("kitchen.saveError"));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function addToShopping() {
    if (lock.current || !ids.length || shopping.loading || shopping.switching)
      return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    const requestContext = context;
    try {
      const result = await shopping.addIngredients(
        available
          .filter((food) => ids.includes(food.id))
          .map((food) => name(food.id)),
      );
      if (contextRef.current === requestContext)
        setMessage(
          t(
            result.added.length
              ? "kitchen.seasonAdded"
              : "kitchen.seasonAlreadyAdded",
            { count: result.added.length },
          ),
        );
    } catch {
      if (contextRef.current === requestContext)
        setMessage(t("kitchen.saveError"));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <AppText muted>{t("kitchen.seasonIntro")}</AppText>
      <ChoiceField
        label={t("kitchen.seasonPlace")}
        value={kitchen.data.country ?? "unset"}
        options={[
          ...(!kitchen.data.country
            ? [{ value: "unset", label: t("kitchen.chooseCountry") }]
            : []),
          ...seasonalAreas.map((item) => ({
            value: item.id,
            label: t(`kitchen.area_${item.id}`),
          })),
          { value: "other", label: t("kitchen.seasonOtherArea") },
        ]}
        disabled={!kitchen.ready || busy}
        onChange={(value) => {
          void changeArea(value);
        }}
      />
      {!!message && (
        <AppText accessibilityLiveRegion="polite">{message}</AppText>
      )}
      {!area ? (
        <AppText>{t("kitchen.seasonChoosePlace")}</AppText>
      ) : (
        <>
          <ChoiceField
            label={t("kitchen.month")}
            value={String(month)}
            options={Array.from({ length: 12 }, (_, index) => ({
              value: String(index + 1),
              label: new Date(2026, index, 1).toLocaleDateString(
                i18n.language,
                { month: "long" },
              ),
            }))}
            disabled={busy}
            onChange={(value) => {
              setChosenMonth(Number(value));
              setSelection({ context: "", ids: [] });
              setMessage("");
            }}
          />
          {chosenMonth !== null && (
            <PrimaryButton
              compact
              variant="secondary"
              label={t("kitchen.seasonCurrentMonth")}
              disabled={busy}
              onPress={() => {
                setChosenMonth(null);
                setSelection({ context: "", ids: [] });
                setMessage("");
              }}
            />
          )}
          <AppText variant="subtitle">
            {t("kitchen.seasonCount", { count: available.length })}
          </AppText>
          {area.basis === "market" && (
            <AppText muted variant="caption">
              {t("kitchen.seasonMarketNote")}
            </AppText>
          )}
          {ids.length > 0 && (
            <GlassPanel style={styles.panel}>
              <AppText>
                {t("kitchen.seasonSelected", { count: ids.length })}
              </AppText>
              <AppText muted>
                {available
                  .filter((food) => ids.includes(food.id))
                  .map((food) => name(food.id))
                  .join(", ")}
              </AppText>
              <PrimaryButton
                label={t("kitchen.seasonBuy")}
                disabled={busy || shopping.loading || shopping.switching}
                onPress={() => {
                  void addToShopping();
                }}
              />
            </GlassPanel>
          )}
          <View style={styles.filters}>
            {["all", "fruit", "vegetable"].map((item) => (
              <PrimaryButton
                compact
                key={item}
                label={t(`kitchen.seasonFilter_${item}`)}
                variant={filter === item ? "primary" : "secondary"}
                onPress={() => setFilter(item)}
              />
            ))}
          </View>
          <TextField
            label={t("kitchen.seasonSearch")}
            value={query}
            onChangeText={setQuery}
          />
          {(["fruit", "vegetable"] as const).map((category) => {
            const foods = visible.filter((food) => food.category === category);
            return foods.length ? (
              <GlassPanel key={category} style={styles.panel}>
                <AppText variant="subtitle">
                  {t(`kitchen.seasonFilter_${category}`)}
                </AppText>
                {foods.map((food) => (
                  <Pressable
                    key={food.id}
                    accessibilityRole="checkbox"
                    accessibilityLabel={name(food.id)}
                    accessibilityState={{
                      checked: ids.includes(food.id),
                      disabled: busy,
                    }}
                    disabled={busy}
                    onPress={() => {
                      setMessage("");
                      setSelection({
                        context,
                        ids: ids.includes(food.id)
                          ? ids.filter((id) => id !== food.id)
                          : [...ids, food.id],
                      });
                    }}
                    style={({ pressed }) => [
                      styles.food,
                      {
                        borderColor: ids.includes(food.id)
                          ? colors.primary
                          : colors.border,
                        backgroundColor:
                          ids.includes(food.id) || pressed
                            ? colors.chip
                            : colors.backgroundElevated,
                      },
                    ]}
                  >
                    <View
                      style={[styles.check, { borderColor: colors.primary }]}
                    >
                      {ids.includes(food.id) ? (
                        <Check size={16} color={colors.primary} />
                      ) : null}
                    </View>
                    <View style={styles.foodText}>
                      <AppText>{name(food.id)}</AppText>
                      {food.storage && (
                        <AppText muted variant="caption">
                          {t("kitchen.seasonStored")}
                        </AppText>
                      )}
                    </View>
                  </Pressable>
                ))}
              </GlassPanel>
            ) : null;
          })}
          {!visible.length && (
            <AppText>{t("kitchen.seasonNoProducts")}</AppText>
          )}
          {ids.length > 0 && (
            <>
              <AppText>
                {t("kitchen.seasonSelected", { count: ids.length })}
              </AppText>
              <PrimaryButton
                label={t("kitchen.seasonBuy")}
                disabled={busy || shopping.loading || shopping.switching}
                onPress={() => {
                  void addToShopping();
                }}
              />
              <PrimaryButton
                compact
                variant="ghost"
                label={t("kitchen.seasonClear")}
                disabled={busy}
                onPress={() => {
                  setSelection({ context, ids: [] });
                  setMessage("");
                }}
              />
            </>
          )}
          <AppText variant="subtitle">
            {t(
              ids.length
                ? "kitchen.seasonSelectedRecipes"
                : "kitchen.seasonRecipes",
            )}
          </AppText>
          <AppText muted variant="caption">
            {t("kitchen.seasonRecipeHelp")}
          </AppText>
          <KitchenRecipeList
            key={context + ids.join(":")}
            recipes={matches.map((result) => result.recipe)}
          >
            {(recipe) => (
              <PrimaryButton
                compact
                key={recipe.id}
                numberOfLines={0}
                variant="secondary"
                label={`${markdownToPlainText(recipe.name)} · ${matches
                  .find((result) => result.recipe === recipe)!
                  .foods.map((food) => name(food.id))
                  .join(", ")}`}
                onPress={() => {
                  if (recipe.id) openRecipe(recipe.id);
                }}
              />
            )}
          </KitchenRecipeList>
          {!matches.length && (
            <AppText muted>{t("kitchen.seasonNoRecipes")}</AppText>
          )}
          <PrimaryButton
            compact
            variant="secondary"
            label={t(
              showSources ? "kitchen.seasonCloseAbout" : "kitchen.seasonAbout",
            )}
            onPress={() => setShowSources(!showSources)}
          />
          {showSources && (
            <GlassPanel style={styles.panel}>
              <AppText muted variant="caption">
                {t("kitchen.seasonScope", {
                  place: t(`kitchen.area_${area.id}`),
                })}
              </AppText>
              <AppText muted variant="caption">
                {t(`kitchen.seasonBasis_${area.basis}`)}
              </AppText>
              <AppText muted variant="caption">
                {t("kitchen.seasonSource", {
                  source: area.source,
                  date: new Date(
                    `${area.reviewed}T12:00:00`,
                  ).toLocaleDateString(i18n.language),
                })}
              </AppText>
              {[
                area.sourceUrl,
                ...("additionalSources" in area
                  ? (area.additionalSources ?? [])
                  : []),
              ].map((url, index) => (
                <PrimaryButton
                  compact
                  key={url}
                  variant="secondary"
                  label={t("kitchen.seasonOpenSource", { index: index + 1 })}
                  onPress={() => {
                    void Linking.openURL(url).catch(() =>
                      setMessage(t("common.error")),
                    );
                  }}
                />
              ))}
            </GlassPanel>
          )}
        </>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  panel: { gap: 8 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  food: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  check: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  foodText: { flex: 1, minWidth: 0 },
});
