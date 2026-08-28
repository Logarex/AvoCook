import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image, type ImageSource } from "expo-image";
import { useKeepAwake } from "expo-keep-awake";
import type { LucideIcon } from "lucide-react-native";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Pencil,
  RefreshCw,
  Share,
  Trash2,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  useWindowDimensions,
  View,
} from "react-native";
import { ServingsControl } from "./recipeDetail/ServingsControl";
import { TimerSection } from "./recipeDetail/TimerSection";
import { IngredientSection } from "./recipeDetail/IngredientSection";
import { InstructionSection } from "./recipeDetail/InstructionSection";
import { HealthSection } from "./recipeDetail/HealthSection";
import { RecipeSection } from "./recipeDetail/RecipeSection";
import { ShareRecipeModal } from "./recipeDetail/ShareRecipeModal";
import { styles } from "./recipeDetail/recipeDetailStyles";
import {
  getTimerPresets,
  normalizeNutrition,
  getPrintLabels,
  getImageSource,
  getToolbarColumnCount,
  getToolbarActionsWidth,
  chunkToolbarActions,
  isUserDismissedShareOrPrint,
  type ToolbarAction,
  type DetailRecipe,
} from "./recipeDetail/recipeDetailHelpers";

import { StarRating } from "../components/StarRating";
import { getRecipeRating, setRecipeRating } from "../features/recipes/recipeRatings";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { useLongActionToast } from "../components/LongActionToast";
import { Pill } from "../components/Pill";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { ScreenErrorBoundary } from "../components/ScreenErrorBoundary";
import { useAuth } from "../features/auth/AuthProvider";
import { usePreferences } from "../features/preferences/PreferencesProvider";
import { getRecipeHealthProfile } from "../features/recipes/health";
import {
  shareRecipeFile,
  shareRecipePdf,
} from "../features/recipes/recipeSharing";
import { useRecipes } from "../features/recipes/RecipesProvider";
import { getRecipeCategoryLabel } from "../features/recipes/categories";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import {
  useRecipeTimers,
} from "../features/timers/TimersProvider";
import {
  normalizeRecipe,
} from "../features/recipes/types";
import {
  submitCommunityRecipe,
  type RecipeLanguage,
} from "../features/community/communityClient";
import { isExternalRecipeSourceUrl } from "../features/recipes/recipeSource";
import type { RootStackParamList } from "../navigation/types";
import { useAppTheme } from "../theme/ThemeProvider";
import { humanDuration } from "../utils/duration";
import { scaleIngredientLine } from "../utils/servings";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeDetail">;
export function RecipeDetailScreen({ navigation, route }: Props) {
  const { getClient } = useAuth();
  const { keepScreenAwake, communityPseudonym } = usePreferences();
  const {
    deleteRecipe,
    getRecipe,
    updateRecipeFromSource,
    updateRecipePreferences,
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
            communityPseudonym={communityPseudonym}
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
        communityPseudonym={communityPseudonym}
      />
    </ScreenErrorBoundary>
  );
}

function RecipeDetailFallback({
  navigation,
}: {
  navigation: Props["navigation"];
}) {
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
  getImageSource,
  communityPseudonym,
}: {
  navigation: Props["navigation"];
  recipeId: string;
  recipe: ReturnType<typeof useRecipes>["recipes"][number] | undefined;
  deleteRecipe: (id: string) => Promise<void>;
  updateRecipeFromSource: ReturnType<
    typeof useRecipes
  >["updateRecipeFromSource"];
  updateRecipePreferences: ReturnType<
    typeof useRecipes
  >["updateRecipePreferences"];
  addIngredientsToShoppingList: ReturnType<
    typeof useShoppingList
  >["addIngredients"];
  getClient: ReturnType<typeof useAuth>["getClient"];
  getImageSource: () => ImageSource | null;
  communityPseudonym: string | null;
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const { watchLongAction } = useLongActionToast();
  const { width: windowWidth } = useWindowDimensions();
  const [userRating, setUserRating] = useState<number>(0);

  useEffect(() => {
    let active = true;
    void getRecipeRating(recipeId).then((r) => {
      if (active) setUserRating(r);
    });
    return () => {
      active = false;
    };
  }, [recipeId]);

  const handleRatingChange = async (newRating: number) => {
    const next = userRating === newRating ? 0 : newRating;
    setUserRating(next);
    await setRecipeRating(recipeId, next);
  };
  const [shareAction, setShareAction] = useState<
    "print" | "pdf" | "file" | "source" | null
  >(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [checkedIngredientIndexes, setCheckedIngredientIndexes] = useState<
    Set<number>
  >(() => new Set());
  const [checkedStepIndexes, setCheckedStepIndexes] = useState<Set<number>>(
    () => new Set(),
  );
  const source = getImageSource();
  const canUpdateFromSource = isExternalRecipeSourceUrl(recipe?.url);
  const nutrition = useMemo(
    () => normalizeNutrition(recipe?.nutrition, t),
    [recipe?.nutrition, t],
  );
  const baseServings = Math.max(1, recipe?.recipeYield || 1);
  const showServings = !recipe?.localMeta?.hideServings;
  const selectedServings = showServings
    ? recipe?.localMeta?.servingOverride ?? baseServings
    : baseServings;
  const servingFactor = showServings ? selectedServings / baseServings : 1;
  const scaledIngredients = useMemo(
    () =>
      recipe?.recipeIngredient.map((ingredient) =>
        scaleIngredientLine(ingredient, servingFactor),
      ) ?? [],
    [recipe?.recipeIngredient, servingFactor],
  );
  useEffect(() => {
    setCheckedIngredientIndexes(new Set());
  }, [recipeId, scaledIngredients.length]);
  const checkedIngredientCount = useMemo(
    () =>
      scaledIngredients.reduce(
        (count, _ingredient, index) =>
          checkedIngredientIndexes.has(index) ? count + 1 : count,
        0,
      ),
    [checkedIngredientIndexes, scaledIngredients],
  );
  useEffect(() => {
    setCheckedStepIndexes(new Set());
  }, [recipeId, recipe?.recipeInstructions.length]);
  const checkedStepCount = useMemo(
    () =>
      recipe?.recipeInstructions.reduce(
        (count, _step, index) =>
          checkedStepIndexes.has(index) ? count + 1 : count,
        0,
      ) ?? 0,
    [checkedStepIndexes, recipe?.recipeInstructions],
  );
  const healthProfile = useMemo(
    () => (recipe ? getRecipeHealthProfile(recipe) : null),
    [recipe],
  );
  const timerPresets = useMemo(
    () => (recipe ? getTimerPresets(recipe, t) : []),
    [recipe, t],
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
            value: prepDuration,
          }
        : null,
      cookDuration
        ? {
            id: "cook",
            icon: Clock,
            label: t("recipes.cookTime"),
            value: cookDuration,
          }
        : null,
      totalDuration
        ? {
            id: "total",
            icon: Clock,
            label: t("recipes.totalTime"),
            value: totalDuration,
          }
        : null,
    ].filter(
      (
        item,
      ): item is {
        id: string;
        icon: LucideIcon;
        label: string;
        value: string;
      } => Boolean(item),
    );
  }, [recipe, t]);
  const {
    notificationStatus: timerNotificationStatus,
    resetTimer,
    timers,
    toggleTimer,
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
        },
      },
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
        localMeta: Object.keys(localMeta).length ? localMeta : undefined,
      }),
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
        title: t("recipes.timers.notificationTitle", { timer: preset.label }),
      });
      return;
    }

    const nextNotificationStatus = await toggleTimer(timerId, {
      body: recipe.name,
      title: t("recipes.timers.notificationTitle", { timer: preset.label }),
    });
    if (nextNotificationStatus !== "ready") {
      Alert.alert(
        t("recipes.timers.notificationsRequiredTitle"),
        t(
          nextNotificationStatus === "unavailable"
            ? "recipes.timers.notificationsUnavailableBody"
            : "recipes.timers.notificationsRequiredBody",
        ),
        nextNotificationStatus === "denied"
          ? [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("common.settings"),
                onPress: () => void Linking.openSettings(),
              },
            ]
          : undefined,
      );
    }
  }

  function handleResetTimer(timerId: string) {
    resetTimer(timerId);
  }

  async function handleSharePdf() {
    if (!recipe) {
      return;
    }
    setShareAction("pdf");
    const stopLongActionNotice = watchLongAction("longActions.exportRecipe");
    try {
      const result = await shareRecipePdf(
        recipe,
        getPrintLabels(t),
        getClient(),
      );
      showShareWarning(result.skippedImageCount);
    } catch (error) {
      if (isUserDismissedShareOrPrint(error)) {
        return;
      }
      Alert.alert(
        t("recipes.share.failedTitle"),
        t("recipes.share.failedBody"),
      );
    } finally {
      stopLongActionNotice();
      setShareAction(null);
    }
  }

  async function handleShareFile() {
    if (!recipe) {
      return;
    }
    setShareAction("file");
    const stopLongActionNotice = watchLongAction("longActions.shareRecipe");
    try {
      const result = await shareRecipeFile(recipe, getClient());
      showShareWarning(result.skippedImageCount);
    } catch (error) {
      if (isUserDismissedShareOrPrint(error)) {
        return;
      }
      Alert.alert(
        t("recipes.share.failedTitle"),
        t("recipes.share.failedBody"),
      );
    } finally {
      stopLongActionNotice();
      setShareAction(null);
    }
  }

  async function handleShareToCommunity() {
    if (!recipe) return;
    const language = (i18n.language.slice(0, 2) as RecipeLanguage) || "en";
    const healthProfile = getRecipeHealthProfile(recipe);
    Alert.alert(
      t("community.shareConfirmTitle"),
      t("community.shareConfirmBody") + `\n\n${recipe.name}`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.share"),
          onPress: () => {
            void (async () => {
              const stopLongActionNotice = watchLongAction("longActions.shareRecipe");
            try {
              await submitCommunityRecipe({
                title: recipe.name,
                description: recipe.description || "",
                ingredients: recipe.recipeIngredient,
                steps: recipe.recipeInstructions,
                language,
                authorName: communityPseudonym?.trim() || t("community.anonymousAuthor"),
                prepTime: recipe.prepTime || null,
                cookTime: recipe.cookTime || null,
                servings: recipe.recipeYield ? Number(recipe.recipeYield) : null,
                nutriScore: healthProfile.grade !== "?" ? (healthProfile.grade as "A" | "B" | "C" | "D" | "E") : null
              });
              Alert.alert(
                t("community.submitSuccessTitle"),
                t("community.submitSuccessBody", { defaultValue: "Merci pour votre contribution ! La recette est en ligne." })
              );
            } catch (err) {
              console.warn("community", "Submit recipe failed", err);
              Alert.alert(t("common.error"), t("community.submitFailedBody"));
            } finally {
              stopLongActionNotice();
            }
            })();
          }
        }
      ]
    );
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
          },
        },
      ],
    );
  }

  async function updateFromSource(recipeToUpdate: DetailRecipe) {
    setShareAction("source");
    try {
      await updateRecipeFromSource(recipeToUpdate);
      Alert.alert(
        t("recipes.share.updateFromSourceSuccessTitle"),
        t("recipes.share.updateFromSourceSuccessBody"),
      );
    } catch {
      Alert.alert(
        t("recipes.share.updateFromSourceFailedTitle"),
        t("recipes.share.updateFromSourceFailedBody"),
      );
    } finally {
      setShareAction(null);
    }
  }

  async function handleAddToShoppingList() {
    if (!recipe || !scaledIngredients.length) {
      return;
    }

    const toAdd = checkedIngredientCount > 0
      ? scaledIngredients.filter((_, index) => checkedIngredientIndexes.has(index))
      : scaledIngredients;

    if (toAdd.length === 0) return;

    const result = await addIngredientsToShoppingList(toAdd, {
      recipeId,
      recipeName: recipe.name,
    });
    showShoppingListAddResult(result.added.length);
  }

  async function handleAddIngredientToShoppingList(ingredient: string) {
    if (!recipe) {
      return;
    }

    const result = await addIngredientsToShoppingList([ingredient], {
      recipeId,
      recipeName: recipe.name,
    });
    showShoppingListAddResult(result.added.length);
  }

  function handleToggleIngredientCheck(index: number) {
    setCheckedIngredientIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function handleResetIngredientChecks() {
    setCheckedIngredientIndexes(new Set());
  }

  function handleToggleStepCheck(index: number) {
    setCheckedStepIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function handleResetStepChecks() {
    setCheckedStepIndexes(new Set());
  }

  function showShoppingListAddResult(addedCount: number) {
    Alert.alert(
      addedCount
        ? t("shoppingList.addedTitle")
        : t("shoppingList.alreadyAddedTitle"),
      addedCount
        ? t("shoppingList.addedBody", { count: addedCount })
        : t("shoppingList.alreadyAddedBody"),
    );
  }

  function showShareWarning(skippedImageCount: number) {
    if (skippedImageCount > 0) {
      Alert.alert(
        t("recipes.share.partialTitle"),
        t("recipes.share.partialBody", { count: skippedImageCount }),
      );
    }
  }

  const toolbarActions: ToolbarAction[] = [
    {
      id: "share",
      icon: Share,
      label: t("common.share"),
      onPress: () => setShowShareMenu(true),
      disabled: shareAction !== null,
    },
    ...(canUpdateFromSource
      ? [
          {
            id: "source",
            icon: RefreshCw,
            label: t("recipes.share.updateFromSource"),
            onPress: () => void handleUpdateFromSource(),
            disabled: shareAction !== null,
          },
        ]
      : []),
    {
      id: "edit",
      icon: Pencil,
      label: t("common.edit"),
      onPress: () => navigation.navigate("RecipeEditor", { id: recipeId }),
      tone: "primary",
    },
    {
      id: "delete",
      icon: Trash2,
      label: t("common.delete"),
      onPress: () => void handleDelete(),
      tone: "danger",
    },
  ];
  const toolbarColumnCount = getToolbarColumnCount(
    toolbarActions.length,
    windowWidth,
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

      <ShareRecipeModal
        visible={showShareMenu}
        onClose={() => setShowShareMenu(false)}
        onSharePdf={() => void handleSharePdf()}
        onShareFile={() => void handleShareFile()}
        onShareToCommunity={() => void handleShareToCommunity()}
        disabled={shareAction !== null}
      />

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
        {recipe.description ? (
          <AppText muted>{recipe.description}</AppText>
        ) : null}
        <View style={{ marginTop: 6, alignItems: "center" }}>
          <StarRating
            rating={userRating}
            interactive
            size={26}
            onRatingChange={(r) => void handleRatingChange(r)}
          />
        </View>
      </View>

      <View style={styles.pills}>
        {recipe.recipeCategory ? (
          <Pill label={getRecipeCategoryLabel(recipe.recipeCategory, t)} />
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

      {showServings ? (
        <ServingsControl
          baseServings={baseServings}
          selectedServings={selectedServings}
          onChange={(nextServings) => void handleServingsChange(nextServings)}
        />
      ) : null}

      <TimerSection
        presets={timerPresets}
        timers={timers}
        notificationStatus={timerNotificationStatus}
        onReset={handleResetTimer}
        onToggle={(timerId) => void handleToggleTimer(timerId)}
      />

      <IngredientSection
        checkedCount={checkedIngredientCount}
        checkedIndexes={checkedIngredientIndexes}
        items={scaledIngredients}
        onAddAll={() => void handleAddToShoppingList()}
        onAddItem={(ingredient) =>
          void handleAddIngredientToShoppingList(ingredient)
        }
        onResetChecked={handleResetIngredientChecks}
        onToggleItem={handleToggleIngredientCheck}
        title={t("recipes.ingredients")}
      />
      <InstructionSection
        checkedCount={checkedStepCount}
        checkedIndexes={checkedStepIndexes}
        title={t("recipes.instructions")}
        items={recipe.recipeInstructions}
        onResetChecked={handleResetStepChecks}
        onToggleItem={handleToggleStepCheck}
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

      {healthProfile?.hasNutrition ? (
        <HealthSection profile={healthProfile} />
      ) : null}
    </Screen>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
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
