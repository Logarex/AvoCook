import { Check, Cloud, Smartphone, Users } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { AppSheet } from "../components/AppSheet";
import { AppText } from "../components/AppText";
import { DisclosureSection } from "../components/DisclosureSection";
import { useAuth } from "../features/auth/AuthProvider";
import { pantryAccountKey } from "../features/pantry/pantryStore";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/colors";
import { PantryListPicker } from "./PantryListPicker";
import { ShoppingListShareContent } from "./ShoppingListShareContent";
import { ShoppingRemindersControls } from "./ShoppingRemindersControls";

type Step = "modes" | "pantry" | "firebase";
type Props = { visible: boolean; onClose: () => void; initialStep?: Step };

export function ShoppingModeModal({
  visible,
  onClose,
  initialStep = "modes",
}: Props) {
  const { credentials } = useAuth();
  // A dismissed sheet and a changed account always start with a fresh navigation state.
  return visible ? (
    <ModeSheet
      key={credentials ? pantryAccountKey(credentials) : "local"}
      onClose={onClose}
      initialStep={initialStep}
    />
  ) : null;
}
function ModeSheet({ onClose, initialStep }: Omit<Props, "visible">) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { credentials } = useAuth();
  const { mode, switching, switchToLocal, sharedList } = useShoppingList();
  const [step, setStep] = useState<Step>(
    initialStep === "pantry" && !credentials
      ? "modes"
      : (initialStep ?? "modes"),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const disabled = busy || switching;
  function close() {
    if (!disabled) onClose();
  }
  function back() {
    if (!disabled) {
      if (step === "modes") onClose();
      else {
        setStep("modes");
        setError(false);
      }
    }
  }
  async function selectLocal() {
    if (disabled) return;
    setBusy(true);
    setError(false);
    try {
      await switchToLocal();
      onClose();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppSheet
      title={t(
        step === "pantry"
          ? "pantry.chooseList"
          : step === "firebase"
            ? "shoppingList.sharedTitle"
            : "shoppingModes.choose",
      )}
      visible
      onClose={close}
      onBack={step === "modes" ? undefined : back}
      busy={disabled}
    >
      {step === "pantry" && credentials ? (
        <PantryListPicker
          credentials={credentials}
          onDone={onClose}
          onBusyChange={setBusy}
        />
      ) : step === "firebase" ? (
        <>
          {!sharedList.active ? (
            <DisclosureSection title={t("ui.details")}>
              <AppText muted variant="caption">
                {t("shoppingModes.transferBody")}
              </AppText>
            </DisclosureSection>
          ) : null}
          <ShoppingListShareContent onBusyChange={setBusy} />
        </>
      ) : (
        <>
          {(
            [
              { kind: "local", icon: Smartphone },
              { kind: "firebase", icon: Users },
              { kind: "pantry", icon: Cloud },
            ] as const
          ).map(({ kind, icon: Icon }) => {
            const selected = mode.kind === kind;
            const unavailable = disabled || (kind === "pantry" && !credentials);
            return (
              <Pressable
                key={kind}
                accessibilityRole="radio"
                accessibilityState={{
                  checked: selected,
                  disabled: unavailable,
                }}
                accessibilityLabel={t(`shoppingModes.${kind}`)}
                disabled={unavailable}
                onPress={() => {
                  setError(false);
                  if (kind === "local") void selectLocal();
                  else setStep(kind);
                }}
                style={[
                  styles.option,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected
                      ? colors.chip
                      : colors.surfaceGlassStrong,
                    opacity: unavailable ? 0.5 : 1,
                  },
                ]}
              >
                <Icon color={colors.primary} size={24} />
                <View style={styles.flex}>
                  <AppText variant="label">
                    {t(`shoppingModes.${kind}`)}
                  </AppText>
                  <AppText muted variant="caption">
                    {t(`shoppingModes.${kind}Body`)}
                  </AppText>
                  {kind === "pantry" && !credentials ? (
                    <AppText muted variant="caption">
                      {t("shoppingModes.nextcloudRequired")}
                    </AppText>
                  ) : null}
                </View>
                {selected ? <Check color={colors.primary} size={20} /> : null}
              </Pressable>
            );
          })}
          <DisclosureSection title={t("ui.details")}>
            <AppText muted variant="caption">
              {t("shoppingModes.transferBody")}
            </AppText>
          </DisclosureSection>
          <ShoppingRemindersControls onBusyChange={setBusy} />
        </>
      )}
      {switching || (busy && step === "modes") ? (
        <View style={styles.header}>
          <ActivityIndicator color={colors.primary} />
          <AppText style={styles.flex}>{t("shoppingModes.switching")}</AppText>
        </View>
      ) : null}
      {error ? (
        <AppText accessibilityRole="alert" style={{ color: colors.danger }}>
          {t("shoppingModes.error")}
        </AppText>
      ) : null}
    </AppSheet>
  );
}
const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
