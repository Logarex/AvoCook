import React from "react";
import {
  KeyboardAvoidingView,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle
} from "react-native";
import { ArrowUp } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useReducedMotion } from "../features/accessibility/useReducedMotion";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  showScrollTop?: boolean;
};

export function Screen({
  children,
  scroll = true,
  contentStyle,
  showScrollTop = scroll
}: ScreenProps) {
  const scrollRef = React.useRef<ScrollView>(null);
  const [contentHeight, setContentHeight] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(0);
  const [scrolledPastTop, setScrolledPastTop] = React.useState(false);
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const content = (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );
  const canScroll = contentHeight > viewportHeight + spacing.lg;
  const showBackToTop = showScrollTop && canScroll && scrolledPastTop;

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextScrolledPastTop = event.nativeEvent.contentOffset.y > 240;
    setScrolledPastTop((current) =>
      current === nextScrolledPastTop ? current : nextScrolledPastTop
    );
  }

  function handleLayout(event: LayoutChangeEvent) {
    setViewportHeight(event.nativeEvent.layout.height);
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {scroll ? (
          <View style={styles.flex}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={(_, height) => setContentHeight(height)}
              onLayout={handleLayout}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {content}
            </ScrollView>
            {showBackToTop ? (
              <Pressable
                accessibilityLabel={t("common.backToTop")}
                accessibilityRole="button"
                hitSlop={6}
                onPress={() =>
                  scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion })
                }
                style={({ pressed }) => [
                  styles.scrollTopButton,
                  {
                    backgroundColor: colors.surfaceGlassStrong,
                    borderColor: colors.border,
                    opacity: pressed ? 0.74 : 0.92,
                    shadowColor: colors.shadow
                  }
                ]}
              >
                <ArrowUp color={colors.primary} size={19} strokeWidth={2.6} />
              </Pressable>
            ) : null}
          </View>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1
  },
  content: {
    flex: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  scrollTopButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: spacing.sm,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    right: spacing.md,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    width: 42,
    elevation: 4
  }
});
