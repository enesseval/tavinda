import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

import { snapProgress } from '../domain/progress';
import { t } from '../i18n/tr';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

const THUMB = 28;

/** 0–100 slider that snaps to 10% with a selection haptic on every step. */
export function ProgressSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const [last, setLast] = useState(value);
  useEffect(() => setLast(value), [value]);

  const update = (x: number) => {
    if (width <= THUMB) return;
    const raw = ((x - THUMB / 2) / (width - THUMB)) * 100;
    const v = snapProgress(raw);
    if (v !== last) {
      setLast(v);
      Haptics.selectionAsync().catch(() => undefined);
      onChange(v);
    }
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => scheduleOnRN(update, e.x))
    .onUpdate((e) => scheduleOnRN(update, e.x));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const pos = width > THUMB ? (value / 100) * (width - THUMB) : 0;

  return (
    <View style={{ gap: 6 }}>
      <GestureDetector gesture={pan}>
        <View
          onLayout={onLayout}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t.progress.sliderLabel}
          accessibilityValue={{ min: 0, max: 100, now: value, text: `%${value}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            const next = snapProgress(value + (e.nativeEvent.actionName === 'increment' ? 10 : -10));
            if (next !== value) onChange(next);
          }}
          style={{ height: 36, justifyContent: 'center' }}
        >
          <View style={{ height: 4, borderRadius: 2, backgroundColor: c.surface2, marginHorizontal: THUMB / 2 }}>
            <View style={{ height: 4, borderRadius: 2, width: `${value}%`, backgroundColor: c.ink }} />
          </View>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: pos,
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              backgroundColor: '#FFFFFF',
              borderWidth: 0.5,
              borderColor: c.line,
              shadowColor: '#000',
              shadowOpacity: 0.18,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
            }}
          />
        </View>
      </GestureDetector>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
        {[0, 25, 50, 75, 100].map((n) => (
          <AppText key={n} variant="micro" tone="ink3" tabular>
            {n}
          </AppText>
        ))}
      </View>
    </View>
  );
}
