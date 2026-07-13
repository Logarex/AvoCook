import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertTriangle,
  Bug,
  ChevronLeft,
  ChefHat,
  Eye,
  EyeOff,
  FileText,
  Heart,
  HelpCircle,
  LockKeyhole,
  Mail
} from "lucide-react-native";
import { Image } from "expo-image";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { LanguagePicker } from "../components/LanguagePicker";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { useAuth } from "../features/auth/AuthProvider";
import { usePreferences } from "../features/preferences/PreferencesProvider";
import { useSupportActions } from "../features/support/useSupportActions";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { login, startLocalMode } = useAuth();
  const { language, setLanguage } = usePreferences();
  const { openGithubIssue, contactByEmail } = useSupportActions();
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordTutorial, setShowPasswordTutorial] = useState(false);
  const [showNextcloud, setShowNextcloud] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setSubmitting(true);
    setError(null);
    try {
      await login({ serverUrl, username, appPassword });
    } catch (caught) {
      const statusMatch = caught instanceof Error ? caught.message.match(/\b(\d{3})\b/) : null;
      const httpStatus = statusMatch ? statusMatch[1] : null;
      const message =
        caught instanceof Error && caught.message === "INSECURE_URL"
          ? t("auth.insecureUrl")
          : isLikelyTlsError(caught)
            ? t("auth.certificateError")
          : caught instanceof Error && /401|403|997|credentials/i.test(caught.message)
            ? t("auth.badCredentials")
          : caught instanceof Error && /404/.test(caught.message)
            ? t("auth.notFound")
          : caught instanceof Error && /50\d/.test(caught.message)
            ? t("auth.serverError")
            : httpStatus
              ? `${t("auth.failed")} (HTTP ${httpStatus})`
              : t("auth.failed");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen contentStyle={styles.screen} showScrollTop={false}>
      <View style={styles.topArea}>
        <LanguagePicker
          variant="minimal"
          value={language}
          onChange={(value) => void setLanguage(value)}
        />
      </View>

      <View style={styles.spacer} />

      {!showNextcloud ? (
        <View style={styles.hero}>
          <Image
            accessible={false}
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
          <View style={styles.heroBadge}>
            <Heart color={colors.primary} size={14} />
            <AppText variant="caption" style={{ color: colors.primary }}>
              {t("auth.values")}
            </AppText>
          </View>
        </View>
      ) : (
        <View style={styles.nextcloudHeader}>
          <Pressable
            accessibilityLabel={t("common.back")}
            accessibilityRole="button"
            onPress={() => setShowNextcloud(false)}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <ChevronLeft color={colors.text} size={24} />
          </Pressable>
          <AppText variant="subtitle" style={styles.nextcloudTitle} numberOfLines={1}>
            {t("auth.nextcloudLoginTitle" as any)}
          </AppText>
        </View>
      )}

      <View style={{ height: 40 }} />

      <View style={styles.formContainer}>
        {!showNextcloud ? (
          <GlassPanel style={styles.form}>
            <PrimaryButton
              disabled={submitting}
              icon={ChefHat}
              label={t("auth.useLocal")}
              onPress={() => void startLocalMode()}
            />
            <Pressable
              disabled={submitting}
              style={styles.textLink}
              onPress={() => setShowNextcloud(true)}
            >
              <AppText variant="label" style={{ color: colors.primary, textAlign: "center" }}>
                {t("auth.nextcloudOption")}
              </AppText>
            </Pressable>
            {submitting ? <ActivityIndicator color={colors.primary} /> : null}
          </GlassPanel>
        ) : (
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
            <View style={styles.secureBadge}>
              <LockKeyhole color={colors.textMuted} size={14} />
              <AppText muted variant="caption" style={{ flex: 1 }}>
                {t("auth.secure")}
              </AppText>
            </View>
            <Pressable
              style={styles.helpLink}
              onPress={() => setShowPasswordTutorial((visible) => !visible)}
            >
              <HelpCircle color={colors.textMuted} size={16} />
              <AppText muted variant="caption">
                {t("auth.appPasswordHelp")}
              </AppText>
            </Pressable>
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
                      {t(`auth.tutorial.steps.${step}` as any)}
                    </AppText>
                  </View>
                ))}
                <AppText muted variant="caption">
                  {t("auth.tutorial.versionNote")}
                </AppText>
              </View>
            ) : null}
            {error ? (
              <AppText
                accessibilityRole="alert"
                style={{ color: colors.danger }}
              >
                {error}
              </AppText>
            ) : null}
            <PrimaryButton
              disabled={!serverUrl || !username || !appPassword || submitting}
              icon={submitting ? undefined : LockKeyhole}
              label={submitting ? t("common.loading") : t("auth.login")}
              onPress={() => void handleLogin()}
            />
            <Pressable
              disabled={submitting}
              style={styles.textLink}
              onPress={() => setShowNextcloud(false)}
            >
              <AppText variant="label" style={{ color: colors.primary, textAlign: "center" }}>
                {t("auth.backToLocal")}
              </AppText>
            </Pressable>
            <PrimaryButton
              icon={FileText}
              label={t("support.openLogs", "Diagnostics & Support")}
              onPress={() => navigation.navigate("DiagnosticsLogs")}
              variant="ghost"
            />
            {submitting ? <ActivityIndicator color={colors.primary} /> : null}
          </GlassPanel>
        )}
      </View>

      <View style={styles.supportContainer}>
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

      <View style={styles.spacer} />

      <View style={styles.bottomArea}>
        {!showNextcloud ? (
          <View style={styles.localWarning}>
            <AlertTriangle color={colors.warning} size={16} style={styles.warningIcon} />
            <AppText muted variant="caption" style={styles.localWarningText}>
              {t("auth.localDataWarning")}
            </AppText>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function isLikelyTlsError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /certificate|cert|ssl|tls|network request failed|trust anchor|timeout|aborted/i.test(
    message
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    minHeight: "100%"
  },
  topArea: {
    alignItems: "flex-end"
  },
  spacer: {
    flex: 1
  },
  hero: {
    alignItems: "center",
    gap: spacing.sm
  },
  heroBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  logo: {
    height: 86,
    width: 86
  },
  center: {
    textAlign: "center"
  },
  nextcloudHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs
  },
  nextcloudTitle: {
    fontSize: 22,
    flex: 1
  },
  formContainer: {
    width: "100%"
  },
  form: {
    gap: spacing.md,
    paddingBottom: 20
  },
  supportContainer: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  secureBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: -spacing.xs,
    paddingHorizontal: spacing.xs
  },
  textLink: {
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  passwordButton: {
    height: 36,
    width: 36
  },
  helpLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    paddingVertical: spacing.xs,
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
  bottomArea: {
    minHeight: 48,
    justifyContent: "center"
  },
  localWarning: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  warningIcon: {
    marginTop: 2
  },
  localWarningText: {
    flex: 1,
    lineHeight: 18
  }
});
