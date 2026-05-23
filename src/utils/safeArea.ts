import { Platform } from "react-native";
import { spacing } from "../theme/colors";

const IOS_TAB_BAR_VISUAL_OVERLAP = 18;

export function getBottomNavigationPadding(bottomInset: number) {
  if (Platform.OS === "ios") {
    return Math.max(
      bottomInset > 0 ? bottomInset - IOS_TAB_BAR_VISUAL_OVERLAP : 0,
      spacing.xxs
    );
  }

  return Math.max(bottomInset + spacing.xxs, spacing.xxs);
}

export function getScreenBottomPadding(bottomInset: number) {
  return spacing.md + Math.max(bottomInset, 0);
}

export function getFloatingBottomOffset(bottomInset: number) {
  return spacing.sm + Math.max(bottomInset, 0);
}
