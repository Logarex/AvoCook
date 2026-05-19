import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BookOpen,
  Database,
  Download,
  Globe,
  Info,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Upload,
  User
} from "lucide-react-native";
import React, { useState } from "react";
import { Alert, Linking, StyleSheet, Switch, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { LanguagePicker } from "../components/LanguagePicker";
import { SegmentedControl } from "../components/SegmentedControl";
import { useAuth } from "../features/auth/AuthProvider";
import { usePreferences } from "../features/preferences/PreferencesProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
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
          label={t("common.back")}
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
        <LanguagePicker
          value={language}
          onChange={(value) => void setLanguage(value)}
          options={[
            { label: t("settings.french"), value: "fr" },
            { label: t("settings.english"), value: "en" },
            { label: t("settings.german"), value: "de" },
            { label: t("settings.spanish"), value: "es" },
            { label: t("settings.italian"), value: "it" }
          ]}
        />
      </GlassPanel>

      <GlassPanel style={styles.rowSection}>
        <View style={styles.rowText}>
          <AppText variant="label">{t("settings.keepAwake")}</AppText>
        </View>
        <Switch
          accessibilityLabel={t("settings.keepAwake")}
          accessibilityRole="switch"
          accessibilityState={{ checked: keepScreenAwake }}
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
          accessibilityLabel={t("settings.keepRecipesLocal")}
          accessibilityRole="switch"
          accessibilityState={{
            checked: keepRecipesLocal || isLocalMode,
            disabled: isLocalMode
          }}
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

      <GlassPanel style={styles.connectionCard}>
        <View style={styles.connectionHeader}>
          <View style={styles.connectionTitleGroup}>
            <ShieldCheck color={colors.primary} size={22} />
            <AppText variant="label">
              {isLocalMode ? t("settings.localMode") : t("settings.server")}
            </AppText>
          </View>
          
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isLocalMode ? colors.border : colors.chip }
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isLocalMode ? colors.warning : colors.success }
              ]}
            />
            <AppText
              variant="caption"
              style={[
                styles.statusText,
                { color: isLocalMode ? colors.warning : colors.primary }
              ]}
            >
              {isLocalMode ? t("common.offline") : t("common.online")}
            </AppText>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          {!isLocalMode && credentials?.serverUrl ? (
            <>
              <View style={styles.detailRow}>
                <View style={[styles.detailIconWrapper, { backgroundColor: colors.chip }]}>
                  <Globe color={colors.primary} size={16} />
                </View>
                <View style={styles.detailContent}>
                  <AppText muted variant="caption">
                    {t("auth.server")}
                  </AppText>
                  <AppText style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">
                    {credentials.serverUrl}
                  </AppText>
                </View>
              </View>
              <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
            </>
          ) : null}

          {!isLocalMode && credentials?.username ? (
            <>
              <View style={styles.detailRow}>
                <View style={[styles.detailIconWrapper, { backgroundColor: colors.chip }]}>
                  <User color={colors.primary} size={16} />
                </View>
                <View style={styles.detailContent}>
                  <AppText muted variant="caption">
                    {t("auth.username")}
                  </AppText>
                  <AppText style={styles.detailValue} numberOfLines={1}>
                    {credentials.username}
                  </AppText>
                </View>
              </View>
              <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
            </>
          ) : null}

          <View style={styles.detailRow}>
            <View style={[styles.detailIconWrapper, { backgroundColor: colors.chip }]}>
              <BookOpen color={colors.primary} size={16} />
            </View>
            <View style={styles.detailContent}>
              <AppText muted variant="caption">
                {t("recipes.title")}
              </AppText>
              <AppText style={styles.detailValue}>
                {t(
                  recipes.length <= 1
                    ? "recipes.loadedRecipes_one"
                    : "recipes.loadedRecipes_other",
                  { count: recipes.length }
                )}
              </AppText>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.noticeBanner,
            { backgroundColor: isLocalMode ? "rgba(184, 106, 29, 0.08)" : colors.chip }
          ]}
        >
          {isLocalMode ? (
            <Info color={colors.warning} size={16} />
          ) : (
            <Lock color={colors.primary} size={16} />
          )}
          <AppText muted variant="caption" style={styles.noticeText}>
            {isLocalMode ? t("settings.localNotice") : t("settings.secureStore")}
          </AppText>
        </View>
      </GlassPanel>

      {message ? (
        <AppText accessibilityLiveRegion="polite" style={{ color: colors.success }}>
          {message}
        </AppText>
      ) : null}

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
    flexWrap: "wrap",
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
  },
  connectionCard: {
    gap: spacing.md,
    padding: spacing.md
  },
  connectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  connectionTitleGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  statusBadge: {
    alignItems: "center",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    width: 8
  },
  statusText: {
    fontWeight: "600"
  },
  detailsContainer: {
    gap: spacing.sm
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  detailIconWrapper: {
    alignItems: "center",
    borderRadius: radius.sm,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  detailContent: {
    flex: 1
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 1
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth
  },
  noticeBanner: {
    alignItems: "flex-start",
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm
  },
  noticeText: {
    flex: 1,
    lineHeight: 18
  }
});

function isPickerCancel(error: unknown) {
  return (
    error instanceof Error &&
    /cancel|aborted|dismiss/i.test(error.message)
  );
}
