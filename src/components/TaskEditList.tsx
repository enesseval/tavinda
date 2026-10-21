import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import ReorderableList, {
  reorderItems,
  useIsActive,
  useReorderableDrag,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import { scheduleOnRN } from 'react-native-worklets';

import type { TaskRow } from '../domain/taskList';
import type { LocalDate } from '../domain/types';
import { fmtRelativeDay } from '../i18n/format';
import { t, WEEKDAYS_SHORT } from '../i18n/tr';
import { reorderTasks, setTaskPaused } from '../services/actions';
import { useTheme } from '../theme/theme';
import { radii } from '../theme/tokens';
import { AppText } from './AppText';
import { CoursePill } from './controls';
import { CheckIcon, DragHandleIcon } from './icons';
import { Touchable } from './Touchable';

const WIGGLE_DEG = 0.6;
const WIGGLE_MS = 130;

function subFor(row: TaskRow, included: boolean, today: LocalDate): string {
  if (!included) return t.tasks.rowPaused;
  if (row.task.kind === 'weekly') return t.tasks.rowWeekly(row.course ? WEEKDAYS_SHORT[row.course.weekday - 1] : null);
  return row.task.dueAt ? t.tasks.rowDeadline(fmtRelativeDay(row.task.dueAt, today)) : '';
}

interface RowProps {
  row: TaskRow;
  included: boolean;
  index: number;
  today: LocalDate;
  onToggle: (row: TaskRow) => void;
}

/** One task in edit mode: tick on the left, drag handle on the right, gently wiggling. */
const EditRow = memo(function EditRow({ row, included, index, today, onToggle }: RowProps) {
  const { c, reduceMotion } = useTheme();
  const drag = useReorderableDrag();
  const active = useIsActive();
  const r = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(r);
    if (reduceMotion || active) {
      r.value = withTiming(0, { duration: 80 });
      return;
    }
    // Neighbours start out of step, like icons on the home screen.
    const dir = index % 2 === 0 ? 1 : -1;
    r.value = withDelay(
      (index * 37) % 120,
      withRepeat(
        withSequence(
          withTiming(WIGGLE_DEG * dir, { duration: WIGGLE_MS, easing: Easing.inOut(Easing.quad) }),
          withTiming(-WIGGLE_DEG * dir, { duration: WIGGLE_MS, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(r);
  }, [reduceMotion, active, index, r]);

  const wiggle = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  const heatColor = included && row.heat != null ? c.heat[row.heat] : c.line;

  return (
    <Animated.View style={[{ paddingHorizontal: 20, paddingBottom: 10 }, wiggle]}>
      <Pressable
        onLongPress={drag}
        delayLongPress={160}
        accessibilityActions={[
          { name: 'activate', label: included ? t.tasks.exclude(row.task.title) : t.tasks.include(row.task.title) },
        ]}
        onAccessibilityAction={() => onToggle(row)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 64,
          paddingLeft: 14,
          paddingRight: 6,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: active ? c.ink3 : c.line,
          backgroundColor: c.surface,
          overflow: 'hidden',
        }}
      >
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: heatColor }} />
        <Touchable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: included }}
          accessibilityLabel={row.task.title}
          hitSlop={10}
          onPress={() => onToggle(row)}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: included ? c.ink : 'transparent',
            borderWidth: included ? 0 : 1.5,
            borderColor: c.ink3,
          }}
        >
          {included ? <CheckIcon color={c.bg} size={16} strokeWidth={2.6} /> : null}
        </Touchable>

        <View style={{ flex: 1, minWidth: 0, gap: 4, opacity: included ? 1 : 0.5 }}>
          <AppText variant="headline" numberOfLines={1}>
            {row.task.title}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {row.course ? <CoursePill code={row.course.shortName} color={row.course.color} /> : null}
            <AppText variant="caption" tone="ink2" numberOfLines={1} style={{ flexShrink: 1 }}>
              {subFor(row, included, today)}
            </AppText>
          </View>
        </View>

        <Pressable
          onPressIn={drag}
          accessibilityRole="adjustable"
          accessibilityLabel={t.tasks.dragA11y}
          hitSlop={8}
          style={{ width: 44, height: 52, alignItems: 'center', justifyContent: 'center' }}
        >
          <DragHandleIcon color={c.ink3} size={20} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
});

interface Props {
  /** Snapshot taken when edit mode opens; the list keeps its own order and ticks from there. */
  rows: TaskRow[];
  today: LocalDate;
  header: ReactElement;
  footer: ReactElement;
}

/**
 * Edit mode for the Görevler tab. Every change is saved at once: dragging writes the
 * order, the tick pauses or resumes the task. Rows don't jump around while it is open.
 */
export function TaskEditList({ rows, today, header, footer }: Props) {
  const [order, setOrder] = useState(rows);
  const [excluded, setExcluded] = useState(() => new Set(rows.filter((r) => r.paused).map((r) => r.task.id)));

  const onReorder = ({ from, to }: ReorderableListReorderEvent) => {
    if (from === to) return;
    const next = reorderItems(order, from, to);
    setOrder(next);
    reorderTasks(next.map((r) => r.task.id));
  };

  // Read through a ref so the callback stays stable and rows don't all re-render.
  const excludedRef = useRef(excluded);
  excludedRef.current = excluded;
  const onToggle = useCallback((row: TaskRow) => {
    Haptics.selectionAsync().catch(() => undefined);
    const pause = !excludedRef.current.has(row.task.id);
    setTaskPaused(row.task, pause);
    setExcluded((prev) => {
      const next = new Set(prev);
      if (pause) next.add(row.task.id);
      else next.delete(row.task.id);
      return next;
    });
  }, []);

  const haptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  const onDragStart = useCallback(() => {
    'worklet';
    scheduleOnRN(haptic);
  }, []);

  return (
    <ReorderableList
      data={order}
      keyExtractor={(r) => String(r.task.id)}
      onReorder={onReorder}
      onDragStart={onDragStart}
      shouldUpdateActiveItem
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      showsVerticalScrollIndicator={false}
      renderItem={({ item, index }) => (
        <EditRow row={item} included={!excluded.has(item.task.id)} index={index} today={today} onToggle={onToggle} />
      )}
    />
  );
}
