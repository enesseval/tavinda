import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { timeToMinutes } from '../domain/dates';
import type { LoadSegment, TodayItem } from '../domain/today';
import type { Course } from '../domain/types';
import { fmtMinutes, fmtRelativeDay, fmtWeekday } from '../i18n/format';
import { HEAT_NAMES, t } from '../i18n/tr';
import { useTheme } from '../theme/theme';
import { heatBorder, radii } from '../theme/tokens';
import { AppText } from './AppText';
import { Button, CoursePill } from './controls';
import { CalendarSetupIcon, HeatGlyph, LockIcon, NoCalendarIcon } from './icons';
import { HeatPulse } from './TaskCard';

export function LoadBar({ segments }: { segments: LoadSegment[] }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 3, height: 6 }}>
      {segments.length ? (
        segments.map((s) => (
          <View
            key={`${s.instanceId}-${s.live}`}
            style={{
              flexGrow: s.minutes,
              flexBasis: 0,
              borderRadius: 3,
              backgroundColor: s.live ? c.heat[s.heat] : c.ink3,
              opacity: s.live ? 1 : 0.35,
            }}
          />
        ))
      ) : (
        <View style={{ flex: 1, borderRadius: 3, backgroundColor: c.surface2 }} />
      )}
    </View>
  );
}

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
      <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10}>
        <AppText variant="label">{t.common.settings}</AppText>
      </Pressable>
    </View>
  );
}

const PX_PER_MIN = 1;

export function ClassesStrip({ classes, nowMinutes, isToday }: { classes: Course[]; nowMinutes: number; isToday: boolean }) {
  const { c } = useTheme();
  const ref = useRef<ScrollView>(null);
  const starts = classes.map((k) => timeToMinutes(k.startTime));
  const ends = classes.map((k) => timeToMinutes(k.endTime));
  const startH = Math.min(8, ...starts.map((m) => Math.floor(m / 60)));
  const endH = Math.max(18, ...ends.map((m) => Math.ceil(m / 60)));
  const origin = startH * 60;
  const width = (endH - startH) * 60 * PX_PER_MIN;
  const X = (m: number) => (m - origin) * PX_PER_MIN;

  const gaps: { x: number; w: number; label: boolean }[] = [];
  let cur = origin;
  const sorted = classes.map((k) => ({ s: timeToMinutes(k.startTime), e: timeToMinutes(k.endTime) })).sort((a, b) => a.s - b.s);
  for (const k of [...sorted, { s: endH * 60, e: endH * 60 }]) {
    if (k.s - cur >= 30) gaps.push({ x: X(cur) + 3, w: k.s - cur - 6, label: k.s - cur >= 70 });
    cur = Math.max(cur, k.e);
  }

  useEffect(() => {
    const target = Math.max(0, X(isToday ? nowMinutes : (sorted[0]?.s ?? origin)) - 120);
    const tm = setTimeout(() => ref.current?.scrollTo({ x: target, animated: false }), 0);
    return () => clearTimeout(tm);
  }, [classes.length, isToday]);

  const showNow = isToday && nowMinutes >= origin && nowMinutes <= endH * 60;
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20 }}
      style={{ marginTop: 20 }}
    >
      <View style={{ width, height: 64 }}>
        {Array.from({ length: endH - startH + 1 }, (_, i) => (
          <AppText
            key={i}
            variant="micro"
            tone="ink3"
            tabular
            maxFontSizeMultiplier={1.1}
            style={{ position: 'absolute', top: 0, left: i * 60 * PX_PER_MIN - 2 }}
          >
            {String(startH + i).padStart(2, '0')}
          </AppText>
        ))}
        {gaps.map((g) => (
          <View
            key={g.x}
            style={{
              position: 'absolute',
              top: 20,
              height: 44,
              left: g.x,
              width: g.w,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: c.line,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {g.label ? (
              <AppText variant="micro" tone="ink3" maxFontSizeMultiplier={1.1}>
                {t.today.study}
              </AppText>
            ) : null}
          </View>
        ))}
        {classes.map((k) => {
          const s = timeToMinutes(k.startTime);
          const e = timeToMinutes(k.endTime);
          return (
            <View
              key={k.id}
              accessibilityLabel={`${k.name}, ${k.startTime}–${k.endTime}`}
              style={{
                position: 'absolute',
                top: 20,
                height: 44,
                left: X(s),
                width: Math.max(40, (e - s) * PX_PER_MIN),
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
        })}
        {showNow ? (
          <View style={{ position: 'absolute', top: 15, bottom: 0, left: X(nowMinutes), width: 1.5, backgroundColor: c.ink }}>
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

export function heroLine(item: TodayItem, today: string): string {
  const share = fmtMinutes(item.shareMinutes);
  if (item.heat === 4) return t.today.heroLastDay(fmtMinutes(item.remainingMinutes));
  if (item.task.kind === 'deadline') return t.today.heroDue(`${fmtRelativeDay(item.instance.windowEnd, today)} 23:59`, share);
  return t.today.heroWeekly(fmtWeekday(item.instance.windowEnd), share);
}

export function HeroCard({
  item,
  today,
  onProgress,
  onDefer,
  onOpen,
}: {
  item: TodayItem;
  today: string;
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
        <Pressable accessibilityRole="button" accessibilityLabel={item.task.title} onPress={onOpen} style={{ gap: 14 }}>
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
              {heroLine(item, today)}
            </AppText>
          </View>
        </Pressable>
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
    <Pressable
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
    </Pressable>
  );
}
