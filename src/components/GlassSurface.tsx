import { BlurView } from "expo-blur";
import { GlassView } from "expo-glass-effect";
import React, { createContext, useContext } from "react";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";
import { useGlassSupport } from "../theme/GlassProvider";
import { useAppTheme } from "../theme/ThemeProvider";

const GlassLayerContext = createContext(false);

type GlassSurfaceProps = ViewProps & {
  tintColor?: string;
  interactive?: boolean;
  intensity?: number;
};

export function GlassSurface({
  children,
  style,
  tintColor,
  interactive = false,
  intensity = 55,
  ...props
}: GlassSurfaceProps) {
  const { colors, isDark } = useAppTheme();
  const { nativeGlass, reducedTransparency } = useGlassSupport();
  const insideGlass = useContext(GlassLayerContext);
  const content = (
    <GlassLayerContext.Provider value={true}>
      {children}
    </GlassLayerContext.Provider>
  );

  // Avoid stacking native glass layers.
  if (insideGlass) {
    return (
      <View {...props} style={[style, { backgroundColor: tintColor ?? "transparent" }]}>
        {children}
      </View>
    );
  }

  if (nativeGlass) {
    return (
      <GlassView
        {...props}
        glassEffectStyle="regular"
        colorScheme={isDark ? "dark" : "light"}
        isInteractive={interactive}
        tintColor={tintColor}
        style={[style, styles.native]}
      >
        {content}
      </GlassView>
    );
  }

  if (Platform.OS === "ios" && !reducedTransparency) {
    return (
      <BlurView
        {...props}
        intensity={intensity}
        tint={isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
        style={[
          styles.fallback,
          { borderColor: tintColor ?? colors.border },
          style,
          styles.blur,
          { backgroundColor: tintColor ?? colors.surfaceGlass }
        ]}
      >
        {content}
      </BlurView>
    );
  }

  return (
    <View
      {...props}
      style={[
        styles.fallback,
        { borderColor: tintColor ?? colors.border },
        style,
        { backgroundColor: tintColor ?? colors.backgroundElevated }
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  // Backgrounds and borders would cover the native glass effect.
  native: { backgroundColor: "transparent", borderWidth: 0 },
  blur: { overflow: "hidden" },
  fallback: { borderWidth: StyleSheet.hairlineWidth }
});
