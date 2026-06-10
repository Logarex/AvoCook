import * as Calendar from "expo-calendar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { ShoppingListItem } from "./shoppingList";
import { logInfo, logWarn, logError } from "../logging/appLogger";

const REMINDERS_LIST_ID_KEY = "shopping.reminders.listId.v1";
const REMINDERS_ITEM_MAP_KEY = "shopping.reminders.itemMap.v1";

// Maps AvoCook item id → system reminder id
type ItemMap = Record<string, string>;

// ─── Platform guard ───────────────────────────────────────────────────────────

export function isRemindersAvailable(): boolean {
  return Platform.OS === "ios";
}

// ─── Permissions ──────────────────────────────────────────────────────────────

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

// ─── List management ──────────────────────────────────────────────────────────

const AVOCOOK_LIST_NAME = "AvoCook";

export async function findOrCreateAvoCookList(): Promise<string> {
  const storedId = await AsyncStorage.getItem(REMINDERS_LIST_ID_KEY);
  if (storedId) {
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER);
      if (calendars.find((c) => c.id === storedId)) return storedId;
    } catch {
      // fall through
    }
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER);
  const existing = calendars.find((c) => c.title === AVOCOOK_LIST_NAME);
  if (existing) {
    await AsyncStorage.setItem(REMINDERS_LIST_ID_KEY, existing.id);
    return existing.id;
  }

  const defaultSource =
    calendars.find((c) => c.source?.isLocalAccount)?.source ?? calendars[0]?.source;

  const newId = await Calendar.createCalendarAsync({
    title: AVOCOOK_LIST_NAME,
    color: "#4CAF50",
    entityType: Calendar.EntityTypes.REMINDER,
    sourceId: defaultSource?.id,
    source: defaultSource ?? { isLocalAccount: true, name: "AvoCook", type: "local" },
    name: AVOCOOK_LIST_NAME,
    ownerAccount: "personal",
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  await AsyncStorage.setItem(REMINDERS_LIST_ID_KEY, newId);
  return newId;
}

export async function getLinkedListId(): Promise<string | null> {
  return AsyncStorage.getItem(REMINDERS_LIST_ID_KEY);
}

export async function clearLinkedListId(): Promise<void> {
  await AsyncStorage.removeItem(REMINDERS_LIST_ID_KEY);
}

// ─── Item map persistence ─────────────────────────────────────────────────────

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

/**
 * Registers reminder IDs for items that were added from the Rappels app.
 * Call right after addIngredients() so the next push updates (not re-creates) them.
 */
export async function registerReminderMappings(
  mappings: Array<{ avocookId: string; reminderId: string }>
): Promise<void> {
  if (mappings.length === 0) return;
  const itemMap = await loadItemMap();
  for (const { avocookId, reminderId } of mappings) {
    itemMap[avocookId] = reminderId;
  }
  await saveItemMap(itemMap);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fetch ALL reminders (incomplete + completed) for a given list. */
async function fetchAllReminders(listId: string): Promise<Calendar.Reminder[]> {
  // Pass null for status and dates to bypass expo-calendar's date requirement
  // and fetch all reminders regardless of completion or due dates.
  return Calendar.getRemindersAsync(
    [listId],
    null,
    null,
    null
  ).catch((e) => {
    logError("sync", "Failed to fetch all reminders", e);
    return [] as Calendar.Reminder[];
  });
}

/** Fetch only INCOMPLETE reminders for a given list. */
async function fetchIncompleteReminders(listId: string): Promise<Calendar.Reminder[]> {
  const range = { start: new Date(2000, 0, 1), end: new Date(2099, 11, 31) };
  return Calendar.getRemindersAsync(
    [listId],
    Calendar.ReminderStatus.INCOMPLETE,
    range.start,
    range.end
  ).catch(() => [] as Calendar.Reminder[]);
}

// ─── Push lock ────────────────────────────────────────────────────────────────
// Only one push runs at a time. If a new push arrives while one is running,
// we store the latest args (only the LAST queued push matters).
// This prevents concurrent pushes from reading the same stale itemMap
// and creating duplicate reminders.

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

/**
 * Sync rules for push (AvoCook state wins):
 * - If a mapped reminder exists, update it to match AvoCook.
 * - If no mapped reminder exists, try finding an unmapped reminder with the same name.
 * - If still none, create a new reminder.
 * - If an item was previously mapped but is missing from current `items`, delete the reminder.
 */
async function _executePush(items: ShoppingListItem[], listId: string): Promise<void> {
  const itemMap = await loadItemMap();
  const reminders = await fetchAllReminders(listId);
  const nextMap: ItemMap = {};
  const knownReminderIds = new Set(Object.values(itemMap));

  logInfo("sync", "Starting push to Reminders", {
    avoCookItems: items.length,
    remindersCount: reminders.length,
    knownMappings: knownReminderIds.size,
  });

  for (const item of items) {
    const reminderId = itemMap[item.id];
    let matchedReminder = reminderId ? reminders.find((r) => r.id === reminderId) : undefined;

    // Fallback: name matching
    if (!matchedReminder) {
      matchedReminder = reminders.find(
        (r) =>
          r.id &&
          !knownReminderIds.has(r.id) &&
          r.title?.trim().toLowerCase() === item.label.trim().toLowerCase()
      );
      if (matchedReminder) {
        logInfo("sync", `Matched item by name: ${item.label}`, {
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
      // Both exist -> update reminder to match AvoCook
      await Calendar.updateReminderAsync(matchedReminder.id, reminderDetails).catch(
        (e) => logWarn("sync", `Failed to update reminder ${matchedReminder!.id}`, e)
      );
      nextMap[item.id] = matchedReminder.id;
    } else {
      // New in AvoCook -> create reminder
      const newId = await Calendar.createReminderAsync(listId, reminderDetails).catch(
        (e) => {
          logWarn("sync", `Failed to create reminder for ${item.label}`, e);
          return null;
        }
      );
      if (newId) {
        logInfo("sync", `Created new reminder for ${item.label}`, { reminderId: newId });
        nextMap[item.id] = newId;
      }
    }
  }

  // Deletions: if a reminder was in the old map, but the item is gone from `items`
  const nextMappedReminderIds = new Set(Object.values(nextMap));
  for (const reminder of reminders) {
    if (
      reminder.id &&
      knownReminderIds.has(reminder.id) &&
      !nextMappedReminderIds.has(reminder.id)
    ) {
      logInfo("sync", `Item deleted in AvoCook, deleting reminder: ${reminder.title}`);
      await Calendar.deleteReminderAsync(reminder.id).catch((e) =>
        logWarn("sync", `Failed to delete orphaned reminder ${reminder.id}`, e)
      );
    }
  }

  await saveItemMap(nextMap);
  logInfo("sync", "Push completed", { nextMapSize: Object.keys(nextMap).length });
}

// ─── Pull lock ────────────────────────────────────────────────────────────────
// The pull lock prevents concurrent pulls (e.g., useFocusEffect + AppState
// firing at the same time) from both reading the same empty itemMap and
// adding the same new reminder as duplicate AvoCook items.

let _pullRunning = false;

// ─── Pull: Reminders → App ────────────────────────────────────────────────────

export type NewReminderItem = {
  reminderId: string;
  label: string;
  checked: boolean;
};

export type PullResult = {
  /** Existing AvoCook items whose label or checked state was changed in Rappels. */
  updatedItems: ShoppingListItem[];
  /** New reminders added directly in Rappels. */
  newReminderItems: NewReminderItem[];
  /** AvoCook IDs of items that were deleted in Rappels. */
  deletedItemIds: string[];
  hasChanges: boolean;
};

/**
 * Pull rules (Reminders state wins):
 * - If a mapped reminder exists, update AvoCook item to match reminder.
 * - If an item is unmapped, try to find an unmapped reminder with the same name.
 * - If a reminder was mapped but is now gone, report it in deletedItemIds.
 * - If a reminder is completely new and unmapped, return as newReminderItems.
 */
export async function pullItemsFromReminders(
  currentItems: ShoppingListItem[],
  listId: string
): Promise<PullResult> {
  // Pull lock: if a pull is already in progress, skip this one.
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

  logInfo("sync", "Starting pull from Reminders", {
    avoCookItems: currentItems.length,
    remindersCount: reminders.length,
  });

  // ── Update or delete existing items ──────────────────────────────────────
  for (const item of currentItems) {
    const reminderId = itemMap[item.id];
    const matchedReminder = reminderId ? reminders.find((r) => r.id === reminderId) : undefined;

    if (matchedReminder && matchedReminder.id) {
      // Both exist. Reminders wins -> update AvoCook item to match reminder.
      const systemLabel = matchedReminder.title?.trim() ?? item.label;
      const systemChecked = matchedReminder.completed ?? false;

      if (systemLabel !== item.label || systemChecked !== item.checked) {
        logInfo("sync", `Item updated from Rappels: ${item.label}`, {
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
      // Reminder is gone! Was it previously mapped?
      if (reminderId) {
        logInfo("sync", `Reminder deleted in Rappels, deleting from AvoCook: ${item.label}`);
        deletedItemIds.push(item.id);
        delete nextMap[item.id];
        hasChanges = true;
      } else {
        // Just an unmapped AvoCook item, leave it alone.
        updatedItems.push(item);
      }
    }
  }

  // ── Detect new reminders added directly in Rappels ─────────────────────────
  const nextMappedReminderIds = new Set(Object.values(nextMap));
  for (const reminder of reminders) {
    if (
      reminder.id &&
      !knownReminderIds.has(reminder.id) &&
      !nextMappedReminderIds.has(reminder.id)
    ) {
      // Brand new reminder in Reminders!
      if (reminder.title?.trim()) {
        logInfo("sync", `New reminder detected from Rappels: ${reminder.title}`);
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
  logInfo("sync", "Pull completed", { hasChanges, newCount: newReminderItems.length, delCount: deletedItemIds.length });

  return {
    updatedItems,
    newReminderItems,
    deletedItemIds,
    hasChanges,
  };
}

// ─── Delete all reminders in the AvoCook list ─────────────────────────────────

export async function deleteAllReminders(listId: string): Promise<void> {
  const allReminders = await fetchAllReminders(listId);
  await Promise.all(
    allReminders.map((r) =>
      r.id ? Calendar.deleteReminderAsync(r.id).catch(() => null) : null
    )
  );
}
