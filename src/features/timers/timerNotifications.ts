import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const TIMER_STOP_ACTION = "stop-timer";

const TIMER_NOTIFICATION_CATEGORY = "recipe-timer";
const TIMER_NOTIFICATION_CHANNEL = "recipe-timers";

let configured = false;

export async function configureTimerNotifications() {
  if (configured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false
    })
  });

  await Notifications.setNotificationCategoryAsync(
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
    await Notifications.setNotificationChannelAsync(TIMER_NOTIFICATION_CHANNEL, {
      name: "Minuteurs",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 500, 250, 500],
      enableVibrate: true
    });
  }

  configured = true;
}

export async function requestTimerNotificationPermission() {
  await configureTimerNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync({
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
  const allowed = await requestTimerNotificationPermission();
  if (!allowed) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
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
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: Date.now() + Math.max(1, seconds) * 1000,
      channelId: TIMER_NOTIFICATION_CHANNEL
    }
  });
}

export async function cancelTimerNotification(notificationId?: string | null) {
  if (!notificationId) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(
    () => undefined
  );
  await Notifications.dismissNotificationAsync(notificationId).catch(
    () => undefined
  );
}
