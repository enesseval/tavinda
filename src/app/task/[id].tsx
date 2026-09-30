import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Button, Card, CoursePill, HeatPill } from '../../components/controls';
import { HistoryChart } from '../../components/HistoryChart';
import { ChevronLeft } from '../../components/icons';
import { instanceHistory } from '../../domain/projection';
import { makeItem } from '../../domain/today';
import { fmtHoursClock, fmtLongDay, fmtMinutes, fmtRange, fmtRelativeDay } from '../../i18n/format';
import { t } from '../../i18n/tr';
import { deleteTask } from '../../services/actions';
import { useNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import { useUi } from '../../store/ui';
import { useTheme } from '../../theme/theme';
import { heatBorder, radii } from '../../theme/tokens';
import { useTaskActions } from '../../ui/useTaskActions';
import { Touchable } from '../../components/Touchable';

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const { today } = useNow();
  const actions = useTaskActions(today);
  const showToast = useUi((s) => s.showToast);

  const task = data.tasks.find((x) => x.id === Number(id)) ?? null;
  const course = task?.courseId != null ? (data.courses.find((k) => k.id === task.courseId) ?? null) : null;

  const instances = useMemo(
    () =>
      task ? data.instances.filter((i) => i.taskId === task.id).sort((a, b) => b.windowStart.localeCompare(a.windowStart)) : [],
    [data.instances, task],
  );
  const current = instances.find((i) => i.status === 'active') ?? instances[0] ?? null;
  const item = task && current ? makeItem(current, task, course, today, data.settings) : null;
  const history = useMemo(
    () => (task && current ? instanceHistory(data, current, task, today) : []),
    [data, current, task, today],
  );

  if (!task || !item || !current) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 20, paddingHorizontal: 20, gap: 16 }}>
        <AppText variant="title">{t.detail.notFound}</AppText>
        <Button label={t.common.back} kind="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const logs = data.progressLogs
    .filter((l) => l.instanceId === current.id)
    .slice()
    .reverse();
  const defers = data.deferLogs.filter((d) => d.instanceId === current.id);
  const pastWindows = instances.filter((i) => i.id !== current.id);
  const active = current.status === 'active';
  const lvl = item.heat;

  const confirmDelete = () =>
    Alert.alert(t.detail.deleteTitle, t.detail.deleteBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          router.back();
          setTimeout(() => {
            deleteTask(task.id);
            showToast(t.toast.deleted);
          }, 250);
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: 44,
            paddingLeft: 8,
            paddingRight: 16,
          }}
        >
          <Touchable
            accessibilityRole="button"
            onPress={() => router.back()}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingHorizontal: 8 }}
          >
            <ChevronLeft color={c.ink} />
            <AppText variant="bodyLarge">{t.detail.back}</AppText>
          </Touchable>
          <Touchable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push({ pathname: '/add', params: { taskId: String(task.id) } })}
          >
            <AppText variant="bodyLarge">{t.common.edit}</AppText>
          </Touchable>
        </View>

        <View style={{ paddingTop: 8, paddingHorizontal: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {active ? <HeatPill heat={lvl} /> : null}
            {course ? (
              <CoursePill code={course.shortName} color={course.color} label={`${course.shortName} · ${course.name}`} />
            ) : null}
            <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: c.surface2 }}>
              <AppText variant="caption" tone="ink2">
                {task.kind === 'weekly' ? t.detail.weekly : t.detail.deadline}
              </AppText>
            </View>
          </View>
          <AppText variant="sheetTitle" accessibilityRole="header">
            {task.title}
          </AppText>
        </View>

        <Card style={{ marginTop: 20, marginHorizontal: 20, padding: 18, gap: 16 }} border={active ? heatBorder(c, lvl) : c.line}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="sheetTitle" tabular>
                %{current.progress}
              </AppText>
              <AppText variant="caption" tone="ink2">
                {t.detail.done}
              </AppText>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="sheetTitle" tabular>
                {fmtHoursClock(item.remainingMinutes)}
              </AppText>
              <AppText variant="caption" tone="ink2">
                {t.detail.hoursLeft}
              </AppText>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="sheetTitle" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {fmtRelativeDay(current.windowEnd, today)}
              </AppText>
              <AppText variant="caption" tone="ink2">
                {task.kind === 'deadline' ? t.detail.dueAt : t.detail.lastDay}
              </AppText>
            </View>
          </View>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: c.surface2 }}>
            <View
              style={{
                width: `${current.progress}%`,
                height: '100%',
                borderRadius: 2,
                backgroundColor: active ? c.heat[lvl] : c.ink3,
              }}
            />
          </View>
          <AppText variant="caption" tone="ink3" tabular>
            {fmtRange(current.windowStart, current.windowEnd)}
          </AppText>
        </Card>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            paddingTop: 28,
            paddingBottom: 10,
            paddingHorizontal: 20,
          }}
        >
          <AppText variant="title">{t.detail.daily}</AppText>
          {active && item.shareMinutes ? (
            <AppText variant="caption" tone="ink3">
              {t.detail.goal(fmtMinutes(item.shareMinutes))}
            </AppText>
          ) : null}
        </View>
        <Card style={{ marginHorizontal: 20, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 14 }}>
          <HistoryChart days={history} goal={active ? item.shareMinutes : undefined} />
        </Card>

        <AppText variant="title" style={{ paddingTop: 28, paddingBottom: 10, paddingHorizontal: 20 }}>
          {t.detail.log}
        </AppText>
        <Card style={{ marginHorizontal: 20, borderRadius: radii.input }}>
          {logs.length ? (
            logs.map((l, i) => (
              <View
                key={l.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: 48,
                  marginLeft: 16,
                  paddingRight: 16,
                  borderBottomWidth: i < logs.length - 1 ? 0.5 : 0,
                  borderBottomColor: c.line,
                }}
              >
                <AppText variant="bodyLarge">{fmtLongDay(l.logicalDate)}</AppText>
                <AppText variant="body" weight="500" tone="ink2" tabular>
                  {t.detail.logRow(l.fromPct, l.toPct)}
                </AppText>
              </View>
            ))
          ) : (
            <AppText variant="body" tone="ink3" style={{ padding: 16 }}>
              {t.detail.noLog}
            </AppText>
          )}
        </Card>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            paddingTop: 28,
            paddingBottom: 10,
            paddingHorizontal: 20,
          }}
        >
          <AppText variant="title">{t.detail.deferHistory}</AppText>
          <AppText variant="caption" tone="ink3">
            {t.detail.deferCount(current.deferCount)}
          </AppText>
        </View>
        <Card style={{ marginHorizontal: 20, borderRadius: radii.input }}>
          {defers.length ? (
            defers.map((d, i) => (
              <View
                key={d.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: 56,
                  marginLeft: 16,
                  paddingRight: 16,
                  borderBottomWidth: i < defers.length - 1 ? 0.5 : 0,
                  borderBottomColor: c.line,
                }}
              >
                <View style={{ gap: 1 }}>
                  <AppText variant="bodyLarge">{fmtLongDay(d.logicalDate)}</AppText>
                  <AppText variant="footnote" tone="ink2">
                    {t.detail.deferredRow}
                  </AppText>
                </View>
                <AppText variant="body" weight="500" tone="ink2" tabular>
                  {t.detail.deferRemaining(d.remainingPct)}
                </AppText>
              </View>
            ))
          ) : (
            <AppText variant="body" tone="ink3" style={{ padding: 16 }}>
              {t.detail.noDefer}
            </AppText>
          )}
        </Card>

        {pastWindows.length ? (
          <>
            <AppText variant="title" style={{ paddingTop: 28, paddingBottom: 10, paddingHorizontal: 20 }}>
              {t.detail.pastWeeks}
            </AppText>
            <Card style={{ marginHorizontal: 20, borderRadius: radii.input }}>
              {pastWindows.map((w, i) => (
                <View
                  key={w.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: 48,
                    marginLeft: 16,
                    paddingRight: 16,
                    borderBottomWidth: i < pastWindows.length - 1 ? 0.5 : 0,
                    borderBottomColor: c.line,
                  }}
                >
                  <AppText variant="bodyLarge" tabular>
                    {fmtRange(w.windowStart, w.windowEnd)}
                  </AppText>
                  <AppText variant="body" weight="500" tone="ink2" tabular>
                    {w.status === 'done'
                      ? t.detail.statusDone
                      : w.status === 'missed'
                        ? `${t.detail.statusMissed} · %${w.progress}`
                        : `${t.detail.statusActive} · %${w.progress}`}
                  </AppText>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <Card style={{ marginTop: 28, marginHorizontal: 20, borderRadius: radii.input }}>
          <Button label={t.detail.delete} kind="destructive" small onPress={confirmDelete} />
        </Card>
      </ScrollView>

      {current.status === 'missed' ? null : (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: 'row',
            gap: 10,
            paddingTop: 12,
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 12) + 10,
            backgroundColor: c.bar,
            borderTopWidth: 0.5,
            borderTopColor: c.line,
          }}
        >
          <Button label={t.today.enterProgress} onPress={() => actions.openProgress(current.id)} style={{ flex: 1 }} />
          {active ? (
            item.deferState === 'locked' ? (
              <Button label={t.today.lastDayLocked} kind="locked" onPress={() => actions.defer(item)} style={{ flex: 1 }} />
            ) : item.deferState === 'lastChance' ? (
              <Button label={t.today.deferLastChance} kind="lastChance" onPress={() => actions.defer(item)} style={{ flex: 1 }} />
            ) : (
              <Button label={t.today.defer} kind="secondary" onPress={() => actions.defer(item)} style={{ flex: 1 }} />
            )
          ) : null}
        </View>
      )}
    </View>
  );
}
