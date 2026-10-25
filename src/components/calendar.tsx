import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { addDays, isoWeekday, startOfIsoWeek, timeToMinutes, toLocalDate } from '../domain/dates';
import { dayPlan } from '../domain/projection';
import { activeWindow, blocksOn } from '../domain/schedule';
import type { AppData, Course, LocalDate, TimeBlock } from '../domain/types';
import {
  fmtCompactMinutes,
  fmtDayNum,
  fmtDayShortDate,
  fmtMinutes,
  fmtMonthYear,
  fmtRange,
  fmtWeekdayShort,
} from '../i18n/format';
import { t, WEEKDAYS_SHORT } from '../i18n/tr';
import { useNow } from '../services/clock';
import { useTheme } from '../theme/theme';
import { withAlpha } from '../theme/tokens';
import { blockName, clockOf } from '../ui/blockText';
import { AppText } from './AppText';
import { ChevronLeft, ChevronRight, FlagIcon } from './icons';
import { Touchable } from './Touchable';

export const HOUR_PX = 48;
/** Width of the fixed hour labels left of the week grid. */
export const HOURS_GUTTER = 40;
/** Month grid: six rows of 62 + gaps, so every month pages at the same height. */
export const MONTH_GRID_HEIGHT = 6 * 62 + 5 * 4 + 8;

function NavArrows({
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
}: {
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row' }}>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={prevLabel}
        onPress={onPrev}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <ChevronLeft color={c.ink} />
      </Touchable>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={nextLabel}
        onPress={onNext}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <ChevronRight color={c.ink} />
      </Touchable>
    </View>
  );
}

/**
 * Shows `children` for `id`; when `id` changes the old content fades out and the new
 * one fades in at the same spot, so dates change without sliding.
 */
function FadeSwap({ id, children }: { id: string; children: (id: string) => ReactNode }) {
  const { reduceMotion } = useTheme();
  const [shown, setShown] = useState(id);
  const o = useSharedValue(1);
  useEffect(() => {
    if (id === shown) return;
    if (reduceMotion) {
      setShown(id);
      return;
    }
    const swap = () => setShown(id);
    o.value = withTiming(0, { duration: 110, easing: Easing.out(Easing.quad) }, (done) => {
      if (done) scheduleOnRN(swap);
    });
  }, [id, shown, reduceMotion, o]);
  useEffect(() => {
    o.value = withTiming(1, { duration: 170, easing: Easing.out(Easing.quad) });
  }, [shown, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={style}>{children(shown)}</Animated.View>;
}

/** Hour range shown for every week: the day hours and the classes (same each week), so pages line up. */
export function weekHourRange(data: AppData, weekStart: LocalDate): { startH: number; endH: number } {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const windows = days.map((d) => activeWindow(d, data.settings.dayHours));
  const startH = Math.min(
    ...windows.map((w) => Math.floor(w.start / 60)),
    ...data.courses.map((k) => Math.floor(timeToMinutes(k.startTime) / 60)),
  );
  const endH = Math.min(
    24,
    Math.max(...windows.map((w) => Math.ceil(w.end / 60)), ...data.courses.map((k) => Math.ceil(timeToMinutes(k.endTime) / 60))),
  );
  return { startH: Math.max(0, startH), endH: Math.max(endH, startH + 1) };
}

/**
 * Fixed above the swiping week: range, arrows and the day row across the full width.
 * Only the text fades when the week changes.
 */
export function WeekHeader({
  data,
  today,
  weekStart,
  onPrev,
  onNext,
}: {
  data: AppData;
  today: LocalDate;
  weekStart: LocalDate;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { c } = useTheme();
  return (
    <FadeSwap id={weekStart}>
      {(ws) => {
        const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
        const plans = days.map((d) => dayPlan(data, today, d));
        const total = plans.reduce((a, p) => a + p.totalMinutes, 0);
        return (
          <View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 16,
                paddingBottom: 8,
                paddingLeft: 20,
                paddingRight: 8,
              }}
            >
              <View style={{ gap: 1, flexShrink: 1 }}>
                <AppText variant="headline">{fmtRange(days[0], days[6])}</AppText>
                <AppText variant="caption" tone="ink2" tabular>
                  {total ? t.calendar.weekLoad(fmtMinutes(total)) : t.calendar.weekEmpty}
                </AppText>
              </View>
              <NavArrows onPrev={onPrev} onNext={onNext} prevLabel={t.calendar.prevWeek} nextLabel={t.calendar.nextWeek} />
            </View>
            <View style={{ flexDirection: 'row', marginHorizontal: 12 }}>
              {plans.map((p) => {
                const isT = p.day === today;
                return (
                  <Touchable
                    key={p.day}
                    accessibilityRole="button"
                    accessibilityLabel={`${fmtDayShortDate(p.day)}, ${p.totalMinutes ? fmtMinutes(p.totalMinutes) : t.calendar.noPlan}`}
                    onPress={() => router.push({ pathname: '/day/[date]', params: { date: p.day } })}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      gap: 4,
                      paddingTop: 6,
                      paddingBottom: 8,
                      borderRadius: 12,
                      backgroundColor: isT ? withAlpha(c.ink, 0.04) : 'transparent',
                    }}
                  >
                    <AppText variant="caption" tone={isT ? 'ink' : 'ink2'} maxFontSizeMultiplier={1.1}>
                      {fmtWeekdayShort(p.day)}
                    </AppText>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isT ? c.ink : 'transparent',
                      }}
                    >
                      <AppText variant="headline" color={isT ? c.bg : c.ink} tabular maxFontSizeMultiplier={1.1}>
                        {fmtDayNum(p.day)}
                      </AppText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: p.maxHeat == null || !p.totalMinutes ? c.line : c.heat[p.maxHeat],
                        }}
                      />
                      <AppText variant="micro" tone="ink2" tabular numberOfLines={1} maxFontSizeMultiplier={1}>
                        {p.totalMinutes ? fmtCompactMinutes(p.totalMinutes) : '–'}
                      </AppText>
                    </View>
                  </Touchable>
                );
              })}
            </View>
          </View>
        );
      }}
    </FadeSwap>
  );
}

/** Hour labels left of the grid; they stay while the week swipes. */
export function HourGutter({ startH, endH }: { startH: number; endH: number }) {
  return (
    <View style={{ width: HOURS_GUTTER, height: (endH - startH) * HOUR_PX }}>
      {Array.from({ length: endH - startH + 1 }, (_, i) => (
        <AppText
          key={i}
          variant="micro"
          tone="ink3"
          tabular
          maxFontSizeMultiplier={1}
          style={{ position: 'absolute', top: i * HOUR_PX - 7, right: 8, textAlign: 'right' }}
        >
          {String((startH + i) % 24).padStart(2, '0')}
        </AppText>
      ))}
    </View>
  );
}

type GridItem =
  { kind: 'class'; start: number; end: number; course: Course } | { kind: 'block'; start: number; end: number; block: TimeBlock };

/**
 * Side by side instead of on top of each other: items that overlap in time share the
 * column in lanes (classes back to back, or a block during a class).
 */
export function layoutLanes<T extends { start: number; end: number }>(items: T[]): { item: T; lane: number; lanes: number }[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: { item: T; lane: number; lanes: number }[] = [];
  let cluster: { item: T; lane: number; lanes: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const close = () => {
    for (const x of cluster) x.lanes = laneEnds.length;
    out.push(...cluster);
    cluster = [];
    laneEnds = [];
  };
  for (const item of sorted) {
    if (cluster.length && item.start >= clusterEnd) close();
    let lane = laneEnds.findIndex((e) => e <= item.start);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else laneEnds[lane] = item.end;
    cluster.push({ item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  if (cluster.length) close();
  return out;
}

/** The swiping part of the week: seven columns of classes and what was done. */
export function WeekColumns({
  data,
  today,
  weekStart,
  startH,
  endH,
}: {
  data: AppData;
  today: LocalDate;
  weekStart: LocalDate;
  startH: number;
  endH: number;
}) {
  const { c } = useTheme();
  const { now } = useNow();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const colW = 100 / 7;
  const lo = startH * 60;
  const hi = endH * 60;
  const Y = (m: number) => ((m - lo) / 60) * HOUR_PX;
  const todayCol = days.indexOf(today);
  const nowMin = toLocalDate(now) === today ? now.getHours() * 60 + now.getMinutes() : null;

  const perDay = useMemo(
    () =>
      days.map((d) => {
        const items: GridItem[] = [
          ...data.courses
            .filter((k) => k.weekday === isoWeekday(d))
            .map((k) => ({
              kind: 'class' as const,
              start: timeToMinutes(k.startTime),
              end: timeToMinutes(k.endTime),
              course: k,
            })),
          ...blocksOn(data.blocks, d).map((b) => ({ kind: 'block' as const, start: b.start, end: b.end, block: b.block })),
        ]
          // Blocks outside the shown hours are clipped to them.
          .map((x) => ({ ...x, start: Math.max(lo, x.start), end: Math.min(hi, x.end) }))
          .filter((x) => x.end > x.start);
        return layoutLanes(items);
      }),
    [days, data.courses, data.blocks, lo, hi],
  );

  return (
    <View style={{ height: (endH - startH) * HOUR_PX }}>
      {todayCol >= 0 ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${todayCol * colW}%`,
            width: `${colW}%`,
            backgroundColor: withAlpha(c.ink, 0.03),
            borderRadius: 8,
          }}
        />
      ) : null}
      {Array.from({ length: endH - startH + 1 }, (_, i) => (
        <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * HOUR_PX, height: 1, backgroundColor: c.line }} />
      ))}
      {perDay.map((list, col) =>
        list.map(({ item, lane, lanes }) => {
          const left = `${col * colW + (colW * lane) / lanes}%` as const;
          const width = `${colW / lanes}%` as const;
          const top = Y(item.start) + 1;
          const height = Math.max(18, Y(item.end) - Y(item.start) - 2);
          if (item.kind === 'class') {
            const k = item.course;
            return (
              <View
                key={`${days[col]}-c-${k.id}`}
                accessibilityLabel={`${k.name}, ${k.startTime}–${k.endTime}`}
                style={{ position: 'absolute', left, width, top, height, paddingHorizontal: 1.5 }}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: c.surface2,
                    borderLeftWidth: 3,
                    borderLeftColor: k.color,
                    borderRadius: 6,
                    paddingVertical: 3,
                    paddingHorizontal: 4,
                    overflow: 'hidden',
                  }}
                >
                  <AppText variant="micro" weight="600" numberOfLines={1} maxFontSizeMultiplier={1}>
                    {lanes > 1 ? k.shortName : k.name}
                  </AppText>
                  {height >= 34 ? (
                    <AppText variant="micro" tone="ink2" tabular numberOfLines={1} maxFontSizeMultiplier={1}>
                      {k.startTime}
                    </AppText>
                  ) : null}
                </View>
              </View>
            );
          }
          const b = item.block;
          return (
            <Touchable
              key={`${days[col]}-b-${b.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${blockName(b)}, ${clockOf(b.startAt)}–${clockOf(b.endAt)}`}
              onPress={() => router.push({ pathname: '/block/[id]', params: { id: String(b.id) } })}
              style={{ position: 'absolute', left, width, top, height, paddingHorizontal: 1.5 }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: withAlpha(b.kind === 'task' ? c.heat[0] : c.ink2, 0.18),
                  borderRadius: 6,
                  paddingVertical: 3,
                  paddingHorizontal: 4,
                  overflow: 'hidden',
                }}
              >
                {height >= 16 ? (
                  <AppText
                    variant="micro"
                    numberOfLines={height >= 30 ? 2 : 1}
                    maxFontSizeMultiplier={1}
                    style={{ fontSize: 10, lineHeight: 12 }}
                  >
                    {blockName(b)}
                  </AppText>
                ) : null}
              </View>
            </Touchable>
          );
        }),
      )}
      {todayCol >= 0 && nowMin != null && nowMin >= lo && nowMin <= hi ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: `${todayCol * colW}%`,
            width: `${colW}%`,
            top: Y(nowMin) - 1,
            height: 2,
            backgroundColor: c.heat[4],
          }}
        />
      ) : null}
    </View>
  );
}

export function WeekLegend() {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginLeft: HOURS_GUTTER }}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          backgroundColor: c.surface2,
          borderLeftWidth: 2,
          borderLeftColor: c.ink3,
        }}
      />
      <AppText variant="caption" tone="ink2">
        {t.calendar.legendClass}
      </AppText>
      <View style={{ width: 12, height: 12, borderRadius: 3, marginLeft: 10, backgroundColor: withAlpha(c.ink2, 0.18) }} />
      <AppText variant="caption" tone="ink2">
        {t.calendar.legendBlock}
      </AppText>
    </View>
  );
}

/** Fixed above the swiping month: name, arrows and the weekday row. Only the name fades. */
export function MonthHeader({ monthStart, onPrev, onNext }: { monthStart: LocalDate; onPrev: () => void; onNext: () => void }) {
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 16,
          paddingBottom: 8,
          paddingLeft: 20,
          paddingRight: 8,
        }}
      >
        <FadeSwap id={monthStart}>{(m) => <AppText variant="headline">{fmtMonthYear(m)}</AppText>}</FadeSwap>
        <NavArrows onPrev={onPrev} onNext={onNext} prevLabel={t.calendar.prevMonth} nextLabel={t.calendar.nextMonth} />
      </View>
      <View style={{ flexDirection: 'row', marginHorizontal: 12 }}>
        {WEEKDAYS_SHORT.map((w) => (
          <AppText key={w} variant="caption" tone="ink3" center style={{ flex: 1 }} maxFontSizeMultiplier={1.1}>
            {w}
          </AppText>
        ))}
      </View>
    </View>
  );
}

/** The swiping part of the month: the day grid. */
export function MonthGrid({ data, today, monthStart }: { data: AppData; today: LocalDate; monthStart: LocalDate }) {
  const { c } = useTheme();
  const month = monthStart.slice(0, 7);
  const gridStart = startOfIsoWeek(monthStart);
  const cells = useMemo(() => {
    const out: LocalDate[] = [];
    for (let d = gridStart; out.length < 42; d = addDays(d, 1)) out.push(d);
    // Drop a trailing week that belongs entirely to the next month.
    return out[35].slice(0, 7) !== month ? out.slice(0, 35) : out;
  }, [gridStart, month]);

  const info = useMemo(
    () =>
      cells.map((d) => {
        const p = dayPlan(data, today, d);
        return { d, minutes: p.totalMinutes, flag: p.dues.length > 0, past: d < today };
      }),
    [cells, data, today],
  );
  const weeks = useMemo(() => Array.from({ length: info.length / 7 }, (_, w) => info.slice(w * 7, w * 7 + 7)), [info]);

  return (
    <View style={{ marginTop: 8, marginHorizontal: 12, gap: 4 }}>
      {weeks.map((week) => (
        <View key={week[0].d} style={{ flexDirection: 'row' }}>
          {week.map(({ d, minutes, flag, past }) => {
            const isT = d === today;
            const other = d.slice(0, 7) !== month;
            const summary = minutes > 0 ? (past ? `✓ ${fmtCompactMinutes(minutes)}` : fmtCompactMinutes(minutes)) : '';
            return (
              <Touchable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={`${fmtDayShortDate(d)}${flag ? `, ${t.calendar.legendDue}` : ''}${
                  minutes > 0
                    ? `, ${past ? t.calendar.doneA11y(fmtMinutes(minutes)) : t.calendar.planned(fmtMinutes(minutes))}`
                    : ''
                }`}
                onPress={() => router.push({ pathname: '/day/[date]', params: { date: d } })}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 62,
                  borderRadius: 12,
                  alignItems: 'center',
                  paddingTop: 6,
                  gap: 4,
                  backgroundColor: pressed ? c.surface2 : 'transparent',
                })}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isT ? c.ink : 'transparent',
                  }}
                >
                  <AppText
                    variant="bodyLarge"
                    weight={isT ? '700' : '500'}
                    color={isT ? c.bg : other ? c.ink3 : c.ink}
                    tabular
                    maxFontSizeMultiplier={1.1}
                  >
                    {fmtDayNum(d)}
                  </AppText>
                </View>
                <AppText
                  variant="micro"
                  tone={past ? 'ink3' : 'ink2'}
                  tabular
                  numberOfLines={1}
                  maxFontSizeMultiplier={1}
                  style={{ fontSize: 10 }}
                >
                  {summary}
                </AppText>
                {flag ? (
                  <View style={{ position: 'absolute', top: 5, right: 3 }}>
                    <FlagIcon color={c.ink2} size={10} filled />
                  </View>
                ) : null}
              </Touchable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function MonthLegend() {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, rowGap: 8, marginTop: 16, marginHorizontal: 20 }}>
      <AppText variant="caption" tone="ink2">
        {t.calendar.legendDone}
      </AppText>
      <AppText variant="caption" tone="ink2">
        {t.calendar.legendPlanned}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <FlagIcon color={c.ink2} size={11} filled />
        <AppText variant="caption" tone="ink2">
          {t.calendar.legendDue}
        </AppText>
      </View>
    </View>
  );
}
