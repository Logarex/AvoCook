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
  pushToSystem: (items: ShoppingListItem[]) => Promise<void>;
  pullFromSystem: (currentItems: ShoppingListItem[]) => Promise<PullResult | null>;
  dismissSyncBanner: () => Promise<void>;
};

export function useRemindersSync(enabled = true, pantryMode = false): UseRemindersSyncReturn {
  const { t } = useTranslation();
  const enabledRef = useRef(enabled);
  const epochRef = useRef(0);
  const wasPantryRef = useRef(pantryMode);
  const resumeRequiredRef = useRef(false);
  if (enabledRef.current !== enabled) epochRef.current++;
  if (wasPantryRef.current && !pantryMode) resumeRequiredRef.current = true;
  wasPantryRef.current = pantryMode;
  enabledRef.current = enabled;

  const [available] = useState<boolean>(() => isRemindersAvailable());
  const [linked, setLinked] = useState(false);
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
    if (!available || !enabledRef.current) return;
    const epoch = epochRef.current;

    const status = await getRemindersPermissionStatus();
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

    if (!enabledRef.current || epoch !== epochRef.current) return;
    const result = await requestRemindersPermission();
    if (!enabledRef.current || epoch !== epochRef.current) return;
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
      if (!enabledRef.current || epoch !== epochRef.current) return;
      await AsyncStorage.setItem(SYNC_ENABLED_KEY, "true");
      if (currentItems.length > 0) {
        await pushItemsToReminders(currentItems, listId);
      }
      if (epoch === epochRef.current) { resumeRequiredRef.current = false; setLinked(true); }
    } catch {
      Alert.alert(t("shoppingList.syncErrorTitle"), t("shoppingList.syncErrorBody"));
    } finally {
      setSyncing(false);
    }
  }, [available, t]);
  const disableSync = useCallback(async () => {
    Alert.alert(t("shoppingList.syncDisableConfirmTitle"), "", [
      {
        text: t("shoppingList.syncDisableConfirmKeep"),
        style: "cancel",
        onPress: () => {
          void (async () => {
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
          void (async () => {
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
    async (items: ShoppingListItem[]) => {
      if (!linked || !enabledRef.current) return;
      const epoch = epochRef.current;
      try {
        const listId = await getLinkedListId();
        if (!listId || !enabledRef.current || epoch !== epochRef.current) return;
        await pushItemsToReminders(items, listId);
        if (epoch === epochRef.current) resumeRequiredRef.current = false;
      } catch {
      }
    },
    [linked]
  );

  const pullFromSystem = useCallback(
    async (currentItems: ShoppingListItem[]): Promise<PullResult | null> => {
      if (!linked || !enabledRef.current) return null;
      const epoch = epochRef.current;
      try {
        const listId = await getLinkedListId();
        if (!listId || !enabledRef.current || epoch !== epochRef.current) return null;
        if (resumeRequiredRef.current) {
          // After leaving Pantry, align Reminders before importing its old mappings.
          await pushItemsToReminders(currentItems, listId);
          if (epoch === epochRef.current) resumeRequiredRef.current = false;
          return null;
        }
        const result = await pullItemsFromReminders(currentItems, listId);
        if (!enabledRef.current || epoch !== epochRef.current) return null;
        return result.hasChanges ? result : null;
      } catch {
        return null;
      }
    },
    [linked]
  );

  const dismissSyncBanner = useCallback(async () => {
    setDismissed(true);
    await AsyncStorage.setItem("shopping.reminders.dismissed.v1", "true");
  }, []);

  return { available: available && enabled, linked: linked && enabled, syncing, listName, dismissed, enableSync, disableSync, pushToSystem, pullFromSystem, dismissSyncBanner };
}
