import { useState } from 'react';
import { View } from 'react-native';

import { addDays, isoWeekday, toLocalDate } from '../domain/dates';
import type { LocalDate } from '../domain/types';
import { fmtLongDay, fmtMonthYear } from '../i18n/format';
import { t, WEEKDAYS_SHORT } from '../i18n/tr';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { ChevronLeft, ChevronRight } from './icons';
import { Touchable } from './Touchable';

const firstOfMonth = (ld: LocalDate): LocalDate => `${ld.slice(0, 8)}01`;
const shiftMonth = (first: LocalDate, n: number): LocalDate => {
  const d = new Date(Number(first.slice(0, 4)), Number(first.slice(5, 7)) - 1 + n, 1);
  return toLocalDate(d);
};

interface Props {
  value: LocalDate;
  onChange: (day: LocalDate) => void;
  min?: LocalDate;
  max?: LocalDate;
  today: LocalDate;
}

/**
 * Month grid for the date sheet. Our own instead of iOS's inline UIDatePicker, which
 * keeps its intrinsic width under Fabric and leaves the right side of the sheet empty.
 * Always six rows, so the sheet doesn't change height between months.
 */
export function CalendarPicker({ value, onChange, min, max, today }: Props) {
  const { c } = useTheme();
  const [month, setMonth] = useState(() => firstOfMonth(value));

  const gridStart = addDays(month, -(isoWeekday(month) - 1));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const canPrev = !min || firstOfMonth(min) < month;
  const canNext = !max || shiftMonth(month, 1) <= max;
  const outside = (d: LocalDate) => (min != null && d < min) || (max != null && d > max);

  const arrow = (dir: -1 | 1, enabled: boolean) => (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={dir < 0 ? t.calendar.prevMonth : t.calendar.nextMonth}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      hitSlop={8}
      onPress={() => setMonth((m) => shiftMonth(m, dir))}
      style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', opacity: enabled ? 1 : 0.3 }}
    >
      {dir < 0 ? <ChevronLeft color={c.ink} size={18} /> : <ChevronRight color={c.ink} size={18} />}
    </Touchable>
  );

  return (
    <View style={{ alignSelf: 'stretch', gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 4 }}>
        <AppText variant="headline" accessibilityRole="header">
          {fmtMonthYear(month)}
        </AppText>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {arrow(-1, canPrev)}
          {arrow(1, canNext)}
        </View>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS_SHORT.map((w) => (
          <AppText key={w} variant="caption" tone="ink3" center style={{ flex: 1 }}>
            {w}
          </AppText>
        ))}
      </View>

      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row' }}>
          {days.slice(row * 7, row * 7 + 7).map((d) => {
            const inMonth = d.slice(0, 7) === month.slice(0, 7);
            const selected = d === value;
            const disabled = outside(d);
            const isToday = d === today;
            return (
              <Touchable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={fmtLongDay(d)}
                accessibilityState={{ selected, disabled }}
                disabled={disabled}
                onPress={() => {
                  onChange(d);
                  if (!inMonth) setMonth(firstOfMonth(d));
                }}
                style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? c.ink : 'transparent',
                    borderWidth: isToday && !selected ? 1 : 0,
                    borderColor: c.ink3,
                  }}
                >
                  <AppText
                    variant="bodyLarge"
                    tabular
                    weight={selected || isToday ? '600' : '400'}
                    color={selected ? c.bg : disabled ? c.line : inMonth ? c.ink : c.ink3}
                  >
                    {Number(d.slice(8))}
                  </AppText>
                </View>
              </Touchable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
