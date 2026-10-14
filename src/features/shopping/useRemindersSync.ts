import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import {
  isRemindersAvailable,
  requestRemindersPermission,
  getRemindersPermissionStatus,
  findOrCreateAvoCookList,
  getLinkedListId,
  clearLinkedListId,
  clearItemMap,
  pushItemsToReminders,
  pullItemsFromReminders,
  deleteAllReminders,
  rebindReminderMappings,
  waitForRemindersPush,
} from "./remindersSync";
import type { PullResult } from "./remindersSync";
import type { ShoppingListItem } from "./shoppingList";

const SYNC_ENABLED_KEY = "shopping.reminders.enabled.v1";

export type RemindersSyncState = {
  available: boolean;
  linked: boolean;
  syncing: boolean;
  listName: string | null;
  dismissed: boolean;
};

export type UseRemindersSyncReturn = RemindersSyncState & {
  enableSync: (currentItems: ShoppingListItem[]) => Promise<void>;
  disableSync: () => Promise<void>;
  pushToSystem: (items: ShoppingListItem[], isCurrent?: () => boolean) => Promise<void>;
  pullFromSystem: (currentItems: ShoppingListItem[], isCurrent?: () => boolean) => Promise<PullResult | null>;
  dismissSyncBanner: () => Promise<void>;
};

const EMPTY_ITEMS: ShoppingListItem[] = [];

export function useRemindersSync(enabled = true, backendKey = "local", items: ShoppingListItem[] = EMPTY_ITEMS): UseRemindersSyncReturn {
  const { t } = useTranslation();
  const enabledRef = useRef(enabled);
  const epochRef = useRef(0);
  const mountedRef = useRef(true);
  const backendRef = useRef(backendKey);
  const previousItems = useRef(items);
  const pendingRemap = useRef<{ previous: ShoppingListItem[]; next: ShoppingListItem[] } | null>(null);
  if (enabledRef.current !== enabled || backendRef.current !== backendKey) epochRef.current++;
  if (backendRef.current !== backendKey) {
    pendingRemap.current = { previous: pendingRemap.current?.previous ?? previousItems.current, next: items };
  } else if (pendingRemap.current) pendingRemap.current.next = items;
  backendRef.current = backendKey;
  previousItems.current = items;
  enabledRef.current = enabled;
  useEffect(() => { const epoch = epochRef; mountedRef.current = true; return () => { mountedRef.current = false; epoch.current++; }; }, []);
  const prepareMappings = useCallback(async (isCurrent: () => boolean) => {
    const remap = pendingRemap.current;
    if (!remap) return;
    const next = remap.next;
    await rebindReminderMappings(remap.previous, next, isCurrent);
    if (isCurrent() && pendingRemap.current === remap && remap.next === next) pendingRemap.current = null;
  }, []);

  const [available] = useState<boolean>(() => isRemindersAvailable());
  const [linked, setLinked] = useState(false);
  const linkedRef = useRef(linked);
  linkedRef.current = linked;
  const [syncing, setSyncing] = useState(false);
  const [listName] = useState<string | null>(available ? "AvoCook" : null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(SYNC_ENABLED_KEY).then((stored) => {
      if (stored === "true") setLinked(true);
    });
    void AsyncStorage.getItem("shopping.reminders.dismissed.v1").then((stored) => {
      if (stored === "true") setDismissed(true);
    });
  }, []);

  const enableSync = useCallback(async (currentItems: ShoppingListItem[]) => {
    if (!available || !enabledRef.current || !mountedRef.current) return;
    const epoch = epochRef.current;

    const status = await getRemindersPermissionStatus();
    if (!enabledRef.current || !mountedRef.current || epoch !== epochRef.current) return;
    if (status === "denied") {
      Alert.alert(
        t("shoppingList.syncPermissionDeniedTitle"),
        t("shoppingList.syncPermissionDeniedBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("common.settings"), onPress: () => void Linking.openSettings() },
        ]
      );
      return;
    }

    if (!enabledRef.current || !mountedRef.current || epoch !== epochRef.current) return;
    const result = await requestRemindersPermission();
    if (!enabledRef.current || !mountedRef.current || epoch !== epochRef.current) return;
    if (result === "denied") {
      Alert.alert(
        t("shoppingList.syncPermissionDeniedTitle"),
        t("shoppingList.syncPermissionDeniedBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("common.settings"), onPress: () => void Linking.openSettings() },
        ]
      );
      return;
    }

    try {
      setSyncing(true);
      const listId = await findOrCreateAvoCookList();
      if (!enabledRef.current || !mountedRef.current || epoch !== epochRef.current) return;
      await prepareMappings(() => enabledRef.current && mountedRef.current && epoch === epochRef.current);
      if (!enabledRef.current || !mountedRef.current || epoch !== epochRef.current) return;
      await AsyncStorage.setItem(SYNC_ENABLED_KEY, "true");
      if (currentItems.length > 0) {
        await pushItemsToReminders(currentItems, listId, () => enabledRef.current && mountedRef.current && epoch === epochRef.current);
      }
      if (enabledRef.current && mountedRef.current && epoch === epochRef.current) setLinked(true);
    } catch {
      Alert.alert(t("shoppingList.syncErrorTitle"), t("shoppingList.syncErrorBody"));
    } finally {
      setSyncing(false);
    }
  }, [available, t, prepareMappings]);
  const disableSync = useCallback(async () => {
    Alert.alert(t("shoppingList.syncDisableConfirmTitle"), "", [
      {
        text: t("shoppingList.syncDisableConfirmKeep"),
        style: "cancel",
        onPress: () => {
          epochRef.current++; linkedRef.current = false; setLinked(false);
          void (async () => {
            await waitForRemindersPush();
            await AsyncStorage.setItem(SYNC_ENABLED_KEY, "false");
            await clearLinkedListId();
            await clearItemMap();
            setLinked(false);
          })();
        },
      },
      {
        text: t("shoppingList.syncDisableConfirmDelete"),
        style: "destructive",
        onPress: () => {
          epochRef.current++; linkedRef.current = false; setLinked(false);
          void (async () => {
            await waitForRemindersPush();
            try {
              const listId = await getLinkedListId();
              if (listId) await deleteAllReminders(listId);
            } catch {
            } finally {
              await AsyncStorage.setItem(SYNC_ENABLED_KEY, "false");
              await clearLinkedListId();
              await clearItemMap();
              setLinked(false);
            }
          })();
        },
      },
    ]);
  }, [t]);

  const pushToSystem = useCallback(
    async (items: ShoppingListItem[], sourceIsCurrent: () => boolean = () => true) => {
      if (!available || !linkedRef.current || !enabledRef.current || !mountedRef.current || !sourceIsCurrent()) return;
      const epoch = epochRef.current;
      try {
        const listId = await getLinkedListId();
        if (!listId || !enabledRef.current || !mountedRef.current || !sourceIsCurrent() || epoch !== epochRef.current) return;
        await prepareMappings(() => enabledRef.current && mountedRef.current && linkedRef.current && sourceIsCurrent() && epoch === epochRef.current);
        if (!enabledRef.current || !mountedRef.current || !sourceIsCurrent() || epoch !== epochRef.current) return;
        await pushItemsToReminders(items, listId, () => enabledRef.current && mountedRef.current && linkedRef.current && sourceIsCurrent() && epoch === epochRef.current);
      } catch {
      }
    },
    [available, prepareMappings]
  );

  const pullFromSystem = useCallback(
    async (currentItems: ShoppingListItem[], sourceIsCurrent: () => boolean = () => true): Promise<PullResult | null> => {
      if (!available || !linkedRef.current || !enabledRef.current || !mountedRef.current || !sourceIsCurrent()) return null;
      const epoch = epochRef.current;
      try {
        const listId = await getLinkedListId();
        if (!listId || !enabledRef.current || !mountedRef.current || !sourceIsCurrent() || epoch !== epochRef.current) return null;
        await prepareMappings(() => enabledRef.current && mountedRef.current && linkedRef.current && sourceIsCurrent() && epoch === epochRef.current);
        if (!enabledRef.current || !mountedRef.current || !sourceIsCurrent() || epoch !== epochRef.current) return null;
        const result = await pullItemsFromReminders(currentItems, listId, () => enabledRef.current && mountedRef.current && linkedRef.current && sourceIsCurrent() && epoch === epochRef.current);
        if (!enabledRef.current || !mountedRef.current || !sourceIsCurrent() || epoch !== epochRef.current) return null;
        return result.hasChanges ? result : null;
      } catch {
        return null;
      }
    },
    [available, prepareMappings]
  );

  const dismissSyncBanner = useCallback(async () => {
    setDismissed(true);
    await AsyncStorage.setItem("shopping.reminders.dismissed.v1", "true");
  }, []);

  return { available, linked: available && linked, syncing, listName, dismissed, enableSync, disableSync, pushToSystem, pullFromSystem, dismissSyncBanner };
}
