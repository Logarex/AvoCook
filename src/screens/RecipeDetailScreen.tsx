import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image, type ImageSource } from "expo-image";
import { useKeepAwake } from "expo-keep-awake";
import type { LucideIcon } from "lucide-react-native";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  FileUp,
  HeartPulse,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Share2,
  ShoppingCart,
  Square,
  Timer,
  Trash2,
  Users
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Linking,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { Pill } from "../components/Pill";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { ScreenErrorBoundary } from "../components/ScreenErrorBoundary";
import { useAuth } from "../features/auth/AuthProvider";
import { usePreferences } from "../features/preferences/PreferencesProvider";
import type { HealthProfile } from "../features/recipes/health";
import { getRecipeHealthProfile } from "../features/recipes/health";
import {
  canUseRemoteRecipeImageFallback,
  isCookbookImageEndpoint,
  isDisplayableRecipeImage
} from "../features/recipes/recipeImageReferences";
import {
  printRecipe,
  shareRecipeFile,
  shareRecipePdf,
  type RecipePrintLabels
} from "../features/recipes/recipeSharing";
import { useRecipes } from "../features/recipes/RecipesProvider";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
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
import { isExternalRecipeSourceUrl } from "../features/recipes/recipeSource";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { humanDuration, isoDurationToMinutes } from "../utils/duration";
import { scaleIngredientLine } from "../utils/servings";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeDetail">;
type DetailRecipe = ReturnType<typeof useRecipes>["recipes"][number];
type ToolbarAction = {
  id: string;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
};

const TOOLBAR_ICON_SIZE = 44;
const TOOLBAR_HORIZONTAL_PADDING = spacing.md * 2;
const TOOLBAR_BACK_ACTION_GAP = spacing.sm;

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
  const {
    deleteRecipe,
    getRecipe,
    updateRecipeFromSource,
    updateRecipePreferences
  } = useRecipes();
  const { addIngredients } = useShoppingList();
  const recipe = getRecipe(route.params.id);

  if (keepScreenAwake) {
    return (
      <>
        <KeepAwake />
        <ScreenErrorBoundary
          resetKey={route.params.id}
          fallback={<RecipeDetailFallback navigation={navigation} />}
        >
          <RecipeDetailContent
            navigation={navigation}
            recipeId={route.params.id}
            recipe={recipe}
            deleteRecipe={deleteRecipe}
            updateRecipeFromSource={updateRecipeFromSource}
            updateRecipePreferences={updateRecipePreferences}
            addIngredientsToShoppingList={addIngredients}
            getClient={getClient}
            getImageSource={() => getImageSource(recipe, getClient())}
          />
        </ScreenErrorBoundary>
      </>
    );
  }

  return (
    <ScreenErrorBoundary
      resetKey={route.params.id}
      fallback={<RecipeDetailFallback navigation={navigation} />}
    >
      <RecipeDetailContent
        navigation={navigation}
        recipeId={route.params.id}
        recipe={recipe}
        deleteRecipe={deleteRecipe}
        updateRecipeFromSource={updateRecipeFromSource}
        updateRecipePreferences={updateRecipePreferences}
        addIngredientsToShoppingList={addIngredients}
        getClient={getClient}
        getImageSource={() => getImageSource(recipe, getClient())}
      />
    </ScreenErrorBoundary>
  );
}

function RecipeDetailFallback({ navigation }: { navigation: Props["navigation"] }) {
  const { t } = useTranslation();
  return (
    <Screen>
      <IconButton
        icon={ArrowLeft}
        label={t("common.back")}
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate("Recipes");
          }
        }}
      />
      <GlassPanel style={styles.section}>
        <AppText variant="subtitle">{t("recipes.openFailedTitle")}</AppText>
        <AppText muted>{t("recipes.openFailedBody")}</AppText>
      </GlassPanel>
    </Screen>
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
  updateRecipeFromSource,
  updateRecipePreferences,
  addIngredientsToShoppingList,
  getClient,
  getImageSource
}: {
  navigation: Props["navigation"];
  recipeId: string;
  recipe: ReturnType<typeof useRecipes>["recipes"][number] | undefined;
  deleteRecipe: (id: string) => Promise<void>;
  updateRecipeFromSource: ReturnType<typeof useRecipes>["updateRecipeFromSource"];
  updateRecipePreferences: ReturnType<typeof useRecipes>["updateRecipePreferences"];
  addIngredientsToShoppingList: ReturnType<typeof useShoppingList>["addIngredients"];
  getClient: ReturnType<typeof useAuth>["getClient"];
  getImageSource: () => ImageSource | null;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [shareAction, setShareAction] = useState<
    "print" | "pdf" | "file" | "source" | null
  >(null);
  const source = getImageSource();
  const canUpdateFromSource = isExternalRecipeSourceUrl(recipe?.url);
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
  const metricItems = useMemo(() => {
    if (!recipe) {
      return [];
    }

    const prepDuration = humanDuration(recipe.prepTime);
    const cookDuration = humanDuration(recipe.cookTime);
    const totalDuration = humanDuration(recipe.totalTime);

    return [
      prepDuration
        ? {
            id: "prep",
            icon: Clock,
            label: t("recipes.prepTime"),
            value: prepDuration
          }
        : null,
      cookDuration
        ? {
            id: "cook",
            icon: Clock,
            label: t("recipes.cookTime"),
            value: cookDuration
          }
        : null,
      totalDuration
        ? {
            id: "total",
            icon: Clock,
            label: t("recipes.totalTime"),
            value: totalDuration
          }
        : null,
      recipe.recipeYield
        ? {
            id: "yield",
            icon: Users,
            label: t("recipes.yield"),
            value: String(selectedServings)
          }
        : null
    ].filter(
      (
        item
      ): item is {
        id: string;
        icon: LucideIcon;
        label: string;
        value: string;
      } => Boolean(item)
    );
  }, [recipe, selectedServings, t]);
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
          label={t("common.back")}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Recipes");
            }
          }}
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
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate("Recipes");
          }
          void deleteRecipe(recipeId);
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

  async function handlePrint() {
    if (!recipe) {
      return;
    }
    setShareAction("print");
    try {
      const result = await printRecipe(recipe, getPrintLabels(t), getClient());
      showShareWarning(result.skippedImageCount);
    } catch (error) {
      if (isUserDismissedShareOrPrint(error)) {
        return;
      }
      Alert.alert(t("recipes.share.failedTitle"), t("recipes.share.failedBody"));
    } finally {
      setShareAction(null);
    }
  }

  async function handleSharePdf() {
    if (!recipe) {
      return;
    }
    setShareAction("pdf");
    try {
      const result = await shareRecipePdf(recipe, getPrintLabels(t), getClient());
      showShareWarning(result.skippedImageCount);
    } catch (error) {
      if (isUserDismissedShareOrPrint(error)) {
        return;
      }
      Alert.alert(t("recipes.share.failedTitle"), t("recipes.share.failedBody"));
    } finally {
      setShareAction(null);
    }
  }

  async function handleShareFile() {
    if (!recipe) {
      return;
    }
    setShareAction("file");
    try {
      const result = await shareRecipeFile(recipe, getClient());
      showShareWarning(result.skippedImageCount);
    } catch (error) {
      if (isUserDismissedShareOrPrint(error)) {
        return;
      }
      Alert.alert(t("recipes.share.failedTitle"), t("recipes.share.failedBody"));
    } finally {
      setShareAction(null);
    }
  }

  async function handleUpdateFromSource() {
    if (!recipe) {
      return;
    }
    Alert.alert(
      t("recipes.share.updateFromSourceConfirmTitle"),
      t("recipes.share.updateFromSourceConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("recipes.share.updateFromSource"),
          onPress: () => {
            void updateFromSource(recipe);
          }
        }
      ]
    );
  }

  async function updateFromSource(recipeToUpdate: DetailRecipe) {
    setShareAction("source");
    try {
      await updateRecipeFromSource(recipeToUpdate);
      Alert.alert(
        t("recipes.share.updateFromSourceSuccessTitle"),
        t("recipes.share.updateFromSourceSuccessBody")
      );
    } catch {
      Alert.alert(
        t("recipes.share.updateFromSourceFailedTitle"),
        t("recipes.share.updateFromSourceFailedBody")
      );
    } finally {
      setShareAction(null);
    }
  }

  async function handleAddToShoppingList() {
    if (!recipe || !scaledIngredients.length) {
      return;
    }

    const result = await addIngredientsToShoppingList(scaledIngredients, {
      recipeId,
      recipeName: recipe.name
    });
    showShoppingListAddResult(result.added.length);
  }

  async function handleAddIngredientToShoppingList(ingredient: string) {
    if (!recipe) {
      return;
    }

    const result = await addIngredientsToShoppingList([ingredient], {
      recipeId,
      recipeName: recipe.name
    });
    showShoppingListAddResult(result.added.length);
  }

  function showShoppingListAddResult(addedCount: number) {
    Alert.alert(
      addedCount
        ? t("shoppingList.addedTitle")
        : t("shoppingList.alreadyAddedTitle"),
      addedCount
        ? t("shoppingList.addedBody", { count: addedCount })
        : t("shoppingList.alreadyAddedBody")
    );
  }

  function showShareWarning(skippedImageCount: number) {
    if (skippedImageCount > 0) {
      Alert.alert(
        t("recipes.share.partialTitle"),
        t("recipes.share.partialBody", { count: skippedImageCount })
      );
    }
  }

  const toolbarActions: ToolbarAction[] = [
    {
      id: "print",
      icon: Printer,
      label: t("recipes.share.print"),
      onPress: () => void handlePrint(),
      disabled: shareAction !== null
    },
    {
      id: "share-pdf",
      icon: Share2,
      label: t("recipes.share.sharePdf"),
      onPress: () => void handleSharePdf(),
      disabled: shareAction !== null,
      tone: "primary"
    },
    {
      id: "share-file",
      icon: FileUp,
      label: t("recipes.share.shareFile"),
      onPress: () => void handleShareFile(),
      disabled: shareAction !== null
    },
    ...(canUpdateFromSource
      ? [
          {
            id: "source",
            icon: RefreshCw,
            label: t("recipes.share.updateFromSource"),
            onPress: () => void handleUpdateFromSource(),
            disabled: shareAction !== null
          }
        ]
      : []),
    {
      id: "edit",
      icon: Pencil,
      label: t("common.edit"),
      onPress: () => navigation.navigate("RecipeEditor", { id: recipeId }),
      tone: "primary"
    },
    {
      id: "delete",
      icon: Trash2,
      label: t("common.delete"),
      onPress: () => void handleDelete(),
      tone: "danger"
    }
  ];
  const toolbarColumnCount = getToolbarColumnCount(
    toolbarActions.length,
    windowWidth
  );
  const toolbarRows = chunkToolbarActions(toolbarActions, toolbarColumnCount);
  const toolbarActionsWidth = getToolbarActionsWidth(toolbarColumnCount);

  return (
    <Screen showScrollTop={false}>
      <View style={styles.toolbar}>
        <IconButton
          icon={ArrowLeft}
          label={t("common.back")}
          onPress={() => navigation.goBack()}
        />
        <View style={[styles.toolbarActions, { width: toolbarActionsWidth }]}>
          {toolbarRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.toolbarActionRow}>
              {row.map((action) => (
                <IconButton
                  key={action.id}
                  icon={action.icon}
                  label={action.label}
                  onPress={action.onPress}
                  disabled={action.disabled}
                  tone={action.tone}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.heroImage, { backgroundColor: colors.chip }]}>
        {source ? (
          <Image
            accessibilityLabel={recipe.name}
            accessibilityRole="image"
            source={source}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <AppText
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            variant="title"
            style={{ color: colors.primary }}
          >
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

      {metricItems.length ? (
        <View style={styles.metrics}>
          {metricItems.map((item) => (
            <Metric
              key={item.id}
              icon={item.icon}
              label={item.label}
              value={item.value}
            />
          ))}
        </View>
      ) : null}

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

      <IngredientSection
        items={scaledIngredients}
        onAddAll={() => void handleAddToShoppingList()}
        onAddItem={(ingredient) =>
          void handleAddIngredientToShoppingList(ingredient)
        }
        title={t("recipes.ingredients")}
      />
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

      {recipe.sourceName ? (
        <GlassPanel style={styles.section}>
          <AppText muted variant="caption">
            {t("recipes.source")}
          </AppText>
          <AppText variant="label">{recipe.sourceName}</AppText>
          {recipe.url ? (
            <PrimaryButton
              icon={ExternalLink}
              label={t("recipes.openSource")}
              onPress={() => void Linking.openURL(recipe.url)}
              variant="ghost"
            />
          ) : null}
        </GlassPanel>
      ) : recipe.url ? (
        <PrimaryButton
          icon={ExternalLink}
          label={t("recipes.source")}
          onPress={() => void Linking.openURL(recipe.url)}
          variant="ghost"
        />
      ) : null}

      {healthProfile?.hasNutrition ? <HealthSection profile={healthProfile} /> : null}
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
                      ? `${preset.label}, ${t("recipes.timers.pause")}`
                      : `${preset.label}, ${t("recipes.timers.start")}`
                  }
                  onPress={() => onToggle(preset.id)}
                  tone="primary"
                />
                <IconButton
                  icon={running || finished ? Square : RotateCcw}
                  label={
                    running || finished
                      ? `${preset.label}, ${t("recipes.timers.stop")}`
                      : `${preset.label}, ${t("recipes.timers.reset")}`
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

function IngredientSection({
  title,
  items,
  onAddAll,
  onAddItem
}: {
  title: string;
  items: string[];
  onAddAll: () => void;
  onAddItem: (ingredient: string) => void;
}) {
  const { t } = useTranslation();
  if (!items.length) {
    return null;
  }

  return (
    <GlassPanel style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">{title}</AppText>
        <PrimaryButton
          icon={ShoppingCart}
          label={t("shoppingList.addFromRecipe")}
          onPress={onAddAll}
          style={styles.addAllIngredientsButton}
          variant="ghost"
        />
      </View>
      <View style={styles.sectionItems}>
        {items.map((item, index) => (
          <View key={`${item}-${index}`} style={styles.ingredientRow}>
            <AppText muted variant="label" style={styles.rowIndex}>
              {"•"}
            </AppText>
            <AppText style={styles.rowText}>{item}</AppText>
            <IconButton
              icon={ShoppingCart}
              label={t("shoppingList.addIngredientFromRecipe", {
                ingredient: item
              })}
              onPress={() => onAddItem(item)}
              tone="primary"
              style={styles.ingredientAction}
            />
          </View>
        ))}
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

function getPrintLabels(t: (key: string) => string): RecipePrintLabels {
  return {
    appName: "AvoCook",
    calories: t("editor.caloriesKcal"),
    category: t("recipes.category"),
    cookTime: t("recipes.cookTime"),
    carbs: t("editor.carbsGrams"),
    fat: t("editor.fatGrams"),
    fiber: t("editor.fiberGrams"),
    ingredients: t("recipes.ingredients"),
    instructions: t("recipes.instructions"),
    keywords: t("recipes.share.keywords"),
    nutrition: t("recipes.nutrition"),
    nutriScore: "Nutri-Score",
    prepTime: t("recipes.prepTime"),
    protein: t("editor.proteinGrams"),
    saturatedFat: t("editor.saturatedFatGrams"),
    servingSize: t("recipes.share.servingSize"),
    source: t("recipes.source"),
    sodium: t("editor.sodiumMg"),
    sugar: t("editor.sugarGrams"),
    tools: t("recipes.tools"),
    totalTime: t("recipes.totalTime"),
    yield: t("recipes.yield")
  };
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

function isUserDismissedShareOrPrint(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /printing did not complete|cancel|dismiss|abort/i.test(error.message);
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

  if (client && canUseRemoteRecipeImageFallback(recipe)) {
    return {
      uri: client.getRecipeImageUrl(recipe.id, "full"),
      headers: client.getImageHeaders()
    };
  }

  return null;
}

function getToolbarColumnCount(actionCount: number, windowWidth: number) {
  const availableActionsWidth =
    windowWidth -
    TOOLBAR_HORIZONTAL_PADDING -
    TOOLBAR_ICON_SIZE -
    TOOLBAR_BACK_ACTION_GAP;

  if (getToolbarActionsWidth(actionCount) <= availableActionsWidth) {
    return actionCount;
  }

  return Math.max(1, Math.ceil(actionCount / 2));
}

function getToolbarActionsWidth(columnCount: number) {
  return (
    columnCount * TOOLBAR_ICON_SIZE +
    Math.max(0, columnCount - 1) * spacing.xs
  );
}

function chunkToolbarActions(actions: ToolbarAction[], columnCount: number) {
  const rows: ToolbarAction[][] = [];
  for (let index = 0; index < actions.length; index += columnCount) {
    rows.push(actions.slice(index, index + columnCount));
  }
  return rows;
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
    flexWrap: "wrap",
    gap: spacing.md
  },
  addAllIngredientsButton: {
    flexGrow: 1,
    minWidth: 190
  },
  ingredientAction: {
    height: 40,
    width: 40
  },
  ingredientRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44
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
    flexWrap: "wrap",
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
    flexWrap: "wrap",
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
    flexWrap: "wrap",
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
    alignItems: "flex-start",
    gap: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  toolbarActions: {
    alignItems: "stretch",
    gap: spacing.xs
  },
  toolbarActionRow: {
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "flex-end"
  }
});
