import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { getScreenBottomPadding } from "../utils/safeArea";
import { useContentViewport } from "../hooks/contentViewport";

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  contentWidth?: number;
};

export function Screen({
  children,
  scroll = true,
  contentStyle,
  backgroundColor,
  header,
  footer,
  contentWidth = 760,
}: ScreenProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { navigationRail } = useContentViewport();
  const content = (
    <View
      style={[
        styles.content,
        !scroll && styles.flex,
        { maxWidth: contentWidth },
        { paddingBottom: getScreenBottomPadding(insets.bottom) },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );
  return (
    <SafeAreaView
      edges={navigationRail ? ["top", "right"] : ["top", "left", "right"]}
      style={[
        styles.safeArea,
        { backgroundColor: backgroundColor ?? colors.background },
      ]}
    >
      {header ? (
        <View style={[styles.header, { maxWidth: contentWidth }]}>
          {header}
        </View>
      ) : null}
      <KeyboardAvoidingView
        behavior={
          scroll ? (Platform.OS === "ios" ? "padding" : "height") : undefined
        }
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        style={styles.flex}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: getScreenBottomPadding(insets.bottom),
              backgroundColor: colors.background,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    alignSelf: "center",
    width: "100%",
    flexGrow: 1,
    flexShrink: 0,
    gap: spacing.md,
    padding: spacing.md,
  },
  header: { alignSelf: "center", width: "100%" },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
});
