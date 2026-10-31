import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTabBarContentInset } from "../utils/safeArea";
import { spacing } from "../theme/colors";
import { useContentViewport } from "./contentViewport";

export function useNavigationContentInset(fontScale = 1) {
  const { bottom } = useSafeAreaInsets();
  const { navigationRail } = useContentViewport();
  return navigationRail ? spacing.md : getTabBarContentInset(bottom, fontScale);
}
