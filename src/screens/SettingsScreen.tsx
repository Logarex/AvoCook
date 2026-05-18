import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Database,
  Download,
  Info,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Upload
} from "lucide-react-native";
import React, { useState } from "react";
import { Alert, Linking, StyleSheet, Switch, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SegmentedControl } from "../components/SegmentedControl";
import { useAuth } from "../features/auth/AuthProvider";
import { usePreferences } from "../features/preferences/PreferencesProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import type { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme/colors";
import { type ThemeMode, useAppTheme } from "../theme/ThemeProvider";
import {
  getTimerNotificationState,
  requestTimerNotificationPermission,
  type TimerNotificationState
} from "../features/timers/timerNotifications";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors, mode, setMode } = useAppTheme();
  const { credentials, getClient, isLocalMode, logout } = useAuth();
  const { exportBackup, importBackup, recipes, sync } = useRecipes();
  const {
    keepRecipesLocal,
    keepScreenAwake,
    language,
    setKeepRecipesLocal,
    setKeepScreenAwake,
    setLanguage
  } = usePreferences();
  const [message, setMessage] = useState<string | null>(null);
  const [backupAction, setBackupAction] = useState<"export" | "import" | null>(
    null
  );
  const [notificationState, setNotificationState] =
    useState<TimerNotificationState>("unavailable");

  useFocusEffect(
    React.useCallback(() => {
      void getTimerNotificationState().then(setNotificationState);
    }, [])
  );

  async function handleToggleNotifications() {
    const next = await requestTimerNotificationPermission();
    setNotificationState(next);
    if (next === "denied") {
      Alert.alert(
        t("recipes.timers.notificationsRequiredTitle"),
        t("recipes.timers.notificationsRequiredBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("common.settings"), onPress: () => void Linking.openSettings() }
        ]
      );
    }
  }

  async function handleReindex() {
    const client = getClient();
    if (!client) {
      return;
    }

    Alert.alert(t("settings.reindexConfirmTitle"), t("settings.reindexConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.reindex"),
        onPress: () => {
          void client
            .reindex()
            .then(sync)
            .then(() => setMessage(t("settings.reindexDone")));
        }
      }
    ]);
  }

  async function handleLogout() {
    await logout();
  }

  async function handleExportBackup() {
    setBackupAction("export");
    setMessage(null);
    try {
      const result = await exportBackup();
      const successMessage = t("settings.backupExportDone", {
        count: result.recipeCount,
        images: result.imageCount
      });
      const skippedMessage =
        result.skippedImageCount > 0
          ? `\n${t("settings.backupExportPartial", {
              count: result.skippedImageCount
            })}`
          : "";
      setMessage(successMessage);
      Alert.alert(t("settings.backupExportTitle"), `${successMessage}${skippedMessage}`);
    } catch (error) {
      if (isPickerCancel(error)) {
        return;
      }
      Alert.alert(
        t("settings.backupFailedTitle"),
        error instanceof Error && error.message === "INVALID_RECIPE_BACKUP"
          ? t("settings.backupInvalid")
          : t("settings.backupFailed")
      );
    } finally {
      setBackupAction(null);
    }
  }

  function handleImportBackup() {
    Alert.alert(
      t("settings.backupImportConfirmTitle"),
      t("settings.backupImportConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.importBackup"),
          onPress: () => {
            void runImportBackup();
          }
        }
      ]
    );
  }

  async function runImportBackup() {
    setBackupAction("import");
    setMessage(null);
    try {
      const result = await importBackup();
      const successMessage = t("settings.backupImportDone", {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        renamed: result.renamed
      });
      setMessage(successMessage);
      Alert.alert(t("settings.backupImportTitle"), successMessage);
    } catch (error) {
      if (isPickerCancel(error)) {
        return;
      }
      Alert.alert(
        t("settings.backupFailedTitle"),
        error instanceof Error && error.message === "INVALID_RECIPE_BACKUP"
          ? t("settings.backupInvalid")
          : t("settings.backupFailed")
      );
    } finally {
      setBackupAction(null);
    }
  }

  return (
    <Screen showScrollTop={false}>
      <View style={styles.toolbar}>
        <IconButton
          icon={ArrowLeft}
          label="Back"
          onPress={() => navigation.goBack()}
        />
        <AppText variant="subtitle">{t("settings.title")}</AppText>
        <View style={styles.toolbarSpacer} />
      </View>

      <GlassPanel style={styles.section}>
        <AppText variant="label">{t("settings.appearance")}</AppText>
        <SegmentedControl<ThemeMode>
          value={mode}
          onChange={(value) => void setMode(value)}
          options={[
            { label: t("settings.system"), value: "system" },
            { label: t("settings.light"), value: "light" },
            { label: t("settings.dark"), value: "dark" }
          ]}
        />
      </GlassPanel>

      <GlassPanel style={styles.section}>
        <AppText variant="label">{t("settings.language")}</AppText>
        <SegmentedControl<"fr" | "en" | "de">
          value={language}
          onChange={(value) => void setLanguage(value)}
          options={[
            { label: t("settings.french"), value: "fr" },
            { label: t("settings.english"), value: "en" },
            { label: t("settings.german"), value: "de" }
          ]}
        />
      </GlassPanel>

      <GlassPanel style={styles.rowSection}>
        <View style={styles.rowText}>
          <AppText variant="label">{t("settings.keepAwake")}</AppText>
        </View>
        <Switch
          onValueChange={(value) => void setKeepScreenAwake(value)}
          thumbColor={keepScreenAwake ? colors.primary : colors.textMuted}
          trackColor={{ false: colors.border, true: colors.chip }}
          value={keepScreenAwake}
        />
      </GlassPanel>

      <GlassPanel style={styles.section}>
        <View style={styles.serverHeader}>
          <Bell color={colors.primary} size={22} />
          <AppText variant="label">{t("settings.notifications")}</AppText>
        </View>
        <PrimaryButton
          disabled={notificationState === "unavailable"}
          label={
            notificationState === "ready"
              ? t("settings.notificationsEnabled")
              : t("settings.notificationsDisabled")
          }
          onPress={() => void handleToggleNotifications()}
          variant={notificationState === "ready" ? "primary" : "ghost"}
        />
      </GlassPanel>

      <GlassPanel style={styles.rowSection}>
        <View style={styles.rowText}>
          <AppText variant="label">{t("settings.keepRecipesLocal")}</AppText>
        </View>
        <Switch
          disabled={isLocalMode}
          onValueChange={(value) => void setKeepRecipesLocal(value)}
          thumbColor={keepRecipesLocal || isLocalMode ? colors.primary : colors.textMuted}
          trackColor={{ false: colors.border, true: colors.chip }}
          value={keepRecipesLocal || isLocalMode}
        />
      </GlassPanel>

      <GlassPanel style={styles.section}>
        <View style={styles.serverHeader}>
          <Database color={colors.primary} size={22} />
          <AppText variant="label">{t("settings.dataBackup")}</AppText>
        </View>
        {isLocalMode ? (
          <View style={styles.warningRow}>
            <AlertTriangle color={colors.danger} size={20} />
            <AppText style={styles.warningText}>
              {t("settings.localDeleteWarning")}
            </AppText>
          </View>
        ) : null}
        <AppText muted variant="caption">
          {t(
            isLocalMode
              ? "settings.dataBackupLocalBody"
              : "settings.dataBackupNextcloudBody"
          )}
        </AppText>
        <View style={styles.backupActions}>
          <PrimaryButton
            disabled={backupAction !== null}
            icon={Download}
            label={
              backupAction === "export"
                ? t("common.loading")
                : t("settings.exportBackup")
            }
            onPress={() => void handleExportBackup()}
            style={styles.backupButton}
            variant="ghost"
          />
          <PrimaryButton
            disabled={backupAction !== null}
            icon={Upload}
            label={
              backupAction === "import"
                ? t("common.loading")
                : t("settings.importBackup")
            }
            onPress={() => handleImportBackup()}
            style={styles.backupButton}
            variant="ghost"
          />
        </View>
      </GlassPanel>

      <GlassPanel style={styles.section}>
        <View style={styles.serverHeader}>
          <ShieldCheck color={colors.primary} size={22} />
          <AppText variant="label">
            {isLocalMode ? t("settings.localMode") : t("settings.server")}
          </AppText>
        </View>
        <AppText>
          {isLocalMode
            ? t("settings.localOnly")
            : credentials?.serverUrl ?? t("common.offline")}
        </AppText>
        <AppText muted variant="caption">
          {credentials?.username}
        </AppText>
        <AppText muted variant="caption">
          {t(
            recipes.length <= 1
              ? "recipes.loadedRecipes_one"
              : "recipes.loadedRecipes_other",
            { count: recipes.length }
          )}
        </AppText>
        <AppText muted variant="caption">
          {t("settings.secureStore")}
        </AppText>
      </GlassPanel>

      {message ? <AppText style={{ color: colors.success }}>{message}</AppText> : null}

      <View style={styles.actions}>
        <PrimaryButton
          icon={Info}
          label={t("settings.openPrivacy")}
          onPress={() => navigation.navigate("Privacy")}
          variant="ghost"
        />
        <PrimaryButton
          disabled={!credentials}
          icon={RefreshCw}
          label={t("settings.reindex")}
          onPress={() => void handleReindex()}
          variant="ghost"
        />
        <PrimaryButton
          icon={LogOut}
          label={t("common.logout")}
          onPress={() => void handleLogout()}
          variant="danger"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm
  },
  backupActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  backupButton: {
    flex: 1,
    minWidth: 150
  },
  rowSection: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  rowText: {
    flex: 1
  },
  section: {
    gap: spacing.md
  },
  serverHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  toolbarSpacer: {
    width: 44
  },
  warningRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs
  },
  warningText: {
    flex: 1
  }
});

function isPickerCancel(error: unknown) {
  return (
    error instanceof Error &&
    /cancel|aborted|dismiss/i.test(error.message)
  );
}
