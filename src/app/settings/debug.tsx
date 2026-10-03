import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { PickerSheet } from '../../components/PickerSheet';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SettingsGroup, SettingsRow } from '../../components/settings';
import { parseLocalDate, toLocalDate } from '../../domain/dates';
import { heatFor, paceForInstance, shareForInstance } from '../../domain/heat';
import { getWidgetSnapshot } from '../../domain/widget';
import { fmtLongDay, fmtMinutes } from '../../i18n/format';
import { HEAT_NAMES, t } from '../../i18n/tr';
import { loadDemo, resetTime, timeTravelBy, timeTravelTo, wipeEverything } from '../../services/actions';
import { getNow, useNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import { scheduledCount, sendTestNotification } from '../../services/notifications';
import { useOnboarding, useUi } from '../../store/ui';
import { useTheme } from '../../theme/theme';

const DAY_MS = 86_400_000;

/** Developer tools for the TestFlight build: time travel, demo data, notification and heat checks. */
export default function DebugScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const { now, today } = useNow();
  const s = data.settings;
  const showToast = useUi((st) => st.showToast);
  const resetOnboarding = useOnboarding((st) => st.reset);
  const [pending, setPending] = useState(0);
  const [picker, setPicker] = useState<'debugDate' | null>(null);

  useFocusEffect(
    useCallback(() => {
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

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={t.debug.title} />

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
    </View>
  );
}
