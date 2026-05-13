import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, ImagePlus, Save, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { useRecipes } from "../features/recipes/RecipesProvider";
import { persistRecipeImage } from "../features/recipes/recipeImages";
import { createEmptyRecipe, normalizeRecipe } from "../features/recipes/types";
import type { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { isoDurationToMinutes, minutesToIsoDuration } from "../utils/duration";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeEditor">;

export function RecipeEditorScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { createRecipe, getRecipe, updateRecipe } = useRecipes();
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
  const [photoUrl, setPhotoUrl] = useState(
    initialRecipe.image || initialRecipe.imageUrl
  );
  const [category, setCategory] = useState(initialRecipe.recipeCategory);
  const [keywords, setKeywords] = useState(initialRecipe.keywords);
  const [recipeYield, setRecipeYield] = useState(
    String(initialRecipe.recipeYield || 1)
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
    initialRecipe.recipeIngredient.join("\n")
  );
  const [instructions, setInstructions] = useState(
    initialRecipe.recipeInstructions.join("\n")
  );
  const [tools, setTools] = useState(initialRecipe.tool.join("\n"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialRecipe.name);
    setDescription(initialRecipe.description);
    setPhotoUrl(initialRecipe.image || initialRecipe.imageUrl);
    setCategory(initialRecipe.recipeCategory);
    setKeywords(initialRecipe.keywords);
    setRecipeYield(String(initialRecipe.recipeYield || 1));
    setPrepMinutes(minutesToString(initialRecipe.prepTime));
    setCookMinutes(minutesToString(initialRecipe.cookTime));
    setTotalMinutes(minutesToString(initialRecipe.totalTime));
    setIngredients(initialRecipe.recipeIngredient.join("\n"));
    setInstructions(initialRecipe.recipeInstructions.join("\n"));
    setTools(initialRecipe.tool.join("\n"));
  }, [initialRecipe]);

  async function handleSave() {
    if (!name.trim()) {
      setError(t("editor.requiredName"));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const recipe = normalizeRecipe({
        ...initialRecipe,
        name,
        description,
        image: photoUrl,
        imageUrl: photoUrl,
        imagePlaceholderUrl: photoUrl,
        recipeCategory: category,
        keywords,
        recipeYield: Number.parseInt(recipeYield, 10) || 1,
        prepTime: minutesToIsoDuration(Number.parseInt(prepMinutes, 10)),
        cookTime: minutesToIsoDuration(Number.parseInt(cookMinutes, 10)),
        totalTime: minutesToIsoDuration(Number.parseInt(totalMinutes, 10)),
        recipeIngredient: splitLines(ingredients),
        recipeInstructions: splitLines(instructions),
        tool: splitLines(tools)
      });
      const saved = existingRecipe
        ? await updateRecipe(recipe)
        : await createRecipe(recipe);
      if (saved.id) {
        navigation.replace("RecipeDetail", { id: saved.id });
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.86
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUrl(await persistRecipeImage(result.assets[0].uri));
    }
  }

  return (
    <Screen>
      <View style={styles.toolbar}>
        <IconButton
          icon={ArrowLeft}
          label="Back"
          onPress={() => navigation.goBack()}
        />
        <AppText variant="subtitle">
          {existingRecipe ? t("editor.editRecipe") : t("editor.newRecipe")}
        </AppText>
        <View style={styles.toolbarSpacer} />
      </View>

      <TextField label={t("editor.name")} onChangeText={setName} value={name} />
      <TextField
        label={t("editor.description")}
        multiline
        onChangeText={setDescription}
        value={description}
      />
      {photoUrl ? (
        <View style={styles.photoPreview}>
          <ExpoImage
            source={{ uri: photoUrl }}
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
          keyboardType="number-pad"
          label={t("recipes.yield")}
          onChangeText={setRecipeYield}
          value={recipeYield}
        />
      </View>
      <TextField
        label={t("editor.keywords")}
        onChangeText={setKeywords}
        value={keywords}
      />
      <View style={styles.row}>
        <TextField
          containerStyle={styles.rowItem}
          keyboardType="number-pad"
          label={t("editor.prepMinutes")}
          onChangeText={setPrepMinutes}
          value={prepMinutes}
        />
        <TextField
          containerStyle={styles.rowItem}
          keyboardType="number-pad"
          label={t("editor.cookMinutes")}
          onChangeText={setCookMinutes}
          value={cookMinutes}
        />
      </View>
      <TextField
        keyboardType="number-pad"
        label={t("editor.totalMinutes")}
        onChangeText={setTotalMinutes}
        value={totalMinutes}
      />
      <TextField
        label={t("editor.ingredients")}
        multiline
        onChangeText={setIngredients}
        value={ingredients}
      />
      <TextField
        label={t("editor.instructions")}
        multiline
        onChangeText={setInstructions}
        value={instructions}
      />
      <TextField
        label={t("editor.tools")}
        multiline
        onChangeText={setTools}
        value={tools}
      />

      {error ? <AppText style={{ color: colors.danger }}>{error}</AppText> : null}

      <PrimaryButton
        disabled={saving}
        icon={Save}
        label={saving ? t("common.loading") : t("common.save")}
        onPress={() => void handleSave()}
      />
    </Screen>
  );
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
    gap: spacing.sm
  },
  rowItem: {
    flex: 1
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  toolbarSpacer: {
    width: 44
  }
});
