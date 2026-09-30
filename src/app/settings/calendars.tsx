import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Button, Toggle } from '../../components/controls';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SettingsGroup, SettingsRow } from '../../components/settings';
import { t } from '../../i18n/tr';
import { setSetting } from '../../services/actions';
import {
  getCalendarPermission,
  listCalendars,
  openAppSettings,
  requestCalendarPermission,
  type DeviceCalendar,
} from '../../services/calendar';
import { useAppData } from '../../services/data';
import { useTheme } from '../../theme/theme';

export default function CalendarsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useAppData();
  const [perm, setPerm] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [cals, setCals] = useState<DeviceCalendar[]>([]);

  const load = useCallback(async () => {
    const p = await getCalendarPermission();
    setPerm(p);
    if (p === 'granted') setCals(await listCalendars());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const selected = new Set(settings.calendarIds);
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSetting('calendarIds', [...next]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}>
        <ScreenHeader title={t.calendarsScreen.title} />
        {perm === 'granted' ? (
          <>
            <SettingsGroup footer={t.calendarsScreen.foot}>
              {cals.map((cal, i) => (
                <SettingsRow
                  key={cal.id}
                  label={cal.title}
                  last={i === cals.length - 1}
                  right={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cal.color }} />
                      <Toggle label={cal.title} value={selected.has(cal.id)} onChange={() => toggle(cal.id)} />
                    </View>
                  }
                />
              ))}
            </SettingsGroup>
            <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
              <Button label={t.calendarsScreen.reimport} kind="secondary" onPress={() => router.push('/courses/import')} />
            </View>
          </>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 16 }}>
            <AppText variant="bodyLarge" tone="ink2">
              {t.calendarsScreen.denied}
            </AppText>
            <Button
              label={perm === 'undetermined' ? t.onboarding.calConnect : t.calendarsScreen.openSettings}
              onPress={async () => {
                if (perm === 'undetermined') {
                  await requestCalendarPermission();
                  load();
                } else openAppSettings();
              }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
