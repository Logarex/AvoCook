import React, { createContext, useContext, useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";

const ReducedTransparencyContext = createContext(true);

/** Share one accessibility subscription across all glass controls. */
export function GlassProvider({ children }: { children?: React.ReactNode }) {
  // Start opaque until the system preference has been read.
  const [reducedTransparency, setReducedTransparency] = useState(true);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let mounted = true;
    let preferenceChanged = false;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      (enabled) => {
        preferenceChanged = true;
        setReducedTransparency(enabled);
      }
    );
    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((enabled) => {
        if (mounted && !preferenceChanged) setReducedTransparency(enabled);
      })
      .catch(() => {
        // Keep the opaque, accessible fallback.
      });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return (
    <ReducedTransparencyContext.Provider value={reducedTransparency}>
      {children}
    </ReducedTransparencyContext.Provider>
  );
}

export function useGlassSupport() {
  const reducedTransparency = useContext(ReducedTransparencyContext);
  let nativeGlass = false;
  if (Platform.OS === "ios" && !reducedTransparency) {
    try {
      nativeGlass = isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
    } catch {
      // An older development binary can be missing the new native module.
    }
  }
  return { nativeGlass, reducedTransparency };
}
