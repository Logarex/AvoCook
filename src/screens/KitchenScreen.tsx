import { KitchenMealEditor } from "./KitchenMealEditor";
import { KitchenHistorySection } from "./KitchenHistorySection";
import { StockQuickAdd } from "./StockQuickAdd";
import { stockDuplicates } from "../features/kitchen/stockInventory";
import { StockInventoryList } from "./StockInventoryList";
import { DisclosureSection } from "../components/DisclosureSection";
import { StockExpiryField } from "./StockExpiryField";
import { StockProductLookup } from "./StockProductLookup";
import { StockProductScores } from "./StockProductScores";
import { SegmentedControl } from "../components/SegmentedControl";
import { KitchenRecipeList } from "../components/KitchenRecipeList";
import { kitchenHistory } from "../features/kitchen/history";
import { KitchenDailyScreen } from "./KitchenDailyScreen";
import { useLocalDay } from "../features/kitchen/useLocalDay";
import {
  repeatMeal,
  stockedShoppingIndices,
  upcomingMeals,
} from "../features/kitchen/everyday";
import { PageSwipeGesture } from "../components/PageSwipeGesture";
import { KitchenBackupScreen } from "./KitchenBackupScreen";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { KitchenDraggable } from "../components/KitchenDraggable";
import {
  getKitchenNative,
  replaceStockReminders,
} from "../features/kitchen/kitchenNative";
import { stockReminderPlan } from "../features/kitchen/stockReminders";
import { KitchenMenusScreen } from "./KitchenMenusScreen";
import { KitchenToolsScreen } from "./KitchenToolsScreen";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { AppSheet } from "../components/AppSheet";
import { IconButton } from "../components/IconButton";
import { ArrowLeft, ArrowRight, Check, Wrench, Pencil, ScanBarcode } from "lucide-react-native";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { useNavigationContentInset } from "../hooks/useNavigationContentInset";
import { useAppTheme } from "../theme/ThemeProvider";
import { TextField } from "../components/TextField";
import { markdownToPlainText } from "../features/markdown/markdown";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import {
  sharedBatchIngredients,
  matchesDietPreference,
  surpriseRecipe,
  convertKitchen,
  localDate,
  mealIngredients,
  mealRecipeId,
  newKitchenId,
  rankRecipes,
  recipeMinutes,
  shiftDate,
  validDate,
  weekDates,
  type Meal,
  type StockItem,
} from "../features/kitchen/kitchen";
import { useRecipes } from "../features/recipes/RecipesProvider";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import type { Recipe } from "../features/recipes/types";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Kitchen" | "Planning">;
type Tab =
  | "today"
  | "planner"
  | "stock"
  | "tonight"
  | "batch"
  | "history"
  | "converter"
  | "seasonal"
  | "substitutions"
  | "book"
  | "profiles"
  | "menus"
  | "backup";
export function KitchenScreen(props: Props) {
  const { account } = useKitchen();
  return <KitchenContent key={`${account}:${props.route.name}`} {...props} />;
}

function KitchenContent({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const planning = route.name === "Planning";
  const mainTabs: Tab[] = planning ? ["today", "planner", "history"] : ["stock", "tonight"];
  const extraTabs: Tab[] = planning ? ["menus", "batch"] : ["seasonal", "converter", "substitutions", "book", "profiles", "backup"];
  const kitchen = useKitchen();
  const { colors } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const navigationContentInset = useNavigationContentInset(fontScale);
  const [calendarWidth, setCalendarWidth] = useState(0);
  const [selectedDay, setSelectedDay] = useState(localDate());
  const { recipes, loading: recipesLoading } = useRecipes();
  const shopping = useShoppingList();
  const dayRefs = useRef(new Map<string, View>());
  const dropRects = useRef<
    { date: string; x: number; y: number; width: number; height: number }[]
  >([]);
  const dragX = useSharedValue(0),
    dragY = useSharedValue(0),
    dragActive = useSharedValue(0);
  const drag = useMemo(
    () => ({ x: dragX, y: dragY, active: dragActive }),
    [dragX, dragY, dragActive],
  );
  const [dragLabel, setDragLabel] = useState("");
  const ghostStyle = useAnimatedStyle(() => ({
    opacity: dragActive.value,
    transform: [
      { translateX: dragX.value - 100 },
      { translateY: dragY.value - 70 },
    ],
  }));
  const [dragQuery, setDragQuery] = useState("");
  const [tab, setTab] = useState<Tab>(route.params?.section ?? (planning ? "today" : "stock"));
  useEffect(() => {
    if (route.params?.section) {
      setTab(route.params.section);
      navigation.setParams({ section: undefined });
    }
  }, [route.params?.section, navigation]);
  const [week, setWeek] = useState(localDate());
  const incomingIngredients = route.params && "ingredients" in route.params ? route.params.ingredients : undefined;
  const [availableInput, setAvailableInput] = useState<string>(incomingIngredients ?? "");
  useEffect(() => {
    if (incomingIngredients !== undefined) setAvailableInput(incomingIngredients);
  }, [incomingIngredients]);
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState(false);
  const [rated, setRated] = useState(false);
  const [difficulty, setDifficulty] = useState(false);
  const [excluded, setExcluded] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [resultLimit, setResultLimit] = useState(8);
  useEffect(() => {
    setResultLimit(8);
  }, [availableInput, query, quick, rated, difficulty, excluded, kitchen.data]);
  const [busy, setBusy] = useState(false);
  const [meal, setMeal] = useState<Meal | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [freeIngredients, setFreeIngredients] = useState("");
  const [servings, setServings] = useState("1");
  const [picker, setPicker] = useState(false);
  const [recipeQuery, setRecipeQuery] = useState("");
  const [stockLocation, setStockLocation] = useState<StockItem["location"]>("fridge");
  const [scanStock, setScanStock] = useState(false);
  const [stock, setStock] = useState<StockItem | null>(null);
  const [quickStock, setQuickStock] = useState(false);
  const [lastSurprise, setLastSurprise] = useState<string | undefined>();
  const [usedStock, setUsedStock] = useState<StockItem | null>(null);
  const incomingProduct = route.params && "product" in route.params ? route.params.product : undefined;
  useEffect(() => {
    if (!incomingProduct || !kitchen.ready) return;
    setTab("stock");
    setScanStock(false);
    setStock({ ...incomingProduct, id: newKitchenId(), location: "fridge", expires: "" });
    navigation.setParams({ product: undefined } as Partial<RootStackParamList["Kitchen"]>);
  }, [incomingProduct, kitchen.ready, navigation]);
  const [batch, setBatch] = useState<string[]>([]);
  const [previewWeek, setPreviewWeek] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[] | null>(null);
  const [omittedShopping, setOmittedShopping] = useState<number[]>([]);
  useEffect(() => {
    setOmittedShopping([]);
  }, [preview]);
  const selectedShopping = (preview ?? []).filter(
    (_, index) => !omittedShopping.includes(index),
  );
  const inStockIndices = stockedShoppingIndices(
    preview ?? [],
    kitchen.data.stock,
  );
  useEffect(() => {
    if (!route.params?.recipeId || recipesLoading || !kitchen.ready) return;
    const recipe = recipes.find(
      (recipe) => recipe.id === route.params?.recipeId,
    );
    navigation.setParams({ recipeId: undefined });
    if (!recipe?.id) return;
    setTab("planner");
    setWeek(localDate());
    setSelectedDay(localDate());
    setMeal({
      id: newKitchenId(),
      date: localDate(),
      slot: "dinner",
      recipeId: recipe.id,
      servings: recipe.recipeYield || 1,
    });
    setServings(String(recipe.recipeYield || 1));
    setFreeIngredients("");
  }, [
    route.params?.recipeId,
    recipes,
    recipesLoading,
    kitchen.ready,
    navigation,
  ]);
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("g");
  const [to, setTo] = useState("kg");
  const today = useLocalDay();
  const dates = useMemo(() => weekDates(week), [week]);
  const activeDay = dates.includes(selectedDay) ? selectedDay : dates[0];
  const planned = useMemo(
    () => kitchen.data.meals.filter((item) => dates.includes(item.date)),
    [kitchen.data.meals, dates],
  );
  const weekShopping = useMemo(
    () => tab === "planner" ? mealIngredients(upcomingMeals(planned, today), recipes) : [],
    [tab, planned, recipes, today],
  );
  const batchRecipes = useMemo(() => {
    if (tab !== "batch") return [];
    const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    return batch.flatMap((id) => byId.get(id) ?? []);
  }, [tab, batch, recipes]);
  const exclusionText = `${excluded},${kitchen.data.excludedWords ?? ""}`;
  const candidates = useMemo(() => {
    if (tab !== "tonight") return [];
    const exclusions = exclusionText
      .split(",")
      .map((item) => item.trim().toLocaleLowerCase())
      .filter(Boolean);
    return recipes.filter((recipe) => {
      const journal = kitchen.data.journals[recipe.id ?? ""];
      const minutes = recipeMinutes(recipe);
      return (
        matchesDietPreference(recipe.id, kitchen.data) &&
        markdownToPlainText(
          `${recipe.name} ${recipe.keywords} ${recipe.recipeCategory}`,
        )
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()) &&
        (!quick || (minutes !== null && minutes <= 30)) &&
        (!rated || (journal?.rating ?? 0) >= 4) &&
        (!difficulty || journal?.difficulty === "easy") &&
        !exclusions.some((term) =>
          markdownToPlainText(recipe.recipeIngredient.join(" "))
            .toLocaleLowerCase()
            .includes(term),
        )
      );
    });
  }, [tab, recipes, kitchen.data, query, quick, rated, difficulty, exclusionText]);
  const suggestions = useMemo(
    () =>
      tab === "tonight"
        ? rankRecipes(
            candidates,
            [
              ...kitchen.data.stock,
              ...availableInput
                .split(/[,\n]/)
                .map((name) => name.trim())
                .filter(Boolean)
                .map((name) => ({
                  id: name,
                  name,
                  quantity: "",
                  expires: "",
                  location: "cupboard" as const,
                })),
            ],
            today,
          ).filter((result) => !availableInput.trim() || result.matched > 0)
        : [],
    [tab, candidates, kitchen.data.stock, availableInput, today],
  );
  const history = useMemo(
    () => tab === "history" ? kitchenHistory(kitchen.data, recipes) : [],
    [tab, kitchen.data, recipes],
  );
  const duplicates = stock ? stockDuplicates(kitchen.data.stock, stock) : [];
  const dateLabel = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  const fail = () => Alert.alert(t("common.error"), t("kitchen.saveError"));
  const pendingMutation = useRef(false);
  async function run(action: () => Promise<void>) {
    if (pendingMutation.current) return;
    pendingMutation.current = true;
    setBusy(true);
    try {
      await action();
    } catch {
      fail();
    } finally {
      pendingMutation.current = false;
      setBusy(false);
    }
  }
  const startDrag = (title: string) => {
    setDragLabel(title);
    dropRects.current = [];
    dayRefs.current.forEach((view, date) =>
      view.measureInWindow((x, y, width, height) => {
        dropRects.current.push({ date, x, y, width, height });
      }),
    );
  };
  const dropMeal = (
    x: number,
    y: number,
    source: { mealId: string } | { recipeId: string },
  ) => {
    const target = dropRects.current.find(
      (rect) =>
        x >= rect.x &&
        x <= rect.x + rect.width &&
        y >= rect.y &&
        y <= rect.y + rect.height,
    );
    if (!target) return;
    if ("mealId" in source && target.date > today && kitchen.data.meals.find((item) => item.id === source.mealId)?.completed) {
      Alert.alert(t("kitchen.futureEaten"));
      return;
    }
    setSelectedDay(target.date);
    void run(() =>
      kitchen.update((data) => {
        if ("mealId" in source)
          return {
            ...data,
            meals: data.meals.map((meal) =>
              meal.id === source.mealId ? { ...meal, date: target.date } : meal,
            ),
          };
        const recipe = recipes.find((recipe) => recipe.id === source.recipeId);
        return recipe
          ? {
              ...data,
              meals: [
                ...data.meals,
                {
                  id: newKitchenId(),
                  recipeId: source.recipeId,
                  date: target.date,
                  slot: "dinner",
                  servings: recipe.recipeYield || 1,
                },
              ],
            }
          : data;
      }),
    );
  };
  const selectRecipe = (recipe: Recipe) => {
    if (!recipe.id) return;
    if (tab === "batch") {
      setBatch((current) =>
        current.includes(recipe.id!)
          ? current.filter((id) => id !== recipe.id)
          : current.length < 5
            ? [...current, recipe.id!]
            : current,
      );
    } else if (meal) {
      setMeal({ ...meal, ...(!meal.kind || meal.kind === "recipe" ? { recipeId: recipe.id } : { linkedRecipeId: recipe.id }) });
      if (!meal.kind || meal.kind === "recipe") setServings(String(recipe.recipeYield || 1));
      setPicker(false);
    }
  };
  const openMeal = (
    date: string,
    slot: Meal["slot"],
    kind: Meal["kind"] = "simple",
  ) => {
    setMeal({
      id: newKitchenId(),
      kind,
      date,
      slot,
      recipeId: "",
      servings: 1,
    });
    setServings("1");
    setFreeIngredients("");
  };
  const editMeal = (item: Meal) => {
    setMeal(item);
    setServings(String(item.servings));
    setFreeIngredients((item.ingredients ?? []).join("\n"));
  };
  const button = (
    key: string,
    onPress: () => void,
    selected = false,
    disabled = false,
  ) => (
    <PrimaryButton
      compact
      key={key}
      label={t(`kitchen.${key}`)}
      onPress={onPress}
      variant={selected ? "primary" : "secondary"}
      disabled={disabled || busy}
    />
  );
  function toggleStockReminders() {
    void run(async () => {
      if (kitchen.data.remindersEnabled) {
        await kitchen.update((data) => ({
          ...data,
          remindersEnabled: false,
        }));
        await replaceStockReminders([]);
        return;
      }
      const native = getKitchenNative();
      if (
        !native ||
        !(await native.requestReminderPermission())
      ) {
        Alert.alert(t("kitchen.remindersUnavailable"));
        return;
      }
      const plan = stockReminderPlan(
        kitchen.data.stock,
        new Date(),
        t("kitchen.reminderTitle"),
        (names) => t("kitchen.reminderBody", { names }),
      );
      if (!(await replaceStockReminders(plan)))
        throw new Error("Reminder scheduling unavailable");
      await kitchen.update((data) => ({
        ...data,
        remindersEnabled: true,
      }));
    });
  }

  const saveStock = (next: boolean) => {
    if (!stock) return;
    void run(async () => {
      await kitchen.update((data) => ({ ...data, stock: [...data.stock.filter((item) => item.id !== stock.id), { ...stock, name: stock.name.trim() }] }));
      setStockLocation(stock.location);
      setStock(next ? { id: newKitchenId(), name: "", quantity: "", location: stock.location, expires: "" } : null);
    });
  };
  const conversion =
    amount.trim() && /^-?\d+(?:[.,]\d+)?$/.test(amount.trim())
      ? convertKitchen(Number(amount.replace(",", ".")), from, to)
      : null;
  return (
    <>
      <PageSwipeGesture
        onSwipeRight={() =>
          planning
            ? navigation.navigate("Kitchen", { tabTransition: "slide_from_left" })
            : navigation.navigate("Recipes", { tabTransition: "slide_from_left" })
        }
        onSwipeLeft={() =>
          planning
            ? navigation.navigate("Community", { tabTransition: "slide_from_right" })
            : navigation.navigate("Planning", { section: "today", tabTransition: "slide_from_right" })
        }
      >
        <Screen
          contentStyle={{ gap: 20, paddingBottom: navigationContentInset }}
          header={
            <ScreenHeader
              title={t(planning ? "kitchen.planningTitle" : "kitchen.title")}
              actions={
                <IconButton
                  icon={Wrench}
                  label={t("kitchen.tools")}
                  onPress={() => setToolsOpen(true)}
                />
              }
            />
          }
        >
          <SegmentedControl
            options={mainTabs.map((value) => ({
              value,
              label: t(`kitchen.nav_${value}`),
            }))}
            value={mainTabs.includes(tab) ? tab : ""}
            onChange={(value) => setTab(value as Tab)}
          />
          {!mainTabs.includes(tab) && (
            <AppText variant="subtitle">{t(`kitchen.${tab}`)}</AppText>
          )}
          {!kitchen.ready || (recipesLoading && tab !== "stock") ? (
            <>
              {kitchen.error ? (
                <>
                  <AppText>{t("kitchen.loadError")}</AppText>
                  {button("retry", () => {
                    void kitchen.reload().catch(fail);
                  })}
                </>
              ) : (
                <ActivityIndicator />
              )}
            </>
          ) : (
            <>
              {tab === "today" && (
                <KitchenDailyScreen
                  today={today}
                  onAdd={(slot, kind) => openMeal(today, slot, kind)}
                  onEdit={editMeal}
                  onIdeas={(ingredients) => {
                    navigation.navigate("Kitchen", { section: "tonight", ingredients: ingredients ?? "" });
                  }}
                  onStock={() => navigation.navigate("Kitchen", { section: "stock" })}
                  onRecipe={(id) => navigation.navigate("Cooking", { id })}
                />
              )}
              {tab === "planner" && (
                <>
                  <AppText variant="label" style={styles.weekTitle}>
                    {dateLabel(dates[0])} – {dateLabel(dates[6])}
                  </AppText>
                  <View style={styles.weekRow}>
                    <IconButton
                      icon={ArrowLeft}
                      label={t("kitchen.previousWeek")}
                      onPress={() => setWeek(shiftDate(week, -7))}
                    />
                    <PrimaryButton
                      compact
                      numberOfLines={0}
                      style={styles.weekToday}
                      variant="secondary"
                      label={t("kitchen.thisWeek")}
                      onPress={() => {
                        setWeek(today);
                        setSelectedDay(today);
                      }}
                    />
                    <IconButton
                      icon={ArrowRight}
                      label={t("kitchen.nextWeek")}
                      onPress={() => setWeek(shiftDate(week, 7))}
                    />
                  </View>
                  <View
                    onLayout={(event) =>
                      setCalendarWidth(event.nativeEvent.layout.width)
                    }
                  >
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.wrapDays}
                    >
                      {dates.map((date) => (
                        <Pressable
                          ref={(view) => {
                            if (view) dayRefs.current.set(date, view);
                            else dayRefs.current.delete(date);
                          }}
                          key={date}
                          accessibilityRole="button"
                          accessibilityState={{ selected: date === activeDay }}
                          accessibilityLabel={dateLabel(date)}
                          onPress={() => setSelectedDay(date)}
                          style={[
                            styles.day,
                            {
                              width: Math.max(
                                44 * fontScale,
                                (calendarWidth - 24) / 7,
                              ),
                            },
                            {
                              backgroundColor:
                                date === activeDay
                                  ? colors.chip
                                  : colors.backgroundElevated,
                              borderColor:
                                date === activeDay
                                  ? colors.primary
                                  : colors.border,
                            },
                          ]}
                        >
                          <AppText variant="caption" style={styles.dayText}>
                            {new Date(`${date}T12:00:00`).toLocaleDateString(
                              i18n.language,
                              { weekday: "short" },
                            )}
                          </AppText>
                          <AppText variant="subtitle">
                            {new Date(`${date}T12:00:00`).getDate()}
                          </AppText>
                          <AppText variant="caption" muted>
                            {planned.filter((meal) => meal.date === date)
                              .length || "—"}
                          </AppText>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                  <DisclosureSection title={t("kitchen.quickRecipe")}>
                  {!!dragQuery.trim() && (
                    <AppText variant="caption" muted>
                      {t("kitchen.dragHelp")}
                    </AppText>
                  )}
                  <TextField
                    label={t("kitchen.quickRecipe")}
                    value={dragQuery}
                    onChangeText={setDragQuery}
                  />
                  {!!dragQuery.trim() &&
                    recipes
                      .filter((recipe) =>
                        markdownToPlainText(recipe.name)
                          .toLocaleLowerCase()
                          .includes(dragQuery.trim().toLocaleLowerCase()),
                      )
                      .slice(0, 8)
                      .map((recipe) => (
                        <KitchenDraggable
                          key={recipe.id}
                          drag={drag}
                          onStart={() =>
                            startDrag(markdownToPlainText(recipe.name))
                          }
                          onDrop={(x, y) =>
                            recipe.id && dropMeal(x, y, { recipeId: recipe.id })
                          }
                        >
                          <PrimaryButton
                            compact
                            label={markdownToPlainText(recipe.name)}
                            variant="secondary"
                            onPress={() => {
                              setMeal({
                                id: newKitchenId(),
                                date: activeDay,
                                slot: "dinner",
                                recipeId: recipe.id!,
                                servings: recipe.recipeYield || 1,
                              });
                              setServings(String(recipe.recipeYield || 1));
                              setFreeIngredients("");
                            }}
                          />
                        </KitchenDraggable>
                      ))}
                  </DisclosureSection>
                  {[activeDay].map((date) => (
                    <GlassPanel key={date} style={styles.panel}>
                      <AppText variant="subtitle">{dateLabel(date)}</AppText>
                      {(["lunch", "dinner"] as const).map((slot) => (
                        <View key={slot} style={styles.panel}>
                          <AppText variant="label">
                            {t(`kitchen.${slot}`)}
                          </AppText>
                          {planned
                            .filter(
                              (item) =>
                                item.date === date && item.slot === slot,
                            )
                            .map((item) => {
                              const recipe = recipes.find(
                                (recipe) => recipe.id === mealRecipeId(item),
                              );
                              const title =
                                item.kind && item.kind !== "recipe"
                                  ? item.title || t(`kitchen.${item.kind}`)
                                  : recipe
                                    ? markdownToPlainText(recipe.name)
                                    : t("kitchen.unavailableRecipe");
                              return (
                                <View key={item.id} style={styles.panel}>
                                  <KitchenDraggable
                                    drag={drag}
                                    onStart={() => startDrag(title)}
                                    onDrop={(x, y) =>
                                      dropMeal(x, y, { mealId: item.id })
                                    }
                                  >
                                    <Pressable
                                      accessibilityRole="button"
                                      accessibilityLabel={`${t("kitchen.moveEdit")}: ${title}`}
                                      onPress={() => {
                                        editMeal(item);
                                      }}
                                      style={{ paddingVertical: 8 }}
                                    >
                                      <AppText>
                                        {item.completed ? "✓ " : ""}
                                        {title} · {item.servings}{" "}
                                        {t("kitchen.servings")} ⠿
                                      </AppText>
                                    </Pressable>
                                  </KitchenDraggable>
                                  {(!item.kind || item.kind === "recipe") &&
                                    !!item.title && (
                                      <AppText muted variant="caption">
                                        {item.title}
                                      </AppText>
                                    )}
                                  <View style={styles.wrap}>
                                    {recipe &&
                                      button("open", () =>
                                        navigation.navigate("RecipeDetail", {
                                          id: recipe.id!,
                                        }),
                                      )}
                                    <IconButton icon={Check} tone={item.completed ? "primary" : "default"} label={t(item.completed ? "kitchen.undoCooked" : "kitchen.markDone")}
                                      disabled={busy || (item.date > today && !item.completed)}
                                      onPress={() => { void run(() => kitchen.update((data) => ({ ...data, meals: data.meals.map((entry) => entry.id === item.id ? { ...entry, completed: !entry.completed } : entry) }))); }} />
                                  </View>
                                </View>
                              );
                            })}
                          {button("addMeal", () => openMeal(date, slot))}
                        </View>
                      ))}
                    </GlassPanel>
                  ))}
                  {planned.some(
                    (meal) =>
                      (!meal.kind || meal.kind === "recipe") &&
                      !recipes.some((recipe) => recipe.id === meal.recipeId),
                  ) && <AppText>{t("kitchen.missingRecipes")}</AppText>}
                  <PrimaryButton
                    label={t("kitchen.weekShopping")}
                    disabled={
                      busy ||
                      (!weekShopping.length &&
                        !shopping.items.some(
                          (item) =>
                            item.recipeId ===
                            `kitchen-week:${kitchen.data.shoppingGroupId}:${dates[0]}`,
                        ))
                    }
                    onPress={() => {
                      setPreviewWeek(dates[0]);
                      setPreview(weekShopping);
                    }}
                  />
                </>
              )}
              {tab === "stock" && (
                <>
                  <View style={[styles.stockActions, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
                    <Pressable accessibilityRole="button" accessibilityLabel={t("kitchen.scanProduct")}
                      style={({ pressed }) => [styles.stockAction, { backgroundColor: pressed ? colors.chip : "transparent" }]}
                      onPress={() => {
                        setScanStock(true);
                        setStock({ id: newKitchenId(), name: "", quantity: "", location: stockLocation, expires: "" });
                      }}>
                      <ScanBarcode size={21} color={colors.primaryStrong} />
                      <AppText variant="label" style={styles.stockActionLabel}>{t("kitchen.scanShort")}</AppText>
                    </Pressable>
                    <View style={[styles.stockActionDivider, { backgroundColor: colors.border }]} />
                    <Pressable accessibilityRole="button" accessibilityLabel={t("kitchen.addStock")}
                      style={({ pressed }) => [styles.stockAction, { backgroundColor: pressed ? colors.chip : "transparent" }]}
                      onPress={() => {
                        setScanStock(false);
                        setStock({ id: newKitchenId(), name: "", quantity: "", location: stockLocation, expires: "" });
                      }}>
                      <Pencil size={20} color={colors.primaryStrong} />
                      <AppText variant="label" style={styles.stockActionLabel}>{t("kitchen.manualShort")}</AppText>
                    </Pressable>
                  </View>
                  <PrimaryButton compact variant="ghost" label={t("kitchen.quickStock")} onPress={() => setQuickStock(true)} />
                  <StockInventoryList
                    items={kitchen.data.stock} today={today} busy={busy}
                    onLocationChange={setStockLocation}
                    onEdit={(item) => { setScanStock(false); setStock(item); }}
                    onIdeas={(item) => { setAvailableInput(item.name); setTab("tonight"); }}
                    onUse={(item) => {
                      void run(async () => {
                        await kitchen.update((data) => ({ ...data, stock: data.stock.filter((entry) => entry.id !== item.id) }));
                        setUsedStock(item);
                      });
                    }}
                  />
                  {usedStock && (
                    <PrimaryButton
                      compact
                      variant="secondary"
                      disabled={busy}
                      label={t("kitchen.undoUsed", { name: usedStock.name })}
                      onPress={() => {
                        void run(async () => {
                          await kitchen.update((data) => ({
                            ...data,
                            stock: data.stock.some(
                              (item) => item.id === usedStock.id,
                            )
                              ? data.stock
                              : [...data.stock, usedStock],
                          }));
                          setUsedStock(null);
                        });
                      }}
                    />
                  )}
                  <DisclosureSection title={t("kitchen.stockReminders")}>
                    <View style={styles.reminderSetting}>
                      <AppText style={{ flex: 1 }}>{t("kitchen.stockReminders")}</AppText>
                      <Switch accessibilityLabel={t("kitchen.stockReminders")} value={Boolean(kitchen.data.remindersEnabled)} disabled={busy} onValueChange={toggleStockReminders} trackColor={{ true: colors.primary }} />
                    </View>
                    <AppText muted variant="caption">{t("kitchen.reminderShort")}</AppText>
                  </DisclosureSection>
                  {kitchen.reminderError && <AppText accessibilityRole="alert">{t("kitchen.reminderSyncError")}</AppText>}
                </>
              )}
              {tab === "tonight" && (
                <>
                  <TextField
                    label={t("kitchen.availableTonight")}
                    placeholder={t("kitchen.availableExample")}
                    value={availableInput}
                    onChangeText={setAvailableInput}
                  />

                  <PrimaryButton
                    compact
                    variant="secondary"
                    label={t(
                      showFilters
                        ? "kitchen.hideFilters"
                        : "kitchen.showFilters",
                    )}
                    onPress={() => setShowFilters(!showFilters)}
                  />
                  {showFilters && (
                    <>
                      <View style={styles.wrap}>
                        {button("quick", () => setQuick(!quick), quick)}
                        {button("seasonal", () => setTab("seasonal"))}
                        <PrimaryButton compact variant="secondary" label={t("kitchen.fridgeAction")} onPress={() => navigation.navigate("FridgeRecipe", { ingredients: availableInput })} />
                      </View>
                      <TextField
                        label={t("common.search")}
                        value={query}
                        onChangeText={setQuery}
                      />
                      <TextField
                        label={t("kitchen.exclude")}
                        value={excluded}
                        onChangeText={setExcluded}
                      />
                      <AppText variant="caption" muted>
                        {t("kitchen.allergyNotice")}
                      </AppText>
                      <View style={styles.wrap}>
                        {button("highRating", () => setRated(!rated), rated)}
                        {button(
                          "easy",
                          () => setDifficulty(!difficulty),
                          difficulty,
                        )}
                      </View>
                    </>
                  )}
                  <PrimaryButton
                    label={t("kitchen.surprise")}
                    disabled={!suggestions.length}
                    onPress={() => {
                      const pool = suggestions.filter(({ recipe }) => recipe.id !== lastSurprise);
                      const recipe = surpriseRecipe((pool.length ? pool : suggestions).map((result) => result.recipe));
                      if (recipe?.id) {
                        setLastSurprise(recipe.id);
                        navigation.navigate("RecipeDetail", { id: recipe.id });
                      }
                    }}
                  />
                  {!suggestions.length && (
                    <AppText muted>{t("kitchen.noResults")}</AppText>
                  )}
                  {suggestions
                    .slice(0, resultLimit)
                    .map(({ recipe, missing, expiring }) => (
                      <GlassPanel key={recipe.id} style={styles.panel}>
                        <AppText variant="subtitle">
                          {markdownToPlainText(recipe.name)}
                        </AppText>
                        <AppText>
                          {t("kitchen.missing", { count: missing.length })}
                          {expiring
                            ? ` · ${t("kitchen.urgent", { count: expiring })}`
                            : ""}
                        </AppText>
                        {missing.slice(0, 3).map((line, i) => (
                          <AppText key={i} muted>
                            • {markdownToPlainText(line)}
                          </AppText>
                        ))}
                        {missing.length > 3 && (
                          <AppText muted variant="caption">
                            {t("kitchen.otherMissing", {
                              count: missing.length - 3,
                            })}
                          </AppText>
                        )}
                        <View style={styles.wrap}>
                          {button(
                            "open",
                            () =>
                              recipe.id &&
                              navigation.navigate("RecipeDetail", {
                                id: recipe.id,
                              }),
                          )}
                          {button("chooseMeal", () => {
                            editMeal({ id: newKitchenId(), kind: "recipe", recipeId: recipe.id!, date: today, slot: "dinner", servings: recipe.recipeYield || 1 });
                          })}
                          {!!missing.length &&
                            button("addMissing", () => {
                              setPreviewWeek(null);
                              setPreview(missing);
                            })}
                        </View>
                      </GlassPanel>
                    ))}
                  {resultLimit < suggestions.length && (
                    <PrimaryButton
                      compact
                      variant="secondary"
                      label={t("kitchen.showMore")}
                      onPress={() => setResultLimit((limit) => limit + 8)}
                    />
                  )}
                </>
              )}
              {tab === "batch" && (
                <>
                  <AppText muted>{t("kitchen.batchHelp")}</AppText>
                  {button("chooseRecipes", () => {
                    setRecipeQuery("");
                    setPicker(true);
                  })}
                  <AppText>{batchRecipes.length} / 5</AppText>
                  {batchRecipes.map((recipe) => (
                    <GlassPanel key={recipe.id} style={styles.panel}>
                      <AppText variant="subtitle">
                        {markdownToPlainText(recipe.name)}
                      </AppText>
                      <AppText muted>
                        {recipe.recipeYield} {t("kitchen.servings")}
                      </AppText>
                      {button("remove", () =>
                        setBatch((current) =>
                          current.filter((id) => id !== recipe.id),
                        ),
                      )}
                    </GlassPanel>
                  ))}
                  {batchRecipes.length >= 3 && (
                    <>
                      <PrimaryButton
                        label={t("kitchen.weekShopping")}
                        onPress={() => {
                          setPreviewWeek(null);
                          setPreview(
                            mealIngredients(
                              batchRecipes.map((recipe) => ({
                                id: recipe.id!,
                                recipeId: recipe.id!,
                                date: today,
                                slot: "dinner",
                                servings: recipe.recipeYield,
                              })),
                              recipes,
                            ),
                          );
                        }}
                      />
                      <GlassPanel style={styles.panel}>
                        <AppText variant="subtitle">
                          {t("kitchen.preparationOrder")}
                        </AppText>
                        <AppText muted>{t("kitchen.batchOrderHelp")}</AppText>
                        <AppText variant="label">
                          {t("kitchen.sharedPreparation")}
                        </AppText>
                        <AppText muted variant="caption">
                          {t("kitchen.sharedPreparationHelp")}
                        </AppText>
                        {sharedBatchIngredients(batchRecipes).map((group) => (
                          <View key={group.name}>
                            <AppText variant="label">
                              {group.name} · {group.recipes}{" "}
                              {t("kitchen.batchRecipesLabel")}
                            </AppText>
                            {group.ingredients.map((line, index) => (
                              <AppText key={index}>• {line}</AppText>
                            ))}
                          </View>
                        ))}
                        <AppText variant="label">
                          {t("kitchen.gatherTools")}
                        </AppText>
                        {[
                          ...new Set(
                            batchRecipes
                              .flatMap((recipe) => recipe.tool)
                              .map(markdownToPlainText),
                          ),
                        ].map((tool) => (
                          <AppText key={tool}>• {tool}</AppText>
                        ))}
                        {[...batchRecipes]
                          .sort(
                            (a, b) =>
                              (recipeMinutes(b) ?? -1) -
                              (recipeMinutes(a) ?? -1),
                          )
                          .map((recipe, i) => (
                            <View key={recipe.id} style={styles.panel}>
                              <AppText>
                                {i + 1}. {markdownToPlainText(recipe.name)}
                              </AppText>
                              <PrimaryButton
                                label={t("kitchen.cooking")}
                                disabled={!recipe.recipeInstructions.length}
                                onPress={() =>
                                  navigation.navigate("Cooking", {
                                    id: recipe.id!,
                                  })
                                }
                              />
                            </View>
                          ))}
                      </GlassPanel>
                    </>
                  )}
                </>
              )}
              {tab === "history" && <KitchenHistorySection entries={history}
                onAdd={() => {
                  openMeal(today, "dinner", "simple");
                  setMeal((current) => current ? { ...current, completed: true } : current);
                }}
                onEdit={editMeal}
                onRepeat={(item) => editMeal(repeatMeal(item, today))}
                onRecipe={(id) => navigation.navigate("RecipeDetail", { id })}
                onJournal={(id) => navigation.navigate("RecipeJournal", { id })}
              />}
              {tab === "backup" && (
                <KitchenBackupScreen key={kitchen.account} />
              )}
              {tab === "menus" && <KitchenMenusScreen key={kitchen.account} />}
              {(tab === "seasonal" ||
                tab === "substitutions" ||
                tab === "book" ||
                tab === "profiles") && (
                <KitchenToolsScreen
                  key={`${kitchen.account}:${tab}`}
                  section={tab}
                  openRecipe={(id) =>
                    navigation.navigate("RecipeDetail", { id })
                  }
                />
              )}
              {tab === "converter" && (
                <GlassPanel style={styles.panel}>
                  <TextField
                    label={t("kitchen.amount")}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numbers-and-punctuation"
                  />
                  <AppText variant="label">{t("kitchen.from")}</AppText>
                  <View style={styles.wrap}>
                    {[
                      "g",
                      "kg",
                      "mg",
                      "ml",
                      "cl",
                      "dl",
                      "l",
                      "tsp",
                      "tbsp",
                      "°C",
                      "°F",
                    ].map((unit) => (
                      <PrimaryButton
                        compact
                        key={unit}
                        label={unit}
                        variant={from === unit ? "primary" : "secondary"}
                        onPress={() => setFrom(unit)}
                      />
                    ))}
                  </View>
                  <AppText variant="label">{t("kitchen.to")}</AppText>
                  <View style={styles.wrap}>
                    {[
                      "g",
                      "kg",
                      "mg",
                      "ml",
                      "cl",
                      "dl",
                      "l",
                      "tsp",
                      "tbsp",
                      "°C",
                      "°F",
                    ].map((unit) => (
                      <PrimaryButton
                        compact
                        key={unit}
                        label={unit}
                        variant={to === unit ? "primary" : "secondary"}
                        onPress={() => setTo(unit)}
                      />
                    ))}
                  </View>
                  <AppText variant="title" accessibilityLiveRegion="polite">
                    {conversion === null
                      ? t("kitchen.incompatible")
                      : `${Number(conversion.toFixed(3)).toLocaleString(i18n.language, { maximumFractionDigits: 3 })} ${to}`}
                  </AppText>
                  <AppText muted>{t("kitchen.converterHelp")}</AppText>
                </GlassPanel>
              )}
            </>
          )}
          <AppSheet
            title={t("kitchen.tools")}
            visible={toolsOpen}
            onClose={() => setToolsOpen(false)}
          >
            {extraTabs.map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  onPress={() => {
                    setToolsOpen(false);
                    setTab(value);
                  }}
                  style={({ pressed }) => [styles.toolRow, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
                >
                  <AppText style={{ flex: 1 }}>{t(`kitchen.${value}`)}</AppText>
                  <ArrowRight size={18} color={colors.textMuted} />
                </Pressable>
              ))}
          </AppSheet>
          <AppSheet
            visible={meal !== null || picker}
            title={t(picker ? "kitchen.chooseRecipes" : "kitchen.addMeal")}
            busy={busy}
            preventDismiss={Boolean(meal && (meal.notes ?? "") !== (kitchen.data.meals.find((item) => item.id === meal.id)?.notes ?? ""))}
            onClose={() => {
              if (picker) setPicker(false);
              else if (meal && (meal.notes ?? "") !== (kitchen.data.meals.find((item) => item.id === meal.id)?.notes ?? "")) {
                Alert.alert(t("kitchen.unsaved"), t("kitchen.unsavedBody"), [
                  { text: t("common.cancel"), style: "cancel" },
                  { text: t("kitchen.discard"), style: "destructive", onPress: () => setMeal(null) },
                ]);
              } else setMeal(null);
            }}
          >
            {meal && !picker && <KitchenMealEditor key={meal.id} meal={meal} onChange={setMeal} recipes={recipes}
              servings={servings} onServings={setServings} ingredients={freeIngredients} onIngredients={setFreeIngredients}
              history={tab === "history"} today={today} busy={busy}
              onChooseRecipe={() => { setRecipeQuery(""); setPicker(true); }}
              onDelete={kitchen.data.meals.some((item) => item.id === meal.id) ? () => {
                void run(async () => { await kitchen.update((data) => ({ ...data, meals: data.meals.filter((item) => item.id !== meal.id) })); setMeal(null); });
              } : undefined}
              onSave={() => {
                void run(async () => {
                  await kitchen.update((data) => ({ ...data, meals: [
                    ...data.meals.filter((item) => item.id !== meal.id),
                    { ...meal, servings: Number(servings), ingredients: meal.kind === "simple" ? freeIngredients.split("\n").map((line) => line.trim()).filter(Boolean) : undefined },
                  ] }));
                  setMeal(null);
                });
              }}
            />}
            {picker && (
              <View style={styles.panel}>
                <TextField
                  label={t("common.search")}
                  value={recipeQuery}
                  onChangeText={setRecipeQuery}
                />
                {!recipes.length && (
                  <AppText muted>{t("kitchen.noResults")}</AppText>
                )}
                <KitchenRecipeList
                  key={recipeQuery}
                  recipes={recipes.filter((recipe) =>
                    markdownToPlainText(recipe.name)
                      .toLocaleLowerCase()
                      .includes(recipeQuery.toLocaleLowerCase()),
                  )}
                >
                  {(recipe) => (
                    <PrimaryButton
                      compact
                      numberOfLines={0}
                      key={recipe.id}
                      label={`${tab === "batch" && batch.includes(recipe.id!) ? "✓ " : ""}${markdownToPlainText(recipe.name)}`}
                      variant="secondary"
                      disabled={
                        tab === "batch" &&
                        batch.length >= 5 &&
                        !batch.includes(recipe.id!)
                      }
                      onPress={() => selectRecipe(recipe)}
                    />
                  )}
                </KitchenRecipeList>
                {button("done", () => setPicker(false))}
              </View>
            )}
          </AppSheet>
          {quickStock && <StockQuickAdd location={stockLocation} onClose={() => setQuickStock(false)} />}
          <AppSheet
            visible={stock !== null}
            title={t("kitchen.addStock")}
            busy={busy}
            onClose={() => setStock(null)}
          >
            {stock && (
              <View style={styles.panel}>
                <StockProductLookup key={stock.id} initiallyOpen={scanStock} onProduct={(product) => {
                  setStock((current) => current ? { ...current, nutrients: undefined, ...product, expires: current.expires } : null);
                }} />
                <TextField
                  label={t("kitchen.foodName")}
                  value={stock.name}
                  onChangeText={(name) => setStock({ ...stock, name, ...(name !== stock.name ? { barcode: undefined, nutriScore: undefined, greenScore: undefined, nutrients: undefined } : {}) })}
                />
                {!!duplicates.length && <View style={styles.panel}>
                  <AppText variant="label" accessibilityLiveRegion="polite">{t("kitchen.stockDuplicate")}</AppText>
                  {duplicates.slice(0, 3).map((item) => <AppText key={item.id} muted variant="caption">{item.name} · {t(`kitchen.${item.location}`)}{item.quantity ? ` · ${item.quantity}` : ""}{item.expires ? ` · ${dateLabel(item.expires)}` : ""}</AppText>)}
                  <AppText muted variant="caption">{t("kitchen.stockDuplicateHelp")}</AppText>
                </View>}
                <StockProductScores item={stock} />
                <DisclosureSection title={`${t("kitchen.quantity")}${stock.quantity ? ` · ${stock.quantity}` : ""}`}>
                <TextField
                  label={t("kitchen.quantity")}
                  value={stock.quantity}
                  onChangeText={(quantity) => setStock({ ...stock, quantity })}
                />
                </DisclosureSection>
                <StockExpiryField value={stock.expires} onChange={(expires) => setStock({ ...stock, expires })} />
                <SegmentedControl
                  options={(["fridge", "cupboard", "freezer"] as const).map((value) => ({ value, label: t(`kitchen.${value}`) }))}
                  value={stock.location}
                  onChange={(location) => setStock({ ...stock, location })}
                />
                <PrimaryButton
                  label={t("common.save")}
                  disabled={
                    busy ||
                    !stock.name.trim() ||
                    (!!stock.expires && !validDate(stock.expires))
                  }
                  onPress={() => saveStock(false)}
                />
                <PrimaryButton variant="secondary" label={t("kitchen.saveAndNext")} disabled={busy || !stock.name.trim() || (!!stock.expires && !validDate(stock.expires))} onPress={() => saveStock(true)} />
              </View>
            )}
          </AppSheet>
          <AppSheet
            visible={preview !== null}
            title={t("kitchen.weekShopping")}
            busy={busy}
            onClose={() => setPreview(null)}
          >
            <View style={styles.panel}>
              <AppText muted>{t("kitchen.checkShopping")}</AppText>
              {!!inStockIndices.length && (
                <>
                  <PrimaryButton
                    compact
                    variant="secondary"
                    label={t("kitchen.skipStocked")}
                    onPress={() =>
                      setOmittedShopping((current) => [
                        ...new Set([...current, ...inStockIndices]),
                      ])
                    }
                  />
                  <AppText variant="caption" muted>
                    {t("kitchen.stockQuantityCheck")}
                  </AppText>
                </>
              )}
              {preview?.map((line, i) => (
                <Pressable
                  key={i}
                  accessibilityRole="checkbox"
                  accessibilityLabel={markdownToPlainText(line)}
                  accessibilityState={{ checked: !omittedShopping.includes(i) }}
                  onPress={() =>
                    setOmittedShopping((current) =>
                      current.includes(i)
                        ? current.filter((index) => index !== i)
                        : [...current, i],
                    )
                  }
                  style={[styles.shoppingLine, { borderColor: colors.border }]}
                >
                  <AppText
                    style={{
                      color: omittedShopping.includes(i)
                        ? colors.textMuted
                        : colors.primary,
                    }}
                  >
                    {omittedShopping.includes(i) ? "○" : "✓"}
                  </AppText>
                  <View style={{ flex: 1 }}>
                    <AppText>{markdownToPlainText(line)}</AppText>
                    {inStockIndices.includes(i) && (
                      <AppText variant="caption" muted>
                        {t("kitchen.inStock")}
                      </AppText>
                    )}
                  </View>
                </Pressable>
              ))}
              {previewWeek && shopping.mode.kind === "local" && (
                <>
                  <AppText muted>{t("kitchen.refreshWeekHelp")}</AppText>
                  <PrimaryButton
                    label={t("kitchen.refreshWeekShopping")}
                    disabled={busy || shopping.loading || shopping.switching}
                    onPress={() => {
                      void run(async () => {
                        await shopping.replaceGeneratedIngredients(
                          selectedShopping,
                          {
                            recipeId: `kitchen-week:${kitchen.data.shoppingGroupId}:${previewWeek}`,
                            recipeName: `${t("kitchen.planner")} · ${dateLabel(previewWeek)}`,
                          },
                        );
                        setPreview(null);
                        Alert.alert(t("kitchen.weekShoppingUpdated"));
                      });
                    }}
                  />
                </>
              )}
              {(!previewWeek || shopping.mode.kind !== "local") && (
                <PrimaryButton
                  label={t("kitchen.addToShopping")}
                  disabled={
                    busy ||
                    shopping.loading ||
                    shopping.switching ||
                    !selectedShopping.length
                  }
                  onPress={() => {
                    void run(async () => {
                      const result =
                        await shopping.addIngredients(selectedShopping);
                      setPreview(null);
                      Alert.alert(
                        t(
                          result.added.length
                            ? "kitchen.itemsAdded"
                            : "kitchen.alreadyInShopping",
                          { count: result.added.length },
                        ),
                      );
                    });
                  }}
                />
              )}
            </View>
          </AppSheet>
        </Screen>
      </PageSwipeGesture>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.dragGhost,
          { backgroundColor: colors.primary },
          ghostStyle,
        ]}
      >
        <AppText style={{ color: colors.textInverted }} numberOfLines={2}>
          {dragLabel}
        </AppText>
      </Animated.View>
    </>
  );
}
const styles = StyleSheet.create({
  dragGhost: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 999,
    width: 200,
    borderRadius: 16,
    padding: 12,
  },
  panel: { gap: 12 },
  stockActions: { flexDirection: "row", alignItems: "center", borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, overflow: "hidden" },
  stockAction: { flex: 1, minWidth: 0, minHeight: 56, paddingVertical: 12, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  stockActionLabel: { flexShrink: 1, fontSize: 16 },
  stockActionDivider: { width: StyleSheet.hairlineWidth, height: 24 },
  reminderSetting: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shoppingLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  weekRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  weekTitle: { textAlign: "center", flexShrink: 1 },
  weekToday: { flex: 1, minWidth: 0 },
  wrapDays: { flexDirection: "row", gap: 4 },
  dayText: { textAlign: "center" },
  day: {
    flexShrink: 0,
    minHeight: 82,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 16,
  },
});
