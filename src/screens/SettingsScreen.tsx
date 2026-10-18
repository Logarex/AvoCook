import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Bot,
  Bug,
  Check,
  CheckCheck,
  Database,
  Download,
  Eye,
  EyeOff,
  Globe,
  Info,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  Star,
  Upload,
  User,
} from "lucide-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { AppText } from "../components/AppText";
import { ChoiceField } from "../components/ChoiceField";
import { DisclosureSection } from "../components/DisclosureSection";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { LanguagePicker } from "../components/LanguagePicker";
import { useLongActionToast } from "../components/LongActionToast";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { SegmentedControl } from "../components/SegmentedControl";
import { SettingsRow } from "../components/SettingsRow";
import { ShoppingModeButton } from "../components/ShoppingModeButton";
import { TextField } from "../components/TextField";
import { useAuth } from "../features/auth/AuthProvider";
import {
  checkPseudonymAvailable,
  releasePseudonym,
  reservePseudonym,
} from "../features/community/communityClient";
import {
  fetchAvailableModels,
  LLM_PROVIDERS,
  type LlmProviderId,
} from "../features/import/photoRecipeImport";
import { useOnboarding } from "../features/onboarding/useOnboarding";
import {
  usePreferences,
  type LlmSettings,
} from "../features/preferences/PreferencesProvider";
import type { RecipeDuplicateGroup } from "../features/recipes/backupDuplicates";
import { useRecipes } from "../features/recipes/RecipesProvider";
import { useSupportActions } from "../features/support/useSupportActions";
import {
  getTimerNotificationState,
  requestTimerNotificationPermission,
  type TimerNotificationState,
} from "../features/timers/timerNotifications";
import type { RootStackParamList, SettingsSection } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme, type ThemeMode } from "../theme/ThemeProvider";
import { containsProfanity } from "../utils/profanityFilter";
import { APP_VERSION } from "../version";
import { ShoppingModeModal } from "./ShoppingModeModal";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export function SettingsScreen({ navigation, route }: Props) {
  const section = route.params?.section;
  const { t } = useTranslation();
  const { colors, mode, setMode } = useAppTheme();
  const { watchLongAction } = useLongActionToast();
  const { credentials, getClient, isLocalMode, logout, startLocalMode } =
    useAuth();
  const {
    exportBackup,
    findDuplicateGroups,
    importBackup,
    mergeDuplicateGroup,
    recipes,
    sync: recipeSync,
  } = useRecipes();
  const [showShoppingModes, setShowShoppingModes] = useState(false);
  const {
    keepRecipesLocal,
    keepScreenAwake,
    enableBackupReminders,
    enableShoppingNotifications,
    language,
    llmSettings,
    communityPseudonym,
    showDefaultCategories,
    nextcloudImageFolder,
    setShowDefaultCategories,
    setKeepRecipesLocal,
    setKeepScreenAwake,
    setEnableBackupReminders,
    setEnableShoppingNotifications,
    setLanguage,
    setLlmSettings,
    setCommunityPseudonym,
    setNextcloudImageFolder,
  } = usePreferences();
  const [message, setMessage] = useState<string | null>(null);
  const [llmMessage, setLlmMessage] = useState<string | null>(null);
  const [backupAction, setBackupAction] = useState<"export" | "import" | null>(
    null,
  );
  const [duplicateAction, setDuplicateAction] = useState(false);
  const [notificationState, setNotificationState] =
    useState<TimerNotificationState>("unavailable");
  const [showApiKey, setShowApiKey] = useState(false);
  const [localPseudonym, setLocalPseudonym] = useState(
    communityPseudonym || "",
  );
  const [pseudoSavedAnim, setPseudoSavedAnim] = useState(false);
  const [localImageFolder, setLocalImageFolder] =
    useState(nextcloudImageFolder);
  const [imageFolderSavedAnim, setImageFolderSavedAnim] = useState(false);

  React.useEffect(() => {
    setLocalPseudonym(communityPseudonym || "");
  }, [communityPseudonym]);

  React.useEffect(() => {
    setLocalImageFolder(nextcloudImageFolder);
  }, [nextcloudImageFolder]);

  // Reserve pseudonyms created before uniqueness checks were introduced.
  React.useEffect(() => {
    if (section !== "account" || !communityPseudonym) return;
    void reservePseudonym(communityPseudonym).catch(() => {
      // Validate reservation errors again when saving.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [llmDraft, setLlmDraft] = useState<LlmSettings | null>(null);
  const currentLlm = llmDraft ?? llmSettings;
  const [availableModels, setAvailableModels] = useState<string[] | null>(null);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchModelsError, setFetchModelsError] = useState<string | null>(null);
  const { openGithubIssue, contactByEmail } = useSupportActions();
  const { resetOnboarding } = useOnboarding();

  React.useEffect(() => {
    if (
      section === "assistant" &&
      currentLlm.apiKey.trim() &&
      availableModels === null &&
      !fetchingModels
    ) {
      void handleFetchModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLlm.apiKey, section]);

  function handleSelectProvider(id: LlmProviderId) {
    const preset = LLM_PROVIDERS.find((p) => p.id === id) ?? LLM_PROVIDERS[0];
    const next: LlmSettings = {
      providerId: id,
      apiKey: currentLlm.apiKey,
      baseUrl: preset.baseUrl,
      model: preset.defaultModel,
    };
    setLlmDraft(next);
    void setLlmSettings(next);
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
        currentLlm.baseUrl,
      );
      setAvailableModels(models);
    } catch (err) {
      console.warn("settings", "Could not fetch provider models", err);
      setFetchModelsError(t("settings.llmFetchModelsFailed"));
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
      setLlmMessage(t("common.saved"));
      setTimeout(() => setLlmMessage(null), 3000);
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      void getTimerNotificationState().then(setNotificationState);
    }, []),
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
          {
            text: t("common.settings"),
            onPress: () => void Linking.openSettings(),
          },
        ],
      );
    }
  }

  async function handleReindex() {
    const client = getClient();
    if (!client) {
      return;
    }

    Alert.alert(
      t("settings.reindexConfirmTitle"),
      t("settings.reindexConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.reindex"),
          onPress: () => {
            const stopLongActionNotice = watchLongAction("longActions.reindex");
            void client
              .reindex()
              .then(recipeSync)
              .then(() => setMessage(t("settings.reindexDone")))
              .finally(stopLongActionNotice);
          },
        },
      ],
    );
  }

  async function handleLogout() {
    Alert.alert(
      t("settings.logoutConfirmTitle"),
      t("settings.logoutConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.logout"),
          style: "destructive",
          onPress: () => {
            void logout().then(() => {
              navigation.replace("Login");
            });
          },
        },
      ],
    );
  }

  async function handleSwitchMode() {
    if (isLocalMode) {
      Alert.alert(
        t("settings.switchToNextcloudConfirmTitle"),
        t("settings.switchToNextcloudConfirmBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("settings.switchToNextcloud"),
            onPress: () => {
              void logout().then(() => {
                navigation.replace("Login", { showNextcloud: true });
              });
            },
          },
        ],
      );
    } else {
      Alert.alert(
        t("settings.switchToLocalConfirmTitle"),
        t("settings.switchToLocalConfirmBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("settings.switchToLocal"),
            style: "destructive",
            onPress: () => {
              void startLocalMode().then(() => {
                navigation.replace("Recipes");
              });
            },
          },
        ],
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
        images: result.imageCount,
      });
      const skippedMessage =
        result.skippedImageCount > 0
          ? `\n${t("settings.backupExportPartial", {
              count: result.skippedImageCount,
            })}`
          : "";
      setMessage(successMessage);
      Alert.alert(
        t("settings.backupExportTitle"),
        `${successMessage}${skippedMessage}`,
      );
    } catch (error) {
      if (isPickerCancel(error)) {
        return;
      }
      Alert.alert(
        t("settings.backupFailedTitle"),
        error instanceof Error && error.message === "INVALID_RECIPE_BACKUP"
          ? t("settings.backupInvalid")
          : t("settings.backupFailed"),
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
          },
        },
      ],
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
        renamed: result.renamed,
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
          : t("settings.backupFailed"),
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
          (group) => !skippedGroups.has(group.id),
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
      Alert.alert(
        t("settings.duplicatesFailedTitle"),
        t("settings.duplicatesFailed"),
      );
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
            .join("\n"),
        }),
        [
          {
            text: t("recipes.keepBoth"),
            onPress: () => resolve("keep"),
            style: "cancel",
          },
          {
            text: t("recipes.mergeRecipes"),
            onPress: () => resolve("merge"),
          },
        ],
        {
          cancelable: true,
          onDismiss: () => resolve("keep"),
        },
      );
    });
  }

  const sectionTitle =
    section === "appearance"
      ? t("settings.sectionAppearance")
      : section === "account"
        ? t("ui.account")
        : section === "shopping"
          ? t("ui.shopping")
          : section === "backup"
            ? t("ui.backup")
            : section === "advanced"
              ? t("settings.advanced")
              : section === "assistant"
                ? t("ui.assistant")
                : section === "maintenance"
                  ? t("ui.maintenance")
                  : t("ui.about");
  function openSection(next: SettingsSection) {
    navigation.push("Settings", { section: next });
  }

  return (
    <Screen
      showScrollTop={false}
      contentWidth={640}
      header={
        <ScreenHeader
          title={section ? sectionTitle : undefined}
          onBack={() => navigation.goBack()}
        />
      }
    >
      {message ? (
        <AppText
          accessibilityLiveRegion="polite"
          style={{ color: colors.success }}
        >
          {message}
        </AppText>
      ) : null}
      {!section ? (
        <>
          <AppText accessibilityRole="header" variant="title">
            {t("settings.title")}
          </AppText>
          <GlassPanel style={styles.menuGroup}>
            <SettingsRow
              icon={Smartphone}
              title={t("settings.sectionAppearance")}
              value={t("ui.appearanceSummary")}
              onPress={() => openSection("appearance")}
            />
            <SettingsRow
              icon={User}
              title={t("ui.account")}
              value={t("ui.accountSummary")}
              onPress={() => openSection("account")}
            />
            <SettingsRow
              icon={ShoppingCart}
              title={t("ui.shopping")}
              value={t("ui.shoppingSummary")}
              onPress={() => openSection("shopping")}
            />
          </GlassPanel>
          <GlassPanel style={styles.menuGroup}>
            <SettingsRow
              icon={Database}
              title={t("ui.backup")}
              value={t("ui.backupSummary")}
              onPress={() => openSection("backup")}
            />
            <SettingsRow
              icon={SlidersHorizontal}
              title={t("settings.advanced")}
              value={t("ui.advancedSummary")}
              onPress={() => openSection("advanced")}
            />
            <SettingsRow
              icon={Info}
              title={t("ui.about")}
              value={t("ui.aboutSummary")}
              onPress={() => openSection("about")}
            />
          </GlassPanel>
          <AppText muted variant="caption" style={{ textAlign: "center" }}>
            AvoCook {APP_VERSION}
          </AppText>
        </>
      ) : null}
      {section === "appearance" ? (
        <>
          <GlassPanel style={styles.section}>
            <SegmentedControl<ThemeMode>
              value={mode}
              onChange={(value) => void setMode(value)}
              options={[
                { label: t("settings.system"), value: "system" },
                { label: t("settings.light"), value: "light" },
                { label: t("settings.dark"), value: "dark" },
              ]}
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <LanguagePicker
              value={language}
              onChange={(value) => void setLanguage(value)}
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <View style={styles.rowSectionInner}>
              <View style={styles.rowText}>
                <AppText variant="label">{t("settings.keepAwake")}</AppText>
              </View>
              <Switch
                accessibilityLabel={t("settings.keepAwake")}
                accessibilityRole="switch"
                accessibilityState={{ checked: keepScreenAwake }}
                onValueChange={(value) => void setKeepScreenAwake(value)}
                thumbColor={
                  Platform.OS === "android"
                    ? keepScreenAwake
                      ? colors.primary
                      : colors.textMuted
                    : undefined
                }
                trackColor={{
                  false: colors.border,
                  true:
                    Platform.OS === "android" ? colors.chip : colors.primary,
                }}
                value={keepScreenAwake}
              />
            </View>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <View style={styles.rowSectionInner}>
              <View style={styles.rowText}>
                <AppText variant="label">
                  {t("settings.showDefaultCategories")}
                </AppText>
                <AppText muted variant="caption">
                  {t("settings.showDefaultCategoriesDescription")}
                </AppText>
              </View>
              <Switch
                accessibilityLabel={t("settings.showDefaultCategories")}
                accessibilityRole="switch"
                accessibilityState={{
                  checked: showDefaultCategories ?? isLocalMode,
                }}
                onValueChange={(value) => void setShowDefaultCategories(value)}
                thumbColor={
                  Platform.OS === "android"
                    ? (showDefaultCategories ?? isLocalMode)
                      ? colors.primary
                      : colors.textMuted
                    : undefined
                }
                trackColor={{
                  false: colors.border,
                  true:
                    Platform.OS === "android" ? colors.chip : colors.primary,
                }}
                value={showDefaultCategories ?? isLocalMode}
              />
            </View>
          </GlassPanel>
        </>
      ) : null}
      {section === "account" ? (
        <>
          <GlassPanel style={styles.section}>
            <AppText
              muted
              variant="caption"
              style={{ marginBottom: spacing.xs }}
            >
              {t("settings.communityPseudonymHint")}
            </AppText>
            <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
              <TextField
                containerStyle={{ flex: 1, marginRight: spacing.sm }}
                label={t("settings.communityPseudonym")}
                value={localPseudonym}
                onChangeText={setLocalPseudonym}
                placeholder={t("settings.communityPseudonymPlaceholder")}
                textContentType="nickname"
                autoComplete="off"
                autoCorrect={false}
                importantForAutofill="noExcludeDescendants"
              />
              <IconButton
                icon={pseudoSavedAnim ? CheckCheck : Check}
                label={t("common.save")}
                tone={pseudoSavedAnim ? "default" : "primary"}
                style={
                  pseudoSavedAnim
                    ? { backgroundColor: colors.success }
                    : undefined
                }
                onPress={() => {
                  void (async () => {
                    Keyboard.dismiss();
                    if (containsProfanity(localPseudonym)) {
                      Alert.alert(
                        t("common.error"),
                        t("settings.profanityError"),
                      );
                      return;
                    }
                    const trimmed = localPseudonym.trim();
                    if (trimmed) {
                      try {
                        const available =
                          await checkPseudonymAvailable(trimmed);
                        if (!available) {
                          Alert.alert(
                            t("common.error"),
                            t("settings.pseudonymTaken"),
                          );
                          return;
                        }
                        if (
                          communityPseudonym &&
                          communityPseudonym !== trimmed
                        ) {
                          await releasePseudonym(communityPseudonym).catch(
                            () => {},
                          );
                        }
                        await reservePseudonym(trimmed);
                      } catch (err) {
                        console.warn(
                          "community",
                          "Pseudonym reservation failed",
                          err,
                        );
                        Alert.alert(
                          t("common.error"),
                          t("settings.pseudonymSaveFailed"),
                        );
                        return;
                      }
                    }
                    await setCommunityPseudonym(trimmed || null);
                    setPseudoSavedAnim(true);
                    setTimeout(() => setPseudoSavedAnim(false), 2000);
                  })();
                }}
              />
            </View>
          </GlassPanel>
          <GlassPanel style={styles.section}>
            <View style={styles.rowSectionInner}>
              <View style={styles.rowText}>
                <AppText variant="label">
                  {isLocalMode ? t("settings.localMode") : t("auth.server")}
                </AppText>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isLocalMode ? colors.border : colors.chip,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isLocalMode
                        ? colors.textMuted
                        : colors.success,
                    },
                  ]}
                />
                <AppText
                  variant="caption"
                  style={[
                    styles.statusText,
                    { color: isLocalMode ? colors.textMuted : colors.primary },
                  ]}
                >
                  {isLocalMode ? t("ui.localStatus") : t("common.online")}
                </AppText>
              </View>
            </View>

            <View style={styles.detailsContainer}>
              {!isLocalMode && credentials?.serverUrl ? (
                <>
                  <View style={styles.detailRow}>
                    <View
                      style={[
                        styles.detailIconWrapper,
                        { backgroundColor: colors.chip },
                      ]}
                    >
                      <Globe color={colors.primary} size={16} />
                    </View>
                    <View style={styles.detailContent}>
                      <AppText muted variant="caption">
                        {t("auth.server")}
                      </AppText>
                      <AppText
                        style={styles.detailValue}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {credentials.serverUrl}
                      </AppText>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.detailDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                </>
              ) : null}

              {!isLocalMode && credentials?.username ? (
                <>
                  <View style={styles.detailRow}>
                    <View
                      style={[
                        styles.detailIconWrapper,
                        { backgroundColor: colors.chip },
                      ]}
                    >
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
                  <View
                    style={[
                      styles.detailDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                </>
              ) : null}

              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.detailIconWrapper,
                    { backgroundColor: colors.chip },
                  ]}
                >
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
                      { count: recipes.length },
                    )}
                  </AppText>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.noticeBanner,
                {
                  backgroundColor: isLocalMode
                    ? "rgba(184, 106, 29, 0.08)"
                    : colors.chip,
                },
              ]}
            >
              {isLocalMode ? (
                <Info color={colors.warning} size={16} />
              ) : (
                <Lock color={colors.primary} size={16} />
              )}
              <AppText muted variant="caption" style={styles.noticeText}>
                {isLocalMode
                  ? t("settings.localNotice")
                  : t("settings.secureStore")}
              </AppText>
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
          </GlassPanel>
          <View style={{ marginTop: 16, marginBottom: 32, gap: 8 }}>
            <PrimaryButton
              icon={isLocalMode ? Globe : Smartphone}
              label={
                isLocalMode
                  ? t("settings.switchToNextcloud")
                  : t("settings.switchToLocal")
              }
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
        </>
      ) : null}
      {section === "shopping" ? (
        <>
          <GlassPanel style={styles.section}>
            <View style={styles.rowSectionInner}>
              <View style={styles.rowText}>
                <AppText variant="label">
                  {t("settings.shoppingNotifications")}
                </AppText>
                <AppText muted variant="caption">
                  {t("settings.shoppingNotificationsHint")}
                </AppText>
              </View>
              <Switch
                accessibilityLabel={t("settings.shoppingNotifications")}
                accessibilityRole="switch"
                accessibilityState={{ checked: enableShoppingNotifications }}
                onValueChange={(value) =>
                  void setEnableShoppingNotifications(value)
                }
                thumbColor={
                  Platform.OS === "android"
                    ? enableShoppingNotifications
                      ? colors.primary
                      : colors.textMuted
                    : undefined
                }
                trackColor={{
                  false: colors.border,
                  true:
                    Platform.OS === "android" ? colors.chip : colors.primary,
                }}
                value={enableShoppingNotifications}
              />
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
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

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <ShoppingModeButton onPress={() => setShowShoppingModes(true)} />
          </GlassPanel>
        </>
      ) : null}
      {section === "backup" ? (
        <>
          <GlassPanel style={styles.section}>
            <View style={styles.rowSectionInner}>
              <View style={styles.rowText}>
                <AppText variant="label">
                  {t("settings.enableBackupReminders")}
                </AppText>
              </View>
              <Switch
                accessibilityLabel={t("settings.enableBackupReminders")}
                accessibilityRole="switch"
                accessibilityState={{ checked: enableBackupReminders }}
                onValueChange={(value) => void setEnableBackupReminders(value)}
                thumbColor={
                  Platform.OS === "android"
                    ? enableBackupReminders
                      ? colors.primary
                      : colors.textMuted
                    : undefined
                }
                trackColor={{
                  false: colors.border,
                  true:
                    Platform.OS === "android" ? colors.chip : colors.primary,
                }}
                value={enableBackupReminders}
              />
            </View>

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
                  : "settings.dataBackupNextcloudBody",
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
                numberOfLines={2}
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
                numberOfLines={2}
              />
            </View>
            {Platform.OS === "ios" ? (
              <DisclosureSection title={t("ui.details")}>
                <AppText muted variant="caption">
                  {t("settings.reinstallNotice")}
                </AppText>
              </DisclosureSection>
            ) : null}
          </GlassPanel>
        </>
      ) : null}
      {section === "assistant" ? (
        <>
          <GlassPanel style={styles.section}>
            <View style={{ marginTop: 16, gap: spacing.md }}>
              <AppText muted>{t("ui.assistantBody")}</AppText>

              <ChoiceField
                label={t("settings.llmProvider")}
                value={currentLlm.providerId}
                onChange={handleSelectProvider}
                options={LLM_PROVIDERS.map((preset) => ({
                  value: preset.id,
                  label:
                    preset.id === "custom"
                      ? t("settings.llmCustomProvider")
                      : preset.label,
                }))}
              />

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
                    accessibilityLabel={
                      showApiKey
                        ? t("auth.hidePassword")
                        : t("auth.showPassword")
                    }
                    onPress={() => setShowApiKey((v) => !v)}
                    hitSlop={8}
                  >
                    {showApiKey ? (
                      <EyeOff color={colors.textMuted} size={20} />
                    ) : (
                      <Eye color={colors.textMuted} size={20} />
                    )}
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
                <AppText
                  variant="caption"
                  style={{ color: colors.danger, marginTop: 8 }}
                >
                  {fetchModelsError}
                </AppText>
              ) : null}

              {availableModels?.length ? (
                <ChoiceField
                  label={t("settings.llmPickModel")}
                  value={currentLlm.model}
                  onChange={handlePickModel}
                  options={availableModels.map((id) => ({
                    value: id,
                    label: id,
                  }))}
                />
              ) : null}

              <DisclosureSection title={t("ui.details")}>
                <AppText muted variant="caption">
                  {t("settings.llmHint")}
                </AppText>
              </DisclosureSection>

              {llmMessage ? (
                <View
                  style={[
                    styles.warningRow,
                    {
                      marginBottom: spacing.md,
                      backgroundColor: colors.success + "1A",
                      padding: spacing.sm,
                      borderRadius: radius.md,
                      alignItems: "center",
                    },
                  ]}
                >
                  <Check color={colors.success} size={20} />
                  <AppText
                    accessibilityLiveRegion="polite"
                    style={[
                      styles.warningText,
                      { color: colors.success, fontWeight: "500" },
                    ]}
                  >
                    {llmMessage}
                  </AppText>
                </View>
              ) : null}
              <PrimaryButton
                icon={Save}
                label={t("common.save")}
                onPress={handleSaveLlmSettings}
                disabled={
                  !llmDraft &&
                  llmSettings.apiKey === currentLlm.apiKey &&
                  llmSettings.model === currentLlm.model &&
                  llmSettings.baseUrl === currentLlm.baseUrl &&
                  llmSettings.providerId === currentLlm.providerId
                }
              />
            </View>
          </GlassPanel>
        </>
      ) : null}
      {section === "maintenance" ? (
        <>
          <GlassPanel style={styles.section}>
            <View style={styles.rowSectionInner}>
              <View style={styles.rowText}>
                <AppText variant="label">
                  {t("settings.keepRecipesLocal")}
                </AppText>
              </View>
              <Switch
                accessibilityLabel={t("settings.keepRecipesLocal")}
                accessibilityRole="switch"
                accessibilityState={{
                  checked: keepRecipesLocal || isLocalMode,
                  disabled: isLocalMode,
                }}
                disabled={isLocalMode}
                onValueChange={(value) => void setKeepRecipesLocal(value)}
                thumbColor={
                  Platform.OS === "android"
                    ? keepRecipesLocal || isLocalMode
                      ? colors.primary
                      : colors.textMuted
                    : undefined
                }
                trackColor={{
                  false: colors.border,
                  true:
                    Platform.OS === "android" ? colors.chip : colors.primary,
                }}
                value={keepRecipesLocal || isLocalMode}
              />
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <View style={{ marginBottom: 12 }}>
              <AppText variant="label">{t("settings.duplicates")}</AppText>
            </View>
            <AppText muted variant="caption" style={{ marginBottom: 12 }}>
              {t(
                isLocalMode
                  ? "settings.duplicatesLocalBody"
                  : "settings.duplicatesNextcloudBody",
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
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
                <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                  <TextField
                    containerStyle={{ flex: 1, marginRight: spacing.sm }}
                    label={t("settings.imageFolderPath")}
                    value={localImageFolder}
                    onChangeText={setLocalImageFolder}
                    placeholder={t("settings.imageFolderPathPlaceholder")}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    importantForAutofill="noExcludeDescendants"
                  />
                  <IconButton
                    icon={imageFolderSavedAnim ? CheckCheck : Check}
                    label={t("common.save")}
                    tone={imageFolderSavedAnim ? "default" : "primary"}
                    style={
                      imageFolderSavedAnim
                        ? { backgroundColor: colors.success }
                        : undefined
                    }
                    onPress={() => {
                      Keyboard.dismiss();
                      void setNextcloudImageFolder(localImageFolder.trim());
                      setImageFolderSavedAnim(true);
                      setTimeout(() => setImageFolderSavedAnim(false), 2000);
                    }}
                  />
                </View>
                <AppText
                  muted
                  variant="caption"
                  style={{ marginTop: 4, marginBottom: 4 }}
                >
                  {t("settings.imageFolderPathHint")}
                </AppText>
                {nextcloudImageFolder.trim() !== "" &&
                nextcloudImageFolder.trim() !== "AvoCook Images" ? (
                  <View
                    style={[
                      styles.warningRow,
                      { marginTop: 4, marginBottom: 4 },
                    ]}
                  >
                    <AlertTriangle color={colors.warning} size={14} />
                    <AppText
                      muted
                      variant="caption"
                      style={[styles.warningText, { color: colors.warning }]}
                    >
                      {t("settings.imageFolderPathMigrationWarning")}
                    </AppText>
                  </View>
                ) : null}
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
                <PrimaryButton
                  icon={RefreshCw}
                  label={t("settings.reindex")}
                  onPress={() => void handleReindex()}
                  variant="ghost"
                />
              </>
            ) : null}
          </GlassPanel>
        </>
      ) : null}
      {section === "advanced" ? (
        <GlassPanel style={styles.menuGroup}>
          <SettingsRow
            icon={Bot}
            title={t("ui.assistant")}
            onPress={() => openSection("assistant")}
          />
          <SettingsRow
            icon={Database}
            title={t("ui.maintenance")}
            onPress={() => openSection("maintenance")}
          />
        </GlassPanel>
      ) : null}
      {section === "about" ? (
        <>
          <GlassPanel style={styles.menuGroup}>
            <SettingsRow
              icon={Star}
              title={t("update.settingsButton")}
              onPress={() => navigation.navigate("Update")}
            />
            <SettingsRow
              icon={BookOpen}
              title={t("settings.replayTour")}
              onPress={() => {
                void resetOnboarding().then(() => navigation.navigate("Tour"));
              }}
            />
            <SettingsRow
              icon={Info}
              title={t("settings.openPrivacy")}
              onPress={() => navigation.navigate("Privacy")}
            />
          </GlassPanel>
          <GlassPanel style={styles.menuGroup}>
            <SettingsRow
              icon={Bug}
              title={t("support.github")}
              onPress={openGithubIssue}
            />
            <SettingsRow
              icon={Globe}
              title={t("support.website")}
              onPress={() => {
                void Linking.openURL("https://logarex.github.io/AvoCook/");
              }}
            />
            <SettingsRow
              icon={Mail}
              title={t("support.email")}
              onPress={contactByEmail}
            />
          </GlassPanel>
          <AppText muted variant="caption" style={{ textAlign: "center" }}>
            AvoCook {APP_VERSION}
          </AppText>
        </>
      ) : null}
      <ShoppingModeModal
        visible={showShoppingModes}
        onClose={() => setShowShoppingModes(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  menuGroup: { padding: 0, borderWidth: 0 },
  backupActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  backupButton: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 140,
  },
  rowText: {
    flex: 1,
  },
  section: {
    gap: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,

    marginVertical: spacing.xxs,
  },
  rowSectionInner: {
    alignItems: "center",
    flexWrap: "wrap",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  warningRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
  },
  warningText: {
    flex: 1,
  },
  statusBadge: {
    alignItems: "center",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  statusText: {
    fontWeight: "600",
  },
  detailsContainer: {
    gap: spacing.sm,
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  detailIconWrapper: {
    alignItems: "center",
    borderRadius: radius.sm,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  detailContent: {
    flex: 1,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 1,
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
  },
  noticeBanner: {
    alignItems: "flex-start",
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  noticeText: {
    flex: 1,
    lineHeight: 18,
  },
});

function isPickerCancel(error: unknown) {
  return (
    error instanceof Error && /cancel|aborted|dismiss/i.test(error.message)
  );
}
