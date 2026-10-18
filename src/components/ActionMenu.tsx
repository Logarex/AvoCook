import { Ellipsis, type LucideIcon } from "lucide-react-native";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, View } from "react-native";
import { useGlassSupport } from "../theme/GlassProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppSheet } from "./AppSheet";
import { GlassPanel } from "./GlassPanel";
import { IconButton } from "./IconButton";
import { useNativeControls } from "./NativeGlassControls";
import { SettingsRow } from "./SettingsRow";

export type MenuAction = {
  id: string;
  label: string;
  icon?: LucideIcon;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export function ActionMenu({
  actions,
  label,
  icon: Icon = Ellipsis,
}: {
  actions: MenuAction[];
  label?: string;
  icon?: LucideIcon;
}) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { nativeGlass } = useGlassSupport();
  const ui = useNativeControls();
  const [visible, setVisible] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const title = label ?? t("ui.more");
  if (ui) {
    const { Host, Menu, Button, RNHostView } = ui.views;
    const { buttonStyle, buttonBorderShape, accessibilityLabel, disabled } =
      ui.modifiers;
    return (
      <Host
        colorScheme={isDark ? "dark" : "light"}
        ignoreSafeArea="all"
        style={styles.trigger}
      >
        <Menu
          label={
            <RNHostView matchContents>
              <View
                collapsable={false}
                pointerEvents="none"
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.icon}
              >
                <Icon color={colors.text} size={22} />
              </View>
            </RNHostView>
          }
          modifiers={[
            buttonStyle(nativeGlass ? "glass" : "bordered"),
            buttonBorderShape("circle"),
            accessibilityLabel(title),
          ]}
        >
          {actions.map((action) => (
            <Button
              key={action.id}
              label={action.label}
              role={action.destructive ? "destructive" : "default"}
              modifiers={[disabled(Boolean(action.disabled))]}
              onPress={action.onPress}
            />
          ))}
        </Menu>
      </Host>
    );
  }
  function select(action: MenuAction) {
    if (Platform.OS === "ios") pending.current = action.onPress;
    setVisible(false);
    if (Platform.OS !== "ios") action.onPress();
  }
  return (
    <>
      <IconButton icon={Icon} label={title} onPress={() => setVisible(true)} />
      <AppSheet
        title={title}
        visible={visible}
        onClose={() => setVisible(false)}
        onDismiss={() => {
          const action = pending.current;
          pending.current = null;
          action?.();
        }}
      >
        <GlassPanel style={styles.group}>
          {actions.map((action) => (
            <SettingsRow
              key={action.id}
              title={action.label}
              icon={action.icon}
              disabled={action.disabled}
              danger={action.destructive}
              onPress={() => select(action)}
            />
          ))}
        </GlassPanel>
      </AppSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { width: 44, height: 44 },
  icon: { width: 22, height: 22 },
  group: { padding: 0 },
});
