import * as Linking from "expo-linking";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";

export function useSupportActions() {
  const { t } = useTranslation();

  function openUrlSafe(url: string) {
    void Linking.openURL(url).catch(() => {
      if (url.startsWith("mailto:")) {
        Alert.alert(
          t("support.emailFailedTitle", "No email app found"),
          t("support.emailFailedBody", "We couldn't open an email app. You can reach us at contact@nephoos.com")
        );
      }
    });
  }

  function openGithubIssue() {
    openUrlSafe("https://github.com/Logarex/AvoCook/issues/new");
  }

  function contactByEmail() {
    openUrlSafe("mailto:contact@nephoos.com?subject=AvoCook%20Support");
  }

  return { openGithubIssue, contactByEmail };
}
