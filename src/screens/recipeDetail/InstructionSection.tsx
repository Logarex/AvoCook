import { Check, RotateCcw } from "lucide-react-native";
import React from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../../components/AppText";
import { GlassPanel } from "../../components/GlassPanel";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAppTheme } from "../../theme/ThemeProvider";
import { styles } from "./recipeDetailStyles";

export function InstructionSection({
  title,
  items,
  checkedIndexes,
  checkedCount,
  onResetChecked,
  onToggleItem,
}: {
  title: string;
  items: string[];
  checkedIndexes: Set<number>;
  checkedCount: number;
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
              {t("recipes.stepsChecked", {
                checked: checkedCount,
                total: items.length,
              })}
            </AppText>
          ) : null}
        </View>
        {checkedCount > 0 ? (
          <View style={styles.stepHeaderActions}>
            <PrimaryButton
              icon={RotateCcw}
              label={t("recipes.resetStepChecks")}
              onPress={onResetChecked}
              style={styles.stepHeaderButton}
              variant="ghost"
            />
          </View>
        ) : null}
      </View>
      <View style={styles.sectionItems}>
        {items.map((item, index) => {
          const checked = checkedIndexes.has(index);
          return (
            <Pressable
              key={`${item}-${index}`}
              accessibilityLabel={t(
                checked ? "recipes.unmarkStepDone" : "recipes.markStepDone",
                { step: index + 1 },
              )}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              onPress={() => onToggleItem(index)}
              style={({ pressed }) => [
                styles.stepCheckRow,
                { opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <AppText muted variant="label" style={styles.rowIndex}>
                {index + 1}
              </AppText>
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
              <View
                style={[
                  styles.checkCircle,
                  {
                    backgroundColor: checked ? colors.success : "transparent",
                    borderColor: checked ? colors.success : colors.border,
                    marginTop: -2,
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
            </Pressable>
          );
        })}
      </View>
    </GlassPanel>
  );
}
