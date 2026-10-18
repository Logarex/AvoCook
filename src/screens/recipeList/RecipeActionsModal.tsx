import { FileUp, Share2, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppSheet, useSheetActions } from "../../components/AppSheet";
import { PrimaryButton } from "../../components/PrimaryButton";
import type { Recipe } from "../../features/recipes/types";
import { useAppTheme } from "../../theme/ThemeProvider";
import { styles } from "./recipeListStyles";

export function RecipeActionsModal({
  action,
  onClose,
  onDelete,
  onShareFile,
  onSharePdf,
  recipe,
  visible,
}: {
  action: "print" | "pdf" | "file" | "delete" | null;
  onClose: () => void;
  onDelete: (recipe: Recipe) => void;
  onShareFile: (recipe: Recipe) => void;
  onSharePdf: (recipe: Recipe) => void;
  recipe: Recipe | null;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const { dismissThen, afterDismiss } = useSheetActions(onClose);
  const { colors } = useAppTheme();
  const busy = action !== null;

  return (
    <AppSheet
      visible={visible}
      title={recipe?.name ?? t("ui.more")}
      onClose={onClose}
      compact
      onDismiss={afterDismiss}
      busy={busy}
    >
      <View style={styles.recipeActionGrid}>
        <PrimaryButton
          disabled={!recipe || busy}
          icon={Share2}
          label={t("recipes.share.sharePdf")}
          onPress={() => {
            if (recipe) dismissThen(() => onSharePdf(recipe));
          }}
          style={styles.recipeActionButton}
        />
        <PrimaryButton
          disabled={!recipe || busy}
          icon={FileUp}
          label={t("recipes.share.shareFile")}
          onPress={() => {
            if (recipe) dismissThen(() => onShareFile(recipe));
          }}
          style={styles.recipeActionButton}
          variant="secondary"
        />
        <PrimaryButton
          disabled={!recipe || busy}
          icon={Trash2}
          label={t("common.delete")}
          onPress={() => {
            if (recipe) dismissThen(() => onDelete(recipe));
          }}
          style={[styles.recipeActionButton, { borderColor: colors.danger }]}
          variant="danger"
        />
      </View>
    </AppSheet>
  );
}
