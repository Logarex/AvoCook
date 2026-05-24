import { Platform } from "react-native";

type ExpoNotificationsModule = typeof import("expo-notifications");
type AndroidTimerNotificationsModule = {
  cancelAsync: (notificationId: string) => Promise<void>;
  configureAsync: () => Promise<boolean>;
  dismissAsync: (notificationId: string) => Promise<void>;
  getPermissionStateAsync: () => Promise<TimerNotificationState>;
  requestPermissionAsync: () => Promise<TimerNotificationState>;
  scheduleAsync: (
    notificationId: string,
    title: string,
    body: string,
    triggerAtMillis: number,
    channelId: string,
    recipeId: string,
    timerId: string
  ) => Promise<string>;
};
type TimerStopEvent = {
  notificationId: string;
  recipeId: string;
  timerId: string;
};
type TimerNotificationSubscription = {
  remove: () => void;
};
export type TimerNotificationState = "denied" | "ready" | "unavailable";

export const TIMER_STOP_ACTION = "stop-timer";

const TIMER_NOTIFICATION_CATEGORY = "recipe-timer";
const TIMER_NOTIFICATION_CHANNEL = "recipe-timers";

let configured = false;
let notificationsPromise: Promise<ExpoNotificationsModule | null> | null = null;
let androidNotificationsPromise: Promise<AndroidTimerNotificationsModule | null> | null =
  null;

async function getAndroidNotifications() {
  if (Platform.OS !== "android") {
    return null;
  }

  if (!androidNotificationsPromise) {
    androidNotificationsPromise = import("expo-modules-core")
      .then(({ requireNativeModule }) =>
        requireNativeModule<AndroidTimerNotificationsModule>(
          "AvoCookTimerNotifications"
        )
      )
      .catch(() => null);
  }

  return androidNotificationsPromise;
}

async function getNotifications() {
  if (!notificationsPromise) {
    notificationsPromise = import("expo-notifications").catch(() => null);
  }

  return notificationsPromise;
}

export async function configureTimerNotifications() {
  if (Platform.OS === "android") {
    const notifications = await getAndroidNotifications();
    if (!notifications || configured) {
      return Boolean(notifications);
    }

    try {
      await notifications.configureAsync();
    } catch {
      androidNotificationsPromise = Promise.resolve(null);
      return false;
    }

    configured = true;
    return true;
  }

  const notifications = await getNotifications();
  if (!notifications || configured) {
    return Boolean(notifications);
  }

  try {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false
      })
    });

    await notifications.setNotificationCategoryAsync(
      TIMER_NOTIFICATION_CATEGORY,
      [
        {
          identifier: TIMER_STOP_ACTION,
          buttonTitle: "Arrêter",
          options: {
            opensAppToForeground: true
          }
        }
      ]
    );

  } catch {
    notificationsPromise = Promise.resolve(null);
    return false;
  }

  configured = true;
  return true;
}

export async function requestTimerNotificationPermission(): Promise<TimerNotificationState> {
  if (Platform.OS === "android") {
    const notifications = await getAndroidNotifications();
    if (!notifications || !(await configureTimerNotifications())) {
      return "unavailable";
    }

    try {
      return await notifications.requestPermissionAsync();
    } catch {
      androidNotificationsPromise = Promise.resolve(null);
      return "unavailable";
    }
  }

  const notifications = await getNotifications();
  if (!notifications || !(await configureTimerNotifications())) {
    return "unavailable";
  }

  try {
    const current = await notifications.getPermissionsAsync();
    if (current.granted) {
      return "ready";
    }

    const requested = await notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true
      }
    });

    return requested.granted ? "ready" : "denied";
  } catch {
    notificationsPromise = Promise.resolve(null);
    return "unavailable";
  }
}

export async function getTimerNotificationState(): Promise<TimerNotificationState> {
  if (Platform.OS === "android") {
    const notifications = await getAndroidNotifications();
    if (!notifications || !(await configureTimerNotifications())) {
      return "unavailable";
    }

    try {
      return await notifications.getPermissionStateAsync();
    } catch {
      androidNotificationsPromise = Promise.resolve(null);
      return "unavailable";
    }
  }

  const notifications = await getNotifications();
  if (!notifications || !(await configureTimerNotifications())) {
    return "unavailable";
  }

  try {
    const current = await notifications.getPermissionsAsync();
    return current.granted ? "ready" : "denied";
  } catch {
    notificationsPromise = Promise.resolve(null);
    return "unavailable";
  }
}

export async function scheduleTimerNotification({
  body,
  recipeId,
  seconds,
  timerId,
  title
}: {
  body: string;
  recipeId: string;
  seconds: number;
  timerId: string;
  title: string;
}): Promise<{ notificationId: string | null; state: TimerNotificationState }> {
  if (Platform.OS === "android") {
    const notifications = await getAndroidNotifications();
    const state = await requestTimerNotificationPermission();
    if (!notifications || state !== "ready") {
      return { notificationId: null, state };
    }

    try {
      const notificationId = `timer-${recipeId}-${timerId}-${Date.now()}`;
      await notifications.scheduleAsync(
        notificationId,
        title,
        body,
        Date.now() + Math.max(1, seconds) * 1000,
        TIMER_NOTIFICATION_CHANNEL,
        recipeId,
        timerId
      );
      return { notificationId, state };
    } catch {
      androidNotificationsPromise = Promise.resolve(null);
      return { notificationId: null, state: "unavailable" as const };
    }
  }

  const notifications = await getNotifications();
  const state = await requestTimerNotificationPermission();
  if (!notifications || state !== "ready") {
    return { notificationId: null, state };
  }

  try {
    const notificationId = await notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        categoryIdentifier: TIMER_NOTIFICATION_CATEGORY,
        data: {
          recipeId,
          timerId
        },
        interruptionLevel: "timeSensitive",
        vibrate: [0, 500, 250, 500]
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: Date.now() + Math.max(1, seconds) * 1000,
        channelId: TIMER_NOTIFICATION_CHANNEL
      }
    });
    return { notificationId, state };
  } catch {
    notificationsPromise = Promise.resolve(null);
    return { notificationId: null, state: "unavailable" as const };
  }
}

export async function cancelTimerNotification(notificationId?: string | null) {
  if (!notificationId) {
    return;
  }

  if (Platform.OS === "android") {
    const notifications = await getAndroidNotifications();
    if (!notifications) {
      return;
    }

    await notifications.cancelAsync(notificationId).catch(() => undefined);
    await notifications.dismissAsync(notificationId).catch(() => undefined);
    return;
  }

  const notifications = await getNotifications();
  if (!notifications) {
    return;
  }

  await notifications.cancelScheduledNotificationAsync(notificationId).catch(
    () => undefined
  );
  await notifications.dismissNotificationAsync(notificationId).catch(
    () => undefined
  );
}

export async function addTimerStopListener(
  onStop: (event: TimerStopEvent) => void
): Promise<TimerNotificationSubscription | null> {
  if (Platform.OS === "android") {
    return null;
  }

  const notifications = await getNotifications();
  if (!notifications) {
    return null;
  }

  try {
    return notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier !== TIMER_STOP_ACTION) {
        return;
      }

      const data = response.notification.request.content.data;
      if (
        typeof data.recipeId !== "string" ||
        typeof data.timerId !== "string"
      ) {
        return;
      }

      onStop({
        notificationId: response.notification.request.identifier,
        recipeId: data.recipeId,
        timerId: data.timerId
      });
    });
  } catch {
    notificationsPromise = Promise.resolve(null);
    return null;
  }
}
