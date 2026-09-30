import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { AppText } from '../../components/AppText';
import { CloseButton } from '../../components/controls';
import { FlagIcon, LockIcon } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { isLocalDate, isoWeekday } from '../../domain/dates';
import { dayPlan } from '../../domain/projection';
import { fmtLongDay, fmtMinutes } from '../../i18n/format';
import { HEAT_NAMES, t } from '../../i18n/tr';
import { useNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import { useTheme } from '../../theme/theme';
import { Touchable } from '../../components/Touchable';

export default function DaySheet() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { c } = useTheme();
  const data = useAppData();
  const { today } = useNow();
  const valid = isLocalDate(date);
  const plan = useMemo(() => (valid ? dayPlan(data, today, date) : null), [data, today, date, valid]);
  if (!plan) return null;

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
            {t.calendar.dueBanner(d.task.title, d.course?.shortName ?? null)}
          </AppText>
        </View>
      ))}

      <View style={{ gap: 8 }}>
        <AppText variant="label" tone="ink2">
          {t.calendar.classes}
        </AppText>
        {plan.classes.length ? (
          plan.classes.map((k) => (
            <View
              key={k.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                minHeight: 40,
                borderBottomWidth: 1,
                borderBottomColor: c.line,
              }}
            >
              <View style={{ width: 3, height: 22, borderRadius: 2, backgroundColor: k.color }} />
              <AppText variant="body" weight="500" style={{ flex: 1 }}>
                {k.name}
              </AppText>
              <AppText variant="caption" tone="ink2" tabular>
                {k.startTime}–{k.endTime}
              </AppText>
            </View>
          ))
        ) : (
          <AppText variant="body" tone="ink3">
            {t.calendar.noClasses}
          </AppText>
        )}
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="label" tone="ink2">
            {plan.isPast ? t.calendar.worked : t.calendar.shares}
          </AppText>
          {plan.totalMinutes ? (
            <AppText variant="label" tone="ink2" tabular>
              {t.calendar.total(fmtMinutes(plan.totalMinutes))}
            </AppText>
          ) : null}
        </View>
        {plan.shares.length ? (
          plan.shares.map((s) => (
            <Touchable
              key={`${s.instance.id}-${s.task.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${s.task.title}, ${HEAT_NAMES[s.heat]}, ${fmtMinutes(s.minutes)}`}
              onPress={() => openShare(s.instance.id, s.task.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 12,
                paddingRight: 14,
                paddingLeft: 18,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.line,
                overflow: 'hidden',
                backgroundColor: pressed ? c.surface2 : 'transparent',
              })}
            >
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: c.heat[s.heat] }} />
              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="bodyStrong">{s.task.title}</AppText>
                {s.course ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.course.color }} />
                    <AppText variant="caption" tone="ink2">
                      {s.course.shortName} · {HEAT_NAMES[s.heat]}
                    </AppText>
                  </View>
                ) : (
                  <AppText variant="caption" tone="ink2">
                    {HEAT_NAMES[s.heat]}
                  </AppText>
                )}
              </View>
              {s.lastDay && s.task.kind === 'weekly' ? <LockIcon color={c.heat[4]} size={12} /> : null}
              <AppText variant="bodyStrong" tabular>
                {fmtMinutes(s.minutes)}
              </AppText>
            </Touchable>
          ))
        ) : (
          <AppText variant="body" tone="ink3">
            {isoWeekday(plan.day) >= 6 ? t.calendar.weekendNoPlan : t.calendar.noShares}
          </AppText>
        )}
      </View>
    </Sheet>
  );
}
