import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { AppText } from '../../components/AppText';
import { CloseButton } from '../../components/controls';
import { DayAgenda, DayShareList } from '../../components/dayPlan';
import { FlagIcon } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { DEFAULT_DUE_TIME, isLocalDate, toLocalDate } from '../../domain/dates';
import { dayPlan } from '../../domain/projection';
import { dayTimeline } from '../../domain/schedule';
import { fmtLongDay, fmtMinutes } from '../../i18n/format';
import { t } from '../../i18n/tr';
import { useNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import { useTheme } from '../../theme/theme';

export default function DaySheet() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { c } = useTheme();
  const data = useAppData();
  const { now, today } = useNow();
  const valid = isLocalDate(date);
  const plan = useMemo(() => (valid ? dayPlan(data, today, date) : null), [data, today, date, valid]);
  const timeline = useMemo(() => (valid ? dayTimeline(data, date) : null), [data, date, valid]);
  if (!plan || !timeline) return null;
  const clock = now.getHours() * 60 + now.getMinutes();
  const nowMinutes = plan.isToday ? (toLocalDate(now) === today ? clock : clock + 1440) : null;
  // Close the sheet first, then open the next screen.
  const go = (open: () => void) => {
    router.back();
    setTimeout(open, 50);
  };

  const sub = plan.isPast
    ? t.calendar.pastDay
    : plan.isToday
      ? t.calendar.today
      : plan.totalMinutes
        ? t.calendar.planned(fmtMinutes(plan.totalMinutes))
        : t.calendar.noPlan;

  const openShare = (instanceId: number, taskId: number) => {
    router.back();
    setTimeout(() => {
      if (instanceId > 0 && !plan.isPast) router.push({ pathname: '/progress/[id]', params: { id: String(instanceId) } });
      else router.push({ pathname: '/task/[id]', params: { id: String(taskId) } });
    }, 50);
  };

  return (
    <Sheet scroll maxHeightRatio={0.72}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ gap: 4, flexShrink: 1 }}>
          <AppText variant="title">{fmtLongDay(plan.day)}</AppText>
          <AppText variant="caption" tone="ink2" tabular>
            {sub}
          </AppText>
        </View>
        <CloseButton onPress={() => router.back()} />
      </View>

      {plan.dues.map((d) => (
        <View
          key={d.task.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            backgroundColor: c.surface2,
          }}
        >
          <FlagIcon color={c.ink} size={14} filled />
          <AppText variant="body" weight="500" style={{ flexShrink: 1 }}>
            {t.calendar.dueBanner(d.task.title, d.course?.shortName ?? null, d.task.dueTime ?? DEFAULT_DUE_TIME)}
          </AppText>
        </View>
      ))}

      <View style={{ gap: 10 }}>
        <AppText variant="label" tone="ink2">
          {t.calendar.agenda}
        </AppText>
        <DayAgenda
          timeline={timeline}
          nowMinutes={nowMinutes}
          onGap={plan.isToday ? () => go(() => router.push('/block/new')) : undefined}
          onBlock={(id) => go(() => router.push({ pathname: '/block/[id]', params: { id: String(id) } }))}
        />
      </View>

      <View style={{ gap: 10 }}>
        <AppText variant="label" tone="ink2">
          {plan.isPast ? t.calendar.worked : t.calendar.todo}
        </AppText>
        <DayShareList plan={plan} today={today} onOpen={(s) => openShare(s.instance.id, s.task.id)} />
      </View>
    </Sheet>
  );
}
