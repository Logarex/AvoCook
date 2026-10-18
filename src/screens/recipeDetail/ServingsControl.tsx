import { Minus, Plus, RotateCcw } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "../../components/AppText";
import { GlassPanel } from "../../components/GlassPanel";
import { IconButton } from "../../components/IconButton";
import { styles } from "./recipeDetailStyles";

export function ServingsControl({
  baseServings,
  selectedServings,
  onChange,
}: {
  baseServings: number;
  selectedServings: number;
  onChange: (servings: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <GlassPanel style={{ gap: 8, paddingVertical: 8 }}>
      <View style={styles.servingsRow}>
        <AppText style={{ flex: 1 }}>{t("recipes.servings.title")}</AppText>
        <IconButton
          disabled={selectedServings <= 1}
          icon={Minus}
          label={t("recipes.servings.decrease")}
          onPress={() => onChange(selectedServings - 1)}
        />
        <AppText
          variant="subtitle"
          style={{ minWidth: 28, textAlign: "center" }}
        >
          {selectedServings}
        </AppText>
        <IconButton
          icon={Plus}
          label={t("recipes.servings.increase")}
          onPress={() => onChange(selectedServings + 1)}
          tone="primary"
        />
      </View>
      {selectedServings !== baseServings ? (
        <View style={styles.servingsRow}>
          <AppText muted variant="caption" style={{ flex: 1 }}>
            {t("recipes.servings.original", { count: baseServings })}
          </AppText>
          <IconButton
            icon={RotateCcw}
            label={t("recipes.servings.reset")}
            onPress={() => onChange(baseServings)}
          />
        </View>
      ) : null}
    </GlassPanel>
  );
}
