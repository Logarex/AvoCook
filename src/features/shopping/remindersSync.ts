import * as Calendar from "expo-calendar/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { ShoppingListItem } from "./shoppingList";

const REMINDERS_LIST_ID_KEY = "shopping.reminders.listId.v1";
const REMINDERS_ITEM_MAP_KEY = "shopping.reminders.itemMap.v1";

// AvoCook item ID -> reminder ID.
type ItemMap = Record<string, string>;

export function isRemindersAvailable(): boolean {
  return Platform.OS === "ios";
}

export async function requestRemindersPermission(): Promise<"granted" | "denied"> {
  if (!isRemindersAvailable()) return "denied";
  const { status } = await Calendar.requestRemindersPermissionsAsync();
  return status === "granted" ? "granted" : "denied";
}

export async function getRemindersPermissionStatus(): Promise<
  "granted" | "denied" | "undetermined"
> {
  if (!isRemindersAvailable()) return "denied";
  const { status } = await Calendar.getRemindersPermissionsAsync();
  return status as "granted" | "denied" | "undetermined";
}

const AVOCOOK_LIST_NAME = "AvoCook";

export async function findOrCreateAvoCookList(): Promise<string> {
  const storedId = await AsyncStorage.getItem(REMINDERS_LIST_ID_KEY);
  
  let calendars: Calendar.Calendar[] = [];
  try {
    calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER);
  } catch (e) {
    console.error("sync", "Failed to get calendars", e);
  }

  if (storedId) {
    const matched = calendars.find((c) => c.id === storedId);
    if (matched && matched.allowsModifications !== false) {
      return storedId;
    }
  }

  const existing = calendars.find(
    (c) => c.title === AVOCOOK_LIST_NAME && c.allowsModifications !== false
  );
  if (existing) {
    await AsyncStorage.setItem(REMINDERS_LIST_ID_KEY, existing.id);
    return existing.id;
  }

  const modifiable = calendars.filter((c) => c.allowsModifications !== false);
  let targetSource = 
    modifiable.find((c) => c.source?.name === "iCloud" || c.source?.type === "caldav")?.source ??
    modifiable.find((c) => c.source?.isLocalAccount)?.source ??
    modifiable[0]?.source ??
    calendars[0]?.source;

  if (!targetSource) {
    try {
      const defaultEventCalendar = await Calendar.getDefaultCalendarAsync();
      targetSource = defaultEventCalendar.source;
    } catch {
    }
  }

  try {
    const newId = await Calendar.createCalendarAsync({
      title: AVOCOOK_LIST_NAME,
      color: "#4CAF50",
      entityType: Calendar.EntityTypes.REMINDER,
      sourceId: targetSource?.id,
      source: targetSource ?? { isLocalAccount: true, name: "AvoCook", type: "local" },
      name: AVOCOOK_LIST_NAME,
      ownerAccount: "personal",
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    await AsyncStorage.setItem(REMINDERS_LIST_ID_KEY, newId);
    return newId;
  } catch (e) {
    console.error("sync", "Failed to create new calendar list", e);
    
    if (targetSource && !targetSource.isLocalAccount) {
       try {
          const localSource = calendars.find((c) => c.source?.isLocalAccount)?.source || { isLocalAccount: true, name: "AvoCook", type: "local" };
          const fallbackId = await Calendar.createCalendarAsync({
            title: AVOCOOK_LIST_NAME,
            color: "#4CAF50",
            entityType: Calendar.EntityTypes.REMINDER,
            sourceId: localSource?.id,
            source: localSource,
            name: AVOCOOK_LIST_NAME,
            ownerAccount: "personal",
            accessLevel: Calendar.CalendarAccessLevel.OWNER,
          });
          await AsyncStorage.setItem(REMINDERS_LIST_ID_KEY, fallbackId);
          return fallbackId;
       } catch (fallbackErr) {
          console.error("sync", "Fallback local calendar creation also failed", fallbackErr);
          throw fallbackErr;
       }
    }
    
    throw e;
  }
}

export async function getLinkedListId(): Promise<string | null> {
  return AsyncStorage.getItem(REMINDERS_LIST_ID_KEY);
}

export async function clearLinkedListId(): Promise<void> {
  await AsyncStorage.removeItem(REMINDERS_LIST_ID_KEY);
}

async function loadItemMap(): Promise<ItemMap> {
  const stored = await AsyncStorage.getItem(REMINDERS_ITEM_MAP_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored) as ItemMap;
  } catch {
    return {};
  }
}

async function saveItemMap(map: ItemMap): Promise<void> {
  await AsyncStorage.setItem(REMINDERS_ITEM_MAP_KEY, JSON.stringify(map));
}

export async function clearItemMap(): Promise<void> {
  await AsyncStorage.removeItem(REMINDERS_ITEM_MAP_KEY);
}

// Link reminder IDs before the next push to avoid recreating them.
export async function registerReminderMappings(
  mappings: { avocookId: string; reminderId: string }[]
): Promise<void> {
  if (mappings.length === 0) return;
  const itemMap = await loadItemMap();
  for (const { avocookId, reminderId } of mappings) {
    itemMap[avocookId] = reminderId;
  }
  await saveItemMap(itemMap);
}

async function fetchAllReminders(listId: string): Promise<Calendar.Reminder[]> {
  // expo-calendar accepts null filters to include completed and undated reminders.
  return Calendar.getRemindersAsync(
    [listId],
    null,
    null,
    null
  ).catch((e) => {
    console.error("sync", `Failed to fetch all reminders for list ${listId}`, e);
    throw e;
  });
}

// Queue only the latest push to prevent duplicate reminder creation.

let _pushRunning = false;
let _queuedPush: { items: ShoppingListItem[]; listId: string } | null = null;

export async function pushItemsToReminders(
  items: ShoppingListItem[],
  listId: string
): Promise<void> {
  if (_pushRunning) {
    _queuedPush = { items, listId };
    return;
  }
  _pushRunning = true;
  try {
    await _executePush(items, listId);
    while (_queuedPush) {
      const { items: qi, listId: ql } = _queuedPush;
      _queuedPush = null;
      await _executePush(qi, ql);
    }
  } finally {
    _pushRunning = false;
  }
}

async function _executePush(items: ShoppingListItem[], listId: string): Promise<void> {
  const itemMap = await loadItemMap();
  const reminders = await fetchAllReminders(listId);
  const nextMap: ItemMap = {};
  const knownReminderIds = new Set(Object.values(itemMap));

  console.info("sync", "Starting push to Reminders", {
    avoCookItems: items.length,
    remindersCount: reminders.length,
    knownMappings: knownReminderIds.size,
  });

  for (const item of items) {
    const reminderId = itemMap[item.id];
    let matchedReminder = reminderId ? reminders.find((r) => r.id === reminderId) : undefined;

    if (!matchedReminder) {
      matchedReminder = reminders.find(
        (r) =>
          r.id &&
          !knownReminderIds.has(r.id) &&
          r.title?.trim().toLowerCase() === item.label.trim().toLowerCase()
      );
      if (matchedReminder) {
        console.info("sync", `Matched item by name: ${item.label}`, {
          avocookId: item.id,
          reminderId: matchedReminder.id,
        });
        knownReminderIds.add(matchedReminder.id!);
      }
    }

    const reminderDetails: Partial<Calendar.Reminder> = {
      title: item.label,
      completed: item.checked,
      calendarId: listId,
      notes: item.recipeName ? `📖 ${item.recipeName}` : undefined,
    };

    if (matchedReminder && matchedReminder.id) {
      await Calendar.updateReminderAsync(matchedReminder.id, reminderDetails).catch(
        (e) => console.warn("sync", `Failed to update reminder ${matchedReminder!.id}`, e)
      );
      nextMap[item.id] = matchedReminder.id;
    } else {
      const newId = await Calendar.createReminderAsync(listId, reminderDetails).catch(
        (e) => {
          console.warn("sync", `Failed to create reminder for ${item.label}`, e);
          return null;
        }
      );
      if (newId) {
        console.info("sync", `Created new reminder for ${item.label}`, { reminderId: newId });
        nextMap[item.id] = newId;
      }
    }
  }

  const nextMappedReminderIds = new Set(Object.values(nextMap));
  for (const reminder of reminders) {
    if (
      reminder.id &&
      knownReminderIds.has(reminder.id) &&
      !nextMappedReminderIds.has(reminder.id)
    ) {
      console.info("sync", `Item deleted in AvoCook, deleting reminder: ${reminder.title}`);
      await Calendar.deleteReminderAsync(reminder.id).catch((e) =>
        console.warn("sync", `Failed to delete orphaned reminder ${reminder.id}`, e)
      );
    }
  }

  await saveItemMap(nextMap);
  console.info("sync", "Push completed", { nextMapSize: Object.keys(nextMap).length });
}

// Concurrent focus and foreground pulls can create duplicate items.

let _pullRunning = false;

export type NewReminderItem = {
  reminderId: string;
  label: string;
  checked: boolean;
};

export type PullResult = {
  updatedItems: ShoppingListItem[];
  newReminderItems: NewReminderItem[];
  deletedItemIds: string[];
  hasChanges: boolean;
};

export async function pullItemsFromReminders(
  currentItems: ShoppingListItem[],
  listId: string
): Promise<PullResult> {
  if (_pullRunning) {
    return { updatedItems: currentItems, newReminderItems: [], deletedItemIds: [], hasChanges: false };
  }
  _pullRunning = true;
  try {
    return await _executePull(currentItems, listId);
  } finally {
    _pullRunning = false;
  }
}

async function _executePull(
  currentItems: ShoppingListItem[],
  listId: string
): Promise<PullResult> {
  const itemMap = await loadItemMap();
  const reminders = await fetchAllReminders(listId);
  
  const nextMap: ItemMap = { ...itemMap };
  const knownReminderIds = new Set(Object.values(itemMap));

  let hasChanges = false;
  const updatedItems: ShoppingListItem[] = [];
  const deletedItemIds: string[] = [];
  const newReminderItems: NewReminderItem[] = [];

  console.info("sync", "Starting pull from Reminders", {
    avoCookItems: currentItems.length,
    remindersCount: reminders.length,
  });

  for (const item of currentItems) {
    const reminderId = itemMap[item.id];
    const matchedReminder = reminderId ? reminders.find((r) => r.id === reminderId) : undefined;

    if (matchedReminder && matchedReminder.id) {
      const systemLabel = matchedReminder.title?.trim() ?? item.label;
      const systemChecked = matchedReminder.completed ?? false;

      if (systemLabel !== item.label || systemChecked !== item.checked) {
        console.info("sync", `Item updated from Rappels: ${item.label}`, {
          old: { label: item.label, checked: item.checked },
          new: { label: systemLabel, checked: systemChecked },
        });
        hasChanges = true;
        updatedItems.push({
          ...item,
          label: systemLabel,
          checked: systemChecked,
          updatedAt: new Date().toISOString(),
        });
      } else {
        updatedItems.push(item);
      }
    } else {
      if (reminderId) {
        console.info("sync", `Reminder deleted in Rappels, deleting from AvoCook: ${item.label}`);
        deletedItemIds.push(item.id);
        delete nextMap[item.id];
        hasChanges = true;
      } else {
        updatedItems.push(item);
      }
    }
  }

  const nextMappedReminderIds = new Set(Object.values(nextMap));
  for (const reminder of reminders) {
    if (
      reminder.id &&
      !knownReminderIds.has(reminder.id) &&
      !nextMappedReminderIds.has(reminder.id)
    ) {
      if (reminder.title?.trim()) {
        console.info("sync", `New reminder detected from Rappels: ${reminder.title}`);
        newReminderItems.push({
          reminderId: reminder.id,
          label: reminder.title.trim(),
          checked: reminder.completed ?? false,
        });
        hasChanges = true;
      }
    }
  }

  await saveItemMap(nextMap);
  console.info("sync", "Pull completed", { hasChanges, newCount: newReminderItems.length, delCount: deletedItemIds.length });

  return {
    updatedItems,
    newReminderItems,
    deletedItemIds,
    hasChanges,
  };
}

export async function deleteAllReminders(listId: string): Promise<void> {
  const allReminders = await fetchAllReminders(listId);
  await Promise.all(
    allReminders.map((r) =>
      r.id ? Calendar.deleteReminderAsync(r.id).catch(() => null) : null
    )
  );
}
