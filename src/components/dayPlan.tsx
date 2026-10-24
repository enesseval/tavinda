import type { ReactNode } from 'react';
import { View } from 'react-native';

import { diffDays, minutesToTime } from '../domain/dates';
import type { DayPlan, DayShare } from '../domain/projection';
import type { DayTimeline, TimelineSegment } from '../domain/schedule';
import type { LocalDate } from '../domain/types';
import { fmtMinutes, fmtRelativeDay } from '../i18n/format';
import { HEAT_NAMES, t } from '../i18n/tr';
import { useTheme } from '../theme/theme';
import { radii, withAlpha } from '../theme/tokens';
import { blockName } from '../ui/blockText';
import { AppText } from './AppText';
import { LockIcon } from './icons';
import { Touchable } from './Touchable';

/** Taller rows for longer stretches, so the list still reads like a day. */
const rowHeight = (minutes: number) => Math.round(Math.min(112, Math.max(52, 40 + minutes * 0.35)));

function NowLine({ minutes }: { minutes: number }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityLabel={t.calendar.now(minutesToTime(minutes % 1440))}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}
    >
      <AppText variant="micro" weight="600" color={c.heat[4]} tabular style={{ width: 46, textAlign: 'right' }}>
        {minutesToTime(minutes % 1440)}
      </AppText>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.heat[4] }} />
      <View style={{ flex: 1, height: 1.5, backgroundColor: c.heat[4] }} />
    </View>
  );
}

function SegmentRow({
  seg,
  nowIn,
  onGap,
  onBlock,
}: {
  seg: TimelineSegment;
  nowIn: boolean;
  onGap?: () => void;
  onBlock: (id: number) => void;
}) {
  const { c } = useTheme();
  const len = seg.end - seg.start;
  const times = (
    <View style={{ width: 46, alignItems: 'flex-end', paddingTop: 2 }}>
      <AppText variant="caption" weight="600" tabular maxFontSizeMultiplier={1.1}>
        {minutesToTime(seg.start % 1440)}
      </AppText>
      <AppText variant="micro" tone="ink3" tabular maxFontSizeMultiplier={1.1}>
        {minutesToTime(seg.end % 1440)}
      </AppText>
    </View>
  );

  if (seg.kind === 'gap') {
    const body = (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: 14,
          borderRadius: radii.input,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: nowIn ? c.ink3 : c.line,
        }}
      >
        <AppText variant="body" tone="ink2">
          {t.calendar.free(fmtMinutes(len))}
        </AppText>
        {onGap ? (
          <AppText variant="caption" tone="ink3">
            {t.calendar.freeTap}
          </AppText>
        ) : null}
      </View>
    );
    return (
      <View style={{ flexDirection: 'row', gap: 10, minHeight: rowHeight(len) }}>
        {times}
        {onGap ? (
          <Touchable accessibilityRole="button" onPress={onGap} style={{ flex: 1, flexDirection: 'row' }}>
            {body}
          </Touchable>
        ) : (
          body
        )}
      </View>
    );
  }

  if (seg.kind === 'class') {
    return (
      <View
        accessibilityLabel={`${seg.course.name}, ${seg.course.startTime}–${seg.course.endTime}`}
        style={{ flexDirection: 'row', gap: 10, minHeight: rowHeight(len) }}
      >
        {times}
        <View
          style={{
            flex: 1,
            paddingVertical: 10,
            paddingLeft: 14,
            paddingRight: 12,
            borderRadius: radii.input,
            backgroundColor: c.surface2,
            borderLeftWidth: 4,
            borderLeftColor: seg.course.color,
            borderWidth: nowIn ? 1 : 0,
            borderColor: c.ink3,
            gap: 2,
          }}
        >
          <AppText variant="bodyStrong" numberOfLines={2}>
            {seg.course.name}
          </AppText>
          <AppText variant="caption" tone="ink2">
            {nowIn ? t.calendar.classNow : t.calendar.classLabel} · {fmtMinutes(len)}
          </AppText>
        </View>
      </View>
    );
  }

  // What the user did (or is doing) with a stretch: softer than classes.
  const b = seg.block;
  return (
    <View style={{ flexDirection: 'row', gap: 10, minHeight: rowHeight(len) }}>
      {times}
      <Touchable
        accessibilityRole="button"
        onPress={() => onBlock(b.id)}
        style={{
          flex: 1,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: radii.input,
          backgroundColor: withAlpha(b.kind === 'task' ? c.heat[0] : c.ink2, 0.14),
          borderWidth: nowIn ? 1 : 0,
          borderColor: c.ink3,
          gap: 2,
        }}
      >
        <AppText variant="body" weight="500" numberOfLines={2}>
          {blockName(b)}
        </AppText>
        <AppText variant="caption" tone="ink2">
          {b.status === 'running' ? t.calendar.blockRunning : t.calendar.blockDone} · {fmtMinutes(len)}
        </AppText>
      </Touchable>
    </View>
  );
}

/**
 * One day as a single column: classes, what was done, and free stretches, in order,
 * with a "now" line on today. Full width, so names are never cut to "Ders tekrar…".
 */
export function DayAgenda({
  timeline,
  nowMinutes,
  onGap,
  onBlock,
}: {
  timeline: DayTimeline;
  /** Minutes since midnight when the day is today; null otherwise. */
  nowMinutes: number | null;
  /** Today's free stretches that are still ahead open "Ne yapacaksın?". */
  onGap?: () => void;
  onBlock: (id: number) => void;
}) {
  const segs = timeline.segments;
  if (!segs.length) {
    return (
      <AppText variant="body" tone="ink3">
        {t.calendar.noAgenda}
      </AppText>
    );
  }
  const rows: ReactNode[] = [];
  let nowPlaced = nowMinutes == null;
  segs.forEach((seg, i) => {
    const nowIn = nowMinutes != null && nowMinutes >= seg.start && nowMinutes < seg.end;
    if (!nowPlaced && nowMinutes != null && nowMinutes < seg.start) {
      rows.push(<NowLine key="now" minutes={nowMinutes} />);
      nowPlaced = true;
    }
    if (nowIn) nowPlaced = true;
    const ahead = nowMinutes != null && seg.end > nowMinutes;
    rows.push(
      <SegmentRow
        key={`${seg.kind}-${seg.start}-${i}`}
        seg={seg}
        nowIn={nowIn}
        onGap={seg.kind === 'gap' && ahead ? onGap : undefined}
        onBlock={onBlock}
      />,
    );
  });
  if (!nowPlaced && nowMinutes != null) rows.push(<NowLine key="now" minutes={nowMinutes} />);
  return <View style={{ gap: 8 }}>{rows}</View>;
}

function dueLine(s: DayShare, today: LocalDate): string {
  const left = diffDays(s.instance.windowEnd, today);
  if (left < 0) return t.calendar.dueOverdue;
  if (left === 0) return t.calendar.dueToday;
  return t.calendar.dueIn(fmtRelativeDay(s.instance.windowEnd, today), left);
}

/** The day's work, hottest first: heat by name, the share, and how long is left. */
export function DayShareList({ plan, today, onOpen }: { plan: DayPlan; today: LocalDate; onOpen: (share: DayShare) => void }) {
  const { c } = useTheme();
  if (!plan.shares.length) {
    return (
      <AppText variant="body" tone="ink3">
        {t.calendar.noShares}
      </AppText>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {plan.shares.map((s) => (
        <Touchable
          key={`${s.instance.id}-${s.task.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${s.task.title}, ${HEAT_NAMES[s.heat]}, ${fmtMinutes(s.minutes)}`}
          onPress={() => onOpen(s)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 12,
            paddingRight: 14,
            paddingLeft: 18,
            borderRadius: radii.input,
            borderWidth: 1,
            borderColor: c.line,
            overflow: 'hidden',
            backgroundColor: pressed ? c.surface2 : 'transparent',
          })}
        >
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: c.heat[s.heat] }} />
          <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: withAlpha(c.heat[s.heat], 0.16),
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.heat[s.heat] }} />
                <AppText variant="micro" weight="600">
                  {HEAT_NAMES[s.heat]}
                </AppText>
              </View>
              {s.course ? (
                <AppText variant="caption" tone="ink2" numberOfLines={1}>
                  {s.course.shortName}
                </AppText>
              ) : null}
            </View>
            <AppText variant="bodyStrong" numberOfLines={2}>
              {s.task.title}
            </AppText>
            {plan.isPast ? null : (
              <AppText variant="caption" tone="ink2" numberOfLines={1}>
                {dueLine(s, today)}
              </AppText>
            )}
          </View>
          {s.lastDay && s.task.kind === 'weekly' ? <LockIcon color={c.heat[4]} size={12} /> : null}
          <AppText variant="bodyStrong" tabular>
            {fmtMinutes(s.minutes)}
          </AppText>
        </Touchable>
      ))}
    </View>
  );
}
