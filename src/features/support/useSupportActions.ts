import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { createDiagnosticsReport } from "../logging/appLogger";

export function useSupportActions() {
  const { t } = useTranslation();

  async function copyLogsAndOpen(url: string) {
    Alert.alert(
      t("support.includeLogsTitle", "Include logs?"),
      t("support.includeLogsBody", "Do you want to copy your anonymized diagnostic logs to your clipboard so you can paste them into your message?"),
      [
        {
          text: t("common.no", "No"),
          style: "cancel",
          onPress: () => {
            void Linking.openURL(url);
          }
        },
        {
          text: t("common.yes", "Yes"),
          onPress: () => {
            void (async () => {
              try {
                const logs = await createDiagnosticsReport({ anonymize: true });
                await Clipboard.setStringAsync(logs);
                Alert.alert(
                  t("support.logsCopiedTitle", "Logs copied!"),
                  t("support.logsCopiedBody", "The diagnostic logs are now in your clipboard. You can paste them into the text field."),
                  [
                    {
                      text: t("common.continue", "Continue"),
                      onPress: () => {
                        void Linking.openURL(url);
                      }
                    }
                  ]
                );
              } catch {
                // If generating logs fails for some reason, just open the URL
                void Linking.openURL(url);
              }
            })();
          }
        }
      ]
    );
  }

  function openGithubIssue() {
    void copyLogsAndOpen("https://github.com/Logarex/AvoCook/issues/new");
  }

  function contactByEmail() {
    void copyLogsAndOpen("mailto:contact@nephoos.com?subject=AvoCook%20Support");
  }

  return { openGithubIssue, contactByEmail };
}
