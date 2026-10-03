import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const DISTANCE = 60;
const VELOCITY = 600;

/**
 * Horizontal swipe to page between periods (weeks, months). Vertical scrolling
 * of the parent keeps working: the pan only activates on a clear sideways drag.
 */
export function SwipePager({ children, onPrev, onNext }: { children: ReactNode; onPrev: () => void; onNext: () => void }) {
  const dx = useSharedValue(0);
  const page = (dir: -1 | 1) => {
    Haptics.selectionAsync().catch(() => undefined);
    if (dir < 0) onPrev();
    else onNext();
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      dx.value = e.translationX * 0.35;
    })
    .onEnd((e) => {
      if (e.translationX < -DISTANCE || e.velocityX < -VELOCITY) scheduleOnRN(page, 1);
      else if (e.translationX > DISTANCE || e.velocityX > VELOCITY) scheduleOnRN(page, -1);
      dx.value = withSpring(0, { damping: 22, stiffness: 240 });
    })
    .onFinalize(() => {
      if (dx.value !== 0) dx.value = withSpring(0, { damping: 22, stiffness: 240 });
    });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: dx.value }] }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}
