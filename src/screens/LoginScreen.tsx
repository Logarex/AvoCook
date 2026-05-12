import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LockKeyhole, Server } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { useAuth } from "../features/auth/AuthProvider";
import type { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen(_props: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { login } = useAuth();
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
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
          : t("auth.failed");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.hero}>
        <View style={[styles.iconHalo, { backgroundColor: colors.chip }]}>
          <Server color={colors.primary} size={38} strokeWidth={2.3} />
        </View>
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
          secureTextEntry
          textContentType="password"
          value={appPassword}
        />
        {error ? (
          <AppText style={{ color: colors.danger }}>{error}</AppText>
        ) : null}
        <PrimaryButton
          disabled={!serverUrl || !username || !appPassword || submitting}
          icon={submitting ? undefined : LockKeyhole}
          label={submitting ? t("common.loading") : t("auth.login")}
          onPress={handleLogin}
        />
        {submitting ? <ActivityIndicator color={colors.primary} /> : null}
      </GlassPanel>

      <AppText muted variant="caption" style={styles.center}>
        {t("auth.secure")}
      </AppText>
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
  iconHalo: {
    alignItems: "center",
    borderRadius: 34,
    height: 72,
    justifyContent: "center",
    width: 72
  },
  center: {
    textAlign: "center"
  },
  form: {
    gap: spacing.md
  }
});
