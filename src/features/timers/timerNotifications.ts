import { Platform } from "react-native";

type ExpoNotificationsModule = typeof import("expo-notifications");
type TimerStopEvent = {
  notificationId: string;
  recipeId: string;
  timerId: string;
};
type TimerNotificationSubscription = {
  remove: () => void;
};

export const TIMER_STOP_ACTION = "stop-timer";

const TIMER_NOTIFICATION_CATEGORY = "recipe-timer";
const TIMER_NOTIFICATION_CHANNEL = "recipe-timers";

let configured = false;
let notificationsPromise: Promise<ExpoNotificationsModule | null> | null = null;

async function getNotifications() {
  if (!notificationsPromise) {
    notificationsPromise = import("expo-notifications").catch(() => null);
  }

  return notificationsPromise;
}

export async function configureTimerNotifications() {
  const notifications = await getNotifications();
  if (!notifications || configured) {
    return Boolean(notifications);
  }

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

  if (Platform.OS === "android") {
    await notifications.setNotificationChannelAsync(
      TIMER_NOTIFICATION_CHANNEL,
      {
        name: "Minuteurs",
        importance: notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 500, 250, 500],
        enableVibrate: true
      }
    );
  }

  configured = true;
  return true;
}

export async function requestTimerNotificationPermission() {
  const notifications = await getNotifications();
  if (!notifications || !(await configureTimerNotifications())) {
    return false;
  }

  const current = await notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const requested = await notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true
    }
  });

  return requested.granted;
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
}) {
  const notifications = await getNotifications();
  const allowed = await requestTimerNotificationPermission();
  if (!notifications || !allowed) {
    return null;
  }

  return notifications.scheduleNotificationAsync({
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
}

export async function cancelTimerNotification(notificationId?: string | null) {
  if (!notificationId) {
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
  const notifications = await getNotifications();
  if (!notifications) {
    return null;
  }

  return notifications.addNotificationResponseReceivedListener((response) => {
    if (response.actionIdentifier !== TIMER_STOP_ACTION) {
      return;
    }

    const data = response.notification.request.content.data;
    if (typeof data.recipeId !== "string" || typeof data.timerId !== "string") {
      return;
    }

    onStop({
      notificationId: response.notification.request.identifier,
      recipeId: data.recipeId,
      timerId: data.timerId
    });
  });
}

