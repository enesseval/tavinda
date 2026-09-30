import * as Haptics from 'expo-haptics';
import { memo, useEffect } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { HeatLevel } from '../domain/types';
import { HEAT_NAMES, t } from '../i18n/tr';
import { useTheme } from '../theme/theme';
import { heatBorder, motion, radii } from '../theme/tokens';
import { AppText } from './AppText';
import { CoursePill } from './controls';
import { CarriedIcon, CheckIcon, HeatGlyph, LockIcon } from './icons';
import { ProgressRing } from './ProgressRing';

export interface TaskCardModel {
  id: number;
  title: string;
  courseCode: string | null;
  courseColor: string | null;
  heat: HeatLevel;
  progress: number;
  sub: string;
  carried?: boolean;
  done?: boolean;
  missed?: boolean;
  /** Last day and deferring is not allowed. */
  locked?: boolean;
  leaving?: boolean;
}

interface Props {
  task: TaskCardModel;
  onTap?: () => void;
  onComplete?: () => void;
  onDefer?: () => void;
}

const THRESHOLD = 80;
const MAX_DRAG = 130;

function Pulse({ color }: { color: string }) {
  const { reduceMotion } = useTheme();
  const o = useSharedValue(0.12);
  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(o);
      o.value = 0.12;
      return;
    }
    o.value = motion.pulseMin;
    o.value = withRepeat(
      withSequence(
        withTiming(motion.pulseMax, { duration: motion.pulseMs / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(motion.pulseMin, { duration: motion.pulseMs / 2, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => cancelAnimation(o);
  }, [reduceMotion, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0, backgroundColor: color }, style]} />;
}

export { Pulse as HeatPulse };

function TaskCardImpl({ task, onTap, onComplete, onDefer }: Props) {
  const { c } = useTheme();
  const off = !!(task.done || task.missed);
  const lvl = task.heat;
  const H = off ? c.ink3 : c.heat[lvl];
  const bar = off ? c.line : c.heat[lvl];
  const locked = !off && !!task.locked;
  const p = task.done ? 100 : task.progress;
  const interactive = !off && !!(onComplete || onDefer);

  const dx = useSharedValue(0);
  const armed = useSharedValue(0);
  const leave = useSharedValue(task.leaving ? 1 : 0);

  useEffect(() => {
    leave.value = withTiming(task.leaving ? 1 : 0, { duration: motion.leaveMs });
  }, [task.leaving, leave]);

  const haptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  const complete = () => onComplete?.();
  const defer = () => onDefer?.();
  const tap = () => onTap?.();

  const pan = Gesture.Pan()
    .enabled(interactive)
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const v = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, e.translationX));
      dx.value = v;
      const nowArmed = Math.abs(v) > THRESHOLD ? 1 : 0;
      if (nowArmed !== armed.value) {
        armed.value = nowArmed;
        if (nowArmed) scheduleOnRN(haptic);
      }
    })
    .onEnd(() => {
      const v = dx.value;
      dx.value = withSpring(0, { damping: 20, stiffness: 220 });
      armed.value = 0;
      if (v > THRESHOLD) scheduleOnRN(complete);
      else if (v < -THRESHOLD) scheduleOnRN(defer);
    })
    .onFinalize(() => {
      if (dx.value !== 0) dx.value = withSpring(0, { damping: 20, stiffness: 220 });
    });

  const tapGesture = Gesture.Tap()
    .enabled(!!onTap)
    .maxDuration(400)
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(tap);
    });

  const gesture = Gesture.Race(pan, tapGesture);

  const frontStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dx.value }] }));
  const leftStyle = useAnimatedStyle(() => ({ opacity: dx.value > 0 ? 1 : 0 }));
  const rightStyle = useAnimatedStyle(() => ({ opacity: dx.value < 0 ? 1 : 0 }));
  const backDoneStyle = useAnimatedStyle(() => ({ opacity: dx.value > 0 ? 1 : 0 }));
  const wrapStyle = useAnimatedStyle(() => ({
    opacity: 1 - leave.value,
    transform: [{ scale: 1 - leave.value * 0.04 }],
  }));

  const backDeferBg = locked ? c.surface2 : c.ink2;
  const backDeferFg = locked ? c.ink3 : c.bg;
  const a11yLabel = [
    task.title,
    task.courseCode,
    off ? null : t.a11y.heat(HEAT_NAMES[lvl]),
    task.done ? t.card.done : `%${p}`,
    task.sub,
  ]
    .filter(Boolean)
    .join(', ');

  const actions = [
    ...(onComplete && !off ? [{ name: 'complete', label: t.card.done }] : []),
    ...(onDefer && !off ? [{ name: 'defer', label: locked ? t.card.locked : t.card.defer }] : []),
  ];

  return (
    <Animated.View style={[{ borderRadius: radii.card, overflow: 'hidden' }, wrapStyle]}>
      <View style={{ position: 'absolute', inset: 0, flexDirection: 'row' }}>
        <Animated.View style={[{ position: 'absolute', inset: 0, backgroundColor: backDeferBg }]} />
        <Animated.View style={[{ position: 'absolute', inset: 0, backgroundColor: c.ink }, backDoneStyle]} />
        <View
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}
        >
          <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, leftStyle]}>
            <CheckIcon color={c.bg} size={18} />
            <AppText variant="bodyStrong" color={c.bg}>
              {t.card.done}
            </AppText>
          </Animated.View>
          <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, rightStyle]}>
            {locked ? <LockIcon color={backDeferFg} size={13} /> : null}
            <AppText variant="bodyStrong" color={backDeferFg}>
              {locked ? t.card.locked : t.card.defer}
            </AppText>
          </Animated.View>
        </View>
      </View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityActions={actions}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'complete') onComplete?.();
            if (e.nativeEvent.actionName === 'defer') onDefer?.();
            if (e.nativeEvent.actionName === 'activate') onTap?.();
          }}
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingTop: 14,
              paddingBottom: 16,
              paddingLeft: 20,
              paddingRight: 16,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: heatBorder(c, lvl, off),
              borderRadius: radii.card,
              overflow: 'hidden',
            },
            frontStyle,
          ]}
        >
          {!off && lvl === 3 ? (
            <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: H, opacity: 0.08 }} />
          ) : null}
          {!off && lvl === 4 ? <Pulse color={H} /> : null}
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: bar }} />

          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            {task.carried && !off ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <CarriedIcon color={c.ink2} />
                <AppText variant="micro" tone="ink2">
                  {t.card.carried}
                </AppText>
              </View>
            ) : null}
            <AppText
              variant="headline"
              color={off ? c.ink3 : c.ink}
              numberOfLines={1}
              style={task.missed ? { textDecorationLine: 'line-through' } : undefined}
            >
              {task.title}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
              {task.courseCode ? <CoursePill code={task.courseCode} color={task.courseColor ?? c.ink3} /> : null}
              {off ? null : locked ? <LockIcon color={H} size={12} /> : <HeatGlyph color={H} level={lvl} size={12} />}
              <AppText variant="caption" color={off ? c.ink3 : c.ink2} numberOfLines={1} tabular style={{ flexShrink: 1 }}>
                {task.sub}
              </AppText>
              {task.missed ? (
                <View
                  style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, borderWidth: 1, borderColor: c.ink3 }}
                >
                  <AppText variant="micro" tone="ink2">
                    {t.card.missed}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>

          <View style={{ width: 28, height: 28 }}>
            {task.done ? (
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: c.ink3,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckIcon color={c.surface} size={16} />
              </View>
            ) : (
              <ProgressRing size={28} stroke={3} progress={p} color={H} track={c.surface2}>
                <AppText
                  variant="micro"
                  tone="ink2"
                  tabular
                  style={{ fontSize: 10, lineHeight: 12, fontWeight: '600' }}
                  maxFontSizeMultiplier={1}
                >
                  {p}
                </AppText>
              </ProgressRing>
            )}
          </View>

          <View style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${p}%`, backgroundColor: bar }} />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

export const TaskCard = memo(TaskCardImpl);
