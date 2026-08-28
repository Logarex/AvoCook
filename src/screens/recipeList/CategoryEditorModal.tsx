import { Check, Star, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "../../features/accessibility/useReducedMotion";
import { AppText } from "../../components/AppText";
import { GlassPanel } from "../../components/GlassPanel";
import { IconButton } from "../../components/IconButton";
import { PrimaryButton } from "../../components/PrimaryButton";
import { TextField } from "../../components/TextField";
import { spacing } from "../../theme/colors";
import { useAppTheme } from "../../theme/ThemeProvider";
import { styles } from "./recipeListStyles";

export function CategoryEditorModal({
  editingCategory,
  initialCategoryName,
  initialIsFavorite,
  onClose,
  onSave,
  visible,
}: {
  editingCategory: string | null;
  initialCategoryName: string;
  initialIsFavorite: boolean;
  onClose: () => void;
  onSave: (name: string, isFavorite: boolean) => void;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();

  const [name, setName] = useState(initialCategoryName);
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);

  useEffect(() => {
    if (visible) {
      setName(initialCategoryName);
      setIsFavorite(initialIsFavorite);
    }
  }, [visible, initialCategoryName, initialIsFavorite]);

  return (
    <Modal
      animationType={reducedMotion ? "none" : "fade"}
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.centeredModalRoot}>
        <Pressable
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          style={styles.modalScrim}
          onPress={onClose}
        />
        <GlassPanel style={styles.centeredModalContent}>
          <View style={styles.modalHeader}>
            <AppText variant="subtitle">
              {editingCategory
                ? t("recipes.renameCategory")
                : t("recipes.createCategory")}
            </AppText>
            <IconButton icon={X} label={t("common.close")} onPress={onClose} />
          </View>
          
          <TextField
            label={t("recipes.categoryName")}
            onChangeText={setName}
            value={name}
            autoCorrect={false}
            rightElement={
              <Pressable
                accessibilityLabel={t("recipes.toggleFavorite")}
                accessibilityRole="button"
                onPress={() => setIsFavorite(!isFavorite)}
                style={({ pressed }) => [
                  styles.headerIcon,
                  { alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 }
                ]}
              >
                <Star
                  color={isFavorite ? colors.warning : colors.border}
                  fill={isFavorite ? colors.warning : "transparent"}
                  size={22}
                />
              </Pressable>
            }
          />

          <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
            <PrimaryButton
              disabled={!name.trim()}
              icon={Check}
              label={
                editingCategory ? t("common.save") : t("recipes.createCategory")
              }
              onPress={() => onSave(name, isFavorite)}
            />
            <PrimaryButton
              icon={X}
              label={t("common.cancel")}
              onPress={onClose}
              variant="ghost"
            />
          </View>
        </GlassPanel>
      </View>
    </Modal>
  );
}
