import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Button, CoursePill, Segmented } from '../../components/controls';
import { TaskCard } from '../../components/TaskCard';
import { TaskEditList } from '../../components/TaskEditList';
import { Touchable } from '../../components/Touchable';
import { editRows, taskListModel, type ListItem, type RiskLevel, type TaskRow } from '../../domain/taskList';
import { fmtMinutes } from '../../i18n/format';
import { t, WEEKDAYS_LONG } from '../../i18n/tr';
import { resetTaskOrder, setTaskPaused } from '../../services/actions';
import { useNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import { useUi } from '../../store/ui';
import { useTheme } from '../../theme/theme';
import { radii } from '../../theme/tokens';
import { toCardModel } from '../../ui/taskText';
import { useTaskActions } from '../../ui/useTaskActions';

type Tab = 'active' | 'recurring' | 'done';

type Row =
  | { type: 'card'; key: string; item: ListItem }
  | { type: 'pausedHeader'; key: string; count: number }
  | { type: 'paused'; key: string; row: TaskRow };

/** A paused task outside edit mode: dimmed, with a one-tap way back. */
function PausedRow({ row, onOpen }: { row: TaskRow; onOpen: () => void }) {
  const { c } = useTheme();
  const showToast = useUi((s) => s.showToast);
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${row.task.title}, ${t.tasks.rowPaused}`}
      onPress={onOpen}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 60,
        paddingLeft: 16,
        paddingRight: 8,
        borderRadius: radii.card,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: c.line,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4, opacity: 0.6 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {row.task.title}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {row.course ? <CoursePill code={row.course.shortName} color={row.course.color} /> : null}
          <AppText variant="caption" tone="ink2" numberOfLines={1} style={{ flexShrink: 1 }}>
            {t.tasks.pausedSub}
          </AppText>
        </View>
      </View>
      <Button
        label={t.tasks.resume}
        kind="ghost"
        small
        onPress={() => {
          setTaskPaused(row.task, false);
          showToast(t.tasks.resumed(row.task.title));
        }}
      />
    </Touchable>
  );
}

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
  const showToast = useUi((s) => s.showToast);
  const [tab, setTab] = useState<Tab>('active');
  /** Rows frozen when edit mode opened; null when not editing. */
  const [editing, setEditing] = useState<TaskRow[] | null>(null);

  // Leaving the tab ends edit mode, like the home screen when you open an app.
  useFocusEffect(useCallback(() => () => setEditing(null), []));

  const items = tab === 'active' ? model.active : tab === 'recurring' ? model.recurring : model.done;
  const paused =
    tab === 'active' ? model.paused : tab === 'recurring' ? model.paused.filter((r) => r.task.kind === 'weekly') : [];
  const canEdit = tab !== 'done' && items.length + paused.length > 0;
  const startEdit = () => {
    if (tab !== 'done') setEditing(editRows(model, tab));
  };

  const rows = useMemo<Row[]>(() => {
    const r: Row[] = items.map((item) => ({ type: 'card', key: `${tab}-${item.instance.id}`, item }));
    if (paused.length) {
      r.push({ type: 'pausedHeader', key: 'pausedHeader', count: paused.length });
      for (const p of paused) r.push({ type: 'paused', key: `paused-${p.task.id}`, row: p });
    }
    return r;
  }, [items, paused, tab]);

  const subFor = (i: ListItem): string | undefined => {
    if (tab === 'recurring') {
      const day = i.course ? WEEKDAYS_LONG[i.course.weekday - 1] : null;
      return t.tasks.recurringSub(day, fmtMinutes(i.task.estimatedMinutes));
    }
    return undefined;
  };

  const titleRow = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
      <AppText variant="display" accessibilityRole="header">
        {t.tasks.title}
      </AppText>
      {editing || canEdit ? (
        <Touchable
          accessibilityRole="button"
          hitSlop={10}
          onPress={editing ? () => setEditing(null) : startEdit}
          style={{ paddingVertical: 6, paddingLeft: 8 }}
        >
          <AppText variant="bodyStrong" color={editing ? c.ink : c.ink2}>
            {editing ? t.tasks.editDone : t.tasks.edit}
          </AppText>
        </Touchable>
      ) : null}
    </View>
  );

  if (editing) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ height: insets.top }} />
        <TaskEditList
          rows={editing}
          today={today}
          header={
            <View style={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 14, gap: 10 }}>
              {titleRow}
              <AppText variant="footnote" tone="ink2" style={{ lineHeight: 19 }}>
                {t.tasks.editHint}
              </AppText>
            </View>
          }
          footer={
            <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: insets.bottom + 49 + 110, gap: 8 }}>
              {model.customOrder ? (
                <Button
                  label={t.tasks.resetOrder}
                  kind="ghost"
                  small
                  onPress={() => {
                    resetTaskOrder();
                    showToast(t.tasks.orderReset);
                    setEditing(null);
                  }}
                />
              ) : null}
            </View>
          }
        />
      </View>
    );
  }

  const header = (
    <View style={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
      {titleRow}
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
        data={rows}
        keyExtractor={(r) => r.key}
        getItemType={(r) => r.type}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <AppText variant="body" tone="ink3" style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            {t.tasks.empty[tab]}
          </AppText>
        }
        renderItem={({ item: row }) => {
          if (row.type === 'pausedHeader') {
            return (
              <View style={{ paddingHorizontal: 20, paddingTop: items.length ? 12 : 4, paddingBottom: 10 }}>
                {items.length ? null : (
                  <AppText variant="body" tone="ink3" style={{ paddingBottom: 20 }}>
                    {t.tasks.empty[tab]}
                  </AppText>
                )}
                <AppText variant="label" tone="ink2">
                  {t.tasks.pausedHeader(row.count)}
                </AppText>
              </View>
            );
          }
          if (row.type === 'paused') {
            return (
              <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
                <PausedRow row={row.row} onOpen={() => actions.openDetail(row.row.task.id)} />
              </View>
            );
          }
          const { item } = row;
          const card = toCardModel(item, today, now, !!leaving[item.instance.id]);
          const sub = subFor(item);
          return (
            <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
              <TaskCard
                task={sub ? { ...card, sub } : card}
                onTap={() => actions.openDetail(item.task.id)}
                onComplete={tab === 'done' ? undefined : () => actions.complete(item)}
                onDefer={tab === 'done' ? undefined : () => actions.defer(item)}
                onLongPress={tab === 'done' ? undefined : startEdit}
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
