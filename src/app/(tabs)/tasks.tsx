import { FlashList } from '@shopify/flash-list';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Segmented } from '../../components/controls';
import { TaskCard } from '../../components/TaskCard';
import { taskListModel, type ListItem, type RiskLevel } from '../../domain/taskList';
import { fmtMinutes } from '../../i18n/format';
import { t, WEEKDAYS_LONG } from '../../i18n/tr';
import { useNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import { useUi } from '../../store/ui';
import { useTheme } from '../../theme/theme';
import { toCardModel } from '../../ui/taskText';
import { useTaskActions } from '../../ui/useTaskActions';

type Tab = 'active' | 'recurring' | 'done';

function RiskChip({ level, count }: { level: RiskLevel; count: number }) {
  const { c } = useTheme();
  const color = level === 'critical' ? c.heat[4] : level === 'risky' ? c.heat[3] : c.heat[1];
  return (
    <View
      accessibilityLabel={`${t.tasks.risk[level]} ${count}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: level === 'critical' && count ? color : c.surface,
        borderWidth: 1,
        borderColor: level === 'critical' && count ? color : c.line,
      }}
    >
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: level === 'critical' && count ? c.bg : color }} />
      <AppText variant="caption" color={level === 'critical' && count ? c.bg : c.ink} tabular>
        {t.tasks.risk[level]} {count}
      </AppText>
    </View>
  );
}

export default function TasksScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const { now, today } = useNow();
  const model = useMemo(() => taskListModel(data, today), [data, today]);
  const actions = useTaskActions(today);
  const leaving = useUi((s) => s.leaving);
  const [tab, setTab] = useState<Tab>('active');

  const items = tab === 'active' ? model.active : tab === 'recurring' ? model.recurring : model.done;

  const subFor = (i: ListItem): string | undefined => {
    if (tab === 'recurring') {
      const day = i.course ? WEEKDAYS_LONG[i.course.weekday - 1] : null;
      return t.tasks.recurringSub(day, fmtMinutes(i.task.estimatedMinutes));
    }
    return undefined;
  };

  const header = (
    <View style={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
      <AppText variant="display" accessibilityRole="header">
        {t.tasks.title}
      </AppText>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <RiskChip level="watch" count={model.risk.watch} />
        <RiskChip level="risky" count={model.risk.risky} />
        <RiskChip level="critical" count={model.risk.critical} />
      </View>
      <Segmented<Tab>
        options={[
          { value: 'active', label: t.tasks.tabs.active },
          { value: 'recurring', label: t.tasks.tabs.recurring },
          { value: 'done', label: t.tasks.tabs.done },
        ]}
        value={tab}
        onChange={setTab}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ height: insets.top }} />
      <FlashList
        data={items}
        keyExtractor={(i) => `${tab}-${i.instance.id}`}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <AppText variant="body" tone="ink3" style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            {t.tasks.empty[tab]}
          </AppText>
        }
        renderItem={({ item }) => {
          const card = toCardModel(item, today, now, !!leaving[item.instance.id]);
          const sub = subFor(item);
          return (
            <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
              <TaskCard
                task={sub ? { ...card, sub } : card}
                onTap={() => actions.openDetail(item.task.id)}
                onComplete={tab === 'done' ? undefined : () => actions.complete(item)}
                onDefer={tab === 'done' ? undefined : () => actions.defer(item)}
              />
            </View>
          );
        }}
        ListFooterComponent={<View style={{ height: insets.bottom + 49 + 110 }} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
