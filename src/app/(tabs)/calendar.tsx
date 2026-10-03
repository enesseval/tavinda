import { addMonths, format } from 'date-fns';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { MonthView, WeekView } from '../../components/calendar';
import { Segmented } from '../../components/controls';
import { Fab } from '../../components/Fab';
import { SwipePager } from '../../components/SwipePager';
import { addDays, parseLocalDate, startOfIsoWeek, toLocalDate } from '../../domain/dates';
import { fmtIsoWeek } from '../../i18n/format';
import { t } from '../../i18n/tr';
import { useNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import { useUi } from '../../store/ui';
import { Touchable } from '../../components/Touchable';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const { today } = useNow();
  const view = useUi((s) => s.calendarView);
  const setView = useUi((s) => s.setCalendarView);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const weekStart = addDays(startOfIsoWeek(today), weekOffset * 7);
  const monthStart = toLocalDate(addMonths(parseLocalDate(`${today.slice(0, 7)}-01`), monthOffset));
  const bottom = insets.bottom + 49 + 110;

  const header = (
    <View>
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
            setWeekOffset(0);
            setMonthOffset(0);
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
          onChange={setView}
        />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: insets.top }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottom }}>
        {header}
        {view === 'week' ? (
          <SwipePager onPrev={() => setWeekOffset((w) => w - 1)} onNext={() => setWeekOffset((w) => w + 1)}>
            <WeekView data={data} today={today} weekStart={weekStart} onShift={(n) => setWeekOffset((w) => w + n)} />
          </SwipePager>
        ) : (
          <SwipePager onPrev={() => setMonthOffset((m) => m - 1)} onNext={() => setMonthOffset((m) => m + 1)}>
            <MonthView data={data} today={today} monthStart={monthStart} onShift={(n) => setMonthOffset((m) => m + n)} />
          </SwipePager>
        )}
      </ScrollView>
      <Fab bottom={insets.bottom + 49 + 16} />
    </View>
  );
}
