import { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';

import { minutesToTime } from '../domain/dates';
import type { DayTimeline as DayTimelineModel } from '../domain/schedule';
import type { TodayItem } from '../domain/today';
import { fmtMinutes } from '../i18n/format';
import { timeLeftLine } from '../ui/taskText';
import { HEAT_NAMES, t } from '../i18n/tr';
import { useTheme } from '../theme/theme';
import { heatBorder, radii, withAlpha } from '../theme/tokens';
import { blockName, clockOf } from '../ui/blockText';
import { AppText } from './AppText';
import { Button, CoursePill } from './controls';
import { CalendarSetupIcon, HeatGlyph, LockIcon, NoCalendarIcon } from './icons';
import { HeatPulse } from './TaskCard';
import { Touchable } from './Touchable';

export function NoCalendarBanner({ onPress }: { onPress: () => void }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 20,
        marginTop: 6,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: c.surface2,
      }}
    >
      <NoCalendarIcon color={c.ink2} />
      <AppText variant="footnote" weight="500" tone="ink2" style={{ flex: 1 }}>
        {t.today.noCalendar}
      </AppText>
      <Touchable accessibilityRole="button" onPress={onPress} hitSlop={10}>
        <AppText variant="label">{t.common.settings}</AppText>
      </Touchable>
    </View>
  );
}

const PX_PER_MIN = 1.1;

/**
 * The whole day on one strip: classes, what the user did or is doing (blocks),
 * free gaps, and a needle at the current time. Tapping the current gap plans it.
 */
export function DayTimeline({
  timeline,
  nowMinutes,
  isToday,
  onPlanGap,
  onOpenBlock,
}: {
  timeline: DayTimelineModel;
  nowMinutes: number;
  isToday: boolean;
  onPlanGap: () => void;
  onOpenBlock: (id: number) => void;
}) {
  const { c } = useTheme();
  const ref = useRef<ScrollView>(null);
  const startH = Math.floor(timeline.start / 60);
  const endH = Math.ceil(timeline.end / 60);
  const origin = startH * 60;
  const width = (endH - startH) * 60 * PX_PER_MIN;
  const X = (m: number) => (m - origin) * PX_PER_MIN;
  const firstBusy = timeline.segments.find((s) => s.kind !== 'gap')?.start ?? origin;

  useEffect(() => {
    const target = Math.max(0, X(isToday ? nowMinutes : firstBusy) - 120);
    const tm = setTimeout(() => ref.current?.scrollTo({ x: target, animated: false }), 0);
    return () => clearTimeout(tm);
    // Scroll once per day/list change; following every minute would fight the user.
  }, [timeline.day, timeline.segments.length, isToday]);

  const showNow = isToday && nowMinutes >= origin && nowMinutes <= endH * 60;
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20 }}
      style={{ marginTop: 16 }}
    >
      <View style={{ width, height: 72 }}>
        {Array.from({ length: endH - startH + 1 }, (_, i) => (
          <AppText
            key={i}
            variant="micro"
            tone="ink3"
            tabular
            maxFontSizeMultiplier={1.1}
            style={{ position: 'absolute', top: 0, left: i * 60 * PX_PER_MIN - 2 }}
          >
            {String((startH + i) % 24).padStart(2, '0')}
          </AppText>
        ))}
        {timeline.segments.map((seg) => {
          const left = X(seg.start) + 1.5;
          const w = Math.max(18, (seg.end - seg.start) * PX_PER_MIN - 3);
          if (seg.kind === 'gap') {
            const current = isToday && nowMinutes >= seg.start && nowMinutes < seg.end;
            const past = isToday && seg.end <= nowMinutes;
            const body = (
              <View
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: current ? c.ink2 : c.line,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 6,
                  opacity: past ? 0.5 : 1,
                }}
              >
                {w >= 60 ? (
                  <AppText variant="micro" tone={current ? 'ink2' : 'ink3'} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                    {current ? `${t.blocks.free} · ${t.blocks.tapToPlan}` : t.blocks.free}
                  </AppText>
                ) : null}
              </View>
            );
            return current ? (
              <Touchable
                key={`g-${seg.start}`}
                accessibilityRole="button"
                accessibilityLabel={`${t.blocks.free} ${minutesToTime(seg.start)}–${minutesToTime(seg.end)}, ${t.blocks.tapToPlan}`}
                onPress={onPlanGap}
                style={{ position: 'absolute', top: 22, height: 46, left, width: w }}
              >
                {body}
              </Touchable>
            ) : (
              <View key={`g-${seg.start}`} style={{ position: 'absolute', top: 22, height: 46, left, width: w }}>
                {body}
              </View>
            );
          }
          if (seg.kind === 'class') {
            const k = seg.course;
            return (
              <View
                key={`c-${k.id}`}
                accessibilityLabel={`${k.name}, ${k.startTime}–${k.endTime}`}
                style={{
                  position: 'absolute',
                  top: 22,
                  height: 46,
                  left,
                  width: w,
                  backgroundColor: c.surface2,
                  borderLeftWidth: 3,
                  borderLeftColor: k.color,
                  borderTopLeftRadius: 6,
                  borderBottomLeftRadius: 6,
                  borderTopRightRadius: 10,
                  borderBottomRightRadius: 10,
                  paddingVertical: 5,
                  paddingHorizontal: 8,
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <AppText variant="caption" weight="600" numberOfLines={1} maxFontSizeMultiplier={1.1}>
                  {k.name}
                </AppText>
                <AppText variant="micro" tone="ink2" tabular numberOfLines={1} maxFontSizeMultiplier={1.1}>
                  {k.startTime}–{k.endTime}
                </AppText>
              </View>
            );
          }
          const b = seg.block;
          const running = b.status === 'running';
          return (
            <Touchable
              key={`b-${b.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${blockName(b)}, ${clockOf(b.startAt)}–${clockOf(b.endAt)}`}
              onPress={() => onOpenBlock(b.id)}
              style={{
                position: 'absolute',
                top: 22,
                height: 46,
                left,
                width: w,
                backgroundColor: withAlpha(b.kind === 'task' ? c.heat[0] : c.ink2, 0.14),
                borderWidth: running ? 1.5 : 0,
                borderColor: c.ink2,
                borderRadius: 10,
                paddingVertical: 5,
                paddingHorizontal: 8,
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <AppText variant="caption" weight="600" numberOfLines={1} maxFontSizeMultiplier={1.1}>
                {blockName(b)}
              </AppText>
              <AppText variant="micro" tone="ink2" tabular numberOfLines={1} maxFontSizeMultiplier={1.1}>
                {clockOf(b.startAt)}–{clockOf(b.endAt)}
              </AppText>
            </Touchable>
          );
        })}
        {showNow ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 17, bottom: 0, left: X(nowMinutes), width: 1.5, backgroundColor: c.ink }}
          >
            <View
              style={{
                position: 'absolute',
                top: -3,
                left: -2.5,
                width: 6.5,
                height: 6.5,
                borderRadius: 4,
                backgroundColor: c.ink,
              }}
            />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

/** What is happening right now: a block to close, a block in progress, or free time to plan. */
export function NowCard({
  title,
  body,
  action,
  onPress,
  emphasis,
}: {
  title: string;
  body: string;
  action: string;
  onPress: () => void;
  emphasis?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View
      style={{
        marginHorizontal: 20,
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingLeft: 16,
        paddingRight: 12,
        borderRadius: radii.card,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: emphasis ? c.ink2 : c.line,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="footnote" tone="ink2" numberOfLines={2}>
          {body}
        </AppText>
      </View>
      <Button label={action} small kind={emphasis ? 'primary' : 'secondary'} onPress={onPress} style={{ minWidth: 84 }} />
    </View>
  );
}

export function SetupCard({ onCalendar, onManual }: { onCalendar: () => void; onManual: () => void }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        marginHorizontal: 20,
        marginTop: 24,
        padding: 24,
        borderRadius: radii.hero,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.line,
        gap: 16,
      }}
    >
      <CalendarSetupIcon color={c.ink2} />
      <View style={{ gap: 6 }}>
        <AppText variant="title">{t.today.setupTitle}</AppText>
        <AppText variant="body" tone="ink2">
          {t.today.setupBody}
        </AppText>
      </View>
      <View style={{ gap: 8 }}>
        <Button label={t.today.setupCalendar} onPress={onCalendar} />
        <Button label={t.today.setupManual} kind="secondary" onPress={onManual} />
      </View>
    </View>
  );
}

export function CalmCard({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  const { c } = useTheme();
  return (
    <View
      style={{
        marginHorizontal: 20,
        marginTop: 24,
        paddingVertical: 28,
        paddingHorizontal: 24,
        borderRadius: radii.hero,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.line,
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          borderWidth: 1.5,
          borderColor: c.ink2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.ink2 }} />
      </View>
      <View style={{ gap: 6, alignItems: 'center' }}>
        <AppText variant="title" center>
          {title}
        </AppText>
        <AppText variant="body" tone="ink2" center style={{ maxWidth: 280 }}>
          {body}
        </AppText>
      </View>
      {action && onAction ? <Button label={action} kind="secondary" small onPress={onAction} /> : null}
    </View>
  );
}

export function heroLine(item: TodayItem, now: Date): string {
  const left = timeLeftLine(item, now);
  if (item.overdue || item.heat === 4) return `${left} · ${t.card.remainingShort(fmtMinutes(item.remainingMinutes))}`;
  if (item.shareMinutes === 0) return `${left} · ${t.card.doneForToday}`;
  return `${left} · ${t.today.shareToday(fmtMinutes(item.shareMinutes))}`;
}

export function HeroCard({
  item,
  now,
  onProgress,
  onDefer,
  onOpen,
}: {
  item: TodayItem;
  now: Date;
  onProgress: () => void;
  onDefer: () => void;
  onOpen: () => void;
}) {
  const { c } = useTheme();
  const lvl = item.heat;
  const color = c.heat[lvl];
  const border = heatBorder(c, lvl);
  return (
    <View
      style={{
        marginHorizontal: 20,
        borderRadius: radii.hero,
        overflow: 'hidden',
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      {lvl === 3 ? (
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: color, opacity: 0.08 }} />
      ) : null}
      {lvl === 4 ? <HeatPulse color={color} /> : null}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: color }} />
      <View style={{ paddingTop: 18, paddingBottom: 20, paddingLeft: 24, paddingRight: 20, gap: 14 }}>
        <Touchable accessibilityRole="button" accessibilityLabel={item.task.title} onPress={onOpen} style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 9,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: border,
              }}
            >
              {lvl === 4 ? <LockIcon color={color} size={11} /> : <HeatGlyph color={color} level={lvl} size={12} />}
              <AppText variant="caption">{HEAT_NAMES[lvl]}</AppText>
            </View>
            {item.course ? <CoursePill code={item.course.shortName} color={item.course.color} /> : null}
          </View>
          <View style={{ gap: 4 }}>
            <AppText variant="title">{item.task.title}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <AppText variant="hero" tabular>
                %{item.remainingPct}
              </AppText>
              <AppText variant="bodyLarge" weight="500" tone="ink2">
                {t.today.left}
              </AppText>
            </View>
            <AppText variant="body" tone="ink2" tabular>
              {heroLine(item, now)}
            </AppText>
          </View>
        </Touchable>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: c.surface2, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${item.instance.progress}%`, backgroundColor: color, borderRadius: 2 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
          <Button label={t.today.enterProgress} onPress={onProgress} style={{ flex: 1 }} />
          {item.deferState === 'locked' ? (
            <Button label={t.today.lastDayLocked} kind="locked" onPress={onDefer} style={{ flex: 1 }} />
          ) : item.deferState === 'lastChance' ? (
            <Button label={t.today.deferLastChance} kind="lastChance" onPress={onDefer} style={{ flex: 1 }} />
          ) : (
            <Button label={t.today.defer} kind="secondary" onPress={onDefer} style={{ flex: 1 }} />
          )}
        </View>
      </View>
    </View>
  );
}

export function LongTermCard({ item, onPress }: { item: TodayItem; onPress: () => void }) {
  const { c } = useTheme();
  const color = c.heat[item.heat];
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={t.a11y.longTerm(item.task.title, Math.max(0, item.daysLeft - 1), item.instance.progress)}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 156,
        paddingTop: 14,
        paddingRight: 14,
        paddingBottom: 16,
        paddingLeft: 18,
        borderRadius: radii.card,
        backgroundColor: pressed ? c.surface2 : c.surface,
        borderWidth: 1,
        borderColor: c.line,
        overflow: 'hidden',
        gap: 10,
      })}
    >
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: color }} />
      <AppText variant="bodyStrong" numberOfLines={2} style={{ minHeight: 40 }}>
        {item.task.title}
      </AppText>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="caption" tone="ink2" tabular>
          {t.today.daysLeft(Math.max(0, item.daysLeft - 1))}
        </AppText>
        <AppText variant="caption" tone="ink2" tabular>
          %{item.instance.progress}
        </AppText>
      </View>
      <View style={{ height: 3, borderRadius: 2, backgroundColor: c.surface2 }}>
        <View style={{ height: '100%', width: `${item.instance.progress}%`, borderRadius: 2, backgroundColor: color }} />
      </View>
    </Touchable>
  );
}
