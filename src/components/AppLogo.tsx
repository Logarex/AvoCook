import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Circle, Ellipse, Rect } from "react-native-svg";
import { useAppTheme } from "../theme/ThemeProvider";

export function AppLogo({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors, isDark } = useAppTheme();
  return (
    <Svg accessible={false} viewBox="0 0 1024 1024" style={style}>
      <Circle cx="512" cy="512" r="326" fill={colors.primary} />
      <Circle cx="512" cy="502" r="197" fill={isDark ? colors.background : colors.textInverted} />
      <Circle cx="512" cy="516" r="130" fill={colors.accent} />
      <Ellipse cx="422" cy="286" rx="72" ry="130" fill={colors.secondary} />
      <Ellipse cx="600" cy="282" rx="70" ry="128" fill={isDark ? colors.text : colors.primary} />
      <Rect x="250" y="748" width="524" height="64" fill={colors.primaryStrong} />
    </Svg>
  );
}
