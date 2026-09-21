import {
  AlertTriangle,
  Check,
  Copy,
  FileText,
  Share2,
  Trash2,
  X
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "./AppText";
import { GlassPanel } from "./GlassPanel";
import { IconButton } from "./IconButton";
import { PrimaryButton } from "./PrimaryButton";
import { logService, type LogEntry } from "../features/logging/logService";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = {
  visible: boolean;
  onClose: () => void;
  serverUrl?: string;
};

export function DebugLogModal({ visible, onClose, serverUrl }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>(() => logService.getLogs());

  if (!visible) return null;

  const isSelfSigned = logService.isLikelySelfSignedSslError();

  const handleRefresh = () => {
    setLogs(logService.getLogs());
  };

  const handleCopy = async () => {
    await logService.copyLogsToClipboard(serverUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    await logService.shareLogReport(serverUrl);
  };

  const handleClear = () => {
    logService.clearLogs();
    setLogs([]);
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <GlassPanel style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <FileText color={colors.primary} size={22} />
              <AppText variant="subtitle">
                {t("auth.debugLogsTitle", "Logs & Débogage")}
              </AppText>
            </View>
            <IconButton
              icon={X}
              label={t("common.close", "Fermer")}
              onPress={onClose}
              style={styles.closeBtn}
            />
          </View>

          {/* SSL Warning Banner if detected */}
          {isSelfSigned ? (
            <View style={[styles.sslBanner, { backgroundColor: colors.danger + "15", borderColor: colors.danger + "40" }]}>
              <AlertTriangle color={colors.danger} size={20} style={{ marginTop: 2 }} />
              <View style={styles.sslBannerContent}>
                <AppText variant="label" style={{ color: colors.danger }}>
                  {t("auth.sslWarningTitle", "Certificat SSL / TLS Auto-signé Détecté")}
                </AppText>
                <AppText variant="caption" style={{ color: colors.text, marginTop: 2 }}>
                  {t(
                    "auth.selfSignedNotice",
                    "Les certificats auto-signés sont bloqués par Android par défaut au niveau TLS. Aucune requête n'atteint le serveur Nextcloud (d'où des logs serveur vides). Utilisez un certificat valide (ex: Let's Encrypt) ou ajoutez le certificat aux certificats de confiance Android."
                  )}
                </AppText>
              </View>
            </View>
          ) : null}

          {/* Log count summary */}
          <View style={styles.subHeader}>
            <AppText muted variant="caption">
              {t("auth.logCount", "{{count}} entrées enregistrées", { count: logs.length })}
            </AppText>
            {logs.length > 0 ? (
              <Pressable onPress={handleClear} style={styles.clearBtn}>
                <Trash2 color={colors.textMuted} size={14} />
                <AppText muted variant="caption">
                  {t("common.clear", "Effacer")}
                </AppText>
              </Pressable>
            ) : null}
          </View>

          {/* Logs View */}
          <ScrollView
            style={[styles.logsScroll, { backgroundColor: colors.background + "80", borderColor: colors.border }]}
            contentContainerStyle={styles.logsScrollContent}
            nestedScrollEnabled
          >
            {logs.length === 0 ? (
              <AppText muted style={styles.emptyText}>
                {t("auth.noLogsYet", "Aucun log enregistré pour le moment.")}
              </AppText>
            ) : (
              logs.map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <View style={styles.logHeader}>
                    <AppText
                      variant="caption"
                      style={[
                        styles.logBadge,
                        {
                          color:
                            log.level === "ERROR"
                              ? colors.danger
                              : log.level === "WARN"
                              ? "#f59e0b"
                              : log.level === "NETWORK"
                              ? colors.primary
                              : colors.textMuted
                        }
                      ]}
                    >
                      [{log.level}] [{log.tag}]
                    </AppText>
                    <AppText muted variant="caption" style={styles.logTime}>
                      {log.timestamp.slice(11, 19)}
                    </AppText>
                  </View>
                  <AppText style={styles.logMessage}>{log.message}</AppText>
                  {log.details ? (
                    <AppText muted variant="caption" style={styles.logDetails}>
                      {log.details}
                    </AppText>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <PrimaryButton
              icon={copied ? Check : Copy}
              label={copied ? t("auth.copied", "Copié !") : t("common.copy", "Copier")}
              onPress={() => void handleCopy()}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              icon={Share2}
              label={t("common.share", "Partager")}
              onPress={() => void handleShare()}
              variant="ghost"
              style={{ flex: 1 }}
            />
          </View>
        </GlassPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md
  },
  modalCard: {
    width: "100%",
    maxHeight: "85%",
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.sm
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  closeBtn: {
    height: 36,
    width: 36
  },
  sslBanner: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1
  },
  sslBannerContent: {
    flex: 1
  },
  subHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xs
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  logsScroll: {
    maxHeight: 280,
    borderRadius: 12,
    borderWidth: 1
  },
  logsScrollContent: {
    padding: spacing.sm,
    gap: spacing.xs
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: spacing.md
  },
  logItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150,150,150,0.2)",
    paddingBottom: spacing.xs
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  logBadge: {
    fontWeight: "600",
    fontSize: 11
  },
  logTime: {
    fontSize: 10
  },
  logMessage: {
    fontSize: 12,
    marginTop: 2
  },
  logDetails: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" })
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs
  }
});
