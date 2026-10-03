import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Card, Segmented, Stepper } from '../../components/controls';
import { Fab } from '../../components/Fab';
import { PickerSheet } from '../../components/PickerSheet';
import { SettingsGroup, SettingsRow } from '../../components/settings';
import { dateAtTime, minutesToTime, parseLocalDate, timeToMinutes, toLocalDate } from '../../domain/dates';
import { heatFor, paceForInstance, shareForInstance } from '../../domain/heat';
import { semesterStats } from '../../domain/stats';
import type { LockMode, ThemePref } from '../../domain/types';
import { getWidgetSnapshot } from '../../domain/widget';
import { fmtLongDay, fmtMinutes } from '../../i18n/format';
import { HEAT_NAMES, t, WEEKDAYS_SHORT } from '../../i18n/tr';
import { loadDemo, resetTime, setSetting, timeTravelBy, timeTravelTo, wipeEverything } from '../../services/actions';
import { getCalendarPermission } from '../../services/calendar';
import { getNow } from '../../services/clock';
import { useNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import {
  getNotificationStatus,
  requestNotificationPermission,
  scheduledCount,
  sendTestNotification,
} from '../../services/notifications';
import { openAppSettings } from '../../services/calendar';
import { useOnboarding, useUi } from '../../store/ui';
import { useTheme } from '../../theme/theme';
import { groupCourses } from '../../ui/courseDrafts';

const DAY_MS = 86_400_000;

function Stat({ value, label, extra }: { value: string; label: string; extra?: string }) {
  return (
    <View style={{ width: '50%', paddingRight: 12, paddingBottom: 16, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <AppText variant="sheetTitle" tabular>
          {value}
        </AppText>
        {extra ? (
          <AppText variant="footnote" weight="500" tone="ink2" tabular>
            {extra}
          </AppText>
        ) : null}
      </View>
      <AppText variant="caption" tone="ink2">
        {label}
      </AppText>
    </View>
  );
}

export default function ProfileScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const { now, today } = useNow();
  const s = data.settings;
  const stats = useMemo(() => semesterStats(data, today), [data, today]);
  const showToast = useUi((st) => st.showToast);
  const resetOnboarding = useOnboarding((st) => st.reset);
  const [notif, setNotif] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [calPerm, setCalPerm] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [pending, setPending] = useState(0);
  const [picker, setPicker] = useState<'morning' | 'debugDate' | null>(null);

  useFocusEffect(
    useCallback(() => {
      getNotificationStatus().then(setNotif);
      getCalendarPermission().then(setCalPerm);
      scheduledCount().then(setPending);
    }, []),
  );

  const confirm = (message: string, onYes: () => void) =>
    Alert.alert(t.debug.confirm, message, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.ok, style: 'destructive', onPress: onYes },
    ]);

  const openHeat = data.instances
    .filter((i) => i.status === 'active')
    .map((i) => {
      const task = data.tasks.find((x) => x.id === i.taskId);
      if (!task) return null;
      return {
        id: i.id,
        title: task.title,
        heat: heatFor(i, task, today, s),
        pace: paceForInstance(i, task, today, s),
        share: shareForInstance(i, task, today),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.heat - a.heat);

  const version = `${Constants.expoConfig?.version ?? '1.0.0'} (${Constants.expoConfig?.ios?.buildNumber ?? '1'})`;
  const cutoffH = Math.floor(timeToMinutes(s.cutoff) / 60);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 49 + 110 }}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="display" style={{ paddingTop: 10, paddingHorizontal: 20 }} accessibilityRole="header">
          {t.profile.title}
        </AppText>

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
          <AppText variant="title">{t.profile.semester}</AppText>
          {stats.weeks ? (
            <AppText variant="caption" tone="ink3">
              {t.profile.weeks(stats.weeks)}
            </AppText>
          ) : null}
        </View>
        <Card style={{ marginHorizontal: 20, padding: 18, gap: 2 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Stat value={String(stats.completed)} label={t.profile.completed} />
            <Stat value={String(stats.lastDayCount)} extra={`%${stats.lastDayPct}`} label={t.profile.lastDay} />
            <Stat value={stats.avgDefer.toLocaleString('tr-TR')} label={t.profile.avgDefer} />
            <Stat value={String(stats.missed)} label={t.profile.missed} />
          </View>
          <View style={{ gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.line }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="label" tone="ink2">
                {t.profile.heatmap}
              </AppText>
              <AppText variant="label" weight="500" tone="ink3">
                {t.profile.heatmapRange(stats.heatmapWeeks)}
              </AppText>
            </View>
            <View style={{ gap: 4 }} accessibilityLabel={t.profile.heatmap}>
              {stats.heatmap.map((row, di) => (
                <View key={di} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AppText variant="micro" tone="ink3" style={{ width: 24, fontSize: 10 }} maxFontSizeMultiplier={1}>
                    {WEEKDAYS_SHORT[di]}
                  </AppText>
                  {row.map((cell, wi) => (
                    <View
                      key={wi}
                      style={{
                        flex: 1,
                        height: 16,
                        borderRadius: 4,
                        backgroundColor: cell === 'future' ? 'transparent' : cell == null ? c.surface2 : c.heat[cell],
                        borderWidth: cell === 'future' ? 1 : 0,
                        borderStyle: 'dashed',
                        borderColor: c.line,
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
            {stats.completed === 0 ? (
              <AppText variant="footnote" tone="ink2">
                {t.profile.empty}
              </AppText>
            ) : null}
          </View>
        </Card>

        <AppText variant="title" style={{ paddingTop: 32, paddingHorizontal: 20 }}>
          {t.settings.title}
        </AppText>

        <SettingsGroup title={t.settings.groupDay} footer={t.settings.cutoffFoot(s.cutoff)}>
          <SettingsRow
            label={t.settings.cutoff}
            value={s.cutoff}
            right={
              <Stepper
                onDec={() => setSetting('cutoff', minutesToTime(Math.max(0, cutoffH - 1) * 60))}
                onInc={() => setSetting('cutoff', minutesToTime(Math.min(6, cutoffH + 1) * 60))}
              />
            }
            last
          />
        </SettingsGroup>

        <SettingsGroup title={t.settings.groupCalendar}>
          <SettingsRow
            label={t.settings.calendars}
            value={calPerm === 'denied' ? t.settings.calendarsDenied : t.settings.calendarsValue(s.calendarIds.length)}
            chevron
            onPress={() => router.push('/settings/calendars')}
          />
          <SettingsRow
            label={t.settings.courses}
            value={t.settings.coursesValue(groupCourses(data.courses).length)}
            chevron
            onPress={() => router.push('/courses')}
            last
          />
        </SettingsGroup>

        <SettingsGroup
          title={t.settings.groupDefer}
          footer={s.lockMode === 'strict' ? t.settings.lockStrictFoot : t.settings.lockFlexibleFoot}
        >
          <SettingsRow
            label={t.settings.lock}
            last
            right={
              <Segmented<LockMode>
                compact
                options={[
                  { value: 'strict', label: t.settings.lockStrict },
                  { value: 'flexible', label: t.settings.lockFlexible },
                ]}
                value={s.lockMode}
                onChange={(v) => setSetting('lockMode', v)}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title={t.settings.groupUrgency} footer={t.settings.warnFoot(s.warnDays)}>
          <SettingsRow
            label={t.settings.warn}
            value={t.settings.warnValue(s.warnDays)}
            right={
              <Stepper
                onDec={() => setSetting('warnDays', Math.max(1, s.warnDays - 1))}
                onInc={() => setSetting('warnDays', Math.min(14, s.warnDays + 1))}
              />
            }
          />
          <SettingsRow
            label={t.settings.budget}
            value={fmtMinutes(s.dailyBudgetMinutes)}
            right={
              <Stepper
                onDec={() => setSetting('dailyBudgetMinutes', Math.max(15, s.dailyBudgetMinutes - 15))}
                onInc={() => setSetting('dailyBudgetMinutes', Math.min(240, s.dailyBudgetMinutes + 15))}
              />
            }
          />
          <SettingsRow
            label={t.settings.heatScale}
            last
            right={
              <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={HEAT_NAMES.join(', ')}>
                {c.heat.map((h) => (
                  <View key={h} style={{ width: 18, height: 8, borderRadius: 4, backgroundColor: h }} />
                ))}
              </View>
            }
          />
        </SettingsGroup>

        <SettingsGroup title={t.settings.groupNotifications} footer={t.settings.notifFoot}>
          <SettingsRow label={t.settings.morning} value={s.morningTime} chevron onPress={() => setPicker('morning')} />
          <SettingsRow
            label={t.settings.notifPermission}
            value={notif === 'granted' ? t.settings.notifOn : t.settings.notifOff}
            chevron={notif !== 'granted'}
            onPress={
              notif === 'granted'
                ? undefined
                : async () => {
                    if (notif === 'denied') openAppSettings();
                    else setNotif((await requestNotificationPermission()) ? 'granted' : 'denied');
                  }
            }
            last
          />
        </SettingsGroup>

        <SettingsGroup title={t.settings.groupAppearance}>
          <SettingsRow
            label={t.settings.theme}
            last
            right={
              <Segmented<ThemePref>
                compact
                options={[
                  { value: 'system', label: t.settings.themeSystem },
                  { value: 'light', label: t.settings.themeLight },
                  { value: 'dark', label: t.settings.themeDark },
                ]}
                value={s.theme}
                onChange={(v) => setSetting('theme', v)}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title={t.debug.title} footer={t.debug.foot}>
          <SettingsRow label={t.debug.clock} value={s.timeOffsetMs ? fmtLongDay(toLocalDate(now)) : t.debug.real} />
          <SettingsRow label={t.debug.plusDay} chevron onPress={() => timeTravelBy(DAY_MS)} />
          <SettingsRow label={t.debug.plusWeek} chevron onPress={() => timeTravelBy(7 * DAY_MS)} />
          <SettingsRow label={t.debug.pickDate} chevron onPress={() => setPicker('debugDate')} />
          <SettingsRow label={t.debug.reset} chevron onPress={resetTime} />
          <SettingsRow label={t.debug.seed} chevron onPress={() => confirm(t.debug.seedConfirm, loadDemo)} />
          <SettingsRow
            label={t.debug.testNotif}
            chevron
            onPress={async () => {
              const ok = await sendTestNotification();
              showToast(ok ? t.toast.testNotification : t.toast.notificationsOff);
            }}
          />
          <SettingsRow label={t.debug.scheduled(pending)} />
          <SettingsRow
            label={t.debug.widget}
            chevron
            onPress={() => Alert.alert(t.debug.widget, JSON.stringify(getWidgetSnapshot(getNow(), data), null, 2))}
          />
          <SettingsRow
            label={t.debug.wipe}
            color={c.heat[3]}
            last
            onPress={() =>
              confirm(t.debug.wipeConfirm, () => {
                wipeEverything();
                resetOnboarding();
              })
            }
          />
        </SettingsGroup>

        <SettingsGroup title={t.debug.heat}>
          {openHeat.length ? (
            openHeat.map((h, i) => (
              <SettingsRow
                key={h.id}
                label={h.title}
                last={i === openHeat.length - 1}
                below={
                  <AppText variant="footnote" tone="ink2" tabular style={{ paddingBottom: 8, marginTop: -4 }}>
                    {t.debug.heatRow(`${h.heat} ${HEAT_NAMES[h.heat]}`, h.pace.toFixed(2), fmtMinutes(h.share))}
                  </AppText>
                }
              />
            ))
          ) : (
            <SettingsRow label={t.debug.noTasks} last />
          )}
        </SettingsGroup>

        <AppText variant="caption" tone="ink3" center weight="400" style={{ paddingTop: 28, paddingHorizontal: 20 }}>
          {t.settings.about(version)}
        </AppText>
      </ScrollView>
      <PickerSheet
        visible={picker === 'morning'}
        mode="time"
        title={t.settings.morning}
        value={dateAtTime(today, s.morningTime)}
        onCancel={() => setPicker(null)}
        onDone={(d) => {
          setSetting('morningTime', minutesToTime(d.getHours() * 60 + d.getMinutes()));
          setPicker(null);
        }}
      />
      <PickerSheet
        visible={picker === 'debugDate'}
        mode="date"
        title={t.debug.pickDate}
        value={parseLocalDate(today)}
        onCancel={() => setPicker(null)}
        onDone={(d) => {
          timeTravelTo(d);
          setPicker(null);
        }}
      />
      <Fab bottom={insets.bottom + 49 + 16} />
    </View>
  );
}
