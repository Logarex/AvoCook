import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertTriangle,
  ChefHat,
  Eye,
  EyeOff,
  HelpCircle,
  LockKeyhole
} from "lucide-react-native";
import { Image } from "expo-image";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
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
import type { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen(_props: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { login, startLocalMode } = useAuth();
  const { language, setLanguage } = usePreferences();
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordTutorial, setShowPasswordTutorial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setSubmitting(true);
    setError(null);
    try {
      await login({ serverUrl, username, appPassword });
    } catch (caught) {
      const message =
        caught instanceof Error && caught.message === "INSECURE_URL"
          ? t("auth.insecureUrl")
          : caught instanceof Error && /401|997|credentials/i.test(caught.message)
            ? t("auth.badCredentials")
            : t("auth.failed");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen contentStyle={styles.screen} showScrollTop={false}>
      <View style={styles.hero}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <AppText variant="title" style={styles.center}>
          {t("auth.title")}
        </AppText>
        <AppText muted style={styles.center}>
          {t("auth.subtitle")}
        </AppText>
      </View>

      <GlassPanel style={styles.form}>
        <TextField
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          label={t("auth.server")}
          onChangeText={setServerUrl}
          placeholder="https://cloud.example.com"
          textContentType="URL"
          value={serverUrl}
        />
        <TextField
          autoCapitalize="none"
          autoCorrect={false}
          label={t("auth.username")}
          onChangeText={setUsername}
          textContentType="username"
          value={username}
        />
        <TextField
          autoCapitalize="none"
          autoCorrect={false}
          label={t("auth.appPassword")}
          onChangeText={setAppPassword}
          rightElement={
            <IconButton
              icon={showPassword ? EyeOff : Eye}
              label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              onPress={() => setShowPassword((visible) => !visible)}
              style={styles.passwordButton}
            />
          }
          secureTextEntry={!showPassword}
          textContentType="password"
          value={appPassword}
        />
        <PrimaryButton
          icon={HelpCircle}
          label={t("auth.appPasswordHelp")}
          onPress={() => setShowPasswordTutorial((visible) => !visible)}
          variant="ghost"
        />
        {showPasswordTutorial ? (
          <View style={styles.tutorial}>
            <AppText variant="label">{t("auth.tutorial.title")}</AppText>
            {[
              "openNextcloud",
              "openSettings",
              "openSecurity",
              "createPassword",
              "copyPassword"
            ].map((step, index) => (
              <View key={step} style={styles.tutorialStep}>
                <View style={[styles.stepBadge, { backgroundColor: colors.chip }]}>
                  <AppText variant="caption" style={{ color: colors.primary }}>
                    {index + 1}
                  </AppText>
                </View>
                <AppText style={styles.stepText}>
                  {t(`auth.tutorial.steps.${step}`)}
                </AppText>
              </View>
            ))}
            <AppText muted variant="caption">
              {t("auth.tutorial.versionNote")}
            </AppText>
          </View>
        ) : null}
        {error ? (
          <AppText style={{ color: colors.danger }}>{error}</AppText>
        ) : null}
        <PrimaryButton
          disabled={!serverUrl || !username || !appPassword || submitting}
          icon={submitting ? undefined : LockKeyhole}
          label={submitting ? t("common.loading") : t("auth.login")}
          onPress={() => void handleLogin()}
        />
        <PrimaryButton
          disabled={submitting}
          icon={ChefHat}
          label={t("auth.useLocal")}
          onPress={() => void startLocalMode()}
          variant="ghost"
        />
        <View style={styles.localWarning}>
          <AlertTriangle color={colors.danger} size={18} />
          <AppText muted variant="caption" style={styles.localWarningText}>
            {t("auth.localDataWarning")}
          </AppText>
        </View>
        {submitting ? <ActivityIndicator color={colors.primary} /> : null}
      </GlassPanel>

      <AppText muted variant="caption" style={styles.center}>
        {t("auth.secure")}{"\n"}{t("auth.localSubtitle")}
      </AppText>

      <View style={styles.languagePicker}>
        <SegmentedControl<"fr" | "en" | "de">
          value={language}
          onChange={(value) => void setLanguage(value)}
          options={[
            { label: t("settings.french"), value: "fr" },
            { label: t("settings.english"), value: "en" },
            { label: t("settings.german"), value: "de" }
          ]}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center"
  },
  hero: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  logo: {
    height: 86,
    width: 86
  },
  center: {
    textAlign: "center"
  },
  form: {
    gap: spacing.md
  },
  passwordButton: {
    height: 36,
    width: 36
  },
  stepBadge: {
    alignItems: "center",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  stepText: {
    flex: 1
  },
  tutorial: {
    gap: spacing.sm
  },
  tutorialStep: {
    flexDirection: "row",
    gap: spacing.sm
  },
  languagePicker: {
    marginTop: spacing.md
  },
  localWarning: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs
  },
  localWarningText: {
    flex: 1
  }
});
