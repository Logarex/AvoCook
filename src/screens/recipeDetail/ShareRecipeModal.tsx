import { AppText } from "../../components/AppText";
import { IconButton } from "../../components/IconButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "../../features/accessibility/useReducedMotion";
import { getScreenBottomPadding } from "../../utils/safeArea";
import {
  FileUp,
  Share2,
  Globe,
  X,
} from "lucide-react-native";
import React from "react";
import { Modal, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassPanel } from "../../components/GlassPanel";
import { PrimaryButton } from "../../components/PrimaryButton";
import { styles } from "../recipeList/recipeListStyles";

export function ShareRecipeModal({
  onClose,
  onSharePdf,
  onShareFile,
  onShareToCommunity,
  visible,
  disabled,
}: {
  onClose: () => void;
  onSharePdf: () => void;
  onShareFile: () => void;
  onShareToCommunity: () => void;
  visible: boolean;
  disabled?: boolean;
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
          disabled={disabled}
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
                {t("common.share")}
              </AppText>
            </View>
            <IconButton
              icon={X}
              label={t("common.close")}
              onPress={onClose}
              disabled={disabled}
            />
          </View>
          <View style={styles.recipeActionGrid}>
            <PrimaryButton
              icon={Share2}
              label={t("recipes.share.sharePdf")}
              onPress={() => {
                onClose();
                onSharePdf();
              }}
              style={styles.recipeActionButton}
              disabled={disabled}
            />
            <PrimaryButton
              icon={FileUp}
              label={t("recipes.share.shareFile")}
              onPress={() => {
                onClose();
                onShareFile();
              }}
              style={styles.recipeActionButton}
              variant="secondary"
              disabled={disabled}
            />
            <PrimaryButton
              icon={Globe}
              label={t("community.shareToCommunity", { defaultValue: "Partager à la communauté" })}
              onPress={() => {
                onClose();
                onShareToCommunity();
              }}
              style={styles.recipeActionButton}
              variant="secondary"
              disabled={disabled}
            />
          </View>
        </GlassPanel>
      </View>
    </Modal>
  );
}
