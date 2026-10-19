import { cookingTimerScope } from "../features/kitchen/cookingTimerState";
import { useCookingVoice } from "../features/kitchen/useCookingVoice";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useKeepAwake } from "expo-keep-awake";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { MarkdownText } from "../components/MarkdownText";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { TextField } from "../components/TextField";
import { emptyJournal, localDate } from "../features/kitchen/kitchen";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import {
  useRecipeTimers,
  type TimerPreset,
} from "../features/timers/TimersProvider";
import type { RootStackParamList } from "../navigation/types";
import { TimerSection } from "./recipeDetail/TimerSection";

type Props = NativeStackScreenProps<RootStackParamList, "Cooking">;
export function CookingScreen(props: Props) {
  const { getRecipe } = useRecipes();
  const recipe = getRecipe(props.route.params.id);
  const { t } = useTranslation();
  const kitchen = useKitchen();
  if (!kitchen.ready)
    return (
      <Screen
        header={
          <ScreenHeader
            title={t("kitchen.cooking")}
            onBack={() => props.navigation.goBack()}
          />
        }
      >
        <AppText>
          {t(kitchen.error ? "kitchen.loadError" : "common.loading")}
        </AppText>
      </Screen>
    );
  if (!recipe || !recipe.recipeInstructions.length)
    return (
      <Screen
        header={
          <ScreenHeader
            title={t("kitchen.cooking")}
            onBack={() => props.navigation.goBack()}
          />
        }
      >
        <AppText>{t("kitchen.noSteps")}</AppText>
      </Screen>
    );
  return (
    <CookingSteps
      key={`${kitchen.account}:${props.route.params.id}`}
      {...props}
      recipe={recipe}
    />
  );
}
function CookingSteps({
  navigation,
  route,
  recipe,
}: Props & {
  recipe: NonNullable<ReturnType<typeof useRecipes>["recipes"][number]>;
}) {
  useKeepAwake();
  const { t, i18n } = useTranslation();
  const kitchen = useKitchen();
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [minutes, setMinutes] = useState("5");
  const storedTimers = kitchen.data.journals[route.params.id]?.stepTimers;
  const presets = useMemo<TimerPreset[]>(
    () =>
      (storedTimers ?? []).map((timer) => ({
        id: timer.id,
        label: t("kitchen.stepLabel", { current: timer.step + 1 }),
        minutes: timer.minutes,
      })),
    [storedTimers, t],
  );
  const [busy, setBusy] = useState(false);
  const safeStep = Math.min(step, recipe.recipeInstructions.length - 1);
  const timerScope = cookingTimerScope(kitchen.account, route.params.id);
  const { timers, toggleTimer, resetTimer, notificationStatus } =
    useRecipeTimers(
      timerScope,
      presets,
      kitchen.data.journals[route.params.id]?.stepTimerStates,
    );
  const stepPresets = useMemo(
    () =>
      presets.filter(
        (preset) =>
          preset.id === `step-${safeStep}` ||
          timers[preset.id]?.running ||
          timers[preset.id]?.remainingSeconds === 0,
      ),
    [presets, safeStep, timers],
  );
  const locale =
    (
      {
        fr: "fr-FR",
        en: "en-US",
        de: "de-DE",
        es: "es-ES",
        it: "it-IT",
        da: "da-DK",
      } as Record<string, string>
    )[i18n.language.split("-")[0]] ?? "en-US";
  const voice = useCookingVoice(locale, (command) => {
    if (command === "next")
      setStep((current) =>
        Math.min(current + 1, recipe.recipeInstructions.length - 1),
      );
    if (command === "previous") setStep((current) => Math.max(0, current - 1));
    if (command === "ingredients") setShowIngredients((current) => !current);
    if (
      command === "timer" &&
      timers[`step-${safeStep}`] &&
      !timers[`step-${safeStep}`].running &&
      timers[`step-${safeStep}`].remainingSeconds > 0
    ) {
      void toggleTimer(`step-${safeStep}`, {
        title: recipe.name,
        body: t("kitchen.stepLabel", { current: safeStep + 1 }),
      }).catch(() => undefined);
    }
  });
  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await kitchen.update((data) => {
        const journal = data.journals[route.params.id] ?? emptyJournal();
        return {
          ...data,
          journals: {
            ...data.journals,
            [route.params.id]: {
              ...journal,
              cooked: journal.cooked.includes(localDate())
                ? journal.cooked
                : [...journal.cooked, localDate()],
            },
          },
        };
      });
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
          title={t("kitchen.cooking")}
          onBack={() => navigation.goBack()}
        />
      }
    >
      {kitchen.timerPersistenceError && (
        <AppText>{t("kitchen.timerPersistenceError")}</AppText>
      )}
      {voice.available && (
        <PrimaryButton
          label={t(
            voice.listening ? "kitchen.stopVoice" : "kitchen.startVoice",
          )}
          variant="secondary"
          onPress={() => {
            void voice.toggle();
          }}
        />
      )}
      {voice.listening && <AppText muted>{t("kitchen.voiceHelp")}</AppText>}
      {voice.failed && <AppText>{t("kitchen.voiceFailed")}</AppText>}
      <AppText accessibilityLiveRegion="polite" variant="subtitle">
        {t("kitchen.stepProgress", {
          current: safeStep + 1,
          total: recipe.recipeInstructions.length,
        })}
      </AppText>
      <GlassPanel>
        <MarkdownText style={styles.step}>
          {recipe.recipeInstructions[safeStep]}
        </MarkdownText>
      </GlassPanel>
      <View style={styles.row}>
        <PrimaryButton
          compact
          label={t("kitchen.previous")}
          disabled={safeStep === 0}
          onPress={() => setStep(safeStep - 1)}
          style={styles.flex}
        />
        <PrimaryButton
          compact
          label={t("kitchen.next")}
          disabled={safeStep === recipe.recipeInstructions.length - 1}
          onPress={() => setStep(safeStep + 1)}
          style={styles.flex}
        />
      </View>
      <PrimaryButton
        label={t("kitchen.ingredients")}
        variant="secondary"
        onPress={() => setShowIngredients(!showIngredients)}
      />
      {showIngredients && (
        <GlassPanel>
          {recipe.recipeIngredient.map((line, i) => (
            <MarkdownText key={i}>{`• ${line}`}</MarkdownText>
          ))}
        </GlassPanel>
      )}
      <GlassPanel style={styles.panel}>
        <TextField
          label={t("kitchen.timerMinutes")}
          keyboardType="number-pad"
          value={minutes}
          onChangeText={setMinutes}
        />
        <PrimaryButton
          label={t("kitchen.attachTimer")}
          disabled={
            !/^\d+$/.test(minutes) ||
            Number(minutes) <= 0 ||
            Number(minutes) > 1440 ||
            busy ||
            !!timers[`step-${safeStep}`]?.running
          }
          variant="secondary"
          onPress={() => {
            setBusy(true);
            void kitchen
              .update((data) => {
                const journal =
                  data.journals[route.params.id] ?? emptyJournal();
                return {
                  ...data,
                  journals: {
                    ...data.journals,
                    [route.params.id]: {
                      ...journal,
                      stepTimers: [
                        ...(journal.stepTimers ?? []).filter(
                          (timer) => timer.id !== `step-${safeStep}`,
                        ),
                        {
                          id: `step-${safeStep}`,
                          step: safeStep,
                          minutes: Number(minutes),
                        },
                      ],
                    },
                  },
                };
              })
              .catch(() =>
                Alert.alert(t("common.error"), t("kitchen.saveError")),
              )
              .finally(() => setBusy(false));
          }}
        />
        <AppText muted variant="caption">
          {t("kitchen.timerHelp")}
        </AppText>
      </GlassPanel>
      <TimerSection
        presets={stepPresets}
        timers={timers}
        notificationStatus={notificationStatus}
        onReset={resetTimer}
        onToggle={(id) => {
          void toggleTimer(id, {
            title: recipe.name,
            body:
              presets.find((preset) => preset.id === id)?.label ?? recipe.name,
          }).catch(() =>
            Alert.alert(t("common.error"), t("kitchen.saveError")),
          );
        }}
      />
      {safeStep === recipe.recipeInstructions.length - 1 && (
        <PrimaryButton
          label={t("kitchen.finish")}
          disabled={busy || !kitchen.ready}
          onPress={() => {
            void finish();
          }}
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  step: { fontSize: 28, lineHeight: 42 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  flex: { flexGrow: 1, flexBasis: 130 },
  panel: { gap: 12 },
});
