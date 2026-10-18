import {
  AndroidHaptics,
  performAndroidHapticsAsync,
  selectionAsync,
} from "expo-haptics";
import { Platform } from "react-native";

export function selectionFeedback() {
  const feedback =
    Platform.OS === "android"
      ? performAndroidHapticsAsync(AndroidHaptics.Clock_Tick)
      : selectionAsync();
  void feedback.catch(() => {});
}
