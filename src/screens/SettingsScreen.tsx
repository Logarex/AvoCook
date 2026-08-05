import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BookOpen,
  Bot,
  
  Database,
  Download,
  Bug,
  Eye,
  EyeOff,
  
  Globe,
  Info,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  
  Smartphone,
  
  Star,
  Upload,
  User
} from "lucide-react-native";
import React, { useState } from "react";
import { Alert, Keyboard, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { LanguagePicker } from "../components/LanguagePicker";
import { SegmentedControl } from "../components/SegmentedControl";
import { TextField } from "../components/TextField";
import { useLongActionToast } from "../components/LongActionToast";
import { useAuth } from "../features/auth/AuthProvider";
import { usePreferences, type LlmSettings } from "../features/preferences/PreferencesProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import { LLM_PROVIDERS, type LlmProviderId, fetchAvailableModels } from "../features/import/photoRecipeImport";
import type { RecipeDuplicateGroup } from "../features/recipes/backupDuplicates";
import { useSupportActions } from "../features/support/useSupportActions";
import { useOnboarding } from "../features/onboarding/useOnboarding";
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
  const { watchLongAction } = useLongActionToast();
  const { credentials, getClient, isLocalMode, logout, startLocalMode } = useAuth();
  const {
    exportBackup,
    findDuplicateGroups,
    importBackup,
    mergeDuplicateGroup,
    recipes,
    sync
  } = useRecipes();
  const {
    keepRecipesLocal,
    keepScreenAwake,
    enableBackupReminders,
    language,
    llmSettings,
    showDefaultCategories,
    setShowDefaultCategories,
    setKeepRecipesLocal,
    setKeepScreenAwake,
    setEnableBackupReminders,
    setLanguage,
    setLlmSettings
  } = usePreferences();
  const [message, setMessage] = useState<string | null>(null);
  const [backupAction, setBackupAction] = useState<"export" | "import" | null>(
    null
  );
  const [duplicateAction, setDuplicateAction] = useState(false);
  const [notificationState, setNotificationState] =
    useState<TimerNotificationState>("unavailable");
  const [showApiKey, setShowApiKey] = useState(false);
  const [llmDraft, setLlmDraft] = useState<LlmSettings | null>(null);
  const currentLlm = llmDraft ?? llmSettings;
  const [availableModels, setAvailableModels] = useState<string[] | null>(null);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchModelsError, setFetchModelsError] = useState<string | null>(null);
  const { openGithubIssue, contactByEmail } = useSupportActions();
  const { resetOnboarding, markUpdateSeen } = useOnboarding();

  // Auto-fetch available models when the API key is already set
  React.useEffect(() => {
    if (currentLlm.apiKey.trim() && availableModels === null && !fetchingModels) {
      void handleFetchModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLlm.apiKey]);

  function handleSelectProvider(id: LlmProviderId) {
    const preset = LLM_PROVIDERS.find((p) => p.id === id) ?? LLM_PROVIDERS[0];
    const next: LlmSettings = {
      providerId: id,
      apiKey: currentLlm.apiKey,
      baseUrl: preset.baseUrl,
      model: preset.defaultModel
    };
    setLlmDraft(next);
    void setLlmSettings(next);
    // Reset model list when switching provider
    setAvailableModels(null);
    setFetchModelsError(null);
  }

  async function handleFetchModels() {
    setFetchingModels(true);
    setFetchModelsError(null);
    try {
      const models = await fetchAvailableModels(
        currentLlm.apiKey,
        currentLlm.providerId,
        currentLlm.baseUrl
      );
      setAvailableModels(models);
    } catch (err) {
      setFetchModelsError(
        err instanceof Error ? err.message : t("settings.llmFetchModelsFailed")
      );
    } finally {
      setFetchingModels(false);
    }
  }

  function handlePickModel(modelId: string) {
    const next = { ...currentLlm, model: modelId };
    setLlmDraft(next);
    void setLlmSettings(next);
  }

  function handleLlmFieldChange(field: keyof LlmSettings, value: string) {
    const next = { ...currentLlm, [field]: value };
    setLlmDraft(next);
  }

  function handleLlmFieldBlur() {
    if (llmDraft) {
      void setLlmSettings(llmDraft);
    }
  }

  function handleSaveLlmSettings() {
    Keyboard.dismiss();
    if (llmDraft) {
      void setLlmSettings(llmDraft);
      setMessage(t("common.saved", "Saved"));
      setTimeout(() => setMessage(null), 3000);
    }
  }

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
          const stopLongActionNotice = watchLongAction("longActions.reindex");
          void client
            .reindex()
            .then(sync)
            .then(() => setMessage(t("settings.reindexDone")))
            .finally(stopLongActionNotice);
        }
      }
    ]);
  }

  async function handleLogout() {
    Alert.alert(
      t("settings.logoutConfirmTitle", "Déconnexion"),
      t("settings.logoutConfirmBody", "Vos informations de connexion seront supprimées de cet appareil."),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.logout"),
          style: "destructive",
          onPress: () => {
            void logout().then(() => {
              navigation.replace("Login");
            });
          }
        }
      ]
    );
  }

  async function handleSwitchMode() {
    if (isLocalMode) {
      Alert.alert(
        t("settings.switchToNextcloudConfirmTitle", "Passer sur Nextcloud ?"),
        t("settings.switchToNextcloudConfirmBody", "Vos recettes locales ne seront pas synchronisées avec Nextcloud, elles resteront uniquement sur cet appareil. Aucune donnée n'est perdue !"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("settings.switchToNextcloud"),
            onPress: () => {
              void logout().then(() => {
                navigation.replace("Login", { showNextcloud: true });
              });
            }
          }
        ]
      );
    } else {
      Alert.alert(
        t("settings.switchToLocalConfirmTitle", "Passer en mode local ?"),
        t("settings.switchToLocalConfirmBody", "Vos recettes Nextcloud ne seront plus synchronisées sur cet appareil. Vos recettes locales sont conservées séparément. Aucune donnée n'est perdue !"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("settings.switchToLocal"),
            style: "destructive",
            onPress: () => {
              void startLocalMode().then(() => {
                navigation.replace("Recipes");
              });
            }
          }
        ]
      );
    }
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

  async function handleCheckDuplicates() {
    setDuplicateAction(true);
    setMessage(null);
    let merged = 0;
    let skipped = 0;
    const skippedGroups = new Set<string>();

    try {
      while (true) {
        const groups = (await findDuplicateGroups()).filter(
          (group) => !skippedGroups.has(group.id)
        );
        const group = groups[0];

        if (!group) {
          const title =
            merged || skipped
              ? t("settings.duplicatesDoneTitle")
              : t("settings.duplicatesNoneTitle");
          const body =
            merged || skipped
              ? t("settings.duplicatesDoneBody", { merged, skipped })
              : t("settings.duplicatesNoneBody");
          setMessage(body);
          Alert.alert(title, body);
          break;
        }

        const resolution = await askDuplicateResolution(group);
        if (resolution === "merge") {
          const result = await mergeDuplicateGroup(group);
          merged += result.removed;
          if (result.removed === 0) {
            skippedGroups.add(group.id);
          }
        } else {
          skipped += 1;
          skippedGroups.add(group.id);
        }
      }
    } catch {
      Alert.alert(t("settings.duplicatesFailedTitle"), t("settings.duplicatesFailed"));
    } finally {
      setDuplicateAction(false);
    }
  }

  function askDuplicateResolution(group: RecipeDuplicateGroup) {
    return new Promise<"keep" | "merge">((resolve) => {
      Alert.alert(
        t("settings.duplicateFoundTitle"),
        t("settings.duplicateFoundBody", {
          count: group.recipes.length,
          reason: t(`settings.duplicateReason.${group.reason}`),
          recipes: group.recipes
            .map((recipe, index) => `${index + 1}. ${recipe.name}`)
            .join("\n")
        }),
        [
          {
            text: t("recipes.keepBoth"),
            onPress: () => resolve("keep"),
            style: "cancel"
          },
          {
            text: t("recipes.mergeRecipes"),
            onPress: () => resolve("merge")
          }
        ],
        {
          cancelable: true,
          onDismiss: () => resolve("keep")
        }
      );
    });
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

      {message ? (
        <AppText accessibilityLiveRegion="polite" style={{ color: colors.success, paddingHorizontal: spacing.md, paddingBottom: spacing.md, textAlign: "center" }}>
          {message}
        </AppText>
      ) : null}

      <GlassPanel style={styles.section}>
        <View style={styles.sectionHeader}>
          <Smartphone color={colors.primary} size={22} />
          <AppText variant="label">{t("settings.sectionAppearance")}</AppText>
        </View>

        <SegmentedControl<ThemeMode>
          value={mode}
          onChange={(value) => void setMode(value)}
          options={[
            { label: t("settings.system"), value: "system" },
            { label: t("settings.light"), value: "light" },
            { label: t("settings.dark"), value: "dark" }
          ]}
        />
        <View style={styles.divider} />

        <LanguagePicker
          value={language}
          onChange={(value) => void setLanguage(value)}
        />
        <View style={styles.divider} />

        <View style={styles.rowSectionInner}>
          <View style={styles.rowText}>
            <AppText variant="label">{t("settings.keepAwake")}</AppText>
          </View>
          <Switch
            accessibilityLabel={t("settings.keepAwake")}
            accessibilityRole="switch"
            accessibilityState={{ checked: keepScreenAwake }}
            onValueChange={(value) => void setKeepScreenAwake(value)}
            thumbColor={Platform.OS === "android" ? (keepScreenAwake ? colors.primary : colors.textMuted) : undefined}
            trackColor={{ false: colors.border, true: Platform.OS === "android" ? colors.chip : colors.primary }}
            value={keepScreenAwake}
          />
        </View>
        <View style={styles.divider} />

        <View style={styles.rowSectionInner}>
          <View style={styles.rowText}>
            <AppText variant="label">{t("settings.showDefaultCategories")}</AppText>
            <AppText muted variant="caption">
              {t("settings.showDefaultCategoriesDescription")}
            </AppText>
          </View>
          <Switch
            accessibilityLabel={t("settings.showDefaultCategories")}
            accessibilityRole="switch"
            accessibilityState={{ checked: showDefaultCategories ?? isLocalMode }}
            onValueChange={(value) => void setShowDefaultCategories(value)}
            thumbColor={Platform.OS === "android" ? ((showDefaultCategories ?? isLocalMode) ? colors.primary : colors.textMuted) : undefined}
            trackColor={{ false: colors.border, true: Platform.OS === "android" ? colors.chip : colors.primary }}
            value={showDefaultCategories ?? isLocalMode}
          />
        </View>
      </GlassPanel>

      <GlassPanel style={styles.section}>
        <View style={styles.sectionHeader}>
          <Globe color={colors.primary} size={22} />
          <AppText variant="label">{t("settings.sectionServer")}</AppText>
        </View>

        <View style={styles.rowSectionInner}>
          <View style={styles.rowText}>
            <AppText variant="label">
              {isLocalMode ? t("settings.localMode") : t("auth.server")}
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

        <View style={styles.divider} />

        <View style={styles.rowSectionInner}>
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
            thumbColor={Platform.OS === "android" ? (keepRecipesLocal || isLocalMode ? colors.primary : colors.textMuted) : undefined}
            trackColor={{ false: colors.border, true: Platform.OS === "android" ? colors.chip : colors.primary }}
            value={keepRecipesLocal || isLocalMode}
          />
        </View>

        <View style={styles.divider} />
        <View style={{ marginBottom: 12 }}>
          <AppText variant="label">{t("settings.duplicates")}</AppText>
        </View>
        <AppText muted variant="caption" style={{ marginBottom: 12 }}>
          {t(
            isLocalMode
              ? "settings.duplicatesLocalBody"
              : "settings.duplicatesNextcloudBody"
          )}
        </AppText>
        <PrimaryButton
          disabled={duplicateAction}
          icon={Database}
          label={
            duplicateAction
              ? t("common.loading")
              : t("settings.checkDuplicates")
          }
          onPress={() => void handleCheckDuplicates()}
          variant="ghost"
        />

        {!isLocalMode && credentials ? (
          <>
            <View style={styles.divider} />
            <PrimaryButton
              icon={RefreshCw}
              label={t("settings.reindex")}
              onPress={() => void handleReindex()}
              variant="ghost"
            />
          </>
        ) : null}
      </GlassPanel>

      <GlassPanel style={styles.section}>
        <View style={styles.sectionHeader}>
          <Database color={colors.primary} size={22} />
          <AppText variant="label">{t("settings.sectionData")}</AppText>
        </View>

        <View style={styles.rowSectionInner}>
          <View style={styles.rowText}>
            <AppText variant="label">{t("settings.enableBackupReminders")}</AppText>
          </View>
          <Switch
            accessibilityLabel={t("settings.enableBackupReminders")}
            accessibilityRole="switch"
            accessibilityState={{ checked: enableBackupReminders }}
            onValueChange={(value) => void setEnableBackupReminders(value)}
            thumbColor={Platform.OS === "android" ? (enableBackupReminders ? colors.primary : colors.textMuted) : undefined}
            trackColor={{ false: colors.border, true: Platform.OS === "android" ? colors.chip : colors.primary }}
            value={enableBackupReminders}
          />
        </View>

        <View style={styles.divider} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
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

        <View style={styles.divider} />

        {isLocalMode ? (
          <View style={[styles.warningRow, { marginBottom: 12 }]}>
            <AlertTriangle color={colors.danger} size={20} />
            <AppText style={styles.warningText}>
              {t("settings.localDeleteWarning")}
            </AppText>
          </View>
        ) : null}
        <AppText muted variant="caption" style={{ marginBottom: 16 }}>
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
        <View style={styles.sectionHeader}>
          <Bot color={colors.primary} size={22} />
          <AppText variant="label">{t("settings.advanced")}</AppText>
        </View>

        <View style={{ marginTop: 16, gap: spacing.md }}>
            <AppText muted variant="caption" style={{ marginBottom: 16 }}>
              {t("settings.llmHint")}
            </AppText>

            <AppText variant="label">{t("settings.llmProvider")}</AppText>
            <View style={styles.providerGrid}>
              {LLM_PROVIDERS.map((preset) => {
                const selected = currentLlm.providerId === preset.id;
                return (
                  <Pressable
                    accessibilityLabel={preset.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={preset.id}
                    onPress={() => handleSelectProvider(preset.id)}
                    style={[
                      styles.providerChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.input,
                        borderColor: selected ? colors.primary : colors.border
                      }
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={{ color: selected ? colors.textInverted : colors.text }}
                    >
                      {preset.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              label={t("settings.llmApiKey")}
              onBlur={handleLlmFieldBlur}
              onChangeText={(v) => handleLlmFieldChange("apiKey", v)}
              placeholder={t("settings.llmApiKeyPlaceholder")}
              secureTextEntry={!showApiKey}
              value={currentLlm.apiKey}
              rightElement={
                <Pressable
                  accessibilityLabel={showApiKey ? t("auth.hidePassword") : t("auth.showPassword")}
                  onPress={() => setShowApiKey((v) => !v)}
                  hitSlop={8}
                >
                  {showApiKey
                    ? <EyeOff color={colors.textMuted} size={20} />
                    : <Eye color={colors.textMuted} size={20} />}
                </Pressable>
              }
            />

            {currentLlm.providerId === "custom" ? (
              <>
                <TextField
                  autoCapitalize="none"
                  autoCorrect={false}
                  label={t("settings.llmModel")}
                  onBlur={handleLlmFieldBlur}
                  onChangeText={(v) => handleLlmFieldChange("model", v)}
                  placeholder={t("settings.llmModelPlaceholder")}
                  value={currentLlm.model}
                />
                <TextField
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  label={t("settings.llmBaseUrl")}
                  onBlur={handleLlmFieldBlur}
                  onChangeText={(v) => handleLlmFieldChange("baseUrl", v)}
                  placeholder="https://api.example.com/v1"
                  value={currentLlm.baseUrl}
                />
              </>
            ) : null}

            <PrimaryButton
              disabled={!currentLlm.apiKey.trim() || fetchingModels}
              icon={RefreshCw}
              label={
                fetchingModels
                  ? t("common.loading")
                  : t("settings.llmFetchModels")
              }
              onPress={() => void handleFetchModels()}
              variant="ghost"
              style={{ marginTop: 8 }}
            />

            {fetchModelsError ? (
              <AppText variant="caption" style={{ color: colors.danger, marginTop: 8 }}>
                {fetchModelsError}
              </AppText>
            ) : null}

            {availableModels && availableModels.length > 0 ? (
              <>
                <AppText variant="label" style={{ marginTop: 16 }}>{t("settings.llmPickModel")}</AppText>
                <ScrollView
                  style={styles.modelListScroll}
                  contentContainerStyle={styles.modelListContent}
                  showsVerticalScrollIndicator
                  nestedScrollEnabled
                >
                  {availableModels.map((id) => {
                    const selected = currentLlm.model === id;
                    return (
                      <Pressable
                        accessibilityLabel={id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={id}
                        onPress={() => handlePickModel(id)}
                        style={[
                          styles.modelChip,
                          {
                            backgroundColor: selected ? colors.primary : colors.input,
                            borderColor: selected ? colors.primary : colors.border
                          }
                        ]}
                      >
                        <AppText
                          variant="caption"
                          style={{ color: selected ? colors.textInverted : colors.text }}
                          numberOfLines={1}
                        >
                          {id}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

            <PrimaryButton
              icon={Save}
              label={t("common.save", "Save")}
              onPress={handleSaveLlmSettings}
              disabled={!llmDraft && llmSettings.apiKey === currentLlm.apiKey && llmSettings.model === currentLlm.model && llmSettings.baseUrl === currentLlm.baseUrl && llmSettings.providerId === currentLlm.providerId}
            />
          </View>
      </GlassPanel>

      <GlassPanel style={styles.section}>
        <View style={styles.sectionHeader}>
          <Info color={colors.primary} size={22} />
          <AppText variant="label">{t("settings.sectionSupport")}</AppText>
        </View>

        <View style={{ gap: 8 }}>
          <PrimaryButton
            icon={Star}
            label={t("update.settingsButton", "Quoi de neuf dans cette version")}
            onPress={() => navigation.navigate("Update")}
            variant="ghost"
          />
          <PrimaryButton
            icon={BookOpen}
            label={t("settings.replayIntro")}
            onPress={() => {
              void resetOnboarding().then(() => {
                void markUpdateSeen();
                navigation.navigate("Onboarding");
              });
            }}
            variant="ghost"
          />

          <PrimaryButton
            icon={Info}
            label={t("settings.openPrivacy")}
            onPress={() => navigation.navigate("Privacy")}
            variant="ghost"
          />
          <PrimaryButton
            icon={Bug}
            label={t("support.github", "Open Issue")}
            onPress={openGithubIssue}
            variant="ghost"
          />
          <PrimaryButton
            icon={Mail}
            label={t("support.email", "Contact Us")}
            onPress={contactByEmail}
            variant="ghost"
          />
        </View>
      </GlassPanel>

      <View style={{ marginTop: 16, marginBottom: 32, gap: 8 }}>
        <PrimaryButton
          icon={isLocalMode ? Globe : Smartphone}
          label={isLocalMode ? t("settings.switchToNextcloud") : t("settings.switchToLocal")}
          onPress={() => void handleSwitchMode()}
          variant="secondary"
        />
        {!isLocalMode ? (
          <PrimaryButton
            icon={LogOut}
            label={t("common.logout")}
            onPress={() => void handleLogout()}
            variant="danger"
          />
        ) : null}
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
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 140,
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
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
    backgroundColor: "gray",
    marginVertical: spacing.sm,
  },
  rowSectionInner: {
    alignItems: "center",
    flexWrap: "wrap",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  actionsInner: {
    gap: spacing.sm
  },
  serverHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  advancedHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  chevronOpen: {
    transform: [{ rotate: "180deg" }]
  },
  providerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm
  },
  providerChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
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
  },
  modelListScroll: {
    maxHeight: 220,
    borderRadius: spacing.sm,
  },
  modelListContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingBottom: spacing.xs
  },
  modelChip: {
    borderRadius: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "100%",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  }
});

function isPickerCancel(error: unknown) {
  return (
    error instanceof Error &&
    /cancel|aborted|dismiss/i.test(error.message)
  );
}
