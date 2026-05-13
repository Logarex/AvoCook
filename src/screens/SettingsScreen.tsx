import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  Folder,
  Info,
  LogOut,
  RefreshCw,
  ShieldCheck
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SegmentedControl } from "../components/SegmentedControl";
import { TextField } from "../components/TextField";
import { useAuth } from "../features/auth/AuthProvider";
import { usePreferences } from "../features/preferences/PreferencesProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import type { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme/colors";
import { type ThemeMode, useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors, mode, setMode } = useAppTheme();
  const { credentials, getClient, isLocalMode, logout } = useAuth();
  const { sync } = useRecipes();
  const {
    keepRecipesLocal,
    keepScreenAwake,
    language,
    setKeepRecipesLocal,
    setKeepScreenAwake,
    setLanguage
  } = usePreferences();
  const [message, setMessage] = useState<string | null>(null);
  const [cookbookFolder, setCookbookFolder] = useState("/Recipes");

  useEffect(() => {
    const client = getClient();
    if (!client) {
      return;
    }
    void client.getConfig().then((config) => {
      if (config.folder) {
        setCookbookFolder(config.folder);
      }
    });
  }, [getClient]);

  async function handleReindex() {
    const client = getClient();
    if (!client) {
      return;
    }

    await client.reindex();
    await sync();
    setMessage(t("settings.reindexDone"));
  }

  async function handleLogout() {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  }

  async function handleSaveFolder() {
    const client = getClient();
    if (!client) {
      return;
    }

    const currentConfig = await client.getConfig();
    await client.setConfig({
      ...currentConfig,
      folder: normalizeFolder(cookbookFolder)
    });
    setCookbookFolder(normalizeFolder(cookbookFolder));
    setMessage(t("settings.folderSaved"));
  }

  return (
    <Screen>
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
        <SegmentedControl<"fr" | "en">
          value={language}
          onChange={(value) => void setLanguage(value)}
          options={[
            { label: t("settings.french"), value: "fr" },
            { label: t("settings.english"), value: "en" }
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
          {t("settings.secureStore")}
        </AppText>
      </GlassPanel>

      {credentials ? (
        <GlassPanel style={styles.section}>
          <View style={styles.serverHeader}>
            <Folder color={colors.primary} size={22} />
            <AppText variant="label">{t("settings.cookbookFolder")}</AppText>
          </View>
          <TextField
            label={t("settings.cookbookFolder")}
            onChangeText={setCookbookFolder}
            value={cookbookFolder}
          />
          <PrimaryButton
            icon={Folder}
            label={t("settings.saveFolder")}
            onPress={() => void handleSaveFolder()}
            variant="ghost"
          />
        </GlassPanel>
      ) : null}

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

function normalizeFolder(folder: string) {
  const trimmed = folder.trim() || "/Recipes";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm
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
  }
});
