import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, ArrowUpRight, ChevronRight, Home, ListChecks, Plus, ShoppingBag } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { EmptyState } from "../components/EmptyState";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { useAuth } from "../features/auth/AuthProvider";
import { PantryClient, PantryError, type PantryHouse, type PantryList } from "../features/pantry/pantryClient";
import type { NextcloudCredentials } from "../features/nextcloud/cookbookClient";
import { pantryAccountKey } from "../features/pantry/pantryStore";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { normalizeNextcloudUrl } from "../utils/url";

type Props = NativeStackScreenProps<RootStackParamList, "Pantry">;
export function PantryScreen({ navigation }: Props) {
  const { credentials } = useAuth();
  const { t } = useTranslation();
  if (!credentials) return <Screen><AppText>{t("shoppingModes.nextcloudRequired")}</AppText><PrimaryButton label={t("common.back")} onPress={() => navigation.goBack()} /></Screen>;
  return <PantryPicker key={pantryAccountKey(credentials)} credentials={credentials} onBack={() => navigation.goBack()} />;
}
function PantryPicker({ credentials, onBack }: { credentials: NextcloudCredentials; onBack: () => void }) {
  const { t } = useTranslation(); const { colors } = useAppTheme();
  const { switching, switchToPantry, mode } = useShoppingList();
  const initialHouse = useRef(mode?.kind === "pantry" ? mode.selection.house : null);
  const [client, setClient] = useState<PantryClient | null>(null);
  const [houses, setHouses] = useState<PantryHouse[] | null>(null);
  const [house, setHouse] = useState<PantryHouse | null>(null);
  const [lists, setLists] = useState<PantryList[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const next = new PantryClient(credentials); setClient(next);
    const selectedHouse = initialHouse.current;
    if (selectedHouse) {
      setBusy(true);
      void Promise.all([next.houses(), next.lists(selectedHouse.id)]).then(([houses, lists]) => {
        if (!active) return;
        setHouses(houses); setHouse(houses.find((house) => house.id === selectedHouse.id) ?? selectedHouse); setLists(lists);
      }).catch((error: unknown) => { if (active) setError(error instanceof PantryError ? `pantry.errors.${error.code}` : "shoppingModes.error"); })
        .finally(() => { if (active) setBusy(false); });
    }
    return () => { active = false; next.dispose(); };
  }, [credentials]);
  async function run(action: (api: PantryClient) => Promise<void>) {
    if (!client || busy || switching) return;
    setBusy(true); setError(null);
    try { await action(client); } catch (error) { setError(error instanceof PantryError ? `pantry.errors.${error.code}` : "shoppingModes.error"); }
    finally { setBusy(false); }
  }
  const discover = () => run(async (api) => { setHouses(await api.houses()); setHouse(null); });
  function chooseHouse(selected: PantryHouse) {
    void run(async (api) => { const next = await api.lists(selected.id); setHouse(selected); setLists(next); });
  }
  function selectList(list: PantryList) {
    if (!house) return;
    void run(async () => { await switchToPantry({ house, list }); onBack(); });
  }
  function createList() {
    if (!house || !draft.trim()) return;
    void run(async (api) => {
      const list = await api.createList(house.id, draft);
      setLists((previous) => [...previous, list]); setDraft("");
      await switchToPantry({ house, list }); onBack();
    });
  }
  async function open() {
    try { await Linking.openURL(`${normalizeNextcloudUrl(credentials.serverUrl)}/index.php/apps/pantry`); }
    catch { Alert.alert(t("common.error"), t("pantry.openError")); }
  }
  const disabled = busy || switching || !client;
  return <Screen>
    <View style={styles.row}>
      <IconButton icon={ArrowLeft} label={t("common.back")} disabled={disabled} onPress={() => { if (house) { setHouse(null); setError(null); } else if (houses) { setHouses(null); setError(null); } else onBack(); }} />
      <AppText variant="subtitle" style={styles.flex}>{t("pantry.title")}</AppText>
      {disabled ? <ActivityIndicator color={colors.primary} /> : null}
    </View>
    {!houses ? <GlassPanel style={styles.hero}>
      <View style={[styles.badge, { backgroundColor: colors.chip }]}><ShoppingBag color={colors.primary} size={40} /></View>
      <AppText variant="subtitle" style={styles.center}>{t("pantry.welcomeTitle")}</AppText>
      <AppText muted style={styles.center}>{t("shoppingModes.pantrySetupBody")}</AppText>
      <PrimaryButton numberOfLines={2} icon={ListChecks} label={t("pantry.connect")} disabled={disabled} onPress={() => { void discover(); }} />
    </GlassPanel> : <>
      <AppText variant="subtitle">{t(house ? "pantry.chooseList" : "pantry.chooseHouse")}</AppText>
      <AppText muted>{house ? house.name : t("pantry.chooseHouseBody")}</AppText>
      <AppText muted variant="caption">{t("shoppingModes.transferBody")}</AppText>
      {(house ? lists : houses).map((entry) => <Pressable key={entry.id} accessibilityRole="button" disabled={disabled}
        onPress={() => { if (house) { const list = lists.find((list) => list.id === entry.id); if (list) selectList(list); } else chooseHouse(entry); }}
        style={[styles.choice, { backgroundColor: colors.surfaceGlassStrong, borderColor: colors.border }]}>
        {house ? <ListChecks color={colors.primary} size={22} /> : <Home color={colors.primary} size={22} />}
        <AppText variant="label" style={styles.flex}>{entry.name}</AppText><ChevronRight color={colors.textMuted} size={18} />
      </Pressable>)}
      {!house && !houses.length ? <EmptyState title={t("pantry.noHouses")} body={t("pantry.noHousesBody")} /> : null}
      {house && !lists.length ? <AppText muted>{t("pantry.noLists")}</AppText> : null}
      {house && (house.isAdmin || house.permissions?.canCreateLists !== false) ? <GlassPanel style={styles.stack}>
        <TextField label={t("pantry.newList")} value={draft} onChangeText={setDraft} editable={!disabled} placeholder={t("shoppingList.title")} />
        <PrimaryButton numberOfLines={2} icon={Plus} label={t("pantry.createList")} disabled={disabled || !draft.trim()} onPress={createList} />
      </GlassPanel> : null}
    </>}
    {switching ? <AppText accessibilityLiveRegion="polite">{t("shoppingModes.switching")}</AppText> : null}
    {error ? <GlassPanel style={styles.stack}><AppText accessibilityRole="alert" style={{ color: colors.danger }}>{t(error)}</AppText><AppText muted variant="caption">{t("shoppingModes.failureBody")}</AppText><PrimaryButton label={t("common.retry")} disabled={disabled} variant="ghost" onPress={() => { if (house) chooseHouse(house); else void discover(); }} /></GlassPanel> : null}
    <PrimaryButton numberOfLines={2} icon={ArrowUpRight} label={t("pantry.open")} variant="ghost" disabled={switching} onPress={() => { void open(); }} />
  </Screen>;
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, row: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, stack: { gap: spacing.sm },
  hero: { gap: spacing.lg, padding: spacing.lg }, center: { textAlign: "center" },
  badge: { width: 84, height: 84, borderRadius: 28, alignSelf: "center", alignItems: "center", justifyContent: "center" },
  choice: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth }
});
