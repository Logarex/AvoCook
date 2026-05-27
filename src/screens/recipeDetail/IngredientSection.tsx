import { Check, RotateCcw, ShoppingCart } from "lucide-react-native";
import React from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../../components/AppText";
import { GlassPanel } from "../../components/GlassPanel";
import { IconButton } from "../../components/IconButton";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAppTheme } from "../../theme/ThemeProvider";
import { styles } from "./recipeDetailStyles";

export function IngredientSection({
  title,
  items,
  checkedIndexes,
  checkedCount,
  onAddAll,
  onAddItem,
  onResetChecked,
  onToggleItem,
}: {
  title: string;
  items: string[];
  checkedIndexes: Set<number>;
  checkedCount: number;
  onAddAll: () => void;
  onAddItem: (ingredient: string) => void;
  onResetChecked: () => void;
  onToggleItem: (index: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  if (!items.length) {
    return null;
  }

  return (
    <GlassPanel style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleBlock}>
          <AppText variant="subtitle">{title}</AppText>
          {checkedCount > 0 ? (
            <AppText muted variant="caption">
              {t("recipes.ingredientsChecked", {
                checked: checkedCount,
                total: items.length,
              })}
            </AppText>
          ) : null}
        </View>
        <View style={styles.ingredientHeaderActions}>
          {checkedCount > 0 ? (
            <PrimaryButton
              icon={RotateCcw}
              label={t("recipes.resetIngredientChecks")}
              onPress={onResetChecked}
              style={styles.ingredientHeaderButton}
              variant="ghost"
            />
          ) : null}
          <PrimaryButton
            icon={ShoppingCart}
            label={t("shoppingList.addFromRecipe")}
            onPress={onAddAll}
            style={styles.ingredientHeaderButton}
            variant="ghost"
          />
        </View>
      </View>
      <View style={styles.sectionItems}>
        {items.map((item, index) => {
          const checked = checkedIndexes.has(index);
          return (
            <View key={`${item}-${index}`} style={styles.ingredientRow}>
              <Pressable
                accessibilityLabel={t(
                  checked
                    ? "recipes.unmarkIngredientReady"
                    : "recipes.markIngredientReady",
                  { ingredient: item },
                )}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => onToggleItem(index)}
                style={({ pressed }) => [
                  styles.ingredientCheckTarget,
                  { opacity: pressed ? 0.72 : 1 },
                ]}
              >
                <View
                  style={[
                    styles.checkCircle,
                    {
                      backgroundColor: checked ? colors.success : "transparent",
                      borderColor: checked ? colors.success : colors.border,
                    },
                  ]}
                >
                  {checked ? (
                    <Check
                      color={colors.textInverted}
                      size={15}
                      strokeWidth={3}
                    />
                  ) : null}
                </View>
                <AppText
                  style={[
                    styles.rowText,
                    checked
                      ? [styles.checkedItemText, { color: colors.textMuted }]
                      : undefined,
                  ]}
                >
                  {item}
                </AppText>
              </Pressable>
              <IconButton
                icon={ShoppingCart}
                label={t("shoppingList.addIngredientFromRecipe", {
                  ingredient: item,
                })}
                onPress={() => onAddItem(item)}
                tone="primary"
                style={styles.ingredientAction}
              />
            </View>
          );
        })}
      </View>
    </GlassPanel>
  );
}
