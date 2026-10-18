import { Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppSheet, useSheetActions } from "../components/AppSheet";
import { PrimaryButton } from "../components/PrimaryButton";
import { styles } from "./recipeList/recipeListStyles";

export function ShoppingListActionsModal({
  onClose,
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
  const { dismissThen, afterDismiss } = useSheetActions(onClose);

  return (
    <AppSheet
      visible={visible}
      title={t("shoppingList.title")}
      onClose={onClose}
      compact
      onDismiss={afterDismiss}
    >
      <View style={styles.recipeActionGrid}>
        {checkedCount > 0 && (
          <PrimaryButton
            icon={Trash2}
            label={t("shoppingList.clearChecked")}
            onPress={() => {
              dismissThen(onClearChecked);
            }}
            style={styles.recipeActionButton}
            variant="danger-secondary"
          />
        )}
        <PrimaryButton
          icon={Trash2}
          label={t("shoppingList.clearAll")}
          onPress={() => {
            dismissThen(onClearAll);
          }}
          style={styles.recipeActionButton}
          variant="danger"
        />
      </View>
    </AppSheet>
  );
}
