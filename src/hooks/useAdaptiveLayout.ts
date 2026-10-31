import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAdaptiveLayout } from "../utils/adaptiveLayout";
import { useContentViewport } from "./contentViewport";

export function useAdaptiveLayout() {
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const viewport = useContentViewport();
  return getAdaptiveLayout(viewport.width ?? width, fontScale, (viewport.navigationRail ? 0 : insets.left) + insets.right);
}
