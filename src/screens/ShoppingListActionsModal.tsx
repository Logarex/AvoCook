import { AppText } from "../components/AppText";
import { IconButton } from "../components/IconButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "../features/accessibility/useReducedMotion";
import { getScreenBottomPadding } from "../utils/safeArea";
import {
  Trash2,
  X,
} from "lucide-react-native";
import React from "react";
import { Modal, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAppTheme } from "../theme/ThemeProvider";
import { styles } from "./recipeList/recipeListStyles";

export function ShoppingListActionsModal({
  onClose,
  onReorder,
  onClearChecked,
  onClearAll,
  checkedCount,
  visible,
}: {
  onClose: () => void;
  onClearChecked: () => void;
  onClearAll: () => void;
  checkedCount: number;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

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
          onPress={onClose}
          style={styles.modalScrim}
        />
        <GlassPanel
          style={[
            styles.recipeActionSheet,
            { paddingBottom: getScreenBottomPadding(insets.bottom) },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.recipeActionTitle}>
              <AppText variant="subtitle" numberOfLines={1}>
                {t("shoppingList.title")}
              </AppText>
            </View>
            <IconButton
              icon={X}
              label={t("common.close")}
              onPress={onClose}
            />
          </View>
          <View style={styles.recipeActionGrid}>
            {checkedCount > 0 && (
              <PrimaryButton
                icon={Trash2}
                label={t("shoppingList.clearChecked")}
                onPress={() => {
                  onClose();
                  onClearChecked();
                }}
                style={styles.recipeActionButton}
                variant="danger-secondary"
              />
            )}
            <PrimaryButton
              icon={Trash2}
              label={t("shoppingList.clearAll")}
              onPress={() => {
                onClose();
                onClearAll();
              }}
              style={styles.recipeActionButton}
              variant="danger"
            />
          </View>
        </GlassPanel>
      </View>
    </Modal>
  );
}
