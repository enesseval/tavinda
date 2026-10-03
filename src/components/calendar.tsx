import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { addDays, isoWeekday, startOfIsoWeek, timeToMinutes } from '../domain/dates';
import { dayPlan, windowRows, type WindowSegment } from '../domain/projection';
import type { AppData, HeatLevel, LocalDate } from '../domain/types';
import {
  fmtCompactMinutes,
  fmtDayNum,
  fmtDayShortDate,
  fmtMinutes,
  fmtMonthYear,
  fmtRange,
  fmtWeekdayShort,
} from '../i18n/format';
import { HEAT_NAMES, t, WEEKDAYS_SHORT } from '../i18n/tr';
import { useTheme } from '../theme/theme';
import { withAlpha } from '../theme/tokens';
import { AppText } from './AppText';
import { GradientBar } from './GradientBar';
import { ChevronLeft, ChevronRight, FlagIcon } from './icons';
import { Touchable } from './Touchable';

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

const HOUR_PX = 44;
const GRID_LEFT = 46;

function openSegment(taskId: number, seg: WindowSegment) {
  if (seg.projected) router.push({ pathname: '/task/[id]', params: { id: String(taskId) } });
  else router.push({ pathname: '/window/[id]', params: { id: String(seg.instance.id) } });
}

/** Gradient stops centred on each day so neighbouring days blend, but a new window starts fresh. */
function dayStops(heats: HeatLevel[], palette: readonly string[]) {
  if (heats.length === 1)
    return [
      { offset: 0, color: palette[heats[0]] },
      { offset: 1, color: palette[heats[0]] },
    ];
  return heats.map((h, i) => ({ offset: (i + 0.5) / heats.length, color: palette[h] }));
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
  const count = 7;
  const days = useMemo(() => Array.from({ length: count }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const plans = useMemo(() => days.map((d) => dayPlan(data, today, d)), [data, today, days]);
  const rows = useMemo(() => windowRows(data, today, days), [data, today, days]);
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
            </Touchable>
          );
        })}
      </View>

      <AppText variant="label" tone="ink2" style={{ marginTop: 16, marginHorizontal: 20 }}>
        {t.calendar.windows}
      </AppText>
      <View style={{ marginTop: 2, marginLeft: GRID_LEFT, marginRight: 12 }}>
        {rows.length ? (
          rows.map((row) => {
            const first = row.segments[0];
            const lastSeg = row.segments[row.segments.length - 1];
            const label = `${row.task.title}${row.course ? ` · ${row.course.shortName}` : ''}`;
            return (
              <View key={row.task.id} style={{ height: 36 }}>
                <AppText
                  variant="micro"
                  tone="ink2"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.1}
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: `${first.fromCol * colW}%`,
                    right: `${(count - 1 - lastSeg.toCol) * colW}%`,
                    paddingLeft: first.clippedLeft ? 0 : 2,
                  }}
                >
                  {label}
                </AppText>
                {row.segments.map((seg) => (
                  <Touchable
                    key={seg.instance.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${label}, ${HEAT_NAMES[seg.heats[seg.heats.length - 1]]}`}
                    onPress={() => openSegment(row.task.id, seg)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${seg.fromCol * colW}%`,
                      width: `${(seg.toCol - seg.fromCol + 1) * colW}%`,
                      justifyContent: 'flex-end',
                      paddingBottom: 6,
                      paddingLeft: seg.clippedLeft ? 0 : 1,
                      paddingRight: seg.clippedRight ? 0 : 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', height: 14 }}>
                      {seg.dueInRange ? <FlagIcon color={c.ink2} size={11} /> : null}
                    </View>
                    <View
                      style={{
                        borderTopLeftRadius: seg.clippedLeft ? 0 : 3,
                        borderBottomLeftRadius: seg.clippedLeft ? 0 : 3,
                        borderTopRightRadius: seg.clippedRight ? 0 : 3,
                        borderBottomRightRadius: seg.clippedRight ? 0 : 3,
                        overflow: 'hidden',
                        opacity: seg.instance.status === 'active' ? 1 : 0.35,
                      }}
                    >
                      <GradientBar height={6} stops={dayStops(seg.heats, c.heat)} />
                    </View>
                  </Touchable>
                ))}
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
        return { d, minutes: p.totalMinutes, flag: p.dues.length > 0, past: d < today };
      }),
    [cells, data, today],
  );
  const weeks = useMemo(() => Array.from({ length: info.length / 7 }, (_, w) => info.slice(w * 7, w * 7 + 7)), [info]);

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
    </View>
  );
}
