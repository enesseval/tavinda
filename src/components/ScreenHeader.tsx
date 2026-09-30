import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { t } from '../i18n/tr';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { ChevronLeft } from './icons';
import { Touchable } from './Touchable';

/** Back chevron + large title, for pushed screens. */
export function ScreenHeader({
  title,
  right,
  backLabel = t.common.back,
}: {
  title: string;
  right?: ReactNode;
  backLabel?: string;
}) {
  const { c } = useTheme();
  return (
    <View>
      <View className="h-11 flex-row items-center justify-between pl-2 pr-4">
        <Touchable
          accessibilityRole="button"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={8}
          className="h-11 flex-row items-center gap-1 px-2"
        >
          <ChevronLeft color={c.ink} />
          <AppText variant="bodyLarge">{backLabel}</AppText>
        </Touchable>
        {right}
      </View>
      <AppText variant="display" className="px-5 pt-1" accessibilityRole="header">
        {title}
      </AppText>
    </View>
  );
}
