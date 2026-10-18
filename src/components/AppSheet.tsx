import { ArrowLeft, X } from "lucide-react-native";
import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useReducedMotion } from "../features/accessibility/useReducedMotion";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { IconButton } from "./IconButton";
import { useNativeControls } from "./NativeGlassControls";

export function useSheetActions(onClose: () => void) {
  const pending = useRef<(() => void) | null>(null);
  return {
    dismissThen(action: () => void) {
      if (Platform.OS === "ios") pending.current = action;
      onClose();
      if (Platform.OS !== "ios") action();
    },
    afterDismiss() {
      const action = pending.current;
      pending.current = null;
      action?.();
    },
  };
}

export function AppSheet({
  visible,
  title,
  onClose,
  onBack,
  onDismiss,
  busy = false,
  scroll = true,
  compact = false,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onBack?: () => void;
  onDismiss?: () => void;
  busy?: boolean;
  scroll?: boolean;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const ui = useNativeControls();
  const ios = Platform.OS === "ios";
  const close = () => {
    if (!busy) onClose();
  };
  const header = (
    <View style={styles.header}>
      {onBack ? (
        <IconButton
          icon={ArrowLeft}
          label={t("common.back")}
          disabled={busy}
          onPress={onBack}
        />
      ) : null}
      <AppText
        accessibilityRole="header"
        variant="subtitle"
        style={styles.title}
      >
        {title}
      </AppText>
      <IconButton
        icon={X}
        label={t("common.close")}
        disabled={busy}
        onPress={close}
      />
    </View>
  );
  if (ui) {
    const { Host, BottomSheet, Group, RNHostView } = ui.views;
    const {
      presentationDetents,
      presentationDragIndicator,
      presentationBackground,
      interactiveDismissDisabled,
    } = ui.modifiers;
    return (
      <Host colorScheme={isDark ? "dark" : "light"} style={styles.anchor}>
        <BottomSheet
          isPresented={visible}
          fitToContents={compact}
          onIsPresentedChange={(presented) => {
            if (!presented) close();
          }}
          onDismiss={onDismiss}
        >
          <Group
            modifiers={[
              ...(!compact ? [presentationDetents(["large"])] : []),
              presentationDragIndicator("visible"),
              presentationBackground(colors.background),
              interactiveDismissDisabled(busy),
            ]}
          >
            <RNHostView matchContents={compact ? { vertical: true } : false}>
              <View style={compact ? styles.nativeCompact : styles.nativePanel}>
                {header}
                {compact ? (
                  <View style={styles.content}>{children}</View>
                ) : scroll ? (
                  <ScrollView
                    style={styles.fill}
                    keyboardShouldPersistTaps="handled"
                    automaticallyAdjustKeyboardInsets
                    contentContainerStyle={styles.content}
                  >
                    {children}
                  </ScrollView>
                ) : (
                  <View style={styles.fill}>{children}</View>
                )}
              </View>
            </RNHostView>
          </Group>
        </BottomSheet>
      </Host>
    );
  }
  return (
    <Modal
      visible={visible}
      transparent={!ios}
      presentationStyle={ios ? "pageSheet" : "overFullScreen"}
      animationType={reducedMotion ? "none" : "slide"}
      allowSwipeDismissal={ios && !busy && !onBack}
      onRequestClose={() => {
        if (!busy) (onBack ?? onClose)();
      }}
      onDismiss={onDismiss}
      supportedOrientations={["portrait", "landscape"]}
    >
      <SafeAreaProvider>
        <KeyboardAvoidingView
          behavior={ios ? "padding" : "height"}
          style={[styles.root, !ios && styles.androidRoot]}
        >
          {!ios ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              disabled={busy}
              onPress={close}
              style={styles.scrim}
            />
          ) : null}
          <SafeAreaView
            edges={["bottom", "left", "right"]}
            accessibilityViewIsModal
            style={[
              styles.panel,
              { backgroundColor: colors.background },
              ios ? styles.iosPanel : styles.androidPanel,
            ]}
          >
            {header}
            {scroll ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
                contentContainerStyle={styles.content}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={styles.fill}>{children}</View>
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  anchor: { position: "absolute", bottom: 0, left: 0, right: 0, height: 1 },
  nativeCompact: { width: "100%", paddingTop: spacing.sm },
  nativePanel: { flex: 1, width: "100%", paddingTop: spacing.sm },
  root: { flex: 1 },
  androidRoot: { justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.4)" },
  panel: { width: "100%", alignSelf: "center", overflow: "hidden" },
  iosPanel: { flex: 1 },
  androidPanel: {
    maxHeight: "90%",
    maxWidth: 640,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  title: { flex: 1, minWidth: 0 },
  content: {
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  fill: { flex: 1 },
});
