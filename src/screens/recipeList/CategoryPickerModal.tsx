import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "../../features/accessibility/useReducedMotion";
import { getScreenBottomPadding } from "../../utils/safeArea";
export type CategoryOption = { count: number; id: string | null; label: string; };
import { Check, FolderPlus, FolderX, X, Trash2 } from "lucide-react-native";
import React, { useState, useMemo } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../../components/AppText";
import { GlassPanel } from "../../components/GlassPanel";
import { IconButton } from "../../components/IconButton";
import { TextField as Input } from "../../components/TextField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAppTheme } from "../../theme/ThemeProvider";
import { styles } from "./recipeListStyles";

export function CategoryPickerModal({
  category,
  categoryOptions,
  customCategories,
  onClose,
  onDeleteCategory,
  onSelect,
  title,
  visible,
}: {
  category: string | null;
  categoryOptions: CategoryOption[];
  customCategories: string[];
  onClose: () => void;
  onDeleteCategory: (category: string, count: number) => void;
  onSelect: (category: string | null) => void;
  title: string;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const customCategorySet = useMemo(
    () => new Set(customCategories),
    [customCategories],
  );
  return (
    <Modal
      animationType={reducedMotion ? "none" : "slide"}
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          style={styles.modalScrim}
          onPress={onClose}
        />
        <GlassPanel
          style={[
            styles.modalSheet,
            { paddingBottom: getScreenBottomPadding(insets.bottom) },
          ]}
        >
          <View style={styles.modalHeader}>
            <AppText variant="subtitle">{title}</AppText>
            <IconButton icon={X} label={t("common.close")} onPress={onClose} />
          </View>
          <ScrollView
            contentContainerStyle={styles.categoryGrid}
            showsVerticalScrollIndicator={false}
          >
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
                <Pressable
                  accessibilityLabel={`${item.label}, ${item.count}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: category === item.id }}
                  onPress={() => onSelect(item.id)}
                  style={({ pressed }) => [
                    styles.categoryGridSelect,
                    { opacity: pressed ? 0.78 : 1 },
                  ]}
                >
                  {category === item.id ? (
                    <Check
                      color={colors.textInverted}
                      size={17}
                      strokeWidth={3}
                    />
                  ) : null}
                  <AppText
                    variant="label"
                    style={{
                      color:
                        category === item.id
                          ? colors.textInverted
                          : colors.text,
                    }}
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
                </Pressable>
                {item.id && customCategorySet.has(item.id) ? (
                  <IconButton
                    icon={Trash2}
                    label={t("recipes.deleteCategory")}
                    onPress={() => onDeleteCategory(item.id ?? "", item.count)}
                    tone="danger"
                    style={styles.categoryDeleteButton}
                  />
                ) : null}
              </View>
            ))}
          </ScrollView>
        </GlassPanel>
      </View>
    </Modal>
  );
}
