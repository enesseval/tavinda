import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { addDays, DEFAULT_DUE_TIME, startOfIsoWeek, toLocalDate } from '../domain/dates';
import { dayPlan, type DayShare } from '../domain/projection';
import { dayTimeline } from '../domain/schedule';
import type { AppData, LocalDate } from '../domain/types';
import {
  fmtCompactMinutes,
  fmtDayNum,
  fmtDayShortDate,
  fmtLongDay,
  fmtMinutes,
  fmtMonthYear,
  fmtRange,
  fmtWeekdayShort,
} from '../i18n/format';
import { t, WEEKDAYS_SHORT } from '../i18n/tr';
import { useNow } from '../services/clock';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { DayAgenda, DayShareList } from './dayPlan';
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

export function WeekView({
  data,
  today,
  weekStart,
  onShift,
  bottomInset,
}: {
  data: AppData;
  today: LocalDate;
  weekStart: LocalDate;
  onShift: (weeks: number) => void;
  /** Space under the scrolling part for the tab bar. */
  bottomInset: number;
}) {
  const { c } = useTheme();
  const { now } = useNow();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const plans = useMemo(() => days.map((d) => dayPlan(data, today, d)), [data, today, days]);
  const total = plans.reduce((a, p) => a + p.totalMinutes, 0);
  // One day at a time: today in this week, otherwise its Monday.
  const [selected, setSelected] = useState(() => (days.includes(today) ? today : days[0]));
  const day = days.includes(selected) ? selected : days[0];
  const plan = plans[days.indexOf(day)];
  const timeline = useMemo(() => dayTimeline(data, day), [data, day]);
  // After midnight but before the cutoff the clock is already on the next date.
  const clock = now.getHours() * 60 + now.getMinutes();
  const nowMinutes = day === today ? (toLocalDate(now) === today ? clock : clock + 1440) : null;

  const sub = plan.isPast
    ? plan.totalMinutes
      ? t.calendar.workedTotal(fmtMinutes(plan.totalMinutes))
      : t.calendar.pastDay
    : plan.totalMinutes
      ? t.calendar.planned(fmtMinutes(plan.totalMinutes))
      : t.calendar.noPlan;

  const openShare = (s: DayShare) => {
    if (s.instance.id > 0 && !plan.isPast) router.push({ pathname: '/progress/[id]', params: { id: String(s.instance.id) } });
    else router.push({ pathname: '/task/[id]', params: { id: String(s.task.id) } });
  };

  return (
    <View style={{ flex: 1 }}>
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

      {/* Day strip: a dot shows how hot the day is; the numbers live below, for the picked day. */}
      <View style={{ flexDirection: 'row', marginHorizontal: 12 }}>
        {plans.map((p) => {
          const isSel = p.day === day;
          const isT = p.day === today;
          return (
            <Touchable
              key={p.day}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              accessibilityLabel={`${fmtDayShortDate(p.day)}, ${p.totalMinutes ? fmtMinutes(p.totalMinutes) : t.calendar.noPlan}`}
              onPress={() => setSelected(p.day)}
              style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 6 }}
            >
              <AppText variant="caption" tone={isSel ? 'ink' : 'ink2'} maxFontSizeMultiplier={1.1}>
                {fmtWeekdayShort(p.day)}
              </AppText>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSel ? c.ink : 'transparent',
                  borderWidth: isT && !isSel ? 1 : 0,
                  borderColor: c.ink3,
                }}
              >
                <AppText variant="headline" color={isSel ? c.bg : c.ink} tabular maxFontSizeMultiplier={1.1}>
                  {fmtDayNum(p.day)}
                </AppText>
              </View>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: p.maxHeat == null || !p.totalMinutes ? 'transparent' : c.heat[p.maxHeat],
                }}
              />
            </Touchable>
          );
        })}
      </View>

      {/* Range, arrows and the day strip stay; only the picked day scrolls. */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: bottomInset, gap: 18 }}
      >
        <View style={{ gap: 2 }}>
          <AppText variant="title" accessibilityRole="header">
            {fmtLongDay(day)}
          </AppText>
          <AppText variant="caption" tone="ink2" tabular>
            {sub}
          </AppText>
        </View>

        {plan.dues.map((d) => (
          <View
            key={d.task.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: c.surface2,
            }}
          >
            <FlagIcon color={c.ink} size={14} filled />
            <AppText variant="body" weight="500" style={{ flexShrink: 1 }}>
              {t.calendar.dueBanner(d.task.title, d.course?.shortName ?? null, d.task.dueTime ?? DEFAULT_DUE_TIME)}
            </AppText>
          </View>
        ))}

        <View style={{ gap: 10 }}>
          <AppText variant="label" tone="ink2">
            {t.calendar.agenda}
          </AppText>
          <DayAgenda
            timeline={timeline}
            nowMinutes={nowMinutes}
            onGap={day === today ? () => router.push('/block/new') : undefined}
            onBlock={(id) => router.push({ pathname: '/block/[id]', params: { id: String(id) } })}
          />
        </View>

        <View style={{ gap: 10 }}>
          <AppText variant="label" tone="ink2">
            {plan.isPast ? t.calendar.worked : t.calendar.todo}
          </AppText>
          <DayShareList plan={plan} today={today} onOpen={openShare} />
        </View>
      </ScrollView>
    </View>
  );
}

export function MonthView({
  data,
  today,
  monthStart,
  onShift,
  bottomInset,
}: {
  data: AppData;
  today: LocalDate;
  monthStart: LocalDate;
  onShift: (months: number) => void;
  bottomInset: number;
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
    <View style={{ flex: 1 }}>
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
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset }}>
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
      </ScrollView>
    </View>
  );
}
