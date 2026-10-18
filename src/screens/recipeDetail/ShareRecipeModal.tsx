import { FileUp, Globe, Share2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppSheet, useSheetActions } from "../../components/AppSheet";
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
  const { dismissThen, afterDismiss } = useSheetActions(onClose);

  return (
    <AppSheet
      visible={visible}
      title={t("common.share")}
      onClose={onClose}
      compact
      onDismiss={afterDismiss}
      busy={Boolean(disabled)}
    >
      <View style={styles.recipeActionGrid}>
        <PrimaryButton
          icon={Share2}
          label={t("recipes.share.sharePdf")}
          onPress={() => {
            dismissThen(onSharePdf);
          }}
          style={styles.recipeActionButton}
          disabled={disabled}
        />
        <PrimaryButton
          icon={FileUp}
          label={t("recipes.share.shareFile")}
          onPress={() => {
            dismissThen(onShareFile);
          }}
          style={styles.recipeActionButton}
          variant="secondary"
          disabled={disabled}
        />
        <PrimaryButton
          icon={Globe}
          label={t("community.shareToCommunity")}
          onPress={() => {
            dismissThen(onShareToCommunity);
          }}
          style={styles.recipeActionButton}
          variant="secondary"
          disabled={disabled}
        />
      </View>
    </AppSheet>
  );
}
