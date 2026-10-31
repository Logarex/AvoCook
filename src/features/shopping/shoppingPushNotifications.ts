import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { requestShoppingRelay, shoppingRelayUrl } from "./shoppingPushClient";
import { getDeviceId } from "./sharedListClient";
import i18n from "../../i18n";

// Serialize changes so a late registration cannot re-enable a previous list.
let pending: Promise<unknown> = Promise.resolve();
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

export function useShoppingPushNotifications(code: string | null, enabled: boolean) {
  const [status, setStatus] = useState<"unknown" | "ready" | "denied" | "unavailable" | "disabled">("unknown");
  const { i18n: translations } = useTranslation();
  const language = translations.resolvedLanguage ?? translations.language;
  useEffect(() => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;
    let disposed = false;
    setStatus(code && enabled ? "unknown" : "disabled");
    const sync = () => {
      pending = pending.catch(() => undefined).then(async () => {
        if (disposed) return;
        if (!shoppingRelayUrl()) {
          if (code && enabled) setStatus("unavailable");
          return;
        }
        const deviceId = await getDeviceId();
        let token: string | null = null;
        let channelEnabled = true;
        if (code && enabled) {
          if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync("shopping", {
              name: i18n.t("shoppingList.notificationTitle"),
              importance: Notifications.AndroidImportance.DEFAULT,
              sound: "default",
            });
            const channel = await Notifications.getNotificationChannelAsync("shopping");
            channelEnabled = channel?.importance !== Notifications.AndroidImportance.NONE;
          }
          let permission = await Notifications.getPermissionsAsync();
          if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
          if (permission.granted && channelEnabled && permission.ios?.allowsAlert !== false) {
            const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
            if (!projectId) throw new Error("Missing push project ID");
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
          }
        }
        if (disposed) return;
        await requestShoppingRelay("/subscription", {
          deviceId, code: token ? code : null, token,
          title: i18n.t("shoppingList.notificationTitle"),
          added: i18n.t("shoppingList.notificationAdded", { count: "{count}" }),
          removed: i18n.t("shoppingList.notificationRemoved", { count: "{count}" }),
        });
        if (!disposed) setStatus(!code || !enabled ? "disabled" : token ? "ready" : "denied");
      }).catch((error: unknown) => {
        console.warn("[ShoppingPush] Registration failed", error);
        if (!disposed) setStatus("unavailable");
      });
    };
    sync();
    const appSubscription = AppState.addEventListener("change", (state) => { if (state === "active") sync(); });
    const tokenSubscription = Notifications.addPushTokenListener(sync);
    return () => { disposed = true; appSubscription.remove(); tokenSubscription.remove(); };
  }, [code, enabled, language]);
  return status;
}
