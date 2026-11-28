import { Check, Cloud, Plus, RefreshCw, Smartphone } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppSheet } from "../components/AppSheet";
import { AppText } from "../components/AppText";
import { DisclosureSection } from "../components/DisclosureSection";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../features/auth/AuthProvider";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import { PantryClient, PantryError, type PantryHouse, type PantryInventory } from "../features/pantry/pantryClient";
import { inventoryLocations, suggestInventory, type InventoryConfig, type InventoryLocation } from "../features/pantry/inventorySync";
import {
  disablePantryInventory,
  enablePantryInventory,
  syncInventoryNow,
  usePantryInventoryState,
} from "../features/pantry/usePantryInventory";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/colors";

type Step = "modes" | "setup";
type Group = { house: PantryHouse; inventories: PantryInventory[] };
/** An existing inventory id, or "new" to create one named after the place. */
type Choice = number | "new";
const icons: Partial<Record<InventoryLocation, string>> = { fridge: "basket", cupboard: "package" };


type Props = { visible: boolean; onClose: () => void; remindersBusy: boolean; onToggleReminders: () => void };

export function InventorySyncSheet({ visible, ...props }: Props) {
  return visible ? <SyncSheet {...props} /> : null;
}

function SyncSheet({ onClose, remindersBusy, onToggleReminders }: Omit<Props, "visible">) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const { credentials, isLocalMode } = useAuth();
  const kitchen = useKitchen();
  const sync = usePantryInventoryState();
  const connected = Boolean(credentials) && !isLocalMode;
  const active = Boolean(sync.config);
  const [step, setStep] = useState<Step>("modes");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [houseId, setHouseId] = useState<number | null>(sync.config?.house.id ?? null);
  const [choices, setChoices] = useState<Record<InventoryLocation, Choice>>({ fridge: "new", cupboard: "new", freezer: "new" });
  const client = useRef<PantryClient | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      client.current?.dispose();
    };
  }, []);

  const failure = useCallback((reason: unknown) => {
    if (!mounted.current) return;
    setError(reason instanceof PantryError
      ? reason.code === "unavailable" ? "inventorySync.errors.inventoryUnavailable" : `pantry.errors.${reason.code}`
      : "inventorySync.errors.generic");
  }, []);

  const preselect = useCallback((group: Group | undefined) => {
    if (!group) return;
    const current = sync.config?.house.id === group.house.id ? sync.config.locations : null;
    setChoices(Object.fromEntries(inventoryLocations.map((location) => {
      const saved = current?.[location].id;
      return [location, saved && group.inventories.some((inventory) => inventory.id === saved) ? saved : suggestInventory(location, group.inventories)];
    })) as Record<InventoryLocation, Choice>);
  }, [sync.config]);

  const discover = useCallback(async () => {
    if (!credentials) return;
    client.current?.dispose();
    const api = new PantryClient(credentials);
    client.current = api;
    setBusy(true);
    setError(null);
    try {
      const houses = await api.houses();
      const loaded: Group[] = [];
      let firstError: unknown = null;
      for (const house of houses) {
        try {
          loaded.push({ house, inventories: await api.inventories(house.id) });
        } catch (reason) {
          firstError ??= reason;
        }
      }
      if (!mounted.current || client.current !== api) return;
      setGroups(loaded);
      if (!loaded.length && firstError) failure(firstError);
      const selected = loaded.find((group) => group.house.id === houseId) ?? loaded[0];
      if (selected) {
        setHouseId(selected.house.id);
        preselect(selected);
      }
    } catch (reason) {
      failure(reason);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [credentials, houseId, failure, preselect]);

  function openSetup() {
    setStep("setup");
    if (!groups) void discover();
  }

  const group = groups?.find((entry) => entry.house.id === houseId);
  const canCreate = Boolean(group && (group.house.isAdmin || group.house.permissions?.canCreateLists !== false));
  const placeName = (location: InventoryLocation) => t(`kitchen.${location}`);

  async function start() {
    const api = client.current;
    if (!group || !api || busy) return;
    if (!canCreate && inventoryLocations.some((location) => choices[location] === "new")) return;
    setBusy(true);
    setError(null);
    try {
      const created = new Map<InventoryLocation, PantryInventory>();
      for (const location of inventoryLocations) {
        if (choices[location] !== "new") continue;
        created.set(location, await api.createInventory(group.house.id, placeName(location), icons[location]));
      }
      const target = (location: InventoryLocation) => {
        const inventory = created.get(location) ?? group.inventories.find((entry) => entry.id === choices[location]);
        if (!inventory) throw new PantryError("invalid");
        return { id: inventory.id, name: inventory.name, canEdit: inventory.canEdit !== false };
      };
      const config: InventoryConfig = {
        house: { id: group.house.id, name: group.house.name },
        locations: { fridge: target("fridge"), cupboard: target("cupboard"), freezer: target("freezer") },
      };
      await enablePantryInventory(kitchen.account, config);
      if (mounted.current) {
        setGroups(null);
        setStep("modes");
      }
    } catch (reason) {
      failure(reason);
      // Inventories created before the failure stay in Pantry and are offered next time.
      setGroups(null);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  function stop() {
    Alert.alert(t("inventorySync.stopTitle"), t("inventorySync.stopBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("inventorySync.stop"),
        style: "destructive",
        onPress: () => {
          setBusy(true);
          void disablePantryInventory(kitchen.account, kitchen.update)
            .catch(() => failure(null))
            .finally(() => mounted.current && setBusy(false));
        },
      },
    ]);
  }

  const lastSync = sync.lastSync
    ? new Date(sync.lastSync).toLocaleString(i18n.language, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;
  const option = (selected: boolean, disabled: boolean) => [
    styles.option,
    { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.chip : colors.surfaceGlassStrong, opacity: disabled ? 0.5 : 1 },
  ];

  return (
    <AppSheet
      visible
      title={t(step === "setup" ? "inventorySync.setupTitle" : "inventorySync.title")}
      onClose={() => !busy && onClose()}
      onBack={step === "setup" ? () => !busy && (setStep("modes"), setError(null)) : undefined}
      busy={busy}
    >
      {step === "modes" ? (
        <View style={styles.stack}>
          <Pressable accessibilityRole="radio" accessibilityState={{ checked: !active, disabled: busy }} accessibilityLabel={t("inventorySync.local")}
            disabled={busy} onPress={() => active && stop()} style={option(!active, busy)}>
            <Smartphone color={colors.primary} size={24} />
            <View style={styles.flex}>
              <AppText variant="label">{t("inventorySync.local")}</AppText>
              <AppText muted variant="caption">{t("inventorySync.localBody")}</AppText>
            </View>
            {!active ? <Check color={colors.primary} size={20} /> : null}
          </Pressable>
          <Pressable accessibilityRole="radio" accessibilityState={{ checked: active, disabled: busy || !connected }} accessibilityLabel={t("inventorySync.pantry")}
            disabled={busy || !connected} onPress={() => !active && openSetup()} style={option(active, busy || !connected)}>
            <Cloud color={colors.primary} size={24} />
            <View style={styles.flex}>
              <AppText variant="label">{t("inventorySync.pantry")}</AppText>
              <AppText muted variant="caption">{t("inventorySync.pantryBody")}</AppText>
              {!connected ? <AppText muted variant="caption">{t("shoppingModes.nextcloudRequired")}</AppText> : null}
            </View>
            {active ? <Check color={colors.primary} size={20} /> : null}
          </Pressable>
          {active && sync.config ? (
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundElevated }]}>
              <AppText variant="label">{sync.config.house.name}</AppText>
              {inventoryLocations.map((location) => (
                <AppText key={location} muted variant="caption">
                  {placeName(location)} → {sync.config!.locations[location].name}
                  {!sync.config!.locations[location].canEdit ? ` · ${t("inventorySync.readOnly")}` : ""}
                </AppText>
              ))}
              <AppText variant="caption" accessibilityLiveRegion="polite" style={{ color: sync.error ? colors.danger : colors.textMuted }}>
                {sync.syncing
                  ? t("inventorySync.syncing")
                  : sync.error
                    ? t(sync.error === "unavailable" ? "inventorySync.errors.inventoryUnavailable" : `pantry.errors.${sync.error}`)
                    : lastSync ? t("inventorySync.lastSync", { date: lastSync }) : t("inventorySync.neverSynced")}
              </AppText>
              {sync.rejected > 0 && !sync.error ? <AppText muted variant="caption">{t("inventorySync.rejected", { count: sync.rejected })}</AppText> : null}
              <View style={styles.row}>
                <PrimaryButton compact variant="secondary" icon={RefreshCw} label={t("inventorySync.syncNow")} disabled={busy || sync.syncing}
                  onPress={() => void syncInventoryNow()} style={styles.flex} />
                <PrimaryButton compact variant="ghost" label={t("inventorySync.change")} disabled={busy} onPress={openSetup} style={styles.flex} />
              </View>
            </View>
          ) : null}
          <DisclosureSection title={t("inventorySync.howTitle")}>
            <AppText muted variant="caption">{t("inventorySync.howBody")}</AppText>
          </DisclosureSection>
          <View style={[styles.card, styles.switchRow, { borderColor: colors.border, backgroundColor: colors.backgroundElevated }]}>
            <View style={styles.flex}>
              <AppText variant="label">{t("kitchen.stockReminders")}</AppText>
              <AppText muted variant="caption">{t("kitchen.reminderSchedule")}</AppText>
            </View>
            <Switch accessibilityLabel={t("kitchen.stockReminders")} value={Boolean(kitchen.data.remindersEnabled)} disabled={busy || remindersBusy || !kitchen.ready}
              onValueChange={onToggleReminders} trackColor={{ true: colors.primary }} />
          </View>
        </View>
      ) : (
        <View style={styles.stack}>
          <AppText muted variant="caption">{t("inventorySync.setupBody")}</AppText>
          {busy ? <ActivityIndicator color={colors.primary} accessibilityLabel={t("common.loading")} /> : null}
          {groups && !groups.length && !error ? (
            <>
              <AppText variant="label">{t("pantry.noHouses")}</AppText>
              <AppText muted>{t("pantry.noHousesBody")}</AppText>
            </>
          ) : null}
          {groups && groups.length > 1 ? (
            <View style={styles.stack}>
              <AppText variant="label">{t("inventorySync.house")}</AppText>
              {groups.map((entry) => (
                <Pressable key={entry.house.id} accessibilityRole="radio" accessibilityLabel={entry.house.name}
                  accessibilityState={{ checked: entry.house.id === houseId, disabled: busy }} disabled={busy}
                  onPress={() => { setHouseId(entry.house.id); preselect(entry); }} style={option(entry.house.id === houseId, busy)}>
                  <AppText style={styles.flex}>{entry.house.name}</AppText>
                  {entry.house.id === houseId ? <Check size={20} color={colors.primary} /> : null}
                </Pressable>
              ))}
            </View>
          ) : null}
          {group ? inventoryLocations.map((location) => (
            <View key={location} style={styles.stack}>
              <AppText variant="label">{placeName(location)}</AppText>
              <View style={styles.chips}>
                {group.inventories.map((inventory) => {
                  const selected = choices[location] === inventory.id;
                  return (
                    <Pressable key={inventory.id} accessibilityRole="radio" accessibilityLabel={`${placeName(location)}: ${inventory.name}`}
                      accessibilityState={{ checked: selected, disabled: busy }} disabled={busy}
                      onPress={() => setChoices((current) => ({ ...current, [location]: inventory.id }))}
                      style={[styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.chip : colors.backgroundElevated }]}>
                      {selected ? <Check size={16} color={colors.primary} /> : null}
                      <AppText variant="caption" style={{ color: selected ? colors.primaryStrong : colors.text }}>
                        {inventory.name}{inventory.canEdit === false ? ` · ${t("inventorySync.readOnly")}` : ""}
                      </AppText>
                    </Pressable>
                  );
                })}
                {canCreate ? (
                  <Pressable accessibilityRole="radio" accessibilityLabel={t("inventorySync.create", { name: placeName(location) })}
                    accessibilityState={{ checked: choices[location] === "new", disabled: busy }} disabled={busy}
                    onPress={() => setChoices((current) => ({ ...current, [location]: "new" }))}
                    style={[styles.chip, { borderColor: choices[location] === "new" ? colors.primary : colors.border, backgroundColor: choices[location] === "new" ? colors.chip : colors.backgroundElevated }]}>
                    {choices[location] === "new" ? <Check size={16} color={colors.primary} /> : <Plus size={16} color={colors.textMuted} />}
                    <AppText variant="caption" style={{ color: choices[location] === "new" ? colors.primaryStrong : colors.text }}>
                      {t("inventorySync.create", { name: placeName(location) })}
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          )) : null}
          {group ? (
            <>
              <AppText muted variant="caption">
                {t(active ? "inventorySync.changeBody" : "inventorySync.firstSyncBody", { count: kitchen.data.stock.length, house: group.house.name })}
              </AppText>
              <PrimaryButton
                label={t(active ? "inventorySync.save" : "inventorySync.start")}
                disabled={busy || (!canCreate && inventoryLocations.some((location) => choices[location] === "new"))}
                onPress={() => void start()}
              />
            </>
          ) : null}
        </View>
      )}
      {error ? (
        <View style={styles.stack}>
          <AppText accessibilityRole="alert" style={{ color: colors.danger }}>{t(error)}</AppText>
          {step === "setup" ? <PrimaryButton label={t("common.retry")} variant="ghost" disabled={busy} onPress={() => void discover()} /> : null}
        </View>
      ) : null}
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  card: { gap: spacing.xxs, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth },
});
