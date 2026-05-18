import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, GraduationCap, ShieldCheck } from "lucide-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { Screen } from "../components/Screen";
import type { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Privacy">;

export function PrivacyScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const paragraphs = [
    t("privacy.free"),
    t("privacy.independent"),
    t("privacy.local"),
    t("privacy.credentials"),
    t("privacy.photos"),
    t("privacy.tracking")
  ];

  return (
    <Screen showScrollTop={false}>
      <View style={styles.toolbar}>
        <IconButton
          icon={ArrowLeft}
          label={t("common.back")}
          onPress={() => navigation.goBack()}
        />
        <AppText variant="subtitle">{t("privacy.title")}</AppText>
        <View style={styles.toolbarSpacer} />
      </View>

      <GlassPanel style={styles.hero}>
        <View style={[styles.icon, { backgroundColor: colors.chip }]}>
          <ShieldCheck color={colors.primary} size={34} />
        </View>
        <AppText variant="title">{t("privacy.title")}</AppText>
      </GlassPanel>

      <GlassPanel style={styles.section}>
        <GraduationCap color={colors.primary} size={24} />
        {paragraphs.map((paragraph) => (
          <AppText key={paragraph}>{paragraph}</AppText>
        ))}
      </GlassPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    gap: spacing.md
  },
  icon: {
    alignItems: "center",
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  section: {
    gap: spacing.md
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  toolbarSpacer: {
    width: 44
  }
});
