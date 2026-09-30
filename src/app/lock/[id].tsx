import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Button, CoursePill } from '../../components/controls';
import { ArrowRight, LockIcon } from '../../components/icons';
import { HeatPulse } from '../../components/TaskCard';
import { fmtMinutes } from '../../i18n/format';
import { t } from '../../i18n/tr';
import { useTheme } from '../../theme/theme';
import { mix } from '../../theme/tokens';
import { useInstanceItem } from '../../ui/useItem';

/** "Son gün kilidi anı": the defer pill morphs into a lock. */
export default function LockMoment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { item } = useInstanceItem(Number(id));
  const phase = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      phase.value = 1;
      return;
    }
    phase.value = withDelay(1100, withTiming(1, { duration: 550, easing: Easing.bezier(0.5, 0, 0.2, 1) }));
  }, [reduceMotion, phase]);

  const hot = c.heat[4];
  const line = c.line;
  const surface = c.surface;
  const lockedBg = mix(hot, surface, 0.14);
  const pill = useAnimatedStyle(() => ({
    width: 210 - 146 * phase.value,
    height: 52 + 12 * phase.value,
    borderColor: phase.value > 0.5 ? hot : line,
    backgroundColor: phase.value > 0.5 ? lockedBg : surface,
  }));
  const label = useAnimatedStyle(() => ({ opacity: phase.value < 0.3 ? 1 - phase.value / 0.3 : 0 }));
  const lock = useAnimatedStyle(() => ({
    opacity: phase.value > 0.6 ? (phase.value - 0.6) / 0.4 : 0,
    transform: [{ scale: reduceMotion ? 1 : withSpring(phase.value > 0.6 ? 1 : 0.3, { damping: 9 }) }],
  }));

  if (!item) return null;
  const close = () => router.back();
  const start = () => router.replace({ pathname: '/progress/[id]', params: { id: String(item.instance.id) } });

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(300)} style={{ position: 'absolute', inset: 0 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.close}
          onPress={close}
          style={{ flex: 1, backgroundColor: c.scrim }}
        />
      </Animated.View>
      <Animated.View
        entering={reduceMotion ? undefined : SlideInDown.duration(500).easing(Easing.bezier(0.2, 0.8, 0.2, 1))}
        style={{
          marginHorizontal: 12,
          marginBottom: Math.max(insets.bottom, 12) + 12,
          borderRadius: 32,
          overflow: 'hidden',
          backgroundColor: c.surface,
          borderWidth: 1.5,
          borderColor: c.heat[4],
        }}
      >
        <HeatPulse color={c.heat[4]} />
        <View style={{ paddingTop: 28, paddingHorizontal: 24, paddingBottom: 20, alignItems: 'center', gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {item.course ? <CoursePill code={item.course.shortName} color={item.course.color} /> : null}
            <AppText variant="caption" tone="ink2">
              {item.task.title}
            </AppText>
          </View>
          <View
            style={{ height: 64, alignItems: 'center', justifyContent: 'center' }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Animated.View
              style={[
                { borderRadius: 32, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
                pill,
              ]}
            >
              <Animated.View style={[{ position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8 }, label]}>
                <ArrowRight color={c.ink} />
                <AppText variant="headline" numberOfLines={1}>
                  {t.lock.deferLabel}
                </AppText>
              </Animated.View>
              <Animated.View style={lock}>
                <LockIcon color={c.heat[4]} size={26} />
              </Animated.View>
            </Animated.View>
          </View>
          <View style={{ gap: 6, alignItems: 'center' }}>
            <AppText variant="sheetTitle" center accessibilityRole="header">
              {t.lock.title}
            </AppText>
            <AppText variant="headline" tabular center>
              {t.lock.remaining(item.remainingPct, fmtMinutes(item.remainingMinutes))}
            </AppText>
            <AppText variant="body" tone="ink2" center>
              {t.lock.body}
            </AppText>
          </View>
          <View style={{ alignSelf: 'stretch', gap: 4, marginTop: 4 }}>
            <Button label={t.lock.start} onPress={start} />
            <Button label={t.lock.later} kind="ghost" small onPress={close} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
