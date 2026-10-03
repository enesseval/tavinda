import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Segmented, Stepper } from '../../components/controls';
import { PickerSheet } from '../../components/PickerSheet';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SettingsGroup, SettingsRow } from '../../components/settings';
import { dateAtTime, minutesToTime, timeToMinutes } from '../../domain/dates';
import type { LockMode, ThemePref } from '../../domain/types';
import { fmtMinutes } from '../../i18n/format';
import { HEAT_NAMES, t } from '../../i18n/tr';
import { setSetting } from '../../services/actions';
import { getCalendarPermission, openAppSettings } from '../../services/calendar';
import { useNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import { getNotificationStatus, requestNotificationPermission } from '../../services/notifications';
import { useTheme } from '../../theme/theme';
import { groupCourses } from '../../ui/courseDrafts';

/** All user settings, grouped. Developer tools sit one level deeper. */
export default function SettingsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const { today } = useNow();
  const s = data.settings;
  const [notif, setNotif] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [calPerm, setCalPerm] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [picker, setPicker] = useState<'morning' | null>(null);

  useFocusEffect(
    useCallback(() => {
      getNotificationStatus().then(setNotif);
      getCalendarPermission().then(setCalPerm);
    }, []),
  );

  const version = `${Constants.expoConfig?.version ?? '1.0.0'} (${Constants.expoConfig?.ios?.buildNumber ?? '1'})`;
  const cutoffH = Math.floor(timeToMinutes(s.cutoff) / 60);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={t.settings.title} />

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
          />
          <SettingsRow
            label={t.hours.row}
            value={t.hours.value(s.dayHours.mode, s.dayHours.start, s.dayHours.end)}
            chevron
            onPress={() => router.push('/settings/hours')}
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

        <SettingsGroup>
          <SettingsRow label={t.debug.title} chevron onPress={() => router.push('/settings/debug')} last />
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
    </View>
  );
}
