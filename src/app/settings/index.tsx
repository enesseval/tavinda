import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Segmented, Toggle } from '../../components/controls';
import { PickerSheet } from '../../components/PickerSheet';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SettingsGroup, SettingsRow } from '../../components/settings';
import { BackupError } from '../../db/backup';
import { dateAtTime, minutesToTime } from '../../domain/dates';
import type { Settings, ThemePref } from '../../domain/types';
import { t } from '../../i18n/tr';
import { setSetting, wipeEverything } from '../../services/actions';
import { exportToFile, pickBackup, restoreBackup } from '../../services/backup';
import { getCalendarPermission, openAppSettings } from '../../services/calendar';
import { useNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import { getNotificationStatus, requestNotificationPermission } from '../../services/notifications';
import { useOnboarding, useUi } from '../../store/ui';
import { useTheme } from '../../theme/theme';
import { groupCourses } from '../../ui/courseDrafts';

type Switch = 'notifyMorning' | 'notifyLastDay' | 'notifyStartNow' | 'notifyClassEnd' | 'notifyBlockEnd' | 'freeTimePrompts';

/** Everyday settings. Rules with good defaults live under Gelişmiş, tools under Geliştirici. */
export default function SettingsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const { today } = useNow();
  const s = data.settings;
  const showToast = useUi((st) => st.showToast);
  const resetOnboarding = useOnboarding((st) => st.reset);
  const [notif, setNotif] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [calPerm, setCalPerm] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [picker, setPicker] = useState<'morning' | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getNotificationStatus().then(setNotif);
      getCalendarPermission().then(setCalPerm);
    }, []),
  );

  const toggle = (key: Switch, label: string, last = false) => (
    <SettingsRow
      label={label}
      last={last}
      right={<Toggle label={label} value={s[key] as Settings[Switch]} onChange={(v) => setSetting(key, v)} />}
    />
  );

  const exportData = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if ((await exportToFile()) === 'unavailable') showToast(t.data.shareUnavailable);
    } catch {
      showToast(t.data.exportFailed);
    } finally {
      setBusy(false);
    }
  };

  const importData = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const picked = await pickBackup();
      if (!picked) return;
      const { backup, summary } = picked;
      Alert.alert(t.data.importTitle, t.data.importBody(summary.courses, summary.tasks, summary.exportedAt.slice(0, 10)), [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.data.importConfirm,
          style: 'destructive',
          onPress: () => {
            restoreBackup(backup);
            showToast(t.data.imported);
          },
        },
      ]);
    } catch (e) {
      showToast(e instanceof BackupError ? t.data.errors[e.reason] : t.data.errors.invalid);
    } finally {
      setBusy(false);
    }
  };

  const version = `${Constants.expoConfig?.version ?? '1.0.0'} (${Constants.expoConfig?.ios?.buildNumber ?? '1'})`;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={t.settings.title} />

        <SettingsGroup title={t.settings.groupProgram}>
          <SettingsRow
            label={t.hours.row}
            value={t.hours.value(s.dayHours.mode, s.dayHours.start, s.dayHours.end)}
            chevron
            onPress={() => router.push('/settings/hours')}
          />
          <SettingsRow
            label={t.settings.courses}
            value={t.settings.coursesValue(groupCourses(data.courses).length)}
            chevron
            onPress={() => router.push('/courses')}
          />
          <SettingsRow
            label={t.settings.calendars}
            value={calPerm === 'denied' ? t.settings.calendarsDenied : t.settings.calendarsValue(s.calendarIds.length)}
            chevron
            onPress={() => router.push('/settings/calendars')}
            last
          />
        </SettingsGroup>

        <SettingsGroup title={t.settings.groupNotifications} footer={t.settings.notifFoot}>
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
          />
          {toggle('notifyMorning', t.settings.morning)}
          {s.notifyMorning ? (
            <SettingsRow label={t.settings.morningTime} value={s.morningTime} chevron onPress={() => setPicker('morning')} />
          ) : null}
          {toggle('notifyLastDay', t.settings.notifLastDay)}
          {toggle('notifyStartNow', t.settings.notifStartNow)}
          {toggle('notifyBlockEnd', t.settings.notifBlockEnd)}
          {toggle('notifyClassEnd', t.settings.notifClassEnd, true)}
        </SettingsGroup>

        <SettingsGroup title={t.settings.groupFreeTime} footer={t.settings.freeTimeFoot}>
          {toggle('freeTimePrompts', t.settings.freeTime, true)}
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

        <SettingsGroup title={t.data.group} footer={t.data.foot}>
          <SettingsRow label={t.data.export} chevron onPress={exportData} />
          <SettingsRow label={t.data.import} chevron onPress={importData} />
          <SettingsRow
            label={t.data.wipe}
            color={c.heat[3]}
            last
            onPress={() =>
              Alert.alert(t.data.wipeTitle, t.data.wipeBody, [
                { text: t.common.cancel, style: 'cancel' },
                {
                  text: t.common.delete,
                  style: 'destructive',
                  onPress: () => {
                    wipeEverything();
                    resetOnboarding();
                  },
                },
              ])
            }
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow label={t.intro.row} chevron onPress={() => router.push('/intro')} />
          <SettingsRow label={t.settings.advanced} chevron onPress={() => router.push('/settings/advanced')} />
          <SettingsRow label={t.debug.title} chevron onPress={() => router.push('/settings/debug')} last />
        </SettingsGroup>

        <AppText variant="caption" tone="ink3" center weight="400" style={{ paddingTop: 28, paddingHorizontal: 20 }}>
          {t.settings.about(version)}
        </AppText>
      </ScrollView>
      <PickerSheet
        visible={picker === 'morning'}
        mode="time"
        title={t.settings.morningTime}
        value={dateAtTime(today, s.morningTime)}
        onCancel={() => setPicker(null)}
        onDone={(d) => {
          setSetting('morningTime', minutesToTime(d.getHours() * 60 + d.getMinutes()));
          setPicker(null);
        }}
      />
    </View>
  );
}
