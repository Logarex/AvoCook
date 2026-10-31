import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { usePreventRemove } from "@react-navigation/native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImagePlus, Sparkles } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { TextField } from "../components/TextField";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import {
  analyzeFridgePhoto,
  generateFridgeRecipe,
  fridgeErrorKey,
  MAX_FRIDGE_PHOTO_LENGTH,
  FridgePhotoError,
} from "../features/kitchen/fridgeAssistant";
import { localDate } from "../features/kitchen/kitchen";
import { usePreferences } from "../features/preferences/PreferencesProvider";
import { LLM_PROVIDERS } from "../features/import/photoRecipeImport";
import type { Recipe } from "../features/recipes/types";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "FridgeRecipe">;
type Busy = "picking" | "photo" | "recipe" | null;
export function FridgeRecipeScreen(props: Props) {
  const { account } = useKitchen();
  return <FridgeRecipeForm key={account} {...props} />;
}
function FridgeRecipeForm({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const kitchen = useKitchen();
  const { llmSettings } = usePreferences();
  const [ingredients, setIngredients] = useState(
    route.params?.ingredients?.slice(0, 6000) ?? "",
  );
  const [wishes, setWishes] = useState(
    [
      kitchen.data.dietaryPreference
        ? t(`kitchen.${kitchen.data.dietaryPreference}`)
        : "",
      kitchen.data.excludedWords
        ? t("kitchen.fridgeAvoid", { foods: kitchen.data.excludedWords })
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const [servings, setServings] = useState("2");
  const [minutes, setMinutes] = useState("20");
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(
    null,
  );
  const [uncertain, setUncertain] = useState<string[]>([]);
  const [reviewPhoto, setReviewPhoto] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const operation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const running = useRef(false);
  const leaving = useRef(false);
  const config = JSON.stringify([llmSettings, i18n.language]);
  const currentConfig = useRef(config);
  currentConfig.current = config;
  const initialInput = useRef({ ingredients, wishes });
  const dirty =
    ingredients !== initialInput.current.ingredients ||
    wishes !== initialInput.current.wishes ||
    servings !== "2" ||
    minutes !== "20" ||
    Boolean(photo || recipe || reviewPhoto);
  const abortPending = useCallback(() => {
    operation.current++;
    controller.current?.abort();
    controller.current = null;
    running.current = false;
  }, []);
  const cancel = useCallback(() => {
    abortPending();
    setBusy(null);
  }, [abortPending]);
  useEffect(() => abortPending, [abortPending]);
  useEffect(() => {
    cancel();
    setError(null);
  }, [config, cancel]);
  usePreventRemove(dirty || Boolean(busy), ({ data }) => {
    if (leaving.current) {
      navigation.dispatch(data.action);
      return;
    }
    Alert.alert(t("kitchen.unsaved"), t("kitchen.fridgeLeave"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("kitchen.discard"),
        style: "destructive",
        onPress: () => {
          cancel();
          navigation.dispatch(data.action);
        },
      },
    ]);
  });
  async function run(
    kind: Exclude<Busy, null>,
    action: (signal: AbortSignal, current: () => boolean) => Promise<void>,
  ) {
    if (running.current || !llmSettings.apiKey.trim()) return;
    running.current = true;
    const id = ++operation.current;
    const requestConfig = currentConfig.current;
    const abort = new AbortController();
    controller.current = abort;
    const current = () =>
      operation.current === id &&
      currentConfig.current === requestConfig &&
      !abort.signal.aborted;
    setBusy(kind);
    setError(null);
    try {
      await action(abort.signal, current);
    } catch (caught) {
      if (current()) setError(t(fridgeErrorKey(caught, kind === "photo")));
    } finally {
      if (operation.current === id) {
        running.current = false;
        controller.current = null;
        setBusy(null);
      }
    }
  }
  function pickPhoto(camera: boolean) {
    void run("picking", async (_, current) => {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!current()) return;
        if (!permission.granted) {
          setError(t("importRecipe.photoCameraPermissionBody"));
          return;
        }
      }
      const picker = camera
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;
      const result = await picker({
        mediaTypes: ["images"],
        quality: 0.45,
        base64: true,
        allowsEditing: false,
        exif: false,
      });
      if (!current() || result.canceled) return;
      const asset = result.assets[0];
      if (
        !asset?.base64 ||
        !asset.base64.startsWith("/9j/") ||
        asset.base64.length > MAX_FRIDGE_PHOTO_LENGTH
      )
        throw new FridgePhotoError();
      setPhoto({ uri: asset.uri, base64: asset.base64 });
      setReviewPhoto(false);
      setRecipe(null);
      setUncertain([]);
    });
  }
  const validNumbers =
    /^\d+$/.test(servings) &&
    Number(servings) >= 1 &&
    Number(servings) <= 20 &&
    /^\d+$/.test(minutes) &&
    Number(minutes) >= 5 &&
    Number(minutes) <= 240;
  const preset = LLM_PROVIDERS.find(
    (item) => item.id === llmSettings.providerId,
  );
  let provider = preset?.label ?? "";
  if (llmSettings.providerId === "custom") {
    try {
      provider = new URL(llmSettings.baseUrl).host;
    } catch {
      provider = t("kitchen.fridgeCustomProvider");
    }
  }
  return (
    <Screen
      header={
        <ScreenHeader
          title={t("kitchen.fridgeTitle")}
          onBack={() => navigation.goBack()}
        />
      }
    >
      <AppText muted>{t("kitchen.fridgeIntro")}</AppText>
      {!llmSettings.apiKey.trim() ? (
        <GlassPanel style={styles.panel}>
          <AppText>{t("kitchen.fridgeNoKey")}</AppText>
          <PrimaryButton
            label={t("ui.assistant")}
            onPress={() =>
              navigation.navigate("Settings", { section: "assistant" })
            }
          />
        </GlassPanel>
      ) : (
        <>
          <AppText muted variant="caption">
            {t("kitchen.fridgeDisclosure", { provider })}
          </AppText>
          <GlassPanel style={styles.panel}>
            <AppText variant="subtitle">
              {t("kitchen.fridgeIngredients")}
            </AppText>
            <TextField
              label={t("kitchen.fridgeText")}
              placeholder={t("kitchen.availableExample")}
              multiline
              maxLength={6000}
              editable={!busy}
              value={ingredients}
              onChangeText={(value) => {
                setIngredients(value);
                setRecipe(null);
              }}
            />
            {kitchen.ready &&
              kitchen.data.stock.some(
                (item) => !item.expires || item.expires >= localDate(),
              ) && (
                <PrimaryButton
                  compact
                  variant="secondary"
                  label={t("kitchen.fridgeUseStock")}
                  disabled={Boolean(busy)}
                  onPress={() => {
                    setIngredients(
                      kitchen.data.stock
                        .filter(
                          (item) =>
                            !item.expires || item.expires >= localDate(),
                        )
                        .map((item) => item.name)
                        .join("\n")
                        .slice(0, 6000),
                    );
                    setRecipe(null);
                  }}
                />
              )}
            <View style={styles.row}>
              <PrimaryButton
                compact
                icon={Camera}
                label={t("importRecipe.photoSourceCamera")}
                variant="secondary"
                disabled={Boolean(busy)}
                onPress={() => pickPhoto(true)}
              />
              <PrimaryButton
                compact
                icon={ImagePlus}
                label={t("importRecipe.photoSourceGallery")}
                variant="secondary"
                disabled={Boolean(busy)}
                onPress={() => pickPhoto(false)}
              />
            </View>
            {photo && (
              <>
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.photo}
                  contentFit="contain"
                  accessibilityLabel={t("kitchen.fridgePhotoPreview")}
                />
                <AppText muted variant="caption">
                  {t("kitchen.fridgePhotoSend")}
                </AppText>
                <PrimaryButton
                  label={t("kitchen.fridgeAnalyze")}
                  disabled={Boolean(busy)}
                  onPress={() => {
                    void run("photo", async (signal, current) => {
                      const result = await analyzeFridgePhoto(
                        photo.base64,
                        llmSettings,
                        i18n.language,
                        signal,
                      );
                      if (!current()) return;
                      setIngredients((text) =>
                        [
                          ...new Set([
                            ...text
                              .split(/[,\n]/)
                              .map((line) => line.trim())
                              .filter(Boolean),
                            ...result.ingredients,
                          ]),
                        ]
                          .join("\n")
                          .slice(0, 6000),
                      );
                      setUncertain(result.uncertain);
                      setReviewPhoto(true);
                      setPhoto(null);
                      setRecipe(null);
                    });
                  }}
                />
                <PrimaryButton
                  compact
                  variant="ghost"
                  label={t("kitchen.remove")}
                  disabled={Boolean(busy)}
                  onPress={() => setPhoto(null)}
                />
              </>
            )}
            {reviewPhoto && (
              <AppText accessibilityLiveRegion="polite">
                {t("kitchen.fridgeCheckPhoto")}
              </AppText>
            )}
            {!!uncertain.length && (
              <AppText muted>
                {t("kitchen.fridgeUncertain", { foods: uncertain.join(", ") })}
              </AppText>
            )}
          </GlassPanel>
          <GlassPanel style={styles.panel}>
            <TextField
              label={t("kitchen.servings")}
              keyboardType="number-pad"
              maxLength={2}
              editable={!busy}
              value={servings}
              onChangeText={(value) => {
                setServings(value);
                setRecipe(null);
              }}
            />
            <TextField
              label={t("kitchen.fridgeTime")}
              keyboardType="number-pad"
              maxLength={3}
              editable={!busy}
              value={minutes}
              onChangeText={(value) => {
                setMinutes(value);
                setRecipe(null);
              }}
            />
            {!validNumbers && <AppText>{t("kitchen.fridgeNumbers")}</AppText>}
            <TextField
              label={t("kitchen.fridgeWishes")}
              multiline
              maxLength={2000}
              editable={!busy}
              value={wishes}
              onChangeText={(value) => {
                setWishes(value);
                setRecipe(null);
              }}
            />
            <PrimaryButton
              icon={Sparkles}
              label={t("kitchen.fridgeGenerate")}
              disabled={
                Boolean(busy) ||
                !ingredients.trim() ||
                !validNumbers ||
                Boolean(photo)
              }
              onPress={() => {
                void run("recipe", async (signal, current) => {
                  const result = await generateFridgeRecipe(
                    {
                      ingredients,
                      wishes,
                      servings: Number(servings),
                      minutes: Number(minutes),
                    },
                    llmSettings,
                    i18n.language,
                    signal,
                  );
                  if (current()) setRecipe(result);
                });
              }}
            />
          </GlassPanel>
          {busy && (
            <>
              <AppText accessibilityLiveRegion="polite">
                {t(
                  busy === "photo"
                    ? "kitchen.fridgeAnalyzing"
                    : busy === "recipe"
                      ? "kitchen.fridgeGenerating"
                      : "common.loading",
                )}
              </AppText>
              <PrimaryButton
                compact
                variant="secondary"
                label={t("common.cancel")}
                onPress={cancel}
              />
            </>
          )}
          {error && (
            <>
              <AppText
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                {error}
              </AppText>
              <PrimaryButton
                compact
                variant="secondary"
                label={t("ui.assistant")}
                onPress={() =>
                  navigation.navigate("Settings", { section: "assistant" })
                }
              />
            </>
          )}
          {recipe && (
            <GlassPanel style={styles.panel}>
              <AppText variant="subtitle">{t("kitchen.fridgeDraft")}</AppText>
              <AppText muted>{t("kitchen.fridgeReview")}</AppText>
              <AppText variant="title">{recipe.name}</AppText>
              <AppText muted variant="caption">
                {t("kitchen.fridgeResultSummary", {
                  servings: recipe.recipeYield,
                  minutes,
                })}
              </AppText>
              {!!recipe.description && <AppText>{recipe.description}</AppText>}
              <AppText variant="label">{t("recipes.ingredients")}</AppText>
              {recipe.recipeIngredient.map((line, index) => (
                <AppText key={index}>• {line}</AppText>
              ))}
              <AppText variant="label">{t("recipes.instructions")}</AppText>
              {recipe.recipeInstructions.map((line, index) => (
                <AppText key={index}>
                  {index + 1}. {line}
                </AppText>
              ))}
              <PrimaryButton
                label={t("kitchen.fridgeEditDraft")}
                disabled={Boolean(busy)}
                onPress={() => {
                  leaving.current = true;
                  navigation.replace("RecipeEditor", { draft: recipe });
                }}
              />
            </GlassPanel>
          )}
        </>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  panel: { gap: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photo: { width: "100%", height: 200, borderRadius: 16 },
});
