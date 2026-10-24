import { Check, ChevronRight, Plus } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import type { NextcloudCredentials } from "../features/nextcloud/cookbookClient";
import { PantryClient, PantryError, type PantryHouse, type PantryList } from "../features/pantry/pantryClient";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/colors";

type Group = { house: PantryHouse; lists: PantryList[] };

export function PantryListPicker({ credentials, onDone, onBusyChange }: {
  credentials: NextcloudCredentials; onDone: () => void; onBusyChange: (busy: boolean) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { mode, switching, switchToPantry } = useShoppingList();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [houseId, setHouseId] = useState<number | null>(mode.kind === "pantry" ? mode.selection.house.id : null);
  const [draft, setDraft] = useState("");
  const client = useRef<PantryClient | null>(null);
  const active = useRef(false);
  const pending = useRef(false);
  const failure = useCallback((error: unknown) => {
    if (active.current) setError(error instanceof PantryError ? `pantry.errors.${error.code}` : "shoppingModes.error");
  }, []);
  const discover = useCallback(async () => {
    const api = client.current;
    if (!api || pending.current) return;
    const current = () => active.current && client.current === api;
    pending.current = true; setBusy(true); setError(null);
    try {
      const houses = await api.houses();
      if (!current()) return;
      const results = await Promise.allSettled(houses.map(async (house) => ({ house, lists: await api.lists(house.id) })));
      if (!current()) return;
      setGroups(results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []));
      setLoaded(true);
      const rejected = results.find((result) => result.status === "rejected");
      if (rejected?.status === "rejected") failure(rejected.reason);
    } catch (error) { if (current()) failure(error); }
    finally { if (current()) { pending.current = false; setBusy(false); } }
  }, [failure]);
  useEffect(() => {
    active.current = true; pending.current = false; setTransferring(false);
    const api = new PantryClient(credentials); client.current = api;
    void discover();
    return () => { active.current = false; client.current = null; api.dispose(); };
  }, [credentials, discover]);
  useEffect(() => { onBusyChange(transferring); return () => onBusyChange(false); }, [transferring, onBusyChange]);

  async function select(group: Group, list: PantryList) {
    const api = client.current;
    if (!api || pending.current || switching) return;
    const current = () => active.current && client.current === api;
    pending.current = true; setBusy(true); setTransferring(true); setError(null);
    try { await switchToPantry({ house: group.house, list }); if (current()) onDone(); }
    catch (error) { if (current()) failure(error); }
    finally { if (current()) { pending.current = false; setBusy(false); setTransferring(false); } }
  }
  const createGroups = groups.filter(({ house }) => house.isAdmin || house.permissions?.canCreateLists !== false);
  const target = createGroups.find(({ house }) => house.id === houseId) ?? createGroups[0];
  async function createList() {
    const api = client.current;
    if (!target || !api || pending.current || switching || !draft.trim()) return;
    const current = () => active.current && client.current === api;
    pending.current = true; setBusy(true); setTransferring(true); setError(null);
    try {
      const list = await api.createList(target.house.id, draft.trim());
      if (!current()) return;
      setGroups((previous) => previous.map((group) => group.house.id === target.house.id ? { ...group, lists: [...group.lists, list] } : group));
      setCreating(false); setDraft("");
      await switchToPantry({ house: target.house, list });
      if (current()) onDone();
    } catch (error) { if (current()) failure(error); }
    finally { if (current()) { pending.current = false; setBusy(false); setTransferring(false); } }
  }
  const disabled = busy || switching;
  return <View style={styles.stack}>
    <AppText muted variant="caption">{t("shoppingModes.transferBody")}</AppText>
    {busy ? <ActivityIndicator color={colors.primary} accessibilityLabel={t("common.loading")} /> : null}
    {groups.map((group) => <View key={group.house.id} style={styles.stack}>
      <AppText muted variant="caption">{group.house.name}</AppText>
      {!group.lists.length ? <AppText muted>{t("pantry.noLists")}</AppText> : null}
      {group.lists.map((list) => {
        const selected = mode.kind === "pantry" && mode.selection.house.id === group.house.id && mode.selection.list.id === list.id;
        return <Pressable key={list.id} accessibilityRole="button" accessibilityLabel={`${list.name}, ${group.house.name}`} accessibilityState={{ selected, disabled }} disabled={disabled}
          onPress={() => { void select(group, list); }} style={[styles.choice, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.chip : colors.surfaceGlassStrong }]}>
          <AppText variant="label" style={styles.flex}>{list.name}</AppText>
          {selected ? <Check color={colors.primary} size={20} /> : <ChevronRight color={colors.textMuted} size={18} />}
        </Pressable>;
      })}
    </View>)}
    {loaded && !groups.length && !error ? <><AppText variant="label">{t("pantry.noHouses")}</AppText><AppText muted>{t("pantry.noHousesBody")}</AppText></> : null}
    {error ? <View style={styles.stack}>
      <AppText accessibilityRole="alert" style={{ color: colors.danger }}>{t(error)}</AppText>
      <AppText muted variant="caption">{t("shoppingModes.failureBody")}</AppText>
      <PrimaryButton label={t("common.retry")} variant="ghost" disabled={disabled} onPress={() => { void discover(); }} />
    </View> : null}
    {createGroups.length ? creating ? <View style={styles.stack}>
      {createGroups.length > 1 ? <View style={styles.stack}>
        <AppText variant="label">{t("pantry.chooseHouse")}</AppText>
        {createGroups.map(({ house }) => <Pressable key={house.id} accessibilityRole="radio" accessibilityLabel={house.name} accessibilityState={{ checked: target?.house.id === house.id }} disabled={disabled}
          onPress={() => setHouseId(house.id)} style={[styles.choice, { backgroundColor: colors.surfaceGlassStrong, borderColor: colors.border }]}>
          <AppText style={styles.flex}>{house.name}</AppText>{target?.house.id === house.id ? <Check size={20} color={colors.primary} /> : null}
        </Pressable>)}
      </View> : null}
      <TextField label={t("pantry.newList")} value={draft} onChangeText={setDraft} editable={!disabled} placeholder={t("shoppingList.title")} onSubmitEditing={() => { void createList(); }} />
      <PrimaryButton label={t("pantry.createList")} disabled={disabled || !draft.trim()} onPress={() => { void createList(); }} />
      <PrimaryButton label={t("common.cancel")} variant="ghost" disabled={disabled} onPress={() => setCreating(false)} />
    </View> : <PrimaryButton label={t("pantry.newList")} icon={Plus} variant="ghost" disabled={disabled} onPress={() => setCreating(true)} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  stack: { gap: spacing.sm }, flex: { flex: 1 },
  choice: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth }
});
