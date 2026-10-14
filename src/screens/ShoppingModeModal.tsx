import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ArrowLeft, Check, Cloud, Smartphone, Users, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { useAuth } from "../features/auth/AuthProvider";
import { pantryAccountKey } from "../features/pantry/pantryStore";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/colors";
import { getScreenBottomPadding } from "../utils/safeArea";
import { PantryListPicker } from "./PantryListPicker";
import { ShoppingRemindersControls } from "./ShoppingRemindersControls";
import { ShoppingListShareContent } from "./ShoppingListShareContent";

type Step = "modes" | "pantry" | "firebase";
type Props = { visible: boolean; onClose: () => void; initialStep?: Step };

export function ShoppingModeModal({ visible, onClose, initialStep = "modes" }: Props) {
  const { credentials } = useAuth();
  // A dismissed sheet and a changed account always start with a fresh navigation state.
  return visible ? <ModeSheet key={credentials ? pantryAccountKey(credentials) : "local"} onClose={onClose} initialStep={initialStep} /> : null;
}
function ModeSheet({ onClose, initialStep }: Omit<Props, "visible">) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { credentials } = useAuth();
  const { mode, switching, switchToLocal, sharedList } = useShoppingList();
  const [step, setStep] = useState<Step>(initialStep === "pantry" && !credentials ? "modes" : initialStep ?? "modes");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const disabled = busy || switching;
  function close() { if (!disabled) onClose(); }
  function back() { if (!disabled) { if (step === "modes") onClose(); else { setStep("modes"); setError(false); } } }
  async function selectLocal() {
    if (disabled) return;
    setBusy(true); setError(false);
    try { await switchToLocal(); onClose(); } catch { setError(true); }
    finally { setBusy(false); }
  }
  return <Modal visible transparent animationType="slide" onRequestClose={back}>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable style={styles.scrim} accessibilityRole="button" accessibilityLabel={t("common.close")} disabled={disabled} onPress={close} />
      <GlassPanel style={[styles.panel, { paddingBottom: getScreenBottomPadding(insets.bottom) }]}>
        <View style={styles.header}>
          {step !== "modes" ? <IconButton icon={ArrowLeft} label={t("common.back")} disabled={disabled} onPress={back} /> : null}
          <AppText variant="subtitle" style={styles.flex}>{t(step === "pantry" ? "pantry.chooseList" : step === "firebase" ? "shoppingList.sharedTitle" : "shoppingModes.choose")}</AppText>
          <IconButton icon={X} label={t("common.close")} disabled={disabled} onPress={close} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.options}>
          {step === "pantry" && credentials ? <PantryListPicker credentials={credentials} onDone={onClose} onBusyChange={setBusy} /> : step === "firebase" ? <>{!sharedList.active ? <AppText muted variant="caption">{t("shoppingModes.transferBody")}</AppText> : null}<ShoppingListShareContent onBusyChange={setBusy} /></> : <>
            <AppText muted>{t("shoppingModes.body")}</AppText>
            {([{ kind: "local", icon: Smartphone }, { kind: "firebase", icon: Users }, { kind: "pantry", icon: Cloud }] as const).map(({ kind, icon: Icon }) => {
              const selected = mode.kind === kind;
              const unavailable = disabled || (kind === "pantry" && !credentials);
              return <Pressable key={kind} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: unavailable }} accessibilityLabel={t(`shoppingModes.${kind}`)}
                disabled={unavailable} onPress={() => { setError(false); if (kind === "local") void selectLocal(); else setStep(kind); }}
                style={[styles.option, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.chip : colors.surfaceGlassStrong, opacity: unavailable ? 0.5 : 1 }]}>
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
            <ShoppingRemindersControls onBusyChange={setBusy} />
          </>}
          {switching || (busy && step === "modes") ? <View style={styles.header}><ActivityIndicator color={colors.primary} /><AppText style={styles.flex}>{t("shoppingModes.switching")}</AppText></View> : null}
          {error ? <AppText accessibilityRole="alert" style={{ color: colors.danger }}>{t("shoppingModes.error")}</AppText> : null}
        </ScrollView>
      </GlassPanel>
    </KeyboardAvoidingView>
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
