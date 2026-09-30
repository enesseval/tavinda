import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo, type ReactElement } from 'react';
import { Pressable, View } from 'react-native';

import { addDays, diffDays, isoWeekday, startOfIsoWeek, timeToMinutes } from '../domain/dates';
import { heatFor, shareForInstance } from '../domain/heat';
import { dayPlan, windowBars, type WindowBar } from '../domain/projection';
import type { AppData, HeatLevel, LocalDate } from '../domain/types';
import { fmtDayNum, fmtDayShortDate, fmtMinutes, fmtMonthYear, fmtRange, fmtWeekdayShort } from '../i18n/format';
import { HEAT_NAMES, t, WEEKDAYS_SHORT } from '../i18n/tr';
import { useTheme } from '../theme/theme';
import { radii, withAlpha } from '../theme/tokens';
import { AppText } from './AppText';
import { CoursePill } from './controls';
import { GradientBar } from './GradientBar';
import { ChevronLeft, ChevronRight, FlagIcon, LockIcon } from './icons';

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={prevLabel}
        onPress={onPrev}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <ChevronLeft color={c.ink} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nextLabel}
        onPress={onNext}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <ChevronRight color={c.ink} />
      </Pressable>
    </View>
  );
}

const HOUR_PX = 44;
const GRID_LEFT = 46;

function openBar(b: WindowBar) {
  if (b.projected) router.push({ pathname: '/task/[id]', params: { id: String(b.task.id) } });
  else router.push({ pathname: '/window/[id]', params: { id: String(b.instance.id) } });
}

export function WeekView({
  data,
  today,
  weekStart,
  onShift,
}: {
  data: AppData;
  today: LocalDate;
  weekStart: LocalDate;
  onShift: (weeks: number) => void;
}) {
  const { c } = useTheme();
  const count = data.settings.showWeekend ? 7 : 5;
  const days = useMemo(() => Array.from({ length: count }, (_, i) => addDays(weekStart, i)), [weekStart, count]);
  const plans = useMemo(() => days.map((d) => dayPlan(data, today, d)), [data, today, days]);
  const bars = useMemo(() => windowBars(data, today, days), [data, today, days]);
  const total = plans.reduce((a, p) => a + p.totalMinutes, 0);
  const colW = 100 / count;

  const classes = data.courses.filter((k) => days.some((d) => isoWeekday(d) === k.weekday));
  const startH = Math.min(8, ...classes.map((k) => Math.floor(timeToMinutes(k.startTime) / 60)));
  const endH = Math.max(19, ...classes.map((k) => Math.ceil(timeToMinutes(k.endTime) / 60)));
  const Y = (m: number) => ((m - startH * 60) / 60) * HOUR_PX;
  const todayCol = days.indexOf(today);

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
          <AppText variant="headline">{fmtRange(days[0], days[days.length - 1])}</AppText>
          <AppText variant="caption" tone="ink2" tabular>
            {total ? t.calendar.weekLoad(fmtMinutes(total)) : t.calendar.weekEmpty}
          </AppText>
        </View>
        <NavArrows
          onPrev={() => onShift(-1)}
          onNext={() => onShift(1)}
          prevLabel={t.calendar.prevWeek}
          nextLabel={t.calendar.nextWeek}
        />
      </View>

      <View style={{ flexDirection: 'row', marginLeft: GRID_LEFT, marginRight: 12 }}>
        {plans.map((p) => {
          const isT = p.day === today;
          return (
            <Pressable
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: p.maxHeat == null ? c.line : c.heat[p.maxHeat],
                  }}
                />
                <AppText variant="micro" tone="ink2" tabular numberOfLines={1} maxFontSizeMultiplier={1}>
                  {p.totalMinutes ? fmtMinutes(p.totalMinutes) : '–'}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>

      <AppText variant="label" tone="ink2" style={{ marginTop: 16, marginHorizontal: 20 }}>
        {t.calendar.windows}
      </AppText>
      <View style={{ marginTop: 2, marginLeft: GRID_LEFT, marginRight: 12 }}>
        {bars.length ? (
          bars.map((b) => {
            const left = b.fromCol * colW;
            const width = (b.toCol - b.fromCol + 1) * colW;
            const from = c.heat[b.heatFrom];
            const to = c.heat[b.heatTo];
            return (
              <View key={`${b.instance.id}-${b.task.id}`} style={{ height: 36 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${b.task.title}, ${HEAT_NAMES[b.heatTo]}`}
                  onPress={() => openBar(b)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${left}%`,
                    width: `${width}%`,
                    justifyContent: 'flex-end',
                    gap: 5,
                    paddingBottom: 6,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingLeft: b.clippedLeft ? 0 : 2,
                      paddingRight: 2,
                    }}
                  >
                    <AppText variant="micro" tone="ink2" numberOfLines={1} style={{ flexShrink: 1 }} maxFontSizeMultiplier={1.1}>
                      {b.task.title}
                      {b.course ? ` · ${b.course.shortName}` : ''}
                    </AppText>
                    <View style={{ flex: 1 }} />
                    {b.lockInRange ? <LockIcon color={c.heat[4]} size={11} /> : null}
                    {b.dueInRange ? <FlagIcon color={c.ink2} size={11} /> : null}
                  </View>
                  <View
                    style={{
                      borderTopLeftRadius: b.clippedLeft ? 0 : 3,
                      borderBottomLeftRadius: b.clippedLeft ? 0 : 3,
                      borderTopRightRadius: b.clippedRight ? 0 : 3,
                      borderBottomRightRadius: b.clippedRight ? 0 : 3,
                      overflow: 'hidden',
                      opacity: b.instance.status === 'active' ? 1 : 0.4,
                    }}
                  >
                    <GradientBar
                      height={6}
                      stops={[
                        { offset: 0, color: from },
                        { offset: 1, color: to },
                      ]}
                    />
                  </View>
                </Pressable>
              </View>
            );
          })
        ) : (
          <AppText variant="footnote" tone="ink3" style={{ paddingVertical: 8 }}>
            {t.calendar.noWindows}
          </AppText>
        )}
      </View>

      <View style={{ marginTop: 18, marginLeft: GRID_LEFT, marginRight: 12, height: (endH - startH) * HOUR_PX }}>
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
          <View
            key={i}
            style={{
              position: 'absolute',
              left: -34,
              right: 0,
              top: i * HOUR_PX - 7,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <AppText variant="micro" tone="ink3" tabular style={{ width: 26, textAlign: 'right' }} maxFontSizeMultiplier={1}>
              {String(startH + i).padStart(2, '0')}
            </AppText>
            <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
          </View>
        ))}
        {days.map((d, col) =>
          data.courses
            .filter((k) => k.weekday === isoWeekday(d))
            .map((k) => {
              const s = timeToMinutes(k.startTime);
              const e = timeToMinutes(k.endTime);
              return (
                <View
                  key={`${d}-${k.id}`}
                  accessibilityLabel={`${k.name}, ${k.startTime}`}
                  style={{
                    position: 'absolute',
                    left: `${col * colW}%`,
                    width: `${colW}%`,
                    top: Y(s),
                    height: Math.max(22, Y(e) - Y(s)),
                    paddingHorizontal: 2,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: c.surface2,
                      borderLeftWidth: 3,
                      borderLeftColor: k.color,
                      borderTopLeftRadius: 4,
                      borderBottomLeftRadius: 4,
                      borderTopRightRadius: 8,
                      borderBottomRightRadius: 8,
                      paddingVertical: 4,
                      paddingHorizontal: 5,
                      overflow: 'hidden',
                    }}
                  >
                    <AppText variant="micro" weight="600" numberOfLines={1} maxFontSizeMultiplier={1}>
                      {k.name}
                    </AppText>
                    <AppText variant="micro" tone="ink2" tabular numberOfLines={1} maxFontSizeMultiplier={1}>
                      {k.startTime}
                    </AppText>
                  </View>
                </View>
              );
            }),
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginLeft: GRID_LEFT }}>
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
      </View>
    </View>
  );
}

export function MonthView({
  data,
  today,
  monthStart,
  onShift,
}: {
  data: AppData;
  today: LocalDate;
  monthStart: LocalDate;
  onShift: (months: number) => void;
}) {
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
        const heats = [...new Set(p.shares.map((s) => s.heat))].sort((a, b) => b - a).slice(0, 3) as HeatLevel[];
        return { d, heats, flag: p.dues.length > 0 };
      }),
    [cells, data, today],
  );

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
        <AppText variant="headline">{fmtMonthYear(monthStart)}</AppText>
        <NavArrows
          onPrev={() => onShift(-1)}
          onNext={() => onShift(1)}
          prevLabel={t.calendar.prevMonth}
          nextLabel={t.calendar.nextMonth}
        />
      </View>
      <View style={{ flexDirection: 'row', marginHorizontal: 12 }}>
        {WEEKDAYS_SHORT.map((w) => (
          <AppText key={w} variant="caption" tone="ink3" center style={{ flex: 1 }} maxFontSizeMultiplier={1.1}>
            {w}
          </AppText>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginHorizontal: 12, rowGap: 4 }}>
        {info.map(({ d, heats, flag }) => {
          const isT = d === today;
          const other = d.slice(0, 7) !== month;
          const weekend = isoWeekday(d) >= 6;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityLabel={`${fmtDayShortDate(d)}${flag ? `, ${t.calendar.legendDue}` : ''}${heats.length ? `, ${HEAT_NAMES[heats[0]]}` : ''}`}
              onPress={() => router.push({ pathname: '/day/[date]', params: { date: d } })}
              style={({ pressed }) => ({
                width: `${100 / 7}%`,
                height: 62,
                borderRadius: 12,
                alignItems: 'center',
                paddingTop: 6,
                gap: 7,
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
                  color={isT ? c.bg : other || weekend ? c.ink3 : c.ink}
                  tabular
                  maxFontSizeMultiplier={1.1}
                >
                  {fmtDayNum(d)}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: 3, opacity: d < today ? 0.45 : 1 }}>
                {heats.map((h) => (
                  <View key={h} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.heat[h] }} />
                ))}
              </View>
              {flag ? (
                <View style={{ position: 'absolute', top: 5, right: 5 }}>
                  <FlagIcon color={c.ink2} size={11} filled />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, rowGap: 8, marginTop: 16, marginHorizontal: 20 }}>
        {HEAT_NAMES.map((n, i) => (
          <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.heat[i] }} />
            <AppText variant="caption" tone="ink2">
              {n}
            </AppText>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <FlagIcon color={c.ink2} size={11} filled />
          <AppText variant="caption" tone="ink2">
            {t.calendar.legendDue}
          </AppText>
        </View>
      </View>
    </View>
  );
}

interface DueRow {
  instanceId: number;
  taskId: number;
  title: string;
  course: { code: string; color: string } | null;
  daysLeft: number;
  due: LocalDate;
  progress: number;
  share: number;
  heat: HeatLevel;
  warnDays: number;
}

export function useDueRows(data: AppData, today: LocalDate): DueRow[] {
  return useMemo(() => {
    const rows: DueRow[] = [];
    for (const task of data.tasks) {
      if (task.kind !== 'deadline') continue;
      const inst = data.instances.find((i) => i.taskId === task.id && i.status === 'active');
      if (!inst) continue;
      const course = task.courseId != null ? data.courses.find((k) => k.id === task.courseId) : undefined;
      rows.push({
        instanceId: inst.id,
        taskId: task.id,
        title: task.title,
        course: course ? { code: course.shortName, color: course.color } : null,
        daysLeft: diffDays(inst.windowEnd, today),
        due: inst.windowEnd,
        progress: inst.progress,
        share: shareForInstance(inst, task, today),
        heat: heatFor(inst, task, today, data.settings),
        warnDays: task.warnDays ?? data.settings.warnDays,
      });
    }
    return rows.sort((a, b) => a.due.localeCompare(b.due));
  }, [data, today]);
}

function DueCard({ row }: { row: DueRow }) {
  const { c } = useTheme();
  const tick = row.daysLeft > row.warnDays ? ((row.daysLeft - row.warnDays) / row.daysLeft) * 100 : 0;
  const stops =
    tick === 0
      ? [
          { offset: 0, color: c.heat[2] },
          { offset: 1, color: c.heat[3] },
        ]
      : [
          { offset: 0, color: c.heat[0] },
          { offset: (tick * 0.5) / 100, color: c.heat[0] },
          { offset: (tick * 0.82) / 100, color: c.heat[1] },
          { offset: tick / 100, color: c.heat[2] },
          { offset: 1, color: c.heat[3] },
        ];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.title}, ${t.card.daysLeft(row.daysLeft)}, %${row.progress}, ${HEAT_NAMES[row.heat]}`}
      onPress={() => router.push({ pathname: '/task/[id]', params: { id: String(row.taskId) } })}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: c.line,
        backgroundColor: pressed ? c.surface2 : c.surface,
        borderRadius: radii.card,
        padding: 16,
        gap: 12,
        marginHorizontal: 20,
        marginBottom: 12,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ gap: 6, flexShrink: 1 }}>
          <AppText variant="headline">{row.title}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {row.course ? <CoursePill code={row.course.code} color={row.course.color} /> : null}
            <AppText variant="caption" tone="ink2" tabular>
              {row.daysLeft <= 0 ? HEAT_NAMES[4] : t.card.daysLeft(row.daysLeft)}
            </AppText>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <AppText variant="bodyStrong" tabular>
            {row.share ? fmtMinutes(row.share) : '–'}
          </AppText>
          <AppText variant="micro" tone="ink3">
            {t.calendar.dailyShare}
          </AppText>
        </View>
      </View>
      <View style={{ height: 8 }}>
        <View style={{ position: 'absolute', inset: 0, borderRadius: 4, overflow: 'hidden' }}>
          <GradientBar height={8} stops={stops} opacity={0.22} />
        </View>
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: `${row.progress}%`,
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <View style={{ width: `${row.progress ? 10000 / row.progress : 0}%` }}>
            <GradientBar height={8} stops={stops} />
          </View>
        </View>
        {tick > 0 ? (
          <View style={{ position: 'absolute', top: -4, bottom: -4, left: `${tick}%`, width: 1.5, backgroundColor: c.ink }} />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="micro" tone="ink3" tabular>
          {t.calendar.todayDone(row.progress)}
        </AppText>
        <AppText variant="micro" tone="ink2" tabular>
          {fmtDayShortDate(row.due)}
        </AppText>
      </View>
    </Pressable>
  );
}

export function DueList({ rows, header, footerHeight }: { rows: DueRow[]; header: ReactElement; footerHeight: number }) {
  return (
    <FlashList
      data={rows}
      keyExtractor={(r) => String(r.instanceId)}
      renderItem={({ item }) => <DueCard row={item} />}
      ListHeaderComponent={header}
      ListFooterComponent={<View style={{ height: footerHeight }} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

export function DueHeader({ rows, warnDays }: { rows: DueRow[]; warnDays: number }) {
  const { c } = useTheme();
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingTop: 18,
          paddingBottom: 12,
          paddingHorizontal: 20,
        }}
      >
        <AppText variant="body" tone="ink2" style={{ flexShrink: 1 }}>
          {t.calendar.dueSummary(rows.length, rows[0]?.daysLeft ?? 0)}
        </AppText>
        {rows.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 1.5, height: 14, backgroundColor: c.ink }} />
            <AppText variant="caption" tone="ink2">
              {t.calendar.dueWarn(warnDays)}
            </AppText>
          </View>
        ) : null}
      </View>
      {!rows.length ? (
        <AppText variant="body" tone="ink3" style={{ paddingHorizontal: 20 }}>
          {t.calendar.dueEmpty}
        </AppText>
      ) : null}
    </View>
  );
}
