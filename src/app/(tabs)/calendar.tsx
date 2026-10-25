import { addMonths, format } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import {
  HOUR_PX,
  HOURS_GUTTER,
  HourGutter,
  MONTH_GRID_HEIGHT,
  MonthGrid,
  MonthHeader,
  MonthLegend,
  WeekColumns,
  WeekHeader,
  WeekLegend,
  weekHourRange,
} from '../../components/calendar';
import { Segmented } from '../../components/controls';
import { PeriodPager, type PeriodPagerHandle } from '../../components/PeriodPager';
import { Touchable } from '../../components/Touchable';
import { addDays, diffDays, isoWeekday, parseLocalDate, startOfIsoWeek, timeToMinutes, toLocalDate } from '../../domain/dates';
import { blocksOn } from '../../domain/schedule';
import type { LocalDate } from '../../domain/types';
import { fmtIsoWeek } from '../../i18n/format';
import { t } from '../../i18n/tr';
import { useNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import { useUi } from '../../store/ui';

/**
 * Takvim. Title, Hafta/Ay, the period header with its arrows, the day row and the hour
 * labels stay where they are; only the grid swipes between periods, and the header text
 * fades to the new dates.
 */
export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const { today } = useNow();
  const view = useUi((s) => s.calendarView);
  const setView = useUi((s) => s.setCalendarView);
  const pager = useRef<PeriodPagerHandle>(null);
  // Kept in a ref for the page renderers (stable while paging) and in state for the fixed header.
  const offset = useRef(0);
  // Live pager position (periods from now) for the fixed headers.
  const progress = useSharedValue(0);
  // Day picked in the week strip (or in the month); the grid highlights and scrolls to it.
  const [selected, setSelected] = useState(today);
  // Week the pager opens on (changes when a day is picked in the month).
  const [startOffset, setStartOffset] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const pendingScroll = useRef<LocalDate | null>(null);
  const window = useWindowDimensions();
  // Estimated from the screen until the first layout, so the grid shows on the first frame.
  const [gridWidth, setGridWidth] = useState(Math.round(window.width - HOURS_GUTTER - 12));

  const thisWeek = startOfIsoWeek(today);
  const thisMonth = parseLocalDate(`${today.slice(0, 7)}-01`);
  const range = useMemo(() => weekHourRange(data, thisWeek), [data, thisWeek]);
  const bottomInset = insets.bottom + 49 + 40;

  /** Brings the day's first class or block (or now, today) into view in the hour grid. */
  const scrollToDay = useCallback(
    (day: LocalDate) => {
      const starts = [
        ...data.courses.filter((k) => k.weekday === isoWeekday(day)).map((k) => timeToMinutes(k.startTime)),
        ...blocksOn(data.blocks, day).map((b) => b.start),
      ];
      const nowD = new Date();
      const target =
        day === today ? nowD.getHours() * 60 + nowD.getMinutes() - 60 : starts.length ? Math.min(...starts) : range.startH * 60;
      const y = 14 + ((Math.max(target, range.startH * 60) - range.startH * 60) / 60) * HOUR_PX - 12;
      scroll.current?.scrollTo({ y: Math.max(0, y), animated: true });
    },
    [data.courses, data.blocks, today, range.startH],
  );

  const onChange = useCallback(
    (o: number) => {
      // Swiping to another week keeps the same weekday picked.
      if (view === 'week' && o !== offset.current) setSelected((d) => addDays(d, (o - offset.current) * 7));
      offset.current = o;
    },
    [view],
  );

  const pickDay = useCallback(
    (day: LocalDate) => {
      setSelected(day);
      scrollToDay(day);
    },
    [scrollToDay],
  );

  // A day picked in the month: open its week, then scroll once the grid is there.
  const openWeekOf = useCallback(
    (day: LocalDate) => {
      const o = diffDays(startOfIsoWeek(day), thisWeek) / 7;
      offset.current = o;
      progress.value = o;
      setStartOffset(o);
      setSelected(day);
      pendingScroll.current = day;
      setView('week');
    },
    [thisWeek, progress, setView],
  );
  useEffect(() => {
    if (view !== 'week' || !pendingScroll.current) return;
    const day = pendingScroll.current;
    pendingScroll.current = null;
    const id = setTimeout(() => scrollToDay(day), 80);
    return () => clearTimeout(id);
  }, [view, scrollToDay]);
  const shift = useCallback((n: number) => pager.current?.goTo(offset.current + n), []);

  const renderWeek = useCallback(
    (o: number) => (
      <WeekColumns
        data={data}
        today={today}
        weekStart={addDays(thisWeek, o * 7)}
        startH={range.startH}
        endH={range.endH}
        selected={selected}
      />
    ),
    [data, today, thisWeek, range, selected],
  );
  const renderMonth = useCallback(
    (o: number) => <MonthGrid data={data} today={today} monthStart={toLocalDate(addMonths(thisMonth, o))} onPick={openWeekOf} />,
    // thisMonth is derived from today.
    [data, today, openWeekOf],
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: insets.top }} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingTop: 10,
          paddingHorizontal: 20,
        }}
      >
        <View style={{ gap: 2 }}>
          <AppText variant="caption" tone="ink2">
            {t.calendar.caption(format(parseLocalDate(today), 'yyyy'), fmtIsoWeek(today))}
          </AppText>
          <AppText variant="display" accessibilityRole="header">
            {t.calendar.title}
          </AppText>
        </View>
        <Touchable
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => {
            pager.current?.goTo(0);
            if (view === 'week') pickDay(today);
          }}
          style={{ marginBottom: 8 }}
        >
          <AppText variant="bodyLarge">{t.calendar.today}</AppText>
        </Touchable>
      </View>
      <View style={{ marginTop: 14, marginHorizontal: 20 }}>
        <Segmented
          options={[
            { value: 'week', label: t.calendar.segments.week },
            { value: 'month', label: t.calendar.segments.month },
          ]}
          value={view}
          onChange={(v) => {
            offset.current = 0;
            progress.value = 0;
            setStartOffset(0);
            setSelected(today);
            setView(v);
          }}
        />
      </View>

      {view === 'week' ? (
        <>
          <WeekHeader
            data={data}
            today={today}
            thisWeek={thisWeek}
            progress={progress}
            selected={selected}
            onSelect={pickDay}
            onPrev={() => shift(-1)}
            onNext={() => shift(1)}
          />
          <ScrollView
            ref={scroll}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 14, paddingBottom: bottomInset }}
          >
            <View style={{ flexDirection: 'row', marginRight: 12 }}>
              <HourGutter startH={range.startH} endH={range.endH} />
              <View style={{ flex: 1 }} onLayout={(e) => setGridWidth(Math.round(e.nativeEvent.layout.width))}>
                {gridWidth > 0 ? (
                  <PeriodPager
                    key={`week-${gridWidth}-${startOffset}`}
                    ref={pager}
                    width={gridWidth}
                    height={(range.endH - range.startH) * HOUR_PX}
                    onChange={onChange}
                    progress={progress}
                    initialOffset={startOffset}
                    renderPage={renderWeek}
                  />
                ) : null}
              </View>
            </View>
            <WeekLegend />
          </ScrollView>
        </>
      ) : (
        <>
          <MonthHeader thisMonth={toLocalDate(thisMonth)} progress={progress} onPrev={() => shift(-1)} onNext={() => shift(1)} />
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomInset }}
          >
            <PeriodPager
              key="month"
              ref={pager}
              height={MONTH_GRID_HEIGHT}
              onChange={onChange}
              progress={progress}
              renderPage={renderMonth}
            />
            <MonthLegend />
          </ScrollView>
        </>
      )}
    </View>
  );
}
