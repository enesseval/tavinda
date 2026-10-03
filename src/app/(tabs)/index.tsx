import { FlashList } from '@shopify/flash-list';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Fab } from '../../components/Fab';
import { TaskCard } from '../../components/TaskCard';
import { CalmCard, ClassesStrip, HeroCard, LoadBar, LongTermCard, NoCalendarBanner, SetupCard } from '../../components/today';
import { buildTodayModel, type TodayGroupKey, type TodayItem } from '../../domain/today';
import { fmtLongDay, fmtMinutes } from '../../i18n/format';
import { HEAT_NAMES, t } from '../../i18n/tr';
import { getCalendarPermission, openAppSettings } from '../../services/calendar';
import { useNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import { useUi } from '../../store/ui';
import { useTheme } from '../../theme/theme';
import { mix } from '../../theme/tokens';
import { toCardModel } from '../../ui/taskText';
import { useTaskActions } from '../../ui/useTaskActions';
import { Touchable } from '../../components/Touchable';

type Row =
  | { type: 'header'; key: string }
  | { type: 'banner'; key: string }
  | { type: 'load'; key: string }
  | { type: 'strip'; key: string }
  | { type: 'setup'; key: string }
  | { type: 'heroLabel'; key: string }
  | { type: 'hero'; key: string; item: TodayItem }
  | { type: 'calm'; key: string }
  | { type: 'group'; key: string; group: TodayGroupKey; count: number; collapsible: boolean }
  | { type: 'card'; key: string; item: TodayItem }
  | { type: 'longHeader'; key: string }
  | { type: 'long'; key: string; items: TodayItem[] }
  | { type: 'footer'; key: string };

const UPCOMING_VISIBLE = 3;

export default function TodayScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const { now, today } = useNow();
  const model = useMemo(() => buildTodayModel(data, today), [data, today]);
  const actions = useTaskActions(today);
  const leaving = useUi((s) => s.leaving);
  const expanded = useUi((s) => s.upcomingExpanded);
  const toggleUpcoming = useUi((s) => s.toggleUpcoming);
  const [calDenied, setCalDenied] = useState(false);

  const usesCalendar = data.settings.calendarIds.length > 0 || data.courses.some((k) => k.source === 'calendar');
  useFocusEffect(
    useCallback(() => {
      if (!usesCalendar) {
        setCalDenied(false);
        return;
      }
      getCalendarPermission().then((p) => setCalDenied(p === 'denied'));
    }, [usesCalendar]),
  );

  const rows = useMemo<Row[]>(() => {
    const r: Row[] = [{ type: 'header', key: 'header' }];
    if (calDenied) r.push({ type: 'banner', key: 'banner' });
    r.push({ type: 'load', key: 'load' });
    if (model.hasCourses) r.push({ type: 'strip', key: 'strip' });
    else r.push({ type: 'setup', key: 'setup' });
    if (model.hero) {
      r.push({ type: 'heroLabel', key: 'heroLabel' }, { type: 'hero', key: `hero-${model.hero.instance.id}`, item: model.hero });
    } else if (model.hasCourses || data.tasks.length > 0) {
      r.push({ type: 'calm', key: 'calm' });
    }
    for (const g of model.groups) {
      const collapsible = g.key === 'upcoming' && g.items.length > UPCOMING_VISIBLE;
      r.push({ type: 'group', key: `g-${g.key}`, group: g.key, count: g.items.length, collapsible });
      const visible = collapsible && !expanded ? g.items.slice(0, UPCOMING_VISIBLE) : g.items;
      for (const item of visible) r.push({ type: 'card', key: `c-${item.instance.id}`, item });
    }
    if (model.longTerm.length) {
      r.push({ type: 'longHeader', key: 'longHeader' }, { type: 'long', key: 'long', items: model.longTerm });
    }
    r.push({ type: 'footer', key: 'footer' });
    return r;
  }, [model, calDenied, expanded, data.tasks.length]);

  const screenBg = model.maxHeat === 4 ? mix(c.heat[4], c.bg, 0.04) : model.maxHeat === 3 ? mix(c.heat[3], c.bg, 0.03) : c.bg;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const renderItem = ({ item: row }: { item: Row }) => {
    switch (row.type) {
      case 'header':
        return (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 12,
              paddingTop: 10,
              paddingHorizontal: 20,
            }}
          >
            <View style={{ gap: 2, flexShrink: 1 }}>
              <AppText variant="caption" tone="ink2">
                {fmtLongDay(today)}
              </AppText>
              <AppText variant="display" accessibilityRole="header">
                {t.today.title}
              </AppText>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 5,
                paddingHorizontal: 10,
                marginBottom: 6,
                borderRadius: 999,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.line,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: model.maxHeat == null ? c.ink3 : c.heat[model.maxHeat],
                }}
              />
              <AppText variant="caption" tone="ink2">
                {model.maxHeat == null ? t.today.calm : HEAT_NAMES[model.maxHeat]}
              </AppText>
            </View>
          </View>
        );
      case 'banner':
        return <NoCalendarBanner onPress={openAppSettings} />;
      case 'load':
        return (
          <View style={{ gap: 10, paddingTop: 16, paddingHorizontal: 20 }}>
            <AppText variant="body" tone="ink2" tabular>
              {!model.hasCourses && data.tasks.length === 0
                ? t.today.welcome
                : model.loadMinutes
                  ? t.today.load(fmtMinutes(model.loadMinutes), model.liveCount)
                  : t.today.noLoad}
            </AppText>
            <LoadBar segments={model.segments} />
          </View>
        );
      case 'strip':
        return <ClassesStrip classes={model.classes} nowMinutes={nowMinutes} isToday />;
      case 'setup':
        return <SetupCard onCalendar={() => router.push('/courses/import')} onManual={() => router.push('/courses/manual')} />;
      case 'heroLabel':
        return (
          <AppText variant="bodyStrong" tone="ink2" style={{ paddingTop: 24, paddingBottom: 8, paddingHorizontal: 20 }}>
            {t.today.nextUp}
          </AppText>
        );
      case 'hero':
        return (
          <HeroCard
            item={row.item}
            now={now}
            onOpen={() => actions.openDetail(row.item.task.id)}
            onProgress={() => actions.openProgress(row.item.instance.id)}
            onDefer={() => actions.defer(row.item)}
          />
        );
      case 'calm': {
        const long = model.longTerm[0];
        const done = model.doneTodayCount > 0;
        return (
          <CalmCard
            title={done ? t.today.calmDoneTitle : t.today.calmEmptyTitle}
            body={done ? t.today.calmDoneBody(model.upcomingCount) : long ? t.today.calmEmptyBody : t.today.calmEmptyNoLong}
            action={!done && long ? t.today.calmAction(long.task.title) : undefined}
            onAction={long ? () => actions.openProgress(long.instance.id) : undefined}
          />
        );
      }
      case 'group':
        return (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              paddingTop: 26,
              paddingBottom: 10,
              paddingHorizontal: 20,
            }}
          >
            <AppText
              variant="bodyStrong"
              color={row.group === 'last' ? c.heat[4] : row.group === 'ended' ? c.ink3 : c.ink2}
              accessibilityRole="header"
            >
              {t.today.groups[row.group]}
            </AppText>
            {row.collapsible ? (
              <Touchable accessibilityRole="button" onPress={toggleUpcoming} hitSlop={10}>
                <AppText variant="body">{expanded ? t.today.showLess : t.today.showAll(row.count)}</AppText>
              </Touchable>
            ) : (
              <AppText variant="caption" tone="ink3" tabular>
                {row.count}
              </AppText>
            )}
          </View>
        );
      case 'card':
        return (
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <TaskCard
              task={toCardModel(row.item, today, now, !!leaving[row.item.instance.id])}
              onTap={() =>
                row.item.instance.status === 'active'
                  ? actions.openProgress(row.item.instance.id)
                  : actions.openDetail(row.item.task.id)
              }
              onComplete={() => actions.complete(row.item)}
              onDefer={() => actions.defer(row.item)}
            />
          </View>
        );
      case 'longHeader':
        return (
          <AppText
            variant="title"
            style={{ paddingTop: 32, paddingBottom: 12, paddingHorizontal: 20 }}
            accessibilityRole="header"
          >
            {t.today.longTerm}
          </AppText>
        );
      case 'long':
        return (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
          >
            {row.items.map((i) => (
              <LongTermCard key={i.instance.id} item={i} onPress={() => actions.openProgress(i.instance.id)} />
            ))}
          </ScrollView>
        );
      case 'footer':
        return <View style={{ height: 150 }} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: screenBg }}>
      <View style={{ height: insets.top, backgroundColor: screenBg }} />
      <FlashList
        data={rows}
        renderItem={renderItem}
        keyExtractor={(r) => r.key}
        getItemType={(r) => r.type}
        showsVerticalScrollIndicator={false}
      />
      <Fab bottom={insets.bottom + 49 + 16} />
    </View>
  );
}
