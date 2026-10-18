import { Check, Pencil, Plus, Star, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppSheet, useSheetActions } from "../../components/AppSheet";
import { AppText } from "../../components/AppText";
import { PrimaryButton } from "../../components/PrimaryButton";
import { spacing } from "../../theme/colors";
import { useAppTheme } from "../../theme/ThemeProvider";
import { styles } from "./recipeListStyles";

export type CategoryOption = {
  count: number;
  id: string | null;
  label: string;
};

export function CategoryPickerModal({
  category,
  categoryOptions,
  favoriteCategories,
  onClose,
  onCreateCategory,
  onDeleteCategory,
  onRenameCategory,
  onSelect,
  onToggleFavorite,
  title,
  visible,
}: {
  category: string | null;
  categoryOptions: CategoryOption[];
  favoriteCategories: string[];
  onClose: () => void;
  onCreateCategory: () => void;
  onDeleteCategory: (category: string, count: number) => void;
  onRenameCategory: (category: string) => void;
  onSelect: (category: string | null) => void;
  onToggleFavorite: (category: string) => void;
  title: string;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const { dismissThen, afterDismiss } = useSheetActions(onClose);
  const { colors } = useAppTheme();
  return (
    <AppSheet
      visible={visible}
      title={title}
      onClose={onClose}
      onDismiss={afterDismiss}
    >
      <PrimaryButton
        icon={Plus}
        label={t("recipes.createCategory")}
        onPress={() => dismissThen(onCreateCategory)}
        variant="secondary"
      />
      <View style={styles.categoryGrid}>
        {categoryOptions.map((item) => (
          <View
            key={item.id ?? "all"}
            style={[
              styles.categoryGridItem,
              {
                backgroundColor:
                  category === item.id ? colors.primary : colors.chip,
                borderColor:
                  category === item.id ? colors.primary : colors.border,
              },
            ]}
          >
            {item.id !== null ? (
              <Pressable
                accessibilityLabel={t("recipes.toggleFavorite")}
                accessibilityRole="button"
                onPress={() => onToggleFavorite(item.id ?? "")}
                style={({ pressed }) => [
                  { opacity: pressed ? 0.6 : 1, padding: spacing.xxs },
                ]}
              >
                <Star
                  color={
                    favoriteCategories.includes(item.id ?? "")
                      ? colors.warning
                      : colors.border
                  }
                  fill={
                    favoriteCategories.includes(item.id ?? "")
                      ? colors.warning
                      : "transparent"
                  }
                  size={22}
                />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel={`${item.label}, ${item.count}`}
              accessibilityRole="button"
              accessibilityState={{ selected: category === item.id }}
              onPress={() => onSelect(item.id)}
              style={({ pressed }) => [
                styles.categoryGridSelect,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <AppText
                markdown
                variant="label"
                style={{
                  flex: 1,
                  color:
                    category === item.id ? colors.textInverted : colors.text,
                }}
                numberOfLines={1}
              >
                {item.label}
              </AppText>
              <AppText
                variant="caption"
                style={{
                  color:
                    category === item.id
                      ? colors.textInverted
                      : colors.textMuted,
                }}
              >
                {item.count}
              </AppText>
              {category === item.id ? (
                <Check color={colors.textInverted} size={20} strokeWidth={3} />
              ) : null}
            </Pressable>
            {item.id ? (
              <View style={styles.categoryGridActions}>
                <Pressable
                  accessibilityLabel={t("recipes.renameCategory")}
                  accessibilityRole="button"
                  onPress={() =>
                    dismissThen(() => onRenameCategory(item.id ?? ""))
                  }
                  style={({ pressed }) => [
                    styles.categoryActionIcon,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Pencil
                    color={
                      category === item.id ? colors.textInverted : colors.text
                    }
                    size={20}
                  />
                </Pressable>
                <Pressable
                  accessibilityLabel={t("recipes.deleteCategory")}
                  accessibilityRole="button"
                  onPress={() =>
                    dismissThen(() =>
                      onDeleteCategory(item.id ?? "", item.count),
                    )
                  }
                  style={({ pressed }) => [
                    styles.categoryActionIcon,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Trash2
                    color={
                      category === item.id ? colors.textInverted : colors.danger
                    }
                    size={20}
                  />
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </AppSheet>
  );
}
