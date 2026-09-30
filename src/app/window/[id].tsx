import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button, CloseButton, CoursePill, HeatPill } from '../../components/controls';
import { HistoryChart } from '../../components/HistoryChart';
import { Sheet } from '../../components/Sheet';
import { addDays } from '../../domain/dates';
import { instanceHistory } from '../../domain/projection';
import type { TodayItem } from '../../domain/today';
import { fmtDayShortDate, fmtMinutes } from '../../i18n/format';
import { t } from '../../i18n/tr';
import { useAppData } from '../../services/data';
import { useInstanceItem } from '../../ui/useItem';

function summary(item: Omit<TodayItem, 'group'>, today: string): string {
  const inst = item.instance;
  if (inst.status === 'done') return t.calendar.summaryDone;
  if (inst.status === 'missed') return t.calendar.summaryMissed;
  const time = fmtMinutes(item.remainingMinutes);
  const head = inst.progress === 0 ? t.calendar.summaryNotStarted(time) : t.calendar.summaryRemaining(item.remainingPct, time);
  let tail: string;
  if (item.heat === 4) tail = t.calendar.summaryTodayLock;
  else if (inst.windowEnd === addDays(today, 1) && item.task.kind === 'weekly') tail = t.calendar.summaryTomorrowLock;
  else if (item.task.kind === 'deadline' && item.shareMinutes > 0)
    tail = t.calendar.summaryBudgetOk(fmtMinutes(item.shareMinutes));
  else tail = item.heat === 0 ? t.calendar.summaryStart : t.calendar.summaryCalm;
  return `${head} ${tail}`;
}

export default function WindowSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const { item, today } = useInstanceItem(Number(id));
  const days = useMemo(() => (item ? instanceHistory(data, item.instance, item.task, today) : []), [data, item, today]);
  if (!item) return null;
  const inst = item.instance;

  const range =
    item.task.kind === 'deadline'
      ? t.calendar.windowDue(fmtDayShortDate(inst.windowEnd))
      : `${t.calendar.windowRange(fmtDayShortDate(inst.windowStart), fmtDayShortDate(inst.windowEnd))}${
          inst.windowEnd === addDays(today, 1) ? ` · ${t.calendar.lastDayTomorrow}` : ''
        }`;

  return (
    <Sheet scroll maxHeightRatio={0.72}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ gap: 4, flexShrink: 1 }}>
          <AppText variant="title">{item.task.title}</AppText>
          <AppText variant="caption" tone="ink2" tabular>
            {range}
          </AppText>
        </View>
        <CloseButton onPress={() => router.back()} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {inst.status === 'active' ? <HeatPill heat={item.heat} /> : null}
        {item.course ? <CoursePill code={item.course.shortName} color={item.course.color} /> : null}
      </View>
      <View style={{ gap: 8 }}>
        <AppText variant="label" tone="ink2">
          {t.calendar.alongWindow}
        </AppText>
        <HistoryChart days={days} height={96} legend={false} />
      </View>
      <AppText variant="body" tone="ink2" tabular>
        {summary(item, today)}
      </AppText>
      {inst.status === 'active' ? (
        <Button
          label={t.today.enterProgress}
          onPress={() => router.replace({ pathname: '/progress/[id]', params: { id: String(inst.id) } })}
        />
      ) : (
        <Button label={t.common.ok} kind="secondary" onPress={() => router.back()} />
      )}
    </Sheet>
  );
}
