import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  ImagePlus,
  Link,
  Plus,
  Save,
  Trash2,
  X
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../components/AppText";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { useAuth } from "../features/auth/AuthProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import { getRecipeCategoryLabel } from "../features/recipes/categories";
import { persistRecipeImage } from "../features/recipes/recipeImages";
import {
  getEditableRecipeImageSource,
  isCookbookImageEndpoint
} from "../features/recipes/recipeImageReferences";
import {
  createEmptyRecipe,
  normalizeRecipe,
  type Nutrition,
  type NutritionValue
} from "../features/recipes/types";
import type { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { isoDurationToMinutes, minutesToIsoDuration } from "../utils/duration";
import {
  applyKeywordSuggestion,
  expandEditableListItem,
  getKeywordSuggestions,
  normalizeSuggestionSearch
} from "./recipeEditorHelpers";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeEditor">;

export function RecipeEditorScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { getClient } = useAuth();
  const { createRecipe, customCategories, getRecipe, recipes, updateRecipe } =
    useRecipes();
  const existingRecipe = route.params.id ? getRecipe(route.params.id) : undefined;
  const initialRecipe = useMemo(
    () =>
      existingRecipe ??
      normalizeRecipe({
        ...createEmptyRecipe(),
        recipeCategory: route.params.category ?? ""
      }),
    [existingRecipe, route.params.category]
  );

  const [name, setName] = useState(initialRecipe.name);
  const [description, setDescription] = useState(initialRecipe.description);
  const [sourceName, setSourceName] = useState(initialRecipe.sourceName);
  const [sourceUrl, setSourceUrl] = useState(initialRecipe.url);
  const [showSourceFields, setShowSourceFields] = useState(
    Boolean(initialRecipe.sourceName || initialRecipe.url)
  );
  const [photoUrl, setPhotoUrl] = useState(
    getEditableRecipeImageSource(initialRecipe)
  );
  const [category, setCategory] = useState(initialRecipe.recipeCategory);
  const [keywords, setKeywords] = useState(initialRecipe.keywords);
  const [recipeYield, setRecipeYield] = useState(
    String(initialRecipe.recipeYield || 1)
  );
  const [showServings, setShowServings] = useState(
    !initialRecipe.localMeta?.hideServings
  );
  const [prepMinutes, setPrepMinutes] = useState(
    minutesToString(initialRecipe.prepTime)
  );
  const [cookMinutes, setCookMinutes] = useState(
    minutesToString(initialRecipe.cookTime)
  );
  const [totalMinutes, setTotalMinutes] = useState(
    minutesToString(initialRecipe.totalTime)
  );
  const [ingredients, setIngredients] = useState(
    createEditableList(initialRecipe.recipeIngredient)
  );
  const [instructions, setInstructions] = useState(
    createEditableList(initialRecipe.recipeInstructions)
  );
  const [tools, setTools] = useState(initialRecipe.tool.join("\n"));
  const initialNutrition = useMemo(
    () => normalizeNutritionForEditor(initialRecipe.nutrition),
    [initialRecipe.nutrition]
  );
  const [calories, setCalories] = useState(initialNutrition.calories);
  const [carbohydrates, setCarbohydrates] = useState(
    initialNutrition.carbohydrates
  );
  const [sugar, setSugar] = useState(initialNutrition.sugar);
  const [fat, setFat] = useState(initialNutrition.fat);
  const [saturatedFat, setSaturatedFat] = useState(initialNutrition.saturatedFat);
  const [sodium, setSodium] = useState(initialNutrition.sodium);
  const [fiber, setFiber] = useState(initialNutrition.fiber);
  const [protein, setProtein] = useState(initialNutrition.protein);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categorySuggestions = useMemo(() => {
    const normalizedCategory = normalizeSuggestionSearch(category);
    const existingCategories = Array.from(
      new Set(
        [
          ...customCategories,
          ...recipes.map((recipe) => recipe.recipeCategory)
        ]
          .map((item) => item.replace(/\s+/g, " ").trim())
          .filter(Boolean)
      )
    ).sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base" })
    );

    return existingCategories
      .filter((item) => {
        const normalizedItem = normalizeSuggestionSearch(item);
        return (
          (!normalizedCategory || normalizedItem.includes(normalizedCategory))
        );
      })
      .map((id) => ({ id, label: getRecipeCategoryLabel(id, t) }))
      .sort((left, right) => left.label.localeCompare(right.label))
      .slice(0, 6);
  }, [category, customCategories, recipes, t]);
  const keywordSuggestions = useMemo(
    () => getKeywordSuggestions(keywords, recipes),
    [keywords, recipes]
  );
  const photoClient = isCookbookImageEndpoint(photoUrl) ? getClient() : null;
  const photoSource = photoUrl
    ? {
        uri: photoUrl,
        headers: photoClient?.getImageHeaders()
      }
    : null;

  useEffect(() => {
    setName(initialRecipe.name);
    setDescription(initialRecipe.description);
    setSourceName(initialRecipe.sourceName);
    setSourceUrl(initialRecipe.url);
    setShowSourceFields(Boolean(initialRecipe.sourceName || initialRecipe.url));
    setPhotoUrl(getEditableRecipeImageSource(initialRecipe));
    setCategory(initialRecipe.recipeCategory);
    setKeywords(initialRecipe.keywords);
    setRecipeYield(String(initialRecipe.recipeYield || 1));
    setShowServings(!initialRecipe.localMeta?.hideServings);
    setPrepMinutes(minutesToString(initialRecipe.prepTime));
    setCookMinutes(minutesToString(initialRecipe.cookTime));
    setTotalMinutes(minutesToString(initialRecipe.totalTime));
    setIngredients(createEditableList(initialRecipe.recipeIngredient));
    setInstructions(createEditableList(initialRecipe.recipeInstructions));
    setTools(initialRecipe.tool.join("\n"));
    setCalories(initialNutrition.calories);
    setCarbohydrates(initialNutrition.carbohydrates);
    setSugar(initialNutrition.sugar);
    setFat(initialNutrition.fat);
    setSaturatedFat(initialNutrition.saturatedFat);
    setSodium(initialNutrition.sodium);
    setFiber(initialNutrition.fiber);
    setProtein(initialNutrition.protein);
  }, [initialRecipe, initialNutrition]);

  async function handleSave() {
    if (!name.trim()) {
      setError(t("editor.requiredName"));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const initialPhotoUrl = getEditableRecipeImageSource(initialRecipe);
      const imageFields =
        photoUrl === initialPhotoUrl
          ? {
              image: initialRecipe.image,
              imageUrl: initialRecipe.imageUrl,
              imagePlaceholderUrl: initialRecipe.imagePlaceholderUrl
            }
          : {
              image: photoUrl,
              imageUrl: photoUrl,
              imagePlaceholderUrl: photoUrl
            };
      const photoLocalMeta =
        photoUrl === initialPhotoUrl
          ? initialRecipe.localMeta
          : getLocalMetaAfterPhotoChange(initialRecipe.localMeta, photoUrl);
      const localMeta = getLocalMetaAfterServingsVisibilityChange(
        photoLocalMeta,
        showServings
      );
      const recipe = normalizeRecipe({
        ...initialRecipe,
        name,
        description,
        sourceName,
        url: sourceUrl,
        ...imageFields,
        localMeta,
        recipeCategory: category,
        keywords,
        recipeYield: Number.parseInt(recipeYield, 10) || 1,
        prepTime: minutesToIsoDuration(Number.parseInt(prepMinutes, 10)),
        cookTime: minutesToIsoDuration(Number.parseInt(cookMinutes, 10)),
        totalTime: minutesToIsoDuration(Number.parseInt(totalMinutes, 10)),
        recipeIngredient: cleanEditableList(ingredients),
        recipeInstructions: cleanEditableList(instructions),
        tool: splitLines(tools),
        nutrition: {
          "@type": "NutritionInformation",
          calories: formatNutritionValue(calories, "kcal"),
          carbohydrateContent: formatNutritionValue(carbohydrates, "g"),
          sugarContent: formatNutritionValue(sugar, "g"),
          fatContent: formatNutritionValue(fat, "g"),
          saturatedFatContent: formatNutritionValue(saturatedFat, "g"),
          sodiumContent: formatNutritionValue(sodium, "mg"),
          fiberContent: formatNutritionValue(fiber, "g"),
          proteinContent: formatNutritionValue(protein, "g")
        }
      });
      const saved = existingRecipe
        ? await updateRecipe(recipe)
        : await createRecipe(recipe);
      if (saved.id) {
        if (existingRecipe && navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.replace("RecipeDetail", { id: saved.id });
        }
      } else {
        navigation.goBack();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  async function handleChoosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      mediaTypes: ['images'],
      quality: 0.86
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUrl(await persistRecipeImage(result.assets[0].uri));
    }
  }

  return (
    <Screen
      contentStyle={{ paddingBottom: spacing.md + insets.bottom }}
      showScrollTop={false}
    >
      <View style={styles.toolbar}>
        <IconButton
          icon={ArrowLeft}
          label={t("common.back")}
          onPress={() => navigation.goBack()}
        />
        <AppText variant="subtitle">
          {existingRecipe ? t("editor.editRecipe") : t("editor.newRecipe")}
        </AppText>
        <IconButton
          disabled={saving}
          icon={Check}
          label={saving ? t("common.loading") : t("common.save")}
          onPress={() => void handleSave()}
          tone="primary"
        />
      </View>

      <TextField label={t("editor.name")} onChangeText={setName} value={name} />
      <TextField
        label={t("editor.description")}
        multiline
        onChangeText={setDescription}
        value={description}
      />
      {showSourceFields ? (
        <View style={styles.lineList}>
          <TextField
            label={t("editor.sourceName")}
            onChangeText={setSourceName}
            placeholder={t("editor.sourceNamePlaceholder")}
            value={sourceName}
          />
          <TextField
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            label={t("editor.sourceUrl")}
            onChangeText={setSourceUrl}
            value={sourceUrl}
          />
        </View>
      ) : (
        <PrimaryButton
          icon={Link}
          label={t("editor.addSource")}
          onPress={() => setShowSourceFields(true)}
          variant="ghost"
        />
      )}
      {photoUrl ? (
        <View style={styles.photoPreview}>
          <ExpoImage
            accessibilityLabel={name || t("editor.photoUrl")}
            accessibilityRole="image"
            source={photoSource}
            style={styles.photo}
            contentFit="cover"
          />
        </View>
      ) : null}
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        label={t("editor.photoUrl")}
        onChangeText={setPhotoUrl}
        value={photoUrl}
      />
      <View style={styles.row}>
        <PrimaryButton
          icon={ImagePlus}
          label={t("editor.choosePhoto")}
          onPress={() => void handleChoosePhoto()}
          style={styles.rowItem}
          variant="ghost"
        />
        <PrimaryButton
          disabled={!photoUrl}
          icon={X}
          label={t("editor.removePhoto")}
          onPress={() => setPhotoUrl("")}
          style={styles.rowItem}
          variant="ghost"
        />
      </View>
      <View style={styles.row}>
        <TextField
          containerStyle={styles.rowItem}
          label={t("editor.category")}
          onChangeText={setCategory}
          value={category}
        />
        <TextField
          containerStyle={styles.rowItem}
          editable={showServings}
          keyboardType="number-pad"
          label={t("recipes.yield")}
          onChangeText={(value) => setRecipeYield(sanitizeIntegerInput(value))}
          style={!showServings ? styles.disabledInput : undefined}
          value={recipeYield}
        />
      </View>
      <Pressable
        accessibilityLabel={t("editor.showServings")}
        accessibilityRole="switch"
        accessibilityState={{ checked: showServings }}
        onPress={() => setShowServings((current) => !current)}
        style={({ pressed }) => [
          styles.switchRow,
          {
            backgroundColor: colors.surfaceGlassStrong,
            borderColor: colors.border,
            opacity: pressed ? 0.76 : 1
          }
        ]}
      >
        <View style={styles.switchText}>
          <AppText variant="label">{t("editor.showServings")}</AppText>
          <AppText muted variant="caption">
            {t("editor.showServingsHelp")}
          </AppText>
        </View>
        <Switch
          onValueChange={setShowServings}
          thumbColor={Platform.OS === "android" ? (showServings ? colors.primary : colors.textMuted) : undefined}
          trackColor={{ false: colors.border, true: Platform.OS === "android" ? colors.chip : colors.primary }}
          value={showServings}
        />
      </Pressable>
      {categorySuggestions.length ? (
        <View style={styles.suggestionList}>
          {categorySuggestions.map((suggestion) => (
            <Pressable
              key={suggestion.id}
              accessibilityLabel={suggestion.label}
              accessibilityRole="button"
              onPress={() => setCategory(suggestion.id)}
              style={({ pressed }) => [
                styles.suggestionChip,
                {
                  backgroundColor: colors.chip,
                  borderColor: colors.border,
                  opacity: pressed ? 0.76 : 1
                }
              ]}
            >
              <AppText variant="caption">{suggestion.label}</AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
      <TextField
        label={t("editor.keywords")}
        onChangeText={setKeywords}
        value={keywords}
      />
      {keywordSuggestions.length ? (
        <View style={styles.suggestionList}>
          {keywordSuggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              accessibilityLabel={suggestion}
              accessibilityRole="button"
              onPress={() =>
                setKeywords((currentKeywords) =>
                  applyKeywordSuggestion(currentKeywords, suggestion)
                )
              }
              style={({ pressed }) => [
                styles.suggestionChip,
                {
                  backgroundColor: colors.chip,
                  borderColor: colors.border,
                  opacity: pressed ? 0.76 : 1
                }
              ]}
            >
              <AppText variant="caption">{suggestion}</AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.row}>
        <TextField
          containerStyle={styles.rowItem}
          keyboardType="number-pad"
          label={t("editor.prepMinutes")}
          onChangeText={(value) => setPrepMinutes(sanitizeIntegerInput(value))}
          value={prepMinutes}
        />
        <TextField
          containerStyle={styles.rowItem}
          keyboardType="number-pad"
          label={t("editor.cookMinutes")}
          onChangeText={(value) => setCookMinutes(sanitizeIntegerInput(value))}
          value={cookMinutes}
        />
      </View>
      <TextField
        keyboardType="number-pad"
        label={t("editor.totalMinutes")}
        onChangeText={(value) => setTotalMinutes(sanitizeIntegerInput(value))}
        value={totalMinutes}
      />
      <EditableLineList
        addLabel={t("editor.addIngredient")}
        itemLabel={(index) => t("editor.ingredientItem", { count: index + 1 })}
        label={t("editor.ingredients")}
        onChange={setIngredients}
        placeholder={t("editor.ingredientPlaceholder")}
        removeLabel={t("editor.removeIngredient")}
        splitPastedLines
        values={ingredients}
      />
      <EditableLineList
        addLabel={t("editor.addInstruction")}
        itemLabel={(index) => t("editor.instructionItem", { count: index + 1 })}
        label={t("editor.instructions")}
        multiline
        moveDownLabel={t("editor.moveInstructionDown")}
        moveUpLabel={t("editor.moveInstructionUp")}
        onChange={setInstructions}
        placeholder={t("editor.instructionPlaceholder")}
        reorderable
        removeLabel={t("editor.removeInstruction")}
        splitPastedLines
        values={instructions}
      />
      <TextField
        label={t("editor.tools")}
        multiline
        onChangeText={setTools}
        value={tools}
      />

      <View style={styles.sectionTitle}>
        <AppText variant="subtitle">{t("editor.nutrition")}</AppText>
        <AppText muted variant="caption">
          {t("editor.nutritionHelp")}
        </AppText>
      </View>
      <View style={styles.row}>
        <TextField
          containerStyle={styles.rowItem}
          keyboardType="decimal-pad"
          label={t("editor.caloriesKcal")}
          onChangeText={(value) => setCalories(sanitizeDecimalInput(value))}
          value={calories}
        />
        <TextField
          containerStyle={styles.rowItem}
          keyboardType="decimal-pad"
          label={t("editor.carbsGrams")}
          onChangeText={(value) => setCarbohydrates(sanitizeDecimalInput(value))}
          value={carbohydrates}
        />
      </View>
      <View style={styles.row}>
        <TextField
          containerStyle={styles.rowItem}
          keyboardType="decimal-pad"
          label={t("editor.sugarGrams")}
          onChangeText={(value) => setSugar(sanitizeDecimalInput(value))}
          value={sugar}
        />
        <TextField
          containerStyle={styles.rowItem}
          keyboardType="decimal-pad"
          label={t("editor.fatGrams")}
          onChangeText={(value) => setFat(sanitizeDecimalInput(value))}
          value={fat}
        />
      </View>
      <View style={styles.row}>
        <TextField
          containerStyle={styles.rowItem}
          keyboardType="decimal-pad"
          label={t("editor.saturatedFatGrams")}
          onChangeText={(value) => setSaturatedFat(sanitizeDecimalInput(value))}
          value={saturatedFat}
        />
        <TextField
          containerStyle={styles.rowItem}
          keyboardType="decimal-pad"
          label={t("editor.sodiumMg")}
          onChangeText={(value) => setSodium(sanitizeDecimalInput(value))}
          value={sodium}
        />
      </View>
      <View style={styles.row}>
        <TextField
          containerStyle={styles.rowItem}
          keyboardType="decimal-pad"
          label={t("editor.fiberGrams")}
          onChangeText={(value) => setFiber(sanitizeDecimalInput(value))}
          value={fiber}
        />
        <TextField
          containerStyle={styles.rowItem}
          keyboardType="decimal-pad"
          label={t("editor.proteinGrams")}
          onChangeText={(value) => setProtein(sanitizeDecimalInput(value))}
          value={protein}
        />
      </View>

      {error ? (
        <AppText accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : null}

      <PrimaryButton
        disabled={saving}
        icon={Save}
        label={saving ? t("common.loading") : t("common.save")}
        onPress={() => void handleSave()}
      />
    </Screen>
  );
}

function EditableLineList({
  addLabel,
  itemLabel,
  label,
  multiline = false,
  moveDownLabel,
  moveUpLabel,
  onChange,
  placeholder,
  reorderable = false,
  removeLabel,
  splitPastedLines = false,
  values
}: {
  addLabel: string;
  itemLabel: (index: number) => string;
  label: string;
  multiline?: boolean;
  moveDownLabel?: string;
  moveUpLabel?: string;
  onChange: (values: string[]) => void;
  placeholder: string;
  reorderable?: boolean;
  removeLabel: string;
  splitPastedLines?: boolean;
  values: string[];
}) {
  function updateItem(index: number, value: string) {
    const isPaste = Math.abs(value.length - values[index].length) > 1 && value.includes("\n");
    onChange(
      splitPastedLines && isPaste
        ? expandEditableListItem(values, index, value)
        : values.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  }

  function removeItem(index: number) {
    const nextValues = values.filter((_, itemIndex) => itemIndex !== index);
    onChange(nextValues.length ? nextValues : [""]);
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= values.length) {
      return;
    }

    const nextValues = [...values];
    const [item] = nextValues.splice(index, 1);
    nextValues.splice(nextIndex, 0, item);
    onChange(nextValues);
  }

  return (
    <View style={styles.lineList}>
      <AppText variant="label">{label}</AppText>
      {values.map((value, index) => (
        <View key={index} style={styles.lineItem}>
          <TextField
            containerStyle={styles.lineInput}
            label={itemLabel(index)}
            multiline={multiline || splitPastedLines}
            onChangeText={(nextValue) => updateItem(index, nextValue)}
            placeholder={placeholder}
            style={multiline ? styles.instructionInput : styles.compactInput}
            value={value}
          />
          <View style={styles.lineActions}>
            {reorderable ? (
              <>
                <IconButton
                  disabled={index === 0}
                  icon={ArrowUp}
                  label={moveUpLabel ?? ""}
                  onPress={() => moveItem(index, -1)}
                  style={styles.lineActionButton}
                />
                <IconButton
                  disabled={index === values.length - 1}
                  icon={ArrowDown}
                  label={moveDownLabel ?? ""}
                  onPress={() => moveItem(index, 1)}
                  style={styles.lineActionButton}
                />
              </>
            ) : null}
            <IconButton
              disabled={values.length === 1 && !value.trim()}
              icon={Trash2}
              label={removeLabel}
              onPress={() => removeItem(index)}
              tone="danger"
              style={styles.lineActionButton}
            />
          </View>
        </View>
      ))}
      <PrimaryButton
        icon={Plus}
        label={addLabel}
        onPress={() => onChange([...values, ""])}
        variant="ghost"
      />
    </View>
  );
}

function createEditableList(items: string[]) {
  return items.length ? items : [""];
}

function cleanEditableList(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean);
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function minutesToString(value: string | null) {
  const minutes = isoDurationToMinutes(value);
  return minutes ? String(minutes) : "";
}

function sanitizeIntegerInput(value: string) {
  return value.replace(/\D/g, "");
}

function sanitizeDecimalInput(value: string) {
  return value.replace(/[^\d,.+-]/g, "");
}

function normalizeNutritionForEditor(
  nutrition?: Nutrition | Nutrition[] | null
) {
  const node = Array.isArray(nutrition) ? nutrition[0] : nutrition;
  return {
    calories: stripNutritionUnit(node?.calories),
    carbohydrates: stripNutritionUnit(node?.carbohydrateContent),
    sugar: stripNutritionUnit(node?.sugarContent),
    fat: stripNutritionUnit(node?.fatContent),
    saturatedFat: stripNutritionUnit(node?.saturatedFatContent),
    sodium: stripNutritionUnit(node?.sodiumContent),
    fiber: stripNutritionUnit(node?.fiberContent),
    protein: stripNutritionUnit(node?.proteinContent)
  };
}

function stripNutritionUnit(value?: NutritionValue | null) {
  const normalized = normalizeNutritionInput(value);
  if (!normalized) {
    return "";
  }

  return normalized.replace(/[^\d,.+-]/g, "").trim();
}

function formatNutritionValue(value: string, unit: "g" | "kcal" | "mg") {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/[a-zA-Z]/.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed} ${unit}`;
}

function getLocalMetaAfterPhotoChange(
  localMeta: ReturnType<typeof normalizeRecipe>["localMeta"],
  photoUrl: string
) {
  const nextLocalMeta: NonNullable<
    ReturnType<typeof normalizeRecipe>["localMeta"]
  > = { ...(localMeta ?? {}) };
  delete nextLocalMeta.cachedImage;

  if (/^file:\/\//i.test(photoUrl)) {
    nextLocalMeta.cachedImage = photoUrl;
  }

  return Object.keys(nextLocalMeta).length ? nextLocalMeta : undefined;
}

function getLocalMetaAfterServingsVisibilityChange(
  localMeta: ReturnType<typeof normalizeRecipe>["localMeta"],
  showServings: boolean
) {
  const nextLocalMeta: NonNullable<
    ReturnType<typeof normalizeRecipe>["localMeta"]
  > = { ...(localMeta ?? {}) };

  if (showServings) {
    delete nextLocalMeta.hideServings;
  } else {
    nextLocalMeta.hideServings = true;
    delete nextLocalMeta.servingOverride;
  }

  return Object.keys(nextLocalMeta).length ? nextLocalMeta : undefined;
}

function normalizeNutritionInput(value?: NutritionValue | null) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  return value;
}

const styles = StyleSheet.create({
  photo: {
    height: "100%",
    width: "100%"
  },
  photoPreview: {
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: "hidden"
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  rowItem: {
    flex: 1,
    minWidth: 150
  },
  suggestionChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  suggestionList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  sectionTitle: {
    gap: spacing.xs
  },
  compactInput: {
    minHeight: 48
  },
  disabledInput: {
    opacity: 0.55
  },
  instructionInput: {
    minHeight: 68,
    textAlignVertical: "top"
  },
  lineInput: {
    flex: 1,
    minWidth: 0
  },
  lineActionButton: {
    height: 38,
    width: 38
  },
  lineActions: {
    gap: spacing.xxs
  },
  lineItem: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.xs
  },
  lineList: {
    gap: spacing.sm
  },
  switchRow: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    padding: spacing.sm
  },
  switchText: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  }
});
