import { ArrowUp } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import { useReducedMotion } from "../features/accessibility/useReducedMotion";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import {
  getFloatingBottomOffset,
  getScreenBottomPadding,
} from "../utils/safeArea";
import { IconButton } from "./IconButton";

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  showScrollTop?: boolean;
  backgroundColor?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  contentWidth?: number;
};

export function Screen({
  children,
  scroll = true,
  contentStyle,
  showScrollTop = scroll,
  backgroundColor,
  header,
  footer,
  contentWidth = 760,
}: ScreenProps) {
  const scrollRef = React.useRef<ScrollView>(null);
  const [contentHeight, setContentHeight] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(0);
  const [scrolledPastTop, setScrolledPastTop] = React.useState(false);
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const content = (
    <View
      style={[
        styles.content,
        { maxWidth: contentWidth },
        { paddingBottom: getScreenBottomPadding(insets.bottom) },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );
  const canScroll = contentHeight > viewportHeight + spacing.lg;
  const showBackToTop = showScrollTop && canScroll && scrolledPastTop;

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextScrolledPastTop = event.nativeEvent.contentOffset.y > 240;
    setScrolledPastTop((current) =>
      current === nextScrolledPastTop ? current : nextScrolledPastTop,
    );
  }

  function handleLayout(event: LayoutChangeEvent) {
    setViewportHeight(event.nativeEvent.layout.height);
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
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
          <View style={styles.flex}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={true}
              onContentSizeChange={(_, height) => setContentHeight(height)}
              onLayout={handleLayout}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {content}
            </ScrollView>
            {showBackToTop ? (
              <IconButton
                label={t("common.backToTop")}
                icon={ArrowUp}
                onPress={() =>
                  scrollRef.current?.scrollTo({
                    y: 0,
                    animated: !reducedMotion,
                  })
                }
                tone="primary"
                style={[
                  styles.scrollTopButton,
                  { bottom: getFloatingBottomOffset(insets.bottom) },
                ]}
              />
            ) : null}
          </View>
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
    flex: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  header: { alignSelf: "center", width: "100%" },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  scrollTopButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    bottom: spacing.sm,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    right: spacing.md,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    width: 42,
    elevation: 4,
  },
});
