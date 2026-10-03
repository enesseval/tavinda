import { addMonths, format } from 'date-fns';
import { useCallback, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { MonthView, WeekView } from '../../components/calendar';
import { Segmented } from '../../components/controls';
import { PeriodPager, type PeriodPagerHandle } from '../../components/PeriodPager';
import { Touchable } from '../../components/Touchable';
import { addDays, parseLocalDate, startOfIsoWeek, toLocalDate } from '../../domain/dates';
import { fmtIsoWeek } from '../../i18n/format';
import { t } from '../../i18n/tr';
import { useNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import { useUi } from '../../store/ui';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const { today } = useNow();
  const view = useUi((s) => s.calendarView);
  const setView = useUi((s) => s.setCalendarView);
  const pager = useRef<PeriodPagerHandle>(null);
  // Current page, kept in a ref so the page renderers stay stable while paging.
  const offset = useRef(0);

  const thisWeek = startOfIsoWeek(today);
  const thisMonth = parseLocalDate(`${today.slice(0, 7)}-01`);
  const shift = useCallback((n: number) => pager.current?.goTo(offset.current + n), []);

  const renderWeek = useCallback(
    (o: number) => <WeekView data={data} today={today} weekStart={addDays(thisWeek, o * 7)} onShift={shift} />,
    [data, today, thisWeek, shift],
  );
  const renderMonth = useCallback(
    (o: number) => <MonthView data={data} today={today} monthStart={toLocalDate(addMonths(thisMonth, o))} onShift={shift} />,
    // thisMonth is derived from today.
    [data, today, shift],
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: insets.top }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 49 + 40 }}>
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
          <Touchable accessibilityRole="button" hitSlop={10} onPress={() => pager.current?.goTo(0)} style={{ marginBottom: 8 }}>
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
              setView(v);
            }}
          />
        </View>
        <PeriodPager
          key={view}
          ref={pager}
          onChange={(o) => (offset.current = o)}
          renderPage={view === 'week' ? renderWeek : renderMonth}
        />
      </ScrollView>
    </View>
  );
}
