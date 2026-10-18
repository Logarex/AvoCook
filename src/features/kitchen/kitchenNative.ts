import {
  requireOptionalNativeModule,
  type EventSubscription,
} from "expo-modules-core";
import { PermissionsAndroid, Platform } from "react-native";
export type StockReminder = {
  id: string;
  title: string;
  body: string;
  date: string;
};
type KitchenNative = {
  voiceAvailable: (language: string) => Promise<boolean>;
  startVoice: (language: string) => Promise<boolean>;
  stopVoice: () => Promise<void>;
  addListener: (
    name: "voiceResult" | "voiceError" | "stockReminderOpen",
    callback: (event: { text?: string }) => void,
  ) => EventSubscription;
  consumeStockReminderOpen: () => Promise<boolean>;
  requestReminderPermission: () => Promise<boolean>;
  replaceStockReminders: (json: string) => Promise<boolean>;
};
export function getKitchenNative(): KitchenNative | null {
  try {
    return requireOptionalNativeModule<KitchenNative>("AvoCookKitchen");
  } catch {
    return null;
  }
}
export async function startLocalVoice(language: string) {
  const native = getKitchenNative();
  if (!native || !(await native.voiceAvailable(language))) return false;
  if (
    Platform.OS === "android" &&
    (await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    )) !== PermissionsAndroid.RESULTS.GRANTED
  )
    return false;
  return native.startVoice(language);
}
let pending: Promise<unknown> = Promise.resolve();
export function replaceStockReminders(plan: StockReminder[]) {
  const next = pending.then(async () => {
    const native = getKitchenNative();
    if (!native) return false;
    return native.replaceStockReminders(JSON.stringify(plan));
  });
  pending = next.catch(() => undefined);
  return next;
}
