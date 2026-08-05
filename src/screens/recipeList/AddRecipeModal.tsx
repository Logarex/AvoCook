import { AppText } from "../../components/AppText";
import { IconButton } from "../../components/IconButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "../../features/accessibility/useReducedMotion";
import { getScreenBottomPadding } from "../../utils/safeArea";
import {
  Download,
  Pencil,
  X,
} from "lucide-react-native";
import React from "react";
import { Modal, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassPanel } from "../../components/GlassPanel";
import { PrimaryButton } from "../../components/PrimaryButton";
import { styles } from "./recipeListStyles";

export function AddRecipeModal({
  onClose,
  onNewRecipe,
  onImportRecipe,
  visible,
}: {
  onClose: () => void;
  onNewRecipe: () => void;
  onImportRecipe: () => void;
  visible: boolean;
}) {
  const { t } = useTranslation();
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
                {t("common.add")}
              </AppText>
            </View>
            <IconButton
              icon={X}
              label={t("common.close")}
              onPress={onClose}
            />
          </View>
          <View style={styles.recipeActionGrid}>
            <PrimaryButton
              icon={Pencil}
              label={t("editor.newRecipe")}
              onPress={() => {
                onClose();
                onNewRecipe();
              }}
              style={styles.recipeActionButton}
            />
            <PrimaryButton
              icon={Download}
              label={t("common.import")}
              onPress={() => {
                onClose();
                onImportRecipe();
              }}
              style={styles.recipeActionButton}
              variant="secondary"
            />
          </View>
        </GlassPanel>
      </View>
    </Modal>
  );
}
