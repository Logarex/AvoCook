import React, { createContext, useContext, useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";

const ReducedTransparencyContext = createContext(true);

export function GlassProvider({ children }: { children?: React.ReactNode }) {
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
    }
  }
  return { nativeGlass, reducedTransparency };
}
