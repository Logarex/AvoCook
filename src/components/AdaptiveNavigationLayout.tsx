import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ContentViewportContext } from "../hooks/contentViewport";
import { getNavigationLayout } from "../utils/adaptiveLayout";
import { useAppTheme } from "../theme/ThemeProvider";
import { BottomNavigation, type BottomNavigationTab } from "./BottomNavigation";

export function AdaptiveNavigationLayout({ children, current, onNavigate }: {
  children?: React.ReactNode;
  current?: BottomNavigationTab;
  onNavigate: (tab: BottomNavigationTab) => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const layout = getNavigationLayout(width, fontScale, insets.left, insets.right, Boolean(current));
  const navigation = current ? <BottomNavigation current={current} onNavigate={onNavigate} rail={layout.navigationRail} /> : null;

  return (
    <ContentViewportContext.Provider value={{ width: layout.contentWidth, navigationRail: layout.navigationRail }}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Keep the navigator mounted when the navigation layout changes. */}
        <View style={{ width: layout.railWidth }}>{layout.navigationRail ? navigation : null}</View>
        <View style={styles.content}>
          {children}
          {!layout.navigationRail ? navigation : null}
        </View>
      </View>
    </ContentViewportContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" },
  content: { flex: 1, minWidth: 0 },
});
