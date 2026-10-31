import React, { useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet, View, Share as RNShare } from "react-native";
import { useTranslation } from "react-i18next";
import { Users, Share2, LogOut, Check, Sparkles } from "lucide-react-native";
import { AppText } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

export function ShoppingListShareContent({ onBusyChange }: { onBusyChange: (busy: boolean) => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { sharedList } = useShoppingList();

  const [inputCode, setInputCode] = useState("");
  const canJoin = inputCode.length === 6;
  const pending = useRef(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  useEffect(() => { onBusyChange(loading); return () => onBusyChange(false); }, [loading, onBusyChange]);

  const handleCreate = async () => {
    if (pending.current || sharedList.syncing) return;
    pending.current = true; setLoading(true);
    setErrorMsg(null);
    try {
      await sharedList.createList();
    } catch {
      setErrorMsg(t("shoppingList.sharedCreateError"));
    } finally {
      pending.current = false; setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (pending.current || sharedList.syncing || !canJoin) return;
    pending.current = true; setLoading(true);
    Keyboard.dismiss();
    setErrorMsg(null);
    try {
      const success = await sharedList.joinList(inputCode.trim());
      if (!success) {
        setErrorMsg(t("shoppingList.sharedNotFoundError"));
      } else {
        setInputCode("");
      }
    } catch {
      setErrorMsg(t("shoppingList.sharedJoinError"));
    } finally {
      pending.current = false; setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (pending.current || sharedList.syncing) return;
    pending.current = true; setLoading(true);
    try { await sharedList.leaveList(); } catch { setErrorMsg(t("shoppingModes.error")); }
    finally { pending.current = false; setLoading(false); }
  };

  const handleShareCode = async () => {
    if (!sharedList.code) return;
    try {
      await RNShare.share({
        message: t("shoppingList.sharedShareMessage", { code: sharedList.code })
      });
    } catch {
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
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
                  disabled={loading || sharedList.syncing}
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
                <AppText accessibilityRole="alert" style={[styles.errorText, { color: colors.danger }]}>
                  {errorMsg}
                </AppText>
              ) : null}

              <View style={styles.joinBox}>
                <TextField
                  label=""
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!loading && !sharedList.syncing}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleJoin()}
                  accessibilityLabel={t("shoppingList.sharedCodeLabel")}
                  placeholder={t("shoppingList.sharedCodePlaceholder")}
                  value={inputCode}
                  onChangeText={(text) => {
                    setInputCode(text.replace(/\s/g, "").toUpperCase().slice(0, 6));
                    setErrorMsg(null);
                  }}
                  containerStyle={styles.inputFlex}
                />
                <PrimaryButton
                  label={t("shoppingList.sharedJoinBtn")}
                  onPress={() => void handleJoin()}
                  disabled={loading || sharedList.syncing || !canJoin}
                  fillAvailableSpace
                />
              </View>

              <View style={styles.divider}>
                <View style={[styles.line, { backgroundColor: colors.border }]} />
                <AppText muted variant="caption">{t("common.or")}</AppText>
                <View style={[styles.line, { backgroundColor: colors.border }]} />
              </View>

              <PrimaryButton
                icon={Sparkles}
                label={t("shoppingList.sharedCreateBtn")}
                disabled={loading || sharedList.syncing}
                onPress={() => void handleCreate()}
                variant="secondary"
              />
            </View>
          )}

          {errorMsg && sharedList.active ? <AppText accessibilityRole="alert" style={{ color: colors.danger }}>{errorMsg}</AppText> : null}

    </View>
  );
}

const styles = StyleSheet.create({
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
    gap: spacing.sm,
    alignItems: "stretch"
  },
  inputFlex: {
    minWidth: 0,
    width: "100%"
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
