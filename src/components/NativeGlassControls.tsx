import { requireNativeView, requireOptionalNativeModule } from "expo";
import React from "react";
import {
  Platform,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { useGlassSupport } from "../theme/GlassProvider";
import { useAppTheme } from "../theme/ThemeProvider";

type NativeUI = {
  views: typeof import("@expo/ui/swift-ui");
  modifiers: typeof import("@expo/ui/swift-ui/modifiers");
};

type NativeTabBarProps = ViewProps & {
  items: { id: string; title: string; symbol: string }[];
  selected: string;
  tintColor: string;
  unselectedTintColor: string;
  colorScheme: "light" | "dark";
  onSelect: (event: NativeSyntheticEvent<{ id: string }>) => void;
};

export const NativeTabBar =
  Platform.OS === "ios" && requireOptionalNativeModule("AvoCookNativeControls")
    ? requireNativeView<NativeTabBarProps>("AvoCookNativeControls")
    : null;

const nativeUI: NativeUI | null =
  Platform.OS === "ios" && requireOptionalNativeModule("ExpoUI")
    ? {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        views: require("@expo/ui/swift-ui"),
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        modifiers: require("@expo/ui/swift-ui/modifiers"),
      }
    : null;

export function useNativeGlassControls() {
  const { nativeGlass } = useGlassSupport();
  return nativeGlass ? nativeUI : null;
}

export function useNativeControls() {
  return nativeUI;
}

export function NativeGlassButton({
  ui,
  label,
  onPress,
  disabled = false,
  tintColor,
  prominent = false,
  square = false,
  fitContent = false,
  style,
  children,
}: {
  ui: NativeUI;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tintColor?: string;
  prominent?: boolean;
  square?: boolean;
  fitContent?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactElement;
}) {
  const { isDark } = useAppTheme();
  const { Host, Button, RNHostView } = ui.views;
  const {
    buttonStyle,
    buttonBorderShape,
    controlSize,
    disabled: disable,
    accessibilityLabel,
    tint,
  } = ui.modifiers;
  return (
    <Host
      colorScheme={isDark ? "dark" : "light"}
      ignoreSafeArea="all"
      matchContents={square ? false : fitContent ? true : { vertical: true }}
      style={style}
    >
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle(prominent ? "glassProminent" : "glass"),
          buttonBorderShape(square ? "circle" : "capsule"),
          controlSize(square ? "regular" : "large"),
          disable(disabled),
          accessibilityLabel(label),
          ...(tintColor ? [tint(tintColor)] : []),
        ]}
      >
        <RNHostView
          matchContents={square || fitContent ? true : { vertical: true }}
        >
          {children}
        </RNHostView>
      </Button>
    </Host>
  );
}
