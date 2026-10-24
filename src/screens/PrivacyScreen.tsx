import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import type { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Privacy">;

export function PrivacyScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const groups = [
    {
      title: t("ui.privacyValues"),
      paragraphs: [
        t("privacy.free"),
        t("privacy.independent"),
        t("privacy.tracking"),
      ],
    },
    {
      title: t("ui.privacyData"),
      paragraphs: [
        t("privacy.local"),
        t("kitchen.privacyDataSummary"),
        t("kitchen.privacyVoiceSummary"),
        t("privacy.credentials"),
        t("privacy.photos"),
      ],
    },
    {
      title: t("ui.privacyServices"),
      paragraphs: [
        t("privacy.sharedListsAndCommunity"),
        t("privacy.ai"),
        t("kitchen.privacyBarcodeSummary"),
        t("privacy.translations"),
        t("privacy.reminders"),
      ],
    },
  ];
  return (
    <Screen
      header={
        <ScreenHeader
          title={t("privacy.title")}
          onBack={() => navigation.goBack()}
        />
      }
    >
      {groups.map((group) => (
        <GlassPanel key={group.title} style={styles.section}>
          <AppText variant="subtitle">{group.title}</AppText>
          {group.paragraphs.map((paragraph) => (
            <AppText key={paragraph}>{paragraph}</AppText>
          ))}
        </GlassPanel>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
});
