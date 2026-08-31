import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View, Share as RNShare } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Users, Share2, LogOut, Check, Sparkles, Bell, BellOff } from "lucide-react-native";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import { getScreenBottomPadding } from "../utils/safeArea";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

export function ShoppingListShareModal({
  visible,
  onClose
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { sharedList, sync, items } = useShoppingList();

  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await sharedList.createList();
    } catch {
      setErrorMsg(t("shoppingList.sharedCreateError"));
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inputCode.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const success = await sharedList.joinList(inputCode);
      if (!success) {
        setErrorMsg(t("shoppingList.sharedNotFoundError"));
      } else {
        setInputCode("");
      }
    } catch {
      setErrorMsg(t("shoppingList.sharedJoinError"));
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    setLoading(true);
    await sharedList.leaveList();
    setLoading(false);
  };

  const handleShareCode = async () => {
    if (!sharedList.code) return;
    try {
      await RNShare.share({
        message: t("shoppingList.sharedShareMessage", { code: sharedList.code })
      });
    } catch {
      // Ignored
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          onPress={onClose}
          style={styles.modalScrim}
        />
        <GlassPanel
          style={[
            styles.panel,
            { paddingBottom: getScreenBottomPadding(insets.bottom) }
          ]}
        >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Users color={colors.primary} size={22} strokeWidth={2.5} />
              <AppText variant="subtitle" numberOfLines={1}>
                {t("shoppingList.sharedTitle")}
              </AppText>
            </View>
            <IconButton icon={X} label={t("common.close")} onPress={onClose} />
          </View>

          {sharedList.active ? (
            <View style={styles.activeWrap}>
              <View style={styles.activeBadge}>
                <Check color={colors.primary} size={20} strokeWidth={3} />
                <AppText variant="label">{t("shoppingList.sharedActiveLabel")}</AppText>
              </View>

              <View style={[styles.codeBox, { backgroundColor: colors.chip }]}>
                <AppText variant="caption" muted>
                  {t("shoppingList.sharedCodeHelp")}
                </AppText>
                <AppText style={styles.codeText} adjustsFontSizeToFit numberOfLines={1}>
                  {sharedList.code}
                </AppText>
                {sharedList.participantCount ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.xs }}>
                    <Users color={colors.primary} size={15} strokeWidth={2.5} />
                    <AppText variant="caption" style={{ color: colors.primary, fontWeight: "600" }}>
                      {t("shoppingList.participantCount", { count: sharedList.participantCount })}
                    </AppText>
                  </View>
                ) : null}
              </View>

              <View style={styles.btnRow}>
                <PrimaryButton
                  icon={Share2}
                  label={t("common.share")}
                  onPress={() => void handleShareCode()}
                  style={styles.btnFlex}
                />
                <PrimaryButton
                  icon={LogOut}
                  label={t("shoppingList.sharedLeave")}
                  onPress={() => void handleLeave()}
                  variant="danger"
                  style={styles.btnFlex}
                />
              </View>
            </View>
          ) : (
            <View style={styles.inactiveWrap}>
              <AppText muted variant="body" style={styles.helpText}>
                {t("shoppingList.sharedDescription")}
              </AppText>

              {errorMsg ? (
                <AppText style={[styles.errorText, { color: colors.danger }]}>
                  {errorMsg}
                </AppText>
              ) : null}

              <View style={styles.joinBox}>
                <TextField
                  label=""
                  autoCapitalize="characters"
                  maxLength={6}
                  placeholder="EX: AVOC42"
                  value={inputCode}
                  onChangeText={(text) => {
                    setInputCode(text.toUpperCase());
                    setErrorMsg(null);
                  }}
                  containerStyle={styles.inputFlex}
                />
                <PrimaryButton
                  label={t("shoppingList.sharedJoinBtn")}
                  onPress={() => void handleJoin()}
                  disabled={loading || !inputCode.trim()}
                />
              </View>

              <View style={styles.divider}>
                <View style={[styles.line, { backgroundColor: colors.border }]} />
                <AppText muted variant="caption">{t("common.or") || "OU"}</AppText>
                <View style={[styles.line, { backgroundColor: colors.border }]} />
              </View>

              <PrimaryButton
                icon={Sparkles}
                label={t("shoppingList.sharedCreateBtn")}
                disabled={loading}
                onPress={() => void handleCreate()}
                variant="secondary"
              />
            </View>
          )}

          {sync.available ? (
            <>
              <View style={[styles.divider, { marginVertical: spacing.md }]}>
                <View style={[styles.line, { backgroundColor: colors.border }]} />
              </View>
              
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Bell color={colors.primary} size={22} strokeWidth={2.5} />
                  <AppText variant="subtitle" numberOfLines={1}>
                    {t("shoppingList.syncBannerTitle")}
                  </AppText>
                </View>
              </View>
              
              <View style={{ marginTop: spacing.md }}>
                <AppText muted variant="caption" style={{ marginBottom: spacing.sm, lineHeight: 18 }}>
                  {t("shoppingList.syncBannerBody")}
                </AppText>
                <PrimaryButton
                  icon={sync.linked ? BellOff : Bell}
                  label={sync.linked ? t("shoppingList.syncDisable") : t("shoppingList.syncEnable")}
                  onPress={() => sync.linked ? void sync.disableSync() : void sync.enableSync(items)}
                  variant={sync.linked ? "danger" : "secondary"}
                  disabled={sync.syncing}
                />
              </View>
            </>
          ) : null}
        </GlassPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)"
  },
  panel: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: "90%"
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  activeWrap: {
    gap: spacing.md
  },
  activeBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  codeBox: {
    alignItems: "center",
    borderRadius: radius.lg,
    gap: spacing.xs,
    padding: spacing.md
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 4,
    lineHeight: 40
  },
  btnRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  btnFlex: {
    flex: 1
  },
  inactiveWrap: {
    gap: spacing.md
  },
  helpText: {
    lineHeight: 20
  },
  joinBox: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center"
  },
  inputFlex: {
    flex: 1
  },
  divider: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginVertical: spacing.xs
  },
  line: {
    flex: 1,
    height: 1
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600"
  }
});
