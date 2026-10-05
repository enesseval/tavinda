import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../components/AppText';
import { Button } from '../components/controls';
import { Touchable } from '../components/Touchable';
import { HEAT_NAMES, t } from '../i18n/tr';
import { setSetting } from '../services/actions';
import { useAppData } from '../services/data';
import { useTheme } from '../theme/theme';
import { radii } from '../theme/tokens';

/** Four short cards that explain the ideas the app is built on. Shown once, then from Ayarlar. */
export default function Intro() {
  const { c, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useAppData();
  const [page, setPage] = useState(0);
  const pages = t.intro.pages;
  const last = page === pages.length - 1;

  const close = () => {
    if (!settings.seenIntro) setSetting('seenIntro', true);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={t.a11y.step(page + 1, pages.length)}>
          {pages.map((p, i) => (
            <View
              key={p.title}
              style={{ width: i === page ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? c.ink : c.line }}
            />
          ))}
        </View>
        <Touchable accessibilityRole="button" onPress={close} hitSlop={10}>
          <AppText variant="bodyLarge" tone="ink2">
            {last ? t.common.close : t.intro.skip}
          </AppText>
        </Touchable>
      </View>

      <Animated.View
        key={page}
        entering={reduceMotion ? undefined : FadeIn.duration(220)}
        style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 }}
      >
        <AppText variant="onboarding" accessibilityRole="header">
          {pages[page].title}
        </AppText>
        <AppText variant="bodyLarge" tone="ink2" style={{ lineHeight: 24 }}>
          {pages[page].body}
        </AppText>
        {page === 0 ? (
          <View style={{ gap: 8, marginTop: 8 }}>
            {HEAT_NAMES.map((name, i) => (
              <View
                key={name}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderRadius: radii.input,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.line,
                }}
              >
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.heat[i] }} />
                <AppText variant="bodyStrong" style={{ width: 70 }}>
                  {name}
                </AppText>
                <AppText variant="footnote" tone="ink2" style={{ flex: 1 }}>
                  {t.intro.heat[i]}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </Animated.View>

      <View style={{ paddingHorizontal: 20, gap: 8 }}>
        <Button label={last ? t.intro.done : t.intro.next} onPress={() => (last ? close() : setPage((p) => p + 1))} />
        {page > 0 ? <Button label={t.common.back} kind="ghost" onPress={() => setPage((p) => p - 1)} /> : null}
      </View>
    </View>
  );
}
