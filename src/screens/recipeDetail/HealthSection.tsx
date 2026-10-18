import { HeartPulse } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "../../components/AppText";
import { GlassPanel } from "../../components/GlassPanel";
import { scoreColors, type HealthProfile } from "../../features/recipes/health";
import type { NutriScoreGrade } from "../../features/recipes/types";
import { useAppTheme } from "../../theme/ThemeProvider";
import { styles } from "./recipeDetailStyles";

export const nutriScoreColors: Record<NutriScoreGrade, string> = {
  A: "#167B40",
  B: "#70B744",
  C: "#F2C84B",
  D: "#EE8E2F",
  E: "#D64545",
  "?": "#8A8177",
};

export const nutriScoreGrades: NutriScoreGrade[] = ["A", "B", "C", "D", "E"];

export function HealthSection({ profile }: { profile: HealthProfile }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <GlassPanel style={styles.section}>
      <View style={styles.sectionHeader}>
        <HeartPulse color={colors.primary} size={21} />
        <AppText variant="subtitle">{t("recipes.health.title")}</AppText>
      </View>
      <View style={styles.healthHeader}>
        <View
          style={[
            styles.nutriBadge,
            { backgroundColor: profile.backgroundColor },
          ]}
        >
          <AppText variant="title" style={{ color: profile.color }}>
            {profile.grade}
          </AppText>
        </View>
        <View style={styles.healthCopy}>
          <AppText variant="label">
            {profile.hasNutrition
              ? t("recipes.health.estimated")
              : t("recipes.health.missingTitle")}
          </AppText>
          <AppText muted variant="caption">
            {t("recipes.health.localNote")}
          </AppText>
          <AppText muted variant="caption">
            {t("recipes.health.calculation")}
          </AppText>
        </View>
      </View>
      <View style={styles.nutriScale}>
        {nutriScoreGrades.map((grade) => (
          <View
            key={grade}
            style={[
              styles.nutriScaleItem,
              {
                backgroundColor: nutriScoreColors[grade],
                borderWidth: profile.grade === grade ? 2 : 0,
                borderColor: colors.text,
              },
            ]}
          >
            <AppText
              variant="label"
              style={{
                color: scoreColors[grade].color,
              }}
            >
              {grade}
            </AppText>
          </View>
        ))}
      </View>
      {profile.facts.length ? (
        <View style={styles.healthFacts}>
          {profile.facts.map((fact) => (
            <View key={fact.labelKey} style={styles.healthFact}>
              <AppText muted variant="caption">
                {t(fact.labelKey)}
              </AppText>
              <AppText markdown variant="label">
                {fact.value}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </GlassPanel>
  );
}
