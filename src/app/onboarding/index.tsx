import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/controls';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { TaskCard } from '../../components/TaskCard';
import type { HeatLevel } from '../../domain/types';
import { HEAT_NAMES, t } from '../../i18n/tr';
import { useOnboarding } from '../../store/ui';
import { useTheme } from '../../theme/theme';

const DEMO_PROGRESS = [0, 10, 25, 30, 60];

export default function OnboardingValue() {
  const { c, reduceMotion } = useTheme();
  const reset = useOnboarding((s) => s.reset);
  const [hi, setHi] = useState(reduceMotion ? 4 : 0);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (reduceMotion) {
      setHi(4);
      return;
    }
    const iv = setInterval(() => setHi((h) => (h + 1) % 6), 900);
    return () => clearInterval(iv);
  }, [reduceMotion]);

  const lvl = Math.min(4, hi) as HeatLevel;

  return (
    <OnboardingFrame step={1} footer={<Button label={t.onboarding.start} onPress={() => router.push('/onboarding/calendar')} />}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 22 }}>
        <View style={{ height: 200 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View
            style={{
              position: 'absolute',
              left: 24,
              right: 24,
              top: 18,
              height: 76,
              borderRadius: 16,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.line,
              opacity: 0.5,
              transform: [{ scale: 0.92 }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              top: 34,
              height: 76,
              borderRadius: 16,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.line,
              opacity: 0.8,
              transform: [{ scale: 0.96 }],
            }}
          />
          <View style={{ position: 'absolute', left: 0, right: 0, top: 52 }}>
            <TaskCard
              task={{
                id: 0,
                title: t.onboarding.demoTask,
                courseCode: 'ALG',
                courseColor: '#B4A2CC',
                heat: lvl,
                progress: DEMO_PROGRESS[lvl],
                sub: t.onboarding.demoSubs[lvl],
                locked: lvl === 4,
              }}
            />
          </View>
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {HEAT_NAMES.map((n, i) => (
              <View
                key={n}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: i === lvl ? c.heat[i] : c.line,
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.heat[i] }} />
                <AppText variant="caption" color={i === lvl ? c.ink : c.ink3} maxFontSizeMultiplier={1.1}>
                  {n}
                </AppText>
              </View>
            ))}
          </View>
        </View>
        <View style={{ gap: 12, marginTop: 20 }}>
          <AppText variant="onboarding" accessibilityRole="header">
            {t.onboarding.valueTitle}
          </AppText>
          <AppText variant="bodyLarge" tone="ink2" style={{ lineHeight: 24 }}>
            {t.onboarding.valueBody}
          </AppText>
        </View>
      </View>
    </OnboardingFrame>
  );
}
