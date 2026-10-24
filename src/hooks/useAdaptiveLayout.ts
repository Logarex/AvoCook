import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAdaptiveLayout } from "../utils/adaptiveLayout";

export function useAdaptiveLayout() {
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return getAdaptiveLayout(width, fontScale, insets.left + insets.right);
}
