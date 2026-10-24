import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { addDays, isoWeekday, timeToMinutes, toLocalDate } from '../domain/dates';
import { dayPlan, windowRows, type WindowRow, type WindowSegment } from '../domain/projection';
import { activeWindow, blocksOn } from '../domain/schedule';
import type { AppData, LocalDate } from '../domain/types';
import { fmtDayNum, fmtDayShortDate, fmtMinutes, fmtWeekdayShort } from '../i18n/format';
import { HEAT_NAMES, t } from '../i18n/tr';
import { useNow } from '../services/clock';
import { useTheme } from '../theme/theme';
import { withAlpha } from '../theme/tokens';
import { blockName, clockOf } from '../ui/blockText';
import { AppText } from './AppText';
import { WeekHeader } from './calendar';
import { FlagIcon } from './icons';
import { InfoButton } from './settings';
import { Touchable } from './Touchable';

const HOUR_PX = 48;
/** Side margin shared by the day header, heat table and grid, so the columns line up edge to edge. */
const SIDE = 12;
/** Room for the hour labels left of the hour grid only; the rows above use the full width. */
const HOURS_GUTTER = 40;
const COLS = 7;

function openSegment(taskId: number, seg: WindowSegment) {
  if (seg.projected) router.push({ pathname: '/task/[id]', params: { id: String(taskId) } });
  else router.push({ pathname: '/window/[id]', params: { id: String(seg.instance.id) } });
}

/** One task: its name, then one cell per day coloured by that day's heat. */
function HeatRow({ row }: { row: WindowRow }) {
  const { c } = useTheme();
  const label = `${row.task.title}${row.course ? ` · ${row.course.shortName}` : ''}`;
  const cells: ({ seg: WindowSegment; heat: number; last: boolean } | null)[] = Array(COLS).fill(null);
  for (const seg of row.segments) {
    for (let col = seg.fromCol; col <= seg.toCol; col++) {
      cells[col] = { seg, heat: seg.heats[col - seg.fromCol], last: col === seg.toCol && seg.dueInRange };
    }
  }
  return (
    <View style={{ gap: 5 }}>
      <AppText variant="caption" tone="ink2" numberOfLines={1} style={{ marginHorizontal: SIDE + 2 }}>
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', marginHorizontal: SIDE }}>
        {cells.map((cell, col) =>
          cell ? (
            <Touchable
              key={col}
              accessibilityRole="button"
              accessibilityLabel={`${label}, ${HEAT_NAMES[cell.heat]}${cell.last ? `, ${t.calendar.legendDue}` : ''}`}
              onPress={() => openSegment(row.task.id, cell.seg)}
              style={{ flex: 1, paddingHorizontal: 2 }}
            >
              <View
                style={{
                  height: 18,
                  borderRadius: 5,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.heat[cell.heat],
                  opacity: cell.seg.instance.status === 'active' ? 1 : 0.3,
                }}
              >
                {cell.last ? <FlagIcon color={c.bg} size={10} filled /> : null}
              </View>
            </Touchable>
          ) : (
            <View key={col} style={{ flex: 1, height: 18, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.line }} />
            </View>
          ),
        )}
      </View>
    </View>
  );
}

/**
 * The whole week at once. The day header stays put while the heat table and the hour
 * grid scroll under it, all on the same columns.
 */
export function WeekGridView({
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
  bottomInset: number;
}) {
  const { c } = useTheme();
  const { now } = useNow();
  const days = useMemo(() => Array.from({ length: COLS }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const plans = useMemo(() => days.map((d) => dayPlan(data, today, d)), [data, today, days]);
  const rows = useMemo(() => windowRows(data, today, days), [data, today, days]);
  const busiest = Math.max(1, ...plans.map((p) => p.totalMinutes));
  const total = plans.reduce((a, p) => a + p.totalMinutes, 0);
  const colW = 100 / COLS;

  const classes = data.courses.filter((k) => days.some((d) => isoWeekday(d) === k.weekday));
  const dayBlocks = useMemo(() => days.map((d) => blocksOn(data.blocks, d)), [data.blocks, days]);
  const flatBlocks = dayBlocks.flat();
  // The user's day hours (Ayarlar › Günlük program), widened to fit classes and blocks.
  const windows = days.map((d) => activeWindow(d, data.settings.dayHours));
  const startH = Math.min(
    ...windows.map((w) => Math.floor(w.start / 60)),
    ...classes.map((k) => Math.floor(timeToMinutes(k.startTime) / 60)),
    ...flatBlocks.map((b) => Math.floor(b.start / 60)),
  );
  const endH = Math.min(
    24,
    Math.max(
      ...windows.map((w) => Math.ceil(w.end / 60)),
      ...classes.map((k) => Math.ceil(timeToMinutes(k.endTime) / 60)),
      ...flatBlocks.map((b) => Math.ceil(b.end / 60)),
    ),
  );
  const Y = (m: number) => ((m - startH * 60) / 60) * HOUR_PX;
  const todayCol = days.indexOf(today);
  const nowMin = toLocalDate(now) === today ? now.getHours() * 60 + now.getMinutes() : null;

  return (
    <View style={{ flex: 1 }}>
      <WeekHeader days={days} total={total} onShift={onShift} />

      {/* Fixed day header: name, date and a bar for how much work the day holds. */}
      <View style={{ flexDirection: 'row', marginHorizontal: SIDE, paddingBottom: 6 }}>
        {plans.map((p) => {
          const isT = p.day === today;
          const w = p.totalMinutes ? Math.max(0.18, p.totalMinutes / busiest) : 0;
          return (
            <Touchable
              key={p.day}
              accessibilityRole="button"
              accessibilityLabel={`${fmtDayShortDate(p.day)}, ${p.totalMinutes ? fmtMinutes(p.totalMinutes) : t.calendar.noPlan}`}
              onPress={() => router.push({ pathname: '/day/[date]', params: { date: p.day } })}
              style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 }}
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
              <View
                style={{ alignSelf: 'stretch', height: 4, marginHorizontal: 6, borderRadius: 2, backgroundColor: c.surface2 }}
              >
                {w ? (
                  <View
                    style={{
                      width: `${w * 100}%`,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: p.maxHeat == null ? c.ink3 : c.heat[p.maxHeat],
                    }}
                  />
                ) : null}
              </View>
            </Touchable>
          );
        })}
      </View>
      <View style={{ height: 1, backgroundColor: c.line }} />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: bottomInset }}
      >
        {/* Heat table: one row per task, one cell per day. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 20, marginBottom: 10 }}>
          <AppText variant="label" tone="ink2">
            {t.calendar.heatTable}
          </AppText>
          <InfoButton info={t.calendar.heatTableInfo} />
        </View>
        <View style={{ gap: 12 }}>
          {rows.length ? (
            rows.map((row) => <HeatRow key={row.task.id} row={row} />)
          ) : (
            <AppText variant="footnote" tone="ink3" style={{ marginHorizontal: SIDE + 2 }}>
              {t.calendar.noHeatRows}
            </AppText>
          )}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, rowGap: 6, marginTop: 14, marginHorizontal: 20 }}>
          {HEAT_NAMES.map((name, i) => (
            <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.heat[i] }} />
              <AppText variant="caption" tone="ink2">
                {name}
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

        {/* Hour grid: classes in full, what was done as a slim strip beside them. */}
        <AppText variant="label" tone="ink2" style={{ marginTop: 26, marginBottom: 12, marginHorizontal: 20 }}>
          {t.calendar.hours}
        </AppText>
        <View style={{ marginLeft: HOURS_GUTTER, marginRight: SIDE, height: (endH - startH) * HOUR_PX }}>
          {todayCol >= 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${todayCol * colW}%`,
                width: `${colW}%`,
                backgroundColor: withAlpha(c.ink, 0.04),
                borderRadius: 8,
              }}
            />
          ) : null}
          {Array.from({ length: endH - startH + 1 }, (_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: -HOURS_GUTTER + 4,
                right: 0,
                top: i * HOUR_PX - 7,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AppText variant="micro" tone="ink3" tabular style={{ width: 26, textAlign: 'right' }} maxFontSizeMultiplier={1}>
                {String((startH + i) % 24).padStart(2, '0')}
              </AppText>
              <View style={{ flex: 1, height: 1, backgroundColor: withAlpha(c.line, 0.7) }} />
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
                    accessibilityLabel={`${k.name}, ${k.startTime}–${k.endTime}`}
                    style={{
                      position: 'absolute',
                      left: `${col * colW}%`,
                      width: `${colW}%`,
                      top: Y(s) + 1,
                      height: Math.max(22, Y(e) - Y(s) - 2),
                      paddingHorizontal: 2,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: withAlpha(k.color, 0.22),
                        borderLeftWidth: 3,
                        borderLeftColor: k.color,
                        borderRadius: 6,
                        paddingVertical: 4,
                        paddingHorizontal: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <AppText variant="micro" weight="600" numberOfLines={1} maxFontSizeMultiplier={1}>
                        {k.shortName}
                      </AppText>
                      <AppText variant="micro" tone="ink2" tabular numberOfLines={1} maxFontSizeMultiplier={1}>
                        {k.startTime}
                      </AppText>
                    </View>
                  </View>
                );
              }),
          )}
          {dayBlocks.map((list, col) =>
            list.map(({ start, end, block }) => (
              <Touchable
                key={`${days[col]}-b-${block.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${blockName(block)}, ${clockOf(block.startAt)}–${clockOf(block.endAt)}`}
                onPress={() => router.push({ pathname: '/block/[id]', params: { id: String(block.id) } })}
                style={{
                  position: 'absolute',
                  // A slim strip on the right of the day, so classes stay readable.
                  left: `${col * colW + colW * 0.62}%`,
                  width: `${colW * 0.38}%`,
                  top: Y(start) + 1,
                  height: Math.max(8, Y(end) - Y(start) - 2),
                  paddingRight: 2,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 4,
                    backgroundColor: withAlpha(block.kind === 'task' ? c.heat[0] : c.ink2, block.kind === 'task' ? 0.55 : 0.3),
                  }}
                />
              </Touchable>
            )),
          )}
          {todayCol >= 0 && nowMin != null && nowMin >= startH * 60 && nowMin <= endH * 60 ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: `${todayCol * colW}%`,
                width: `${colW}%`,
                top: Y(nowMin) - 1,
                height: 2,
                backgroundColor: c.heat[4],
              }}
            />
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, marginHorizontal: 20 }}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              backgroundColor: withAlpha(c.ink3, 0.3),
              borderLeftWidth: 2,
              borderLeftColor: c.ink3,
            }}
          />
          <AppText variant="caption" tone="ink2">
            {t.calendar.legendClass}
          </AppText>
          <View style={{ width: 6, height: 12, borderRadius: 2, marginLeft: 10, backgroundColor: withAlpha(c.heat[0], 0.55) }} />
          <AppText variant="caption" tone="ink2">
            {t.calendar.legendBlock}
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}
