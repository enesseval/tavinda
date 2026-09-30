import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../i18n/tr';
import { useTheme } from '../theme/theme';
import { ChevronLeft } from './icons';
import { Touchable } from './Touchable';

/** Back chevron + 4 progress dots, as in the design. */
export function OnboardingFrame({ step, children, footer }: { step: number; children: ReactNode; footer?: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const dot = Math.min(4, step);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View className="h-11 flex-row items-center px-2">
        <View className="w-11">
          {step > 1 && router.canGoBack() ? (
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={t.a11y.back}
              onPress={() => router.back()}
              className="h-11 w-11 items-center justify-center"
            >
              <ChevronLeft color={c.ink} />
            </Touchable>
          ) : null}
        </View>
        <View className="flex-1 flex-row justify-center gap-1.5" accessibilityLabel={t.a11y.step(dot, 4)}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{ width: i === dot ? 22 : 6, height: 6, borderRadius: 3, backgroundColor: i <= dot ? c.ink : c.line }}
            />
          ))}
        </View>
        <View className="w-11" />
      </View>
      <View className="flex-1">{children}</View>
      {footer ? (
        <View style={{ paddingTop: 12, paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 12 }}>{footer}</View>
      ) : null}
    </View>
  );
}
