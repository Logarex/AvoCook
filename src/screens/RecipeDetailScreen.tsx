import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image, type ImageSource } from "expo-image";
import { useKeepAwake } from "expo-keep-awake";
import type { LucideIcon } from "lucide-react-native";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  HeartPulse,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Square,
  Timer,
  Trash2,
  Users
} from "lucide-react-native";
import React, { useMemo } from "react";
import { Alert, Linking, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { Pill } from "../components/Pill";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useAuth } from "../features/auth/AuthProvider";
import { usePreferences } from "../features/preferences/PreferencesProvider";
import type { HealthProfile } from "../features/recipes/health";
import { getRecipeHealthProfile } from "../features/recipes/health";
import {
  isCookbookImageEndpoint,
  isDisplayableRecipeImage
} from "../features/recipes/recipeImageReferences";
import { useRecipes } from "../features/recipes/RecipesProvider";
import {
  useRecipeTimers,
  type TimerNotificationStatus,
  type TimerPreset,
  type TimerState
} from "../features/timers/TimersProvider";
import {
  normalizeRecipe,
  type NutriScoreGrade,
  type Nutrition
} from "../features/recipes/types";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { humanDuration, isoDurationToMinutes } from "../utils/duration";
import { scaleIngredientLine } from "../utils/servings";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeDetail">;
type DetailRecipe = ReturnType<typeof useRecipes>["recipes"][number];
const nutriScoreColors: Record<NutriScoreGrade, string> = {
  A: "#1B8F4B",
  B: "#70B744",
  C: "#F2C84B",
  D: "#EE8E2F",
  E: "#D64545",
  "?": "#8A8177"
};

const nutriScoreGrades: NutriScoreGrade[] = ["A", "B", "C", "D", "E"];

export function RecipeDetailScreen({ navigation, route }: Props) {
  const { getClient } = useAuth();
  const { keepScreenAwake } = usePreferences();
  const { deleteRecipe, getRecipe, updateRecipePreferences } = useRecipes();
  const recipe = getRecipe(route.params.id);

  if (keepScreenAwake) {
    return (
      <>
        <KeepAwake />
        <RecipeDetailContent
          navigation={navigation}
          recipeId={route.params.id}
          recipe={recipe}
          deleteRecipe={deleteRecipe}
          updateRecipePreferences={updateRecipePreferences}
          getImageSource={() => getImageSource(recipe, getClient())}
        />
      </>
    );
  }

  return (
    <RecipeDetailContent
      navigation={navigation}
      recipeId={route.params.id}
      recipe={recipe}
      deleteRecipe={deleteRecipe}
      updateRecipePreferences={updateRecipePreferences}
      getImageSource={() => getImageSource(recipe, getClient())}
    />
  );
}

function KeepAwake() {
  useKeepAwake("recipe-detail");
  return null;
}

function RecipeDetailContent({
  navigation,
  recipeId,
  recipe,
  deleteRecipe,
  updateRecipePreferences,
  getImageSource
}: {
  navigation: Props["navigation"];
  recipeId: string;
  recipe: ReturnType<typeof useRecipes>["recipes"][number] | undefined;
  deleteRecipe: (id: string) => Promise<void>;
  updateRecipePreferences: ReturnType<typeof useRecipes>["updateRecipePreferences"];
  getImageSource: () => ImageSource | null;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const source = getImageSource();
  const nutrition = useMemo(
    () => normalizeNutrition(recipe?.nutrition),
    [recipe?.nutrition]
  );
  const baseServings = Math.max(1, recipe?.recipeYield || 1);
  const selectedServings = recipe?.localMeta?.servingOverride ?? baseServings;
  const servingFactor = selectedServings / baseServings;
  const scaledIngredients = useMemo(
    () =>
      recipe?.recipeIngredient.map((ingredient) =>
        scaleIngredientLine(ingredient, servingFactor)
      ) ?? [],
    [recipe?.recipeIngredient, servingFactor]
  );
  const healthProfile = useMemo(
    () => (recipe ? getRecipeHealthProfile(recipe) : null),
    [recipe]
  );
  const timerPresets = useMemo(
    () => (recipe ? getTimerPresets(recipe, t) : []),
    [recipe, t]
  );
  const {
    notificationStatus: timerNotificationStatus,
    resetTimer,
    timers,
    toggleTimer
  } = useRecipeTimers(recipeId, timerPresets);

  if (!recipe) {
    return (
      <Screen>
        <IconButton
          icon={ArrowLeft}
          label="Back"
          onPress={() => navigation.goBack()}
        />
        <AppText variant="subtitle">{t("recipes.emptyTitle")}</AppText>
      </Screen>
    );
  }

  async function handleDelete() {
    Alert.alert(t("common.delete"), t("recipes.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          void deleteRecipe(recipeId).then(() => navigation.goBack());
        }
      }
    ]);
  }

  async function handleServingsChange(nextServings: number) {
    if (!recipe) {
      return;
    }

    const normalizedServings = Math.max(1, Math.round(nextServings));
    const localMeta = { ...recipe.localMeta };
    if (normalizedServings === baseServings) {
      delete localMeta.servingOverride;
    } else {
      localMeta.servingOverride = normalizedServings;
    }

    await updateRecipePreferences(
      normalizeRecipe({
        ...recipe,
        localMeta: Object.keys(localMeta).length ? localMeta : undefined
      })
    );
  }

  async function handleToggleTimer(timerId: string) {
    const timer = timers[timerId];
    const preset = timerPresets.find((item) => item.id === timerId);
    if (!timer || !preset || !recipe) {
      return;
    }

    if (timer.running) {
      await toggleTimer(timerId, {
        body: recipe.name,
        title: t("recipes.timers.notificationTitle", { timer: preset.label })
      });
      return;
    }

    const nextNotificationStatus = await toggleTimer(timerId, {
      body: recipe.name,
      title: t("recipes.timers.notificationTitle", { timer: preset.label })
    });
    if (nextNotificationStatus !== "ready") {
      Alert.alert(
        t("recipes.timers.notificationsRequiredTitle"),
        t(
          nextNotificationStatus === "unavailable"
            ? "recipes.timers.notificationsUnavailableBody"
            : "recipes.timers.notificationsRequiredBody"
        )
      );
    }
  }

  function handleResetTimer(timerId: string) {
    resetTimer(timerId);
  }

  return (
    <Screen showScrollTop={false}>
      <View style={styles.toolbar}>
        <IconButton
          icon={ArrowLeft}
          label="Back"
          onPress={() => navigation.goBack()}
        />
        <View style={styles.toolbarActions}>
          <IconButton
            icon={Pencil}
            label={t("common.edit")}
            onPress={() => navigation.navigate("RecipeEditor", { id: recipeId })}
            tone="primary"
          />
          <IconButton
            icon={Trash2}
            label={t("common.delete")}
            onPress={() => void handleDelete()}
            tone="danger"
          />
        </View>
      </View>

      <View style={[styles.heroImage, { backgroundColor: colors.chip }]}>
        {source ? (
          <Image source={source} style={styles.image} contentFit="cover" />
        ) : (
          <AppText variant="title" style={{ color: colors.primary }}>
            {recipe.name.slice(0, 1).toUpperCase()}
          </AppText>
        )}
      </View>

      <View style={styles.titleBlock}>
        <AppText variant="title">{recipe.name}</AppText>
        {recipe.description ? <AppText muted>{recipe.description}</AppText> : null}
      </View>

      <View style={styles.pills}>
        {recipe.recipeCategory ? <Pill label={recipe.recipeCategory} /> : null}
        {recipe.recipeYield ? (
          <Pill label={`${selectedServings} ${t("recipes.yield")}`} />
        ) : null}
        {recipe.keywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean)
          .slice(0, 5)
          .map((keyword) => (
            <Pill key={keyword} label={keyword} />
          ))}
      </View>

      <View style={styles.metrics}>
        <Metric
          icon={Clock}
          label={t("recipes.prepTime")}
          value={humanDuration(recipe.prepTime) ?? "-"}
        />
        <Metric
          icon={Clock}
          label={t("recipes.cookTime")}
          value={humanDuration(recipe.cookTime) ?? "-"}
        />
        <Metric
          icon={Users}
          label={t("recipes.yield")}
          value={String(selectedServings)}
        />
      </View>

      <ServingsControl
        baseServings={baseServings}
        selectedServings={selectedServings}
        onChange={(nextServings) => void handleServingsChange(nextServings)}
      />

      <TimerSection
        presets={timerPresets}
        timers={timers}
        notificationStatus={timerNotificationStatus}
        onReset={handleResetTimer}
        onToggle={(timerId) => void handleToggleTimer(timerId)}
      />

      <RecipeSection title={t("recipes.ingredients")} items={scaledIngredients} />
      <RecipeSection
        ordered
        title={t("recipes.instructions")}
        items={recipe.recipeInstructions}
      />
      <RecipeSection title={t("recipes.tools")} items={recipe.tool} />

      {nutrition.length > 0 ? (
        <GlassPanel style={styles.section}>
          <AppText variant="subtitle">{t("recipes.nutrition")}</AppText>
          <View style={styles.nutritionGrid}>
            {nutrition.map(([label, value]) => (
              <View key={label} style={styles.nutritionItem}>
                <AppText muted variant="caption">
                  {label}
                </AppText>
                <AppText variant="label">{value}</AppText>
              </View>
            ))}
          </View>
        </GlassPanel>
      ) : null}

      {recipe.url ? (
        <PrimaryButton
          icon={ExternalLink}
          label={t("recipes.source")}
          onPress={() => void Linking.openURL(recipe.url)}
          variant="ghost"
        />
      ) : null}

      {healthProfile ? <HealthSection profile={healthProfile} /> : null}
    </Screen>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  const { colors } = useAppTheme();
  return (
    <GlassPanel style={styles.metric}>
      <Icon color={colors.primary} size={19} />
      <AppText muted variant="caption">
        {label}
      </AppText>
      <AppText variant="label">{value}</AppText>
    </GlassPanel>
  );
}

function ServingsControl({
  baseServings,
  selectedServings,
  onChange
}: {
  baseServings: number;
  selectedServings: number;
  onChange: (servings: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <GlassPanel style={styles.section}>
      <View style={styles.sectionHeader}>
        <Users color={colors.primary} size={21} />
        <AppText variant="subtitle">{t("recipes.servings.title")}</AppText>
      </View>
      <View style={styles.servingsRow}>
        <IconButton
          disabled={selectedServings <= 1}
          icon={Minus}
          label={t("recipes.servings.decrease")}
          onPress={() => onChange(selectedServings - 1)}
        />
        <View style={styles.servingValue}>
          <AppText variant="title">{selectedServings}</AppText>
          <AppText muted variant="caption">
            {t("recipes.servings.people")}
          </AppText>
        </View>
        <IconButton
          icon={Plus}
          label={t("recipes.servings.increase")}
          onPress={() => onChange(selectedServings + 1)}
          tone="primary"
        />
      </View>
      <View style={styles.servingFooter}>
        <AppText muted variant="caption">
          {t("recipes.servings.original", { count: baseServings })}
        </AppText>
        {selectedServings !== baseServings ? (
          <PrimaryButton
            icon={RotateCcw}
            label={t("recipes.servings.reset")}
            onPress={() => onChange(baseServings)}
            variant="ghost"
          />
        ) : null}
      </View>
    </GlassPanel>
  );
}

function TimerSection({
  presets,
  timers,
  notificationStatus,
  onReset,
  onToggle
}: {
  presets: TimerPreset[];
  timers: Record<string, TimerState>;
  notificationStatus: TimerNotificationStatus;
  onReset: (timerId: string) => void;
  onToggle: (timerId: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  if (!presets.length) {
    return null;
  }

  return (
    <GlassPanel style={styles.section}>
      <View style={styles.sectionHeader}>
        <Timer color={colors.primary} size={21} />
        <AppText variant="subtitle">{t("recipes.timers.title")}</AppText>
      </View>
      <AppText
        muted={notificationStatus !== "denied" && notificationStatus !== "unavailable"}
        variant="caption"
        style={
          notificationStatus === "denied" ||
          notificationStatus === "unavailable"
            ? { color: colors.danger }
            : undefined
        }
      >
        {notificationStatus === "unavailable"
          ? t("recipes.timers.notificationsUnavailable")
          : notificationStatus === "denied"
            ? t("recipes.timers.notificationsOff")
            : t("recipes.timers.notificationHint")}
      </AppText>
      <View style={styles.timerList}>
        {presets.map((preset) => {
          const timer = timers[preset.id];
          const running = Boolean(timer?.running);
          const finished = Boolean(timer && timer.remainingSeconds === 0);
          return (
            <View
              key={preset.id}
              style={[
                styles.timerCard,
                {
                  backgroundColor: colors.chip,
                  borderColor: colors.border
                }
              ]}
            >
              <View style={styles.timerInfo}>
                <AppText variant="label">{preset.label}</AppText>
                <AppText variant="subtitle">
                  {formatTimerSeconds(
                    timer?.remainingSeconds ?? preset.minutes * 60
                  )}
                </AppText>
                {finished ? (
                  <AppText muted variant="caption">
                    {t("recipes.timers.done")}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.timerActions}>
                <IconButton
                  icon={running ? Pause : Play}
                  label={
                    running
                      ? t("recipes.timers.pause")
                      : t("recipes.timers.start")
                  }
                  onPress={() => onToggle(preset.id)}
                  tone="primary"
                />
                <IconButton
                  icon={running || finished ? Square : RotateCcw}
                  label={
                    running || finished
                      ? t("recipes.timers.stop")
                      : t("recipes.timers.reset")
                  }
                  onPress={() => onReset(preset.id)}
                />
              </View>
            </View>
          );
        })}
      </View>
    </GlassPanel>
  );
}

function HealthSection({ profile }: { profile: HealthProfile }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <GlassPanel style={styles.section}>
      <View style={styles.sectionHeader}>
        <HeartPulse color={colors.primary} size={21} />
        <AppText variant="subtitle">{t("recipes.health.title")}</AppText>
      </View>
      <View style={styles.healthHeader}>
        <View
          style={[
            styles.nutriBadge,
            { backgroundColor: profile.backgroundColor }
          ]}
        >
          <AppText variant="title" style={{ color: profile.color }}>
            {profile.grade}
          </AppText>
        </View>
        <View style={styles.healthCopy}>
          <AppText variant="label">
            {profile.hasNutrition
              ? t("recipes.health.estimated")
              : t("recipes.health.missingTitle")}
          </AppText>
          <AppText muted variant="caption">
            {t("recipes.health.localNote")}
          </AppText>
          <AppText muted variant="caption">
            {t("recipes.health.calculation")}
          </AppText>
        </View>
      </View>
      <View style={styles.nutriScale}>
        {nutriScoreGrades.map((grade) => (
          <View
            key={grade}
            style={[
              styles.nutriScaleItem,
              {
                backgroundColor: nutriScoreColors[grade],
                opacity: profile.grade === grade ? 1 : 0.42
              }
            ]}
          >
            <AppText
              variant="label"
              style={{
                color: grade === "C" || grade === "D" ? "#251A05" : "#FFFFFF"
              }}
            >
              {grade}
            </AppText>
          </View>
        ))}
      </View>
      {profile.facts.length ? (
        <View style={styles.healthFacts}>
          {profile.facts.map((fact) => (
            <View key={fact.labelKey} style={styles.healthFact}>
              <AppText muted variant="caption">
                {t(fact.labelKey)}
              </AppText>
              <AppText variant="label">{fact.value}</AppText>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.recommendations}>
        {profile.recommendations.map((recommendation) => (
          <View key={recommendation} style={styles.recommendationRow}>
            <View
              style={[
                styles.recommendationDot,
                { backgroundColor: profile.backgroundColor }
              ]}
            />
            <AppText style={styles.recommendationText}>
              {t(`recipes.health.recommendations.${recommendation}`)}
            </AppText>
          </View>
        ))}
      </View>
    </GlassPanel>
  );
}

function RecipeSection({
  title,
  items,
  ordered = false
}: {
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <GlassPanel style={styles.section}>
      <AppText variant="subtitle">{title}</AppText>
      <View style={styles.sectionItems}>
        {items.map((item, index) => (
          <View key={`${item}-${index}`} style={styles.row}>
            <AppText muted variant="label" style={styles.rowIndex}>
              {ordered ? `${index + 1}` : "•"}
            </AppText>
            <AppText style={styles.rowText}>{item}</AppText>
          </View>
        ))}
      </View>
    </GlassPanel>
  );
}

function getTimerPresets(
  recipe: DetailRecipe,
  t: (key: string) => string
): TimerPreset[] {
  const presets: TimerPreset[] = [
    {
      id: "prep",
      label: t("recipes.timers.prep"),
      minutes: isoDurationToMinutes(recipe.prepTime) ?? 0
    },
    {
      id: "cook",
      label: t("recipes.timers.cook"),
      minutes: isoDurationToMinutes(recipe.cookTime) ?? 0
    },
    {
      id: "total",
      label: t("recipes.timers.total"),
      minutes: isoDurationToMinutes(recipe.totalTime) ?? 0
    }
  ];

  return presets.filter((preset) => preset.minutes > 0);
}

function formatTimerSeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  const paddedMinutes = String(minutes).padStart(hours > 0 ? 2 : 1, "0");
  const paddedSeconds = String(remainingSeconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${paddedMinutes}:${paddedSeconds}`;
}

function normalizeNutrition(
  nutrition?: Nutrition | Nutrition[] | null
): [string, string][] {
  const node = Array.isArray(nutrition) ? nutrition[0] : nutrition;
  if (!node || typeof node !== "object") {
    return [];
  }

  return Object.entries(node)
    .filter(([key, value]) => key !== "@type" && Boolean(value))
    .map(([key, value]) => [key.replace(/Content$/, ""), String(value)]);
}

function getImageSource(
  recipe: ReturnType<typeof useRecipes>["recipes"][number] | undefined,
  client: ReturnType<typeof useAuth>["getClient"] extends () => infer T ? T : never
): ImageSource | null {
  if (!recipe) {
    return null;
  }

  const publicImage =
    [recipe.image, recipe.imageUrl, recipe.imagePlaceholderUrl].find(
      isDisplayableRecipeImage
    ) ?? "";
  if (publicImage) {
    return {
      uri: publicImage,
      headers:
        client && isCookbookImageEndpoint(publicImage)
          ? client.getImageHeaders()
          : undefined
    };
  }

  if (recipe.id && client) {
    return {
      uri: client.getRecipeImageUrl(recipe.id, "full"),
      headers: client.getImageHeaders()
    };
  }

  return null;
}

const styles = StyleSheet.create({
  heroImage: {
    alignItems: "center",
    aspectRatio: 1.25,
    borderRadius: radius.lg,
    justifyContent: "center",
    overflow: "hidden"
  },
  image: {
    height: "100%",
    width: "100%"
  },
  healthCopy: {
    flex: 1,
    gap: spacing.xxs
  },
  healthFact: {
    minWidth: "30%"
  },
  healthFacts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  healthHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  metric: {
    alignItems: "flex-start",
    flex: 1,
    gap: spacing.xxs,
    minWidth: 104,
    padding: spacing.sm
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  nutritionItem: {
    minWidth: "44%"
  },
  nutriBadge: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  nutriScale: {
    flexDirection: "row",
    gap: spacing.xxs
  },
  nutriScaleItem: {
    alignItems: "center",
    borderRadius: radius.sm,
    flex: 1,
    height: 28,
    justifyContent: "center"
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  recommendationDot: {
    borderRadius: radius.pill,
    height: 8,
    marginTop: 7,
    width: 8
  },
  recommendationRow: {
    flexDirection: "row",
    gap: spacing.xs
  },
  recommendationText: {
    flex: 1
  },
  recommendations: {
    gap: spacing.xs
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm
  },
  rowIndex: {
    width: 24
  },
  rowText: {
    flex: 1
  },
  section: {
    gap: spacing.md
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  sectionItems: {
    gap: spacing.sm
  },
  servingFooter: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  servingValue: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xxs
  },
  servingsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  timerActions: {
    flexDirection: "row",
    gap: spacing.xs
  },
  timerCard: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.sm
  },
  timerInfo: {
    flex: 1,
    gap: spacing.xxs
  },
  timerList: {
    gap: spacing.sm
  },
  titleBlock: {
    gap: spacing.xs
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  toolbarActions: {
    flexDirection: "row",
    gap: spacing.xs
  }
});
