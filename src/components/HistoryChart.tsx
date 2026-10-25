import { View } from 'react-native';

import type { HistoryDay } from '../domain/projection';
import type { HeatLevel } from '../domain/types';
import { fmtWeekdayShort } from '../i18n/format';
import { t } from '../i18n/tr';
import { useTheme } from '../theme/theme';
import { withAlpha } from '../theme/tokens';
import { AppText } from './AppText';

const TRACK_RADIUS = 9;

/**
 * Per-day columns. Every day has the same rounded track; a full track is the day's
 * goal (or the busiest day when there is none). Done work fills it solid, planned
 * work in a soft tint of the same heat, a deferred day shows a gray cap. No lines
 * cross the columns, so nothing meets at awkward joints.
 */
export function HistoryChart({
  days,
  goal,
  height = 110,
  legend = true,
  heat,
}: {
  days: HistoryDay[];
  goal?: number;
  height?: number;
  legend?: boolean;
  /** One colour for every column (the task's heat), so the legend matches the bars. */
  heat?: HeatLevel;
}) {
  const { c } = useTheme();
  const track = height - 22;
  const full = Math.max(goal ?? 0, ...days.map((d) => d.minutes), 1);

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8, height }}>
        {days.map((d) => {
          const future = d.kind === 'future';
          const deferred = d.kind === 'deferred';
          const isToday = d.kind === 'today';
          const fill = d.minutes > 0 ? Math.max(TRACK_RADIUS * 2, Math.round((Math.min(d.minutes, full) / full) * track)) : 0;
          const color = c.heat[heat ?? d.heat];
          const label = !deferred && d.minutes ? String(d.minutes) : '';
          return (
            <View
              key={d.day}
              accessibilityLabel={`${isToday ? t.calendar.today : fmtWeekdayShort(d.day)}: ${
                deferred ? t.detail.legendDeferred : `${d.minutes} dk ${future ? t.detail.legendPlanned : t.detail.legendDone}`
              }`}
              style={{ flex: 1, alignItems: 'stretch', justifyContent: 'flex-end', gap: 6 }}
            >
              <AppText
                variant="micro"
                tabular
                center
                maxFontSizeMultiplier={1.1}
                color={future || deferred ? c.ink3 : c.ink2}
                weight={isToday ? '600' : '500'}
              >
                {label}
              </AppText>
              <View
                style={{
                  height: track,
                  borderRadius: TRACK_RADIUS,
                  backgroundColor: c.surface2,
                  borderWidth: isToday ? 1 : 0,
                  borderColor: withAlpha(c.ink, 0.25),
                  overflow: 'hidden',
                  justifyContent: 'flex-end',
                }}
              >
                {deferred ? (
                  <View style={{ height: 4, marginHorizontal: 6, marginBottom: 6, borderRadius: 2, backgroundColor: c.ink3 }} />
                ) : fill ? (
                  <View
                    style={{
                      height: fill,
                      borderRadius: TRACK_RADIUS,
                      backgroundColor: future ? withAlpha(color, 0.3) : color,
                    }}
                  />
                ) : null}
              </View>
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
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.heat[heat ?? 2] }} />
            <AppText variant="caption" tone="ink2">
              {t.detail.legendDone}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: withAlpha(c.heat[heat ?? 2], 0.3) }} />
            <AppText variant="caption" tone="ink2">
              {t.detail.legendPlanned}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: c.ink3 }} />
            <AppText variant="caption" tone="ink2">
              {t.detail.legendDeferred}
            </AppText>
          </View>
        </View>
      ) : null}
    </View>
  );
}
