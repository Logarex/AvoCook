import { t } from "i18next";
import {
  requireOptionalNativeModule,
  type EventSubscription
} from "expo-modules-core";

type TimerStopEvent = {
  notificationId: string;
  recipeId: string;
  timerId: string;
};
type NativeTimerStopEvent = Partial<TimerStopEvent>;
type NativeTimerNotificationsModule = {
  addListener?: (
    eventName: "timerStop",
    listener: (event: NativeTimerStopEvent) => void
  ) => EventSubscription;
  cancelTimerNotification: (notificationId: string) => Promise<void>;
  configureTimerNotifications: (
    stopActionTitle: string,
    channelName: string
  ) => Promise<boolean>;
  getTimerNotificationState: () => Promise<TimerNotificationState>;
  requestTimerNotificationPermission: () => Promise<TimerNotificationState>;
  scheduleTimerNotification: (
    title: string,
    body: string,
    recipeId: string,
    timerId: string,
    seconds: number
  ) => Promise<string>;
};
export type TimerNotificationState = "denied" | "ready" | "unavailable";

let configured = false;

function getTimerNotificationsModule() {
  try {
    const notifications = requireOptionalNativeModule<NativeTimerNotificationsModule>(
      "AvoCookTimerNotifications"
    );

    if (!notifications) {
      console.warn("[AvoCookTimers] Native timer notifications module is unavailable.");
    }

    return notifications;
  } catch (error) {
    console.warn("[AvoCookTimers] Native timer notifications lookup failed.", error);
    return null;
  }
}

export async function configureTimerNotifications() {
  const notifications = getTimerNotificationsModule();
  if (!notifications) {
    return false;
  }

  if (configured) {
    return true;
  }

  try {
    await notifications.configureTimerNotifications(
      t("recipes.timers.stopAction"),
      t("recipes.timers.title")
    );
  } catch (error) {
    console.warn("[AvoCookTimers] Timer notification configuration failed.", error);
    return false;
  }

  configured = true;
  return true;
}

export async function requestTimerNotificationPermission(): Promise<TimerNotificationState> {
  const notifications = getTimerNotificationsModule();
  if (!notifications || !(await configureTimerNotifications())) {
    return "unavailable";
  }

  try {
    return await notifications.requestTimerNotificationPermission();
  } catch (error) {
    console.warn("[AvoCookTimers] Timer notification permission request failed.", error);
    return "unavailable";
  }
}

export async function getTimerNotificationState(): Promise<TimerNotificationState> {
  const notifications = getTimerNotificationsModule();
  if (!notifications || !(await configureTimerNotifications())) {
    return "unavailable";
  }

  try {
    return await notifications.getTimerNotificationState();
  } catch (error) {
    console.warn("[AvoCookTimers] Timer notification state lookup failed.", error);
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
  const notifications = getTimerNotificationsModule();
  const state = await requestTimerNotificationPermission();
  if (!notifications || state !== "ready") {
    return { notificationId: null, state };
  }

  try {
    const notificationId = await notifications.scheduleTimerNotification(
      title,
      body,
      recipeId,
      timerId,
      Math.max(1, seconds)
    );
    return { notificationId, state };
  } catch (error) {
    console.warn("[AvoCookTimers] Timer notification scheduling failed.", error);
    return { notificationId: null, state: "unavailable" as const };
  }
}

export async function cancelTimerNotification(notificationId?: string | null) {
  if (!notificationId) {
    return;
  }

  const notifications = getTimerNotificationsModule();
  if (!notifications) {
    return;
  }

  await notifications.cancelTimerNotification(notificationId).catch(() => undefined);
}

export async function addTimerStopListener(
  onStop: (event: TimerStopEvent) => void
): Promise<EventSubscription | null> {
  const notifications = getTimerNotificationsModule();
  if (!notifications?.addListener) {
    return null;
  }

  try {
    return notifications.addListener("timerStop", (event) => {
      if (
        typeof event.notificationId !== "string" ||
        typeof event.recipeId !== "string" ||
        typeof event.timerId !== "string"
      ) {
        return;
      }

      onStop({
        notificationId: event.notificationId,
        recipeId: event.recipeId,
        timerId: event.timerId
      });
    });
  } catch {
    return null;
  }
}
