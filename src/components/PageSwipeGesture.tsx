import React from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

type PageSwipeGestureProps = {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
};

const SWIPE_DISTANCE = 72;
const SWIPE_VELOCITY = 700;

export function PageSwipeGesture({
  children,
  onSwipeLeft,
  onSwipeRight
}: PageSwipeGestureProps) {
  const gesture = React.useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-28, 28])
        .failOffsetY([-18, 18])
        .onEnd((event) => {
          const isFastSwipe = Math.abs(event.velocityX) > SWIPE_VELOCITY;
          const isLongSwipe = Math.abs(event.translationX) > SWIPE_DISTANCE;

          if (!isFastSwipe && !isLongSwipe) {
            return;
          }

          if (event.translationX < 0 && onSwipeLeft) {
            runOnJS(onSwipeLeft)();
          }

          if (event.translationX > 0 && onSwipeRight) {
            runOnJS(onSwipeRight)();
          }
        }),
    [onSwipeLeft, onSwipeRight]
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>{children}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
