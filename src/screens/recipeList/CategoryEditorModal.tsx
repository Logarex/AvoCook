import { Check, Star, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppSheet } from "../../components/AppSheet";
import { PrimaryButton } from "../../components/PrimaryButton";
import { TextField } from "../../components/TextField";
import { spacing } from "../../theme/colors";
import { useAppTheme } from "../../theme/ThemeProvider";
import { styles } from "./recipeListStyles";

export function CategoryEditorModal({
  editingCategory,
  initialCategoryName,
  initialIsFavorite,
  onClose,
  onSave,
  visible,
}: {
  editingCategory: string | null;
  initialCategoryName: string;
  initialIsFavorite: boolean;
  onClose: () => void;
  onSave: (name: string, isFavorite: boolean) => void;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const [name, setName] = useState(initialCategoryName);
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);

  useEffect(() => {
    if (visible) {
      setName(initialCategoryName);
      setIsFavorite(initialIsFavorite);
    }
  }, [visible, initialCategoryName, initialIsFavorite]);

  return (
    <AppSheet
      visible={visible}
      title={
        editingCategory
          ? t("recipes.renameCategory")
          : t("recipes.createCategory")
      }
      onClose={onClose}
      compact
    >
      <TextField
        label={t("recipes.categoryName")}
        onChangeText={setName}
        value={name}
        autoCorrect={false}
        rightElement={
          <Pressable
            accessibilityLabel={t("recipes.toggleFavorite")}
            accessibilityRole="button"
            onPress={() => setIsFavorite(!isFavorite)}
            style={({ pressed }) => [
              styles.headerIcon,
              {
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Star
              color={isFavorite ? colors.warning : colors.border}
              fill={isFavorite ? colors.warning : "transparent"}
              size={22}
            />
          </Pressable>
        }
      />
      <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
        <PrimaryButton
          disabled={!name.trim()}
          icon={Check}
          label={
            editingCategory ? t("common.save") : t("recipes.createCategory")
          }
          onPress={() => onSave(name, isFavorite)}
        />
        <PrimaryButton
          icon={X}
          label={t("common.cancel")}
          onPress={onClose}
          variant="ghost"
        />
      </View>
    </AppSheet>
  );
}
