import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Check, Cloud, Smartphone, Users, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { useAuth } from "../features/auth/AuthProvider";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/colors";
import { getScreenBottomPadding } from "../utils/safeArea";

export function ShoppingModeModal({ visible, onClose, onPantry, onFirebase }: { visible: boolean; onClose: () => void; onPantry: () => void; onFirebase: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { credentials } = useAuth();
  const { mode, switching, switchToLocal } = useShoppingList();
  const [error, setError] = useState(false);
  async function selectLocal() {
    setError(false);
    try { await switchToLocal(); onClose(); } catch { setError(true); }
  }
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!switching) onClose(); }}>
    <View style={styles.root}>
      <Pressable style={styles.scrim} accessibilityRole="button" accessibilityLabel={t("common.close")} disabled={switching} onPress={onClose} />
      <GlassPanel style={[styles.panel, { paddingBottom: getScreenBottomPadding(insets.bottom) }]}>
        <View style={styles.header}>
          <AppText variant="subtitle" style={styles.flex}>{t("shoppingModes.choose")}</AppText>
          <IconButton icon={X} label={t("common.close")} disabled={switching} onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.options}>
          <AppText muted>{t("shoppingModes.body")}</AppText>
          {([{ kind: "local", icon: Smartphone }, { kind: "firebase", icon: Users }, { kind: "pantry", icon: Cloud }] as const).map(({ kind, icon: Icon }) => {
            const selected = mode.kind === kind;
            const disabled = switching || (kind === "pantry" && !credentials);
            return <Pressable key={kind} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} accessibilityLabel={t(`shoppingModes.${kind}`)}
              disabled={disabled} onPress={() => {
                setError(false);
                if (kind === "local") void selectLocal();
                else { onClose(); if (kind === "pantry") onPantry(); else onFirebase(); }
              }} style={[styles.option, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.chip : colors.surfaceGlassStrong, opacity: disabled ? 0.5 : 1 }]}>
              <Icon color={colors.primary} size={24} />
              <View style={styles.flex}>
                <AppText variant="label">{t(`shoppingModes.${kind}`)}</AppText>
                <AppText muted variant="caption">{t(`shoppingModes.${kind}Body`)}</AppText>
                {kind === "pantry" && !credentials ? <AppText muted variant="caption">{t("shoppingModes.nextcloudRequired")}</AppText> : null}
              </View>
              {selected ? <Check color={colors.primary} size={20} /> : null}
            </Pressable>;
          })}
          <AppText muted variant="caption">{t("shoppingModes.transferBody")}</AppText>
          {switching ? <View style={styles.header}><ActivityIndicator color={colors.primary} /><AppText>{t("shoppingModes.switching")}</AppText></View> : null}
          {error ? <AppText accessibilityRole="alert" style={{ color: colors.danger }}>{t("shoppingModes.error")}</AppText> : null}
        </ScrollView>
      </GlassPanel>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.4)" },
  panel: { maxHeight: "90%", borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1 }, options: { gap: spacing.md },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 }
});
