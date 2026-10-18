import React, { useCallback, useMemo, useRef } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, type SharedValue } from "react-native-reanimated";
export type KitchenDragState = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  active: SharedValue<number>;
};
export function KitchenDraggable({
  children,
  drag,
  onStart,
  onDrop,
}: {
  children: React.ReactNode;
  drag: KitchenDragState;
  onStart: () => void;
  onDrop: (x: number, y: number) => void;
}) {
  const callbacks = useRef({ onStart, onDrop });
  callbacks.current = { onStart, onDrop };
  const start = useCallback(() => callbacks.current.onStart(), []);
  const drop = useCallback(
    (x: number, y: number) => callbacks.current.onDrop(x, y),
    [],
  );
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(350)
        .onStart((event) => {
          drag.x.value = event.absoluteX;
          drag.y.value = event.absoluteY;
          drag.active.value = 1;
          runOnJS(start)();
        })
        .onUpdate((event) => {
          drag.x.value = event.absoluteX;
          drag.y.value = event.absoluteY;
        })
        .onEnd((event) => {
          runOnJS(drop)(event.absoluteX, event.absoluteY);
        })
        .onFinalize(() => {
          drag.active.value = 0;
        }),
    [drag, start, drop],
  );
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View>{children}</Animated.View>
    </GestureDetector>
  );
}
