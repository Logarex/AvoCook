import { AppText } from "../../components/AppText";
import { IconButton } from "../../components/IconButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "../../features/accessibility/useReducedMotion";
import { getScreenBottomPadding } from "../../utils/safeArea";
import {
  ExternalLink,
  Pencil,
  Printer,
  Share2,
  Trash2,
  FileUp,
  X,
} from "lucide-react-native";
import React from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassPanel } from "../../components/GlassPanel";
import { PrimaryButton } from "../../components/PrimaryButton";
import { isExternalRecipeSourceUrl } from "../../features/recipes/recipeSource";
import type { Recipe } from "../../features/recipes/types";
import { useAppTheme } from "../../theme/ThemeProvider";
import { styles } from "./recipeListStyles";

export function RecipeActionsModal({
  action,
  onClose,
  onDelete,
  onPrint,
  onShareFile,
  onSharePdf,
  recipe,
  visible,
}: {
  action: "print" | "pdf" | "file" | "delete" | null;
  onClose: () => void;
  onDelete: (recipe: Recipe) => void;
  onPrint: (recipe: Recipe) => void;
  onShareFile: (recipe: Recipe) => void;
  onSharePdf: (recipe: Recipe) => void;
  recipe: Recipe | null;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const busy = action !== null;

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
          disabled={busy}
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
                {recipe?.name}
              </AppText>
              <AppText muted variant="caption">
                {t("recipes.title")}
              </AppText>
            </View>
            <IconButton
              icon={X}
              label={t("common.close")}
              onPress={onClose}
              disabled={busy}
            />
          </View>
          <View style={styles.recipeActionGrid}>
            <PrimaryButton
              disabled={!recipe || busy}
              icon={Printer}
              label={t("recipes.share.print")}
              onPress={() => recipe && onPrint(recipe)}
              style={styles.recipeActionButton}
              variant="ghost"
            />
            <PrimaryButton
              disabled={!recipe || busy}
              icon={Share2}
              label={t("recipes.share.sharePdf")}
              onPress={() => recipe && onSharePdf(recipe)}
              style={styles.recipeActionButton}
            />
            <PrimaryButton
              disabled={!recipe || busy}
              icon={FileUp}
              label={t("recipes.share.shareFile")}
              onPress={() => recipe && onShareFile(recipe)}
              style={styles.recipeActionButton}
              variant="secondary"
            />
            <PrimaryButton
              disabled={!recipe || busy}
              icon={Trash2}
              label={t("common.delete")}
              onPress={() => recipe && onDelete(recipe)}
              style={[
                styles.recipeActionButton,
                { borderColor: colors.danger },
              ]}
              variant="danger"
            />
          </View>
        </GlassPanel>
      </View>
    </Modal>
  );
}
