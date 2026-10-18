import { Download, Pencil } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppSheet, useSheetActions } from "../../components/AppSheet";
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
  const { dismissThen, afterDismiss } = useSheetActions(onClose);

  return (
    <AppSheet
      visible={visible}
      title={t("common.add")}
      onClose={onClose}
      compact
      onDismiss={afterDismiss}
    >
      <View style={styles.recipeActionGrid}>
        <PrimaryButton
          icon={Pencil}
          label={t("editor.newRecipe")}
          onPress={() => {
            dismissThen(onNewRecipe);
          }}
          style={styles.recipeActionButton}
        />
        <PrimaryButton
          icon={Download}
          label={t("common.import")}
          onPress={() => {
            dismissThen(onImportRecipe);
          }}
          style={styles.recipeActionButton}
          variant="secondary"
        />
      </View>
    </AppSheet>
  );
}
