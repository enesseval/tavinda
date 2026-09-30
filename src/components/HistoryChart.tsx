import { View } from 'react-native';

import type { HistoryDay } from '../domain/projection';
import { fmtWeekdayShort } from '../i18n/format';
import { t } from '../i18n/tr';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

/** Per-day bars: done (filled), planned (dashed), deferred (thin gray). */
export function HistoryChart({
  days,
  goal,
  height = 110,
  legend = true,
}: {
  days: HistoryDay[];
  goal?: number;
  height?: number;
  legend?: boolean;
}) {
  const { c } = useTheme();
  const barMax = height - 30;
  const peak = Math.max(goal ?? 0, ...days.map((d) => d.minutes), 1);
  const scale = barMax / peak;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height }}>
        {goal ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: Math.round(goal * scale),
              borderTopWidth: 1,
              borderStyle: 'dashed',
              borderColor: c.ink3,
            }}
          />
        ) : null}
        {days.map((d) => {
          const future = d.kind === 'future';
          const deferred = d.kind === 'deferred';
          const h = deferred ? 3 : Math.max(3, Math.round(d.minutes * scale));
          return (
            <View key={d.day} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' }}>
              <AppText variant="micro" tone="ink2" tabular maxFontSizeMultiplier={1.1}>
                {deferred ? '' : d.minutes ? String(d.minutes) : '–'}
              </AppText>
              <View
                style={{
                  alignSelf: 'stretch',
                  height: h,
                  borderRadius: 6,
                  backgroundColor: future ? 'transparent' : deferred ? c.ink3 : d.minutes ? c.heat[d.heat] : c.line,
                  borderWidth: future ? 1.5 : 0,
                  borderStyle: 'dashed',
                  borderColor: c.heat[d.heat],
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        {days.map((d) => (
          <AppText
            key={d.day}
            variant="caption"
            maxFontSizeMultiplier={1.1}
            numberOfLines={1}
            color={d.kind === 'today' ? c.ink : c.ink3}
            weight={d.kind === 'today' ? '600' : '500'}
            style={{ flex: 1, textAlign: 'center' }}
          >
            {d.kind === 'today' ? t.calendar.today : fmtWeekdayShort(d.day)}
          </AppText>
        ))}
      </View>
      {legend ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 14,
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: c.line,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.heat[2] }} />
            <AppText variant="caption" tone="ink2">
              {t.detail.legendDone}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{ width: 10, height: 10, borderRadius: 3, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.heat[3] }}
            />
            <AppText variant="caption" tone="ink2">
              {t.detail.legendPlanned}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: c.ink3 }} />
            <AppText variant="caption" tone="ink2">
              {t.detail.legendDeferred}
            </AppText>
          </View>
        </View>
      ) : null}
    </View>
  );
}
