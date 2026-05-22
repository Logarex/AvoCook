import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  FileText,
  RefreshCw,
  Share2,
  ShieldCheck,
  Trash2
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Switch, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import {
  clearLogEntries,
  formatLogEntry,
  loadLogEntries,
  subscribeToLogEntries,
  getLogMode,
  setLogMode,
  type AppLogEntry
} from "../features/logging/appLogger";
import { shareDiagnosticsReport } from "../features/logging/diagnosticsReport";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "DiagnosticsLogs">;

const VISIBLE_LOG_LIMIT = 50;

export function DiagnosticsLogsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [entries, setEntries] = useState<AppLogEntry[]>([]);
  const [anonymize, setAnonymize] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [detailed, setDetailed] = useState(false);

  useEffect(() => subscribeToLogEntries(setEntries), []);

  useEffect(() => {
    void getLogMode().then((mode) => setDetailed(mode === "all"));
  }, []);

  const visibleEntries = useMemo(
    () => entries.slice(-VISIBLE_LOG_LIMIT).reverse(),
    [entries]
  );

  async function refreshLogs() {
    setEntries(await loadLogEntries());
  }

  async function handleToggleDetailed(value: boolean) {
    const nextMode = value ? "all" : "errors";
    setDetailed(value);
    await setLogMode(nextMode);
    setEntries(await loadLogEntries());
  }

  function confirmClearLogs() {
    Alert.alert(t("logs.clearConfirmTitle"), t("logs.clearConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("logs.clear"),
        style: "destructive",
        onPress: () => {
          void clearLogEntries();
        }
      }
    ]);
  }

  async function shareLogs() {
    setSharing(true);
    try {
      await shareDiagnosticsReport({ anonymize });
    } catch {
      Alert.alert(t("logs.exportFailedTitle"), t("logs.exportFailed"));
    } finally {
      setSharing(false);
    }
  }

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <View style={styles.toolbar}>
        <IconButton
          icon={ArrowLeft}
          label={t("common.back")}
          onPress={() => navigation.goBack()}
        />
        <AppText variant="subtitle">{t("logs.title")}</AppText>
        <IconButton
          icon={RefreshCw}
          label={t("logs.refresh")}
          onPress={() => void refreshLogs()}
        />
      </View>

      <GlassPanel style={styles.section}>
        <View style={styles.headerLine}>
          <View style={styles.headerTitle}>
            <FileText color={colors.primary} size={20} />
            <AppText variant="label">
              {t("logs.count", { count: entries.length })}
            </AppText>
          </View>
          <PrimaryButton
            disabled={sharing || entries.length === 0}
            icon={Share2}
            label={sharing ? t("common.loading") : t("logs.share")}
            onPress={() => void shareLogs()}
            variant="ghost"
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <AppText variant="label">{t("logs.detailed")}</AppText>
            <AppText muted variant="caption">
              {detailed ? t("logs.detailedNotice") : t("logs.errorsOnlyNotice")}
            </AppText>
          </View>
          <Switch
            accessibilityLabel={t("logs.detailed")}
            accessibilityRole="switch"
            accessibilityState={{ checked: detailed }}
            onValueChange={(val) => void handleToggleDetailed(val)}
            thumbColor={detailed ? colors.primary : colors.textMuted}
            trackColor={{ false: colors.border, true: colors.chip }}
            value={detailed}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <AppText variant="label">{t("logs.anonymize")}</AppText>
            <AppText muted variant="caption">
              {anonymize ? t("logs.anonymizedNotice") : t("logs.rawNotice")}
            </AppText>
          </View>
          <Switch
            accessibilityLabel={t("logs.anonymize")}
            accessibilityRole="switch"
            accessibilityState={{ checked: anonymize }}
            onValueChange={setAnonymize}
            thumbColor={anonymize ? colors.primary : colors.textMuted}
            trackColor={{ false: colors.border, true: colors.chip }}
            value={anonymize}
          />
        </View>

        <View style={styles.actionRow}>
          <PrimaryButton
            disabled={entries.length === 0}
            icon={ShieldCheck}
            label={t("logs.shareAnonymized")}
            onPress={() => {
              setAnonymize(true);
              void shareDiagnosticsReport({ anonymize: true }).catch(() =>
                Alert.alert(t("logs.exportFailedTitle"), t("logs.exportFailed"))
              );
            }}
            style={styles.actionButton}
            variant="primary"
          />
          <PrimaryButton
            disabled={entries.length === 0}
            icon={Trash2}
            label={t("logs.clear")}
            onPress={confirmClearLogs}
            style={styles.actionButton}
            variant="danger"
          />
        </View>
      </GlassPanel>

      <FlatList
        data={visibleEntries}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <GlassPanel style={styles.emptyState}>
            <AppText variant="subtitle">{t("logs.emptyTitle")}</AppText>
            <AppText muted>{t("logs.emptyBody")}</AppText>
          </GlassPanel>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.logEntry,
              {
                backgroundColor: colors.surfaceGlassStrong,
                borderColor: getLogBorderColor(item, colors)
              }
            ]}
          >
            <AppText
              selectable
              variant="caption"
              style={[styles.logText, { color: colors.text }]}
            >
              {formatLogEntry(item, { anonymize })}
            </AppText>
          </View>
        )}
        contentContainerStyle={styles.logList}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

function getLogBorderColor(
  entry: AppLogEntry,
  colors: ReturnType<typeof useAppTheme>["colors"]
) {
  if (entry.level === "error") {
    return colors.danger;
  }
  if (entry.level === "warn") {
    return colors.warning;
  }
  return colors.border;
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
    minWidth: 150
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  emptyState: {
    gap: spacing.xs
  },
  headerLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  headerTitle: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  logEntry: {
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm
  },
  logList: {
    gap: spacing.sm,
    paddingBottom: spacing.lg
  },
  logText: {
    fontFamily: "Menlo"
  },
  screen: {
    flex: 1
  },
  section: {
    gap: spacing.md
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  switchText: {
    flex: 1,
    gap: spacing.xxs
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  }
});
