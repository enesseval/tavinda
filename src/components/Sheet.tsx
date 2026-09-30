import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../i18n/tr';
import { useTheme } from '../theme/theme';
import { motion, radii } from '../theme/tokens';
import { Grabber } from './controls';
import { Touchable } from './Touchable';

/**
 * Bottom sheet drawn inside a transparent modal route: scrim + sliding panel,
 * as in the design. Tapping the scrim or `close()` dismisses the route.
 */
export function Sheet({
  children,
  maxHeightRatio = 0.9,
  scroll = false,
  onDismiss,
}: {
  children: ReactNode;
  maxHeightRatio?: number;
  scroll?: boolean;
  onDismiss?: () => void;
}) {
  const { c, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const dismiss = onDismiss ?? (() => router.back());

  const body = (
    <View style={{ gap: 18, paddingTop: 8, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 16 }}>
      <Grabber />
      {children}
    </View>
  );

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(200)} style={{ position: 'absolute', inset: 0 }}>
        <Touchable
          accessibilityLabel={t.a11y.close}
          accessibilityRole="button"
          onPress={dismiss}
          style={{ flex: 1, backgroundColor: c.scrim }}
        />
      </Animated.View>
      <Animated.View
        entering={reduceMotion ? undefined : SlideInDown.duration(motion.sheetMs).easing(Easing.bezier(0.2, 0.8, 0.2, 1))}
        style={{
          maxHeight: height * maxHeightRatio,
          backgroundColor: c.surface,
          borderTopLeftRadius: radii.sheet,
          borderTopRightRadius: radii.sheet,
          overflow: 'hidden',
        }}
      >
        {scroll ? (
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
        ) : (
          body
        )}
      </Animated.View>
    </View>
  );
}
