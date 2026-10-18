import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useRef, useState } from "react";
import { usePreventRemove } from "@react-navigation/native";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { TextField } from "../components/TextField";
import {
  emptyJournal,
  localDate,
  type Journal,
  type Diet,
} from "../features/kitchen/kitchen";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import { markdownToPlainText } from "../features/markdown/markdown";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeJournal">;
export function RecipeJournalScreen(props: Props) {
  const kitchen = useKitchen();
  const { t } = useTranslation();
  if (!kitchen.ready)
    return (
      <Screen
        header={
          <ScreenHeader
            title={t("kitchen.journal")}
            onBack={() => props.navigation.goBack()}
          />
        }
      >
        {kitchen.error ? (
          <>
            <AppText>{t("kitchen.loadError")}</AppText>
            <PrimaryButton
              label={t("kitchen.retry")}
              onPress={() => {
                void kitchen.reload().catch(() => undefined);
              }}
            />
          </>
        ) : (
          <ActivityIndicator />
        )}
      </Screen>
    );
  return (
    <JournalEditor
      key={`${kitchen.account}:${props.route.params.id}`}
      {...props}
    />
  );
}
function JournalEditor({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const kitchen = useKitchen();
  const { getRecipe } = useRecipes();
  const id = route.params.id;
  const recipe = getRecipe(id);
  const [journal, setJournal] = useState<Journal>(
    () => kitchen.data.journals[id] ?? emptyJournal(),
  );
  const [busy, setBusy] = useState(false);
  const saved = useRef(false);
  const dirty =
    JSON.stringify(journal) !==
    JSON.stringify(kitchen.data.journals[id] ?? emptyJournal());
  usePreventRemove(busy || dirty, ({ data }) => {
    if (saved.current) {
      navigation.dispatch(data.action);
      return;
    }
    if (busy) return;
    Alert.alert(t("kitchen.unsaved"), t("kitchen.unsavedBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("kitchen.discard"),
        style: "destructive",
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });
  const cost = journal.cost.trim()
    ? Number(journal.cost.replace(",", "."))
    : null;
  const validCost =
    cost === null ||
    (/^\d+(?:[.,]\d{1,2})?$/.test(journal.cost) &&
      Number.isFinite(cost) &&
      cost >= 0);
  const save = async () => {
    if (busy || !validCost) return;
    setBusy(true);
    try {
      await kitchen.update((data) => ({
        ...data,
        journals: {
          ...data.journals,
          [id]: {
            ...journal,
            stepTimers: data.journals[id]?.stepTimers,
            stepTimerStates: data.journals[id]?.stepTimerStates,
          },
        },
      }));
      saved.current = true;
      navigation.goBack();
    } catch {
      Alert.alert(t("common.error"), t("kitchen.saveError"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      header={
        <ScreenHeader
          title={t("kitchen.journal")}
          onBack={() => navigation.goBack()}
        />
      }
    >
      <AppText variant="title">
        {recipe
          ? markdownToPlainText(recipe.name)
          : t("kitchen.unavailableRecipe")}
      </AppText>
      <AppText muted>{t("kitchen.privateJournal")}</AppText>
      <GlassPanel style={styles.panel}>
        <AppText variant="label">{t("kitchen.rating")}</AppText>
        <View style={styles.wrap}>
          {[0, 1, 2, 3, 4, 5].map((rating) => (
            <PrimaryButton
              compact
              key={rating}
              label={rating ? `${rating} ★` : "—"}
              variant={journal.rating === rating ? "primary" : "secondary"}
              onPress={() => setJournal({ ...journal, rating })}
            />
          ))}
        </View>
        <TextField
          label={t("kitchen.notes")}
          multiline
          value={journal.notes}
          onChangeText={(notes) => setJournal({ ...journal, notes })}
        />
        <TextField
          label={t("kitchen.changes")}
          multiline
          value={journal.changes}
          onChangeText={(changes) => setJournal({ ...journal, changes })}
        />
        <AppText variant="label">{t("kitchen.personalDietTags")}</AppText>
        <AppText variant="caption" muted>
          {t("kitchen.dietTagHelp")}
        </AppText>
        <View style={styles.wrap}>
          {(["vegetarian", "vegan", "glutenFree"] as Diet[]).map((diet) => (
            <PrimaryButton
              compact
              key={diet}
              label={t(`kitchen.${diet}`)}
              variant={journal.diets?.includes(diet) ? "primary" : "secondary"}
              onPress={() =>
                setJournal({
                  ...journal,
                  diets: journal.diets?.includes(diet)
                    ? journal.diets.filter((item) => item !== diet)
                    : [...(journal.diets ?? []), diet],
                })
              }
            />
          ))}
        </View>
        <AppText variant="label">{t("kitchen.difficulty")}</AppText>
        <View style={styles.wrap}>
          {(["", "easy", "medium", "hard"] as const).map((difficulty) => (
            <PrimaryButton
              compact
              key={difficulty}
              label={difficulty ? t(`kitchen.${difficulty}`) : "—"}
              variant={
                journal.difficulty === difficulty ? "primary" : "secondary"
              }
              onPress={() => setJournal({ ...journal, difficulty })}
            />
          ))}
        </View>
        <TextField
          label={t("kitchen.cost")}
          value={journal.cost}
          onChangeText={(cost) => setJournal({ ...journal, cost })}
          keyboardType="decimal-pad"
        />
        {!validCost && <AppText>{t("kitchen.invalidCost")}</AppText>}
        {cost !== null && validCost && recipe && (
          <AppText>
            {t("kitchen.perServing", {
              cost: (cost / (recipe.recipeYield || 1)).toLocaleString(
                i18n.language,
                { maximumFractionDigits: 2 },
              ),
            })}
          </AppText>
        )}
        <PrimaryButton
          label={t("kitchen.cookedToday")}
          variant="secondary"
          disabled={journal.cooked.includes(localDate())}
          onPress={() =>
            setJournal({ ...journal, cooked: [...journal.cooked, localDate()] })
          }
        />
        {[...journal.cooked].reverse().map((date, index) => (
          <View key={`${date}:${index}`} style={styles.wrap}>
            <AppText>{date}</AppText>
            <PrimaryButton
              label={t("kitchen.remove")}
              variant="ghost"
              onPress={() =>
                setJournal({
                  ...journal,
                  cooked: journal.cooked.filter(
                    (_, i) => i !== journal.cooked.length - 1 - index,
                  ),
                })
              }
            />
          </View>
        ))}
      </GlassPanel>
      <PrimaryButton
        label={t("common.save")}
        disabled={busy || !validCost}
        onPress={() => {
          void save();
        }}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  panel: { gap: 16 },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
});
