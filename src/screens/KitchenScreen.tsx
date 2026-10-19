import { KitchenRecipeList } from "../components/KitchenRecipeList";
import { kitchenHistory } from "../features/kitchen/history";
import { KitchenDailyScreen } from "./KitchenDailyScreen";
import { useLocalDay } from "../features/kitchen/useLocalDay";
import {
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
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { AppSheet } from "../components/AppSheet";
import { IconButton } from "../components/IconButton";
import { ArrowLeft, ArrowRight, Wrench } from "lucide-react-native";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTabBarContentInset } from "../utils/safeArea";
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

type Props = NativeStackScreenProps<RootStackParamList, "Kitchen">;
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
const tabs: Tab[] = [
  "today",
  "planner",
  "stock",
  "tonight",
  "batch",
  "history",
  "converter",
  "seasonal",
  "substitutions",
  "book",
  "profiles",
  "menus",
  "backup",
];
export function KitchenScreen(props: Props) {
  const { account } = useKitchen();
  return <KitchenContent key={account} {...props} />;
}

function KitchenContent({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const kitchen = useKitchen();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
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
  const [tab, setTab] = useState<Tab>(route.params?.section ?? "today");
  useEffect(() => {
    if (route.params?.section) setTab(route.params.section);
  }, [route.params?.section]);
  const [week, setWeek] = useState(localDate());
  const [availableInput, setAvailableInput] = useState("");
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
  const [mealOptions, setMealOptions] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [showMealShopping, setShowMealShopping] = useState(false);
  const [freeIngredients, setFreeIngredients] = useState("");
  const [servings, setServings] = useState("1");
  const [picker, setPicker] = useState(false);
  const [recipeQuery, setRecipeQuery] = useState("");
  const [stock, setStock] = useState<StockItem | null>(null);
  const [usedStock, setUsedStock] = useState<StockItem | null>(null);
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
    () => mealIngredients(upcomingMeals(planned, today), recipes),
    [planned, recipes, today],
  );
  const batchRecipes = batch.flatMap(
    (id) => recipes.find((recipe) => recipe.id === id) ?? [],
  );
  const exclusionText = `${excluded},${kitchen.data.excludedWords ?? ""}`;
  const candidates = useMemo(() => {
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
  }, [recipes, kitchen.data, query, quick, rated, difficulty, exclusionText]);
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
    () => kitchenHistory(kitchen.data, recipes),
    [kitchen.data, recipes],
  );
  const dateLabel = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
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
      setMeal({ ...meal, recipeId: recipe.id });
      setServings(String(recipe.recipeYield || 1));
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
    setMealOptions(false);
    setShowMealShopping(false);
  };
  const editMeal = (item: Meal) => {
    setMeal(item);
    setServings(String(item.servings));
    setFreeIngredients((item.ingredients ?? []).join("\n"));
    setMealOptions(false);
    setShowMealShopping(Boolean(item.ingredients?.length));
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
  const conversion =
    amount.trim() && /^-?\d+(?:[.,]\d+)?$/.test(amount.trim())
      ? convertKitchen(Number(amount.replace(",", ".")), from, to)
      : null;
  return (
    <>
      <PageSwipeGesture
        onSwipeRight={() =>
          navigation.navigate("Recipes", { tabTransition: "slide_from_left" })
        }
        onSwipeLeft={() =>
          navigation.navigate("Community", {
            tabTransition: "slide_from_right",
          })
        }
      >
        <Screen
          contentStyle={{ paddingBottom: getTabBarContentInset(insets.bottom) }}
          header={
            <ScreenHeader
              title={t("kitchen.title")}
              onBack={() => navigation.goBack()}
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
          <View style={styles.wrap}>
            {(["today", "planner", "stock", "tonight"] as const).map(
              (value) => (
                <PrimaryButton
                  compact
                  style={styles.mainSection}
                  numberOfLines={0}
                  key={value}
                  label={t(`kitchen.nav_${value}`)}
                  variant={tab === value ? "primary" : "secondary"}
                  onPress={() => setTab(value)}
                />
              ),
            )}
          </View>
          {!["today", "planner", "stock", "tonight"].includes(tab) && (
            <AppText variant="subtitle">{t(`kitchen.${tab}`)}</AppText>
          )}
          {!kitchen.ready || recipesLoading ? (
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
                    setAvailableInput(ingredients ?? "");
                    setTab("tonight");
                  }}
                  onStock={() => setTab("stock")}
                  onWeek={() => {
                    setWeek(today);
                    setSelectedDay(today);
                    setTab("planner");
                  }}
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
                  <AppText variant="caption" muted>
                    {t("kitchen.plannerIntro")}
                  </AppText>
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
                                (recipe) => recipe.id === item.recipeId,
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
                                        setMeal(item);
                                        setServings(String(item.servings));
                                        setFreeIngredients(
                                          (item.ingredients ?? []).join("\n"),
                                        );
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
                                          id: item.recipeId,
                                        }),
                                      )}
                                    {button(
                                      item.completed
                                        ? "undoCooked"
                                        : "markDone",
                                      () => {
                                        void run(() =>
                                          kitchen.update((data) => ({
                                            ...data,
                                            meals: data.meals.map((m) =>
                                              m.id === item.id
                                                ? {
                                                    ...m,
                                                    completed: !m.completed,
                                                  }
                                                : m,
                                            ),
                                          })),
                                        );
                                      },
                                    )}
                                    {button("moveEdit", () => {
                                      setMeal(item);
                                      setServings(String(item.servings));
                                      setFreeIngredients(
                                        (item.ingredients ?? []).join("\n"),
                                      );
                                    })}
                                    {button("remove", () => {
                                      void run(() =>
                                        kitchen.update((data) => ({
                                          ...data,
                                          meals: data.meals.filter(
                                            (m) => m.id !== item.id,
                                          ),
                                        })),
                                      );
                                    })}
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
                  <AppText variant="caption" muted>
                    {t("kitchen.futureShoppingHelp")}
                  </AppText>
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
                  <AppText muted>{t("kitchen.startStock")}</AppText>
                  {button("addStock", () =>
                    setStock({
                      id: newKitchenId(),
                      name: "",
                      quantity: "",
                      location: "fridge",
                      expires: "",
                    }),
                  )}
                  {!kitchen.data.stock.length && (
                    <AppText muted>{t("kitchen.emptyStock")}</AppText>
                  )}
                  {[...kitchen.data.stock]
                    .sort((a, b) =>
                      (a.expires || "9999").localeCompare(b.expires || "9999"),
                    )
                    .map((item) => (
                      <GlassPanel key={item.id} style={styles.panel}>
                        <AppText variant="subtitle">
                          {item.name}
                          {item.quantity ? ` · ${item.quantity}` : ""}
                        </AppText>
                        <AppText muted>
                          {t(`kitchen.${item.location}`)}
                          {item.expires ? ` · ${dateLabel(item.expires)}` : ""}
                        </AppText>
                        {!!item.expires && item.expires < today && (
                          <AppText>{t("kitchen.datePassed")}</AppText>
                        )}
                        {!!item.expires &&
                          item.expires >= today &&
                          item.expires <= shiftDate(today, 3) && (
                            <AppText>{t("kitchen.soon")}</AppText>
                          )}
                        {(!item.expires || item.expires >= today) && (
                          <View style={styles.wrap}>
                            {button("findUse", () => {
                              setAvailableInput(item.name);
                              setTab("tonight");
                            })}
                            {button("planLeftover", () =>
                              editMeal({
                                id: newKitchenId(),
                                kind: "leftovers",
                                date: today,
                                slot: "dinner",
                                title: item.name,
                                recipeId: "",
                                servings: 1,
                              }),
                            )}
                          </View>
                        )}
                        <View style={styles.wrap}>
                          {button("edit", () => setStock(item))}
                          {button(
                            item.expires && item.expires < today
                              ? "remove"
                              : "usedUp",
                            () => {
                              void run(async () => {
                                await kitchen.update((data) => ({
                                  ...data,
                                  stock: data.stock.filter(
                                    (s) => s.id !== item.id,
                                  ),
                                }));
                                setUsedStock(item);
                              });
                            },
                          )}
                        </View>
                      </GlassPanel>
                    ))}
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
                  <PrimaryButton
                    label={t(
                      kitchen.data.remindersEnabled
                        ? "kitchen.disableReminders"
                        : "kitchen.enableReminders",
                    )}
                    variant="secondary"
                    disabled={busy}
                    onPress={() => {
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
                    }}
                  />
                  <AppText variant="caption" muted>
                    {t("kitchen.remindersHelp")}
                  </AppText>
                  {kitchen.reminderError && (
                    <AppText>{t("kitchen.reminderSyncError")}</AppText>
                  )}
                </>
              )}
              {tab === "tonight" && (
                <>
                  <AppText variant="subtitle">
                    {t("kitchen.recipeIdeas")}
                  </AppText>
                  <TextField
                    label={t("kitchen.availableTonight")}
                    placeholder={t("kitchen.availableExample")}
                    value={availableInput}
                    onChangeText={setAvailableInput}
                  />
                  <AppText variant="caption" muted>
                    {t("kitchen.matchHelp")}
                  </AppText>
                  {button("quick", () => setQuick(!quick), quick)}
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
                  {showFilters && (
                    <>
                      <PrimaryButton
                        label={t("kitchen.surprise")}
                        disabled={!candidates.length}
                        onPress={() => {
                          const recipe = surpriseRecipe(candidates);
                          if (recipe?.id)
                            navigation.navigate("RecipeDetail", {
                              id: recipe.id,
                            });
                        }}
                      />
                    </>
                  )}
                  {!suggestions.length && (
                    <AppText muted>{t("kitchen.noResults")}</AppText>
                  )}
                  <AppText muted>
                    {t("kitchen.resultCount", {
                      shown: Math.min(resultLimit, suggestions.length),
                      total: suggestions.length,
                    })}
                  </AppText>
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
              {tab === "history" && (
                <>
                  {!history.length && (
                    <AppText muted>{t("kitchen.emptyHistory")}</AppText>
                  )}
                  {history.map(({ id, recipe, recipeId, meal, date }) => (
                    <GlassPanel key={id} style={styles.panel}>
                      <AppText variant="subtitle">
                        {recipe
                          ? markdownToPlainText(recipe.name)
                          : meal?.title || t("kitchen.unavailableRecipe")}
                      </AppText>
                      <AppText muted>
                        {dateLabel(date)}
                        {meal ? ` · ${t(`kitchen.${meal.slot}`)}` : ""}
                      </AppText>
                      {recipeId && recipe
                        ? button("journal", () =>
                            navigation.navigate("RecipeJournal", {
                              id: recipeId,
                            }),
                          )
                        : button("showPlan", () => {
                            setWeek(date);
                            setSelectedDay(date);
                            setTab("planner");
                          })}
                    </GlassPanel>
                  ))}
                </>
              )}
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
            {tabs
              .filter(
                (value) =>
                  !["today", "planner", "stock", "tonight"].includes(value),
              )
              .map((value) => (
                <PrimaryButton
                  key={value}
                  compact
                  variant="secondary"
                  label={t(`kitchen.${value}`)}
                  onPress={() => {
                    setToolsOpen(false);
                    setTab(value);
                  }}
                />
              ))}
          </AppSheet>
          <AppSheet
            visible={meal !== null || picker}
            title={t(picker ? "kitchen.chooseRecipes" : "kitchen.addMeal")}
            busy={busy}
            onClose={() => {
              if (picker) setPicker(false);
              else setMeal(null);
            }}
          >
            {meal && !picker && (
              <View style={styles.panel}>
                <View style={styles.wrap}>
                  {(["recipe", "simple", "leftovers", "out"] as const).map(
                    (kind) =>
                      button(
                        kind,
                        () =>
                          setMeal({
                            ...meal,
                            kind,
                            title:
                              meal.title ||
                              (kind === "out" || kind === "leftovers"
                                ? t(`kitchen.${kind}`)
                                : ""),
                            recipeId: kind === "recipe" ? meal.recipeId : "",
                          }),
                        (meal.kind ?? "recipe") === kind,
                      ),
                  )}
                </View>
                {!meal.kind || meal.kind === "recipe" ? (
                  <PrimaryButton
                    label={
                      recipes.find((recipe) => recipe.id === meal.recipeId)
                        ?.name || t("kitchen.chooseRecipes")
                    }
                    onPress={() => {
                      setRecipeQuery("");
                      setPicker(true);
                    }}
                  />
                ) : (
                  <>
                    <TextField
                      label={t("kitchen.mealName")}
                      placeholder={t("kitchen.mealExample")}
                      value={meal.title ?? ""}
                      onChangeText={(title) => setMeal({ ...meal, title })}
                    />
                    {meal.kind === "simple" && (
                      <>
                        <PrimaryButton
                          compact
                          variant="secondary"
                          label={t(
                            showMealShopping
                              ? "kitchen.hideMealShopping"
                              : "kitchen.addMealShopping",
                          )}
                          onPress={() => setShowMealShopping(!showMealShopping)}
                        />
                        {showMealShopping && (
                          <>
                            <TextField
                              label={t("kitchen.simpleIngredients")}
                              multiline
                              value={freeIngredients}
                              onChangeText={setFreeIngredients}
                            />
                            <AppText muted variant="caption">
                              {t("kitchen.simpleHelp")}
                            </AppText>
                          </>
                        )}
                      </>
                    )}
                    {(meal.kind === "leftovers" || meal.kind === "out") && (
                      <AppText muted>{t("kitchen.noShopping")}</AppText>
                    )}
                  </>
                )}
                <AppText variant="caption" muted>
                  {dateLabel(meal.date)} · {t(`kitchen.${meal.slot}`)}
                  {!meal.kind || meal.kind === "recipe"
                    ? ` · ${servings} ${t("kitchen.servings")}`
                    : ""}
                </AppText>
                <PrimaryButton
                  compact
                  variant="ghost"
                  label={t(
                    mealOptions
                      ? "kitchen.hideMealOptions"
                      : "kitchen.mealOptions",
                  )}
                  onPress={() => setMealOptions(!mealOptions)}
                />
                {mealOptions && (
                  <>
                    <TextField
                      label={t("kitchen.date")}
                      value={meal.date}
                      onChangeText={(date) => setMeal({ ...meal, date })}
                      placeholder="YYYY-MM-DD"
                    />
                    <View style={styles.wrap}>
                      {(["lunch", "dinner"] as const).map((slot) =>
                        button(
                          slot,
                          () => setMeal({ ...meal, slot }),
                          meal.slot === slot,
                        ),
                      )}
                    </View>
                    <TextField
                      label={t("kitchen.servings")}
                      value={servings}
                      onChangeText={setServings}
                      keyboardType="number-pad"
                    />
                  </>
                )}
                <PrimaryButton
                  label={t("common.save")}
                  disabled={
                    busy ||
                    (!meal.kind || meal.kind === "recipe"
                      ? !meal.recipeId
                      : !meal.title?.trim()) ||
                    !validDate(meal.date) ||
                    !/^\d+$/.test(servings) ||
                    Number(servings) < 1 ||
                    Number(servings) > 1000
                  }
                  onPress={() => {
                    void run(async () => {
                      await kitchen.update((data) => ({
                        ...data,
                        meals: [
                          ...data.meals.filter((m) => m.id !== meal.id),
                          {
                            ...meal,
                            servings: Number(servings),
                            ingredients:
                              meal.kind === "simple"
                                ? freeIngredients
                                    .split("\n")
                                    .map((line) => line.trim())
                                    .filter(Boolean)
                                : undefined,
                          },
                        ],
                      }));
                      setMeal(null);
                    });
                  }}
                />
              </View>
            )}
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
          <AppSheet
            visible={stock !== null}
            title={t("kitchen.addStock")}
            busy={busy}
            onClose={() => setStock(null)}
          >
            {stock && (
              <View style={styles.panel}>
                <TextField
                  label={t("kitchen.foodName")}
                  value={stock.name}
                  onChangeText={(name) => setStock({ ...stock, name })}
                />
                <TextField
                  label={t("kitchen.quantity")}
                  value={stock.quantity}
                  onChangeText={(quantity) => setStock({ ...stock, quantity })}
                />
                <TextField
                  label={t("kitchen.expiry")}
                  placeholder="YYYY-MM-DD"
                  value={stock.expires}
                  onChangeText={(expires) => setStock({ ...stock, expires })}
                />
                <View style={styles.wrap}>
                  {(["fridge", "cupboard", "freezer"] as const).map(
                    (location) =>
                      button(
                        location,
                        () => setStock({ ...stock, location }),
                        stock.location === location,
                      ),
                  )}
                </View>
                <PrimaryButton
                  label={t("common.save")}
                  disabled={
                    busy ||
                    !stock.name.trim() ||
                    (!!stock.expires && !validDate(stock.expires))
                  }
                  onPress={() => {
                    void run(async () => {
                      await kitchen.update((data) => ({
                        ...data,
                        stock: [
                          ...data.stock.filter((s) => s.id !== stock.id),
                          { ...stock, name: stock.name.trim() },
                        ],
                      }));
                      setStock(null);
                    });
                  }}
                />
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
  mainSection: { flexBasis: "47%", flexGrow: 1 },
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
