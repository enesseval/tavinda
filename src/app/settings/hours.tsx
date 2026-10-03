import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Segmented } from '../../components/controls';
import { PickerField, PickerSheet } from '../../components/PickerSheet';
import { ScreenHeader } from '../../components/ScreenHeader';
import { dateAtTime, minutesToTime } from '../../domain/dates';
import type { DayHours, DayHoursMode, LocalTime } from '../../domain/types';
import { t, WEEKDAYS_LONG } from '../../i18n/tr';
import { setSetting } from '../../services/actions';
import { useAppData } from '../../services/data';
import { useTheme } from '../../theme/theme';
import { radii } from '../../theme/tokens';

type Target = { day: number | null; field: 'start' | 'end' };

/** When the user's day runs: 24 hours, the same hours every day, or per weekday. */
export default function HoursScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useAppData();
  const hours = settings.dayHours;
  const [target, setTarget] = useState<Target | null>(null);

  const save = (next: DayHours) => setSetting('dayHours', next);
  const valueOf = (tg: Target): LocalTime => (tg.day == null ? hours[tg.field] : hours.perDay[tg.day][tg.field]);
  const setValue = (tg: Target, v: LocalTime) => {
    if (tg.day == null) save({ ...hours, [tg.field]: v });
    else save({ ...hours, perDay: hours.perDay.map((p, i) => (i === tg.day ? { ...p, [tg.field]: v } : p)) });
  };

  const pair = (day: number | null) => {
    const v = day == null ? hours : hours.perDay[day];
    return (
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PickerField
          label={t.hours.start}
          value={v.start}
          active={target?.day === day && target.field === 'start'}
          onPress={() => setTarget({ day, field: 'start' })}
        />
        <PickerField
          label={t.hours.end}
          value={v.end}
          active={target?.day === day && target.field === 'end'}
          onPress={() => setTarget({ day, field: 'end' })}
        />
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}>
        <ScreenHeader title={t.hours.title} />
        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 16 }}>
          <Segmented<DayHoursMode>
            options={[
              { value: 'all', label: t.hours.modes.all },
              { value: 'same', label: t.hours.modes.same },
              { value: 'perDay', label: t.hours.modes.perDay },
            ]}
            value={hours.mode}
            onChange={(mode) => save({ ...hours, mode })}
          />
          {hours.mode === 'same' ? pair(null) : null}
          {hours.mode === 'perDay'
            ? WEEKDAYS_LONG.map((name, i) => (
                <View
                  key={name}
                  style={{
                    gap: 8,
                    padding: 12,
                    borderRadius: radii.input,
                    backgroundColor: c.surface,
                    borderWidth: 1,
                    borderColor: c.line,
                  }}
                >
                  <AppText variant="label" tone="ink2">
                    {name}
                  </AppText>
                  {pair(i)}
                </View>
              ))
            : null}
          <AppText variant="footnote" tone="ink2" style={{ paddingHorizontal: 4 }}>
            {hours.mode === 'all' ? t.hours.allFoot : t.hours.foot}
          </AppText>
        </View>
      </ScrollView>
      <PickerSheet
        visible={!!target}
        mode="time"
        title={target?.field === 'end' ? t.hours.end : t.hours.start}
        value={dateAtTime('2026-01-05', target ? valueOf(target) : '08:00')}
        onCancel={() => setTarget(null)}
        onDone={(d) => {
          if (target) setValue(target, minutesToTime(d.getHours() * 60 + d.getMinutes()));
          setTarget(null);
        }}
      />
    </View>
  );
}
