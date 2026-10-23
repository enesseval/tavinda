import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Segmented, Stepper } from '../../components/controls';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SettingsGroup, SettingsRow } from '../../components/settings';
import { minutesToTime, timeToMinutes } from '../../domain/dates';
import type { LockMode } from '../../domain/types';
import { fmtMinutes } from '../../i18n/format';
import { HEAT_NAMES, t } from '../../i18n/tr';
import { setSetting } from '../../services/actions';
import { useAppData } from '../../services/data';
import { useTheme } from '../../theme/theme';

/** Rules most people never need to touch; the defaults work. */
export default function AdvancedSettings() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useAppData().settings;
  const cutoffH = Math.floor(timeToMinutes(s.cutoff) / 60);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}>
        <ScreenHeader title={t.settings.advanced} />

        <SettingsGroup title={t.settings.groupDay} footer={t.settings.cutoffFoot(s.cutoff)}>
          <SettingsRow
            label={t.settings.cutoff}
            info={t.settings.info.cutoff}
            value={s.cutoff}
            last
            right={
              <Stepper
                onDec={() => setSetting('cutoff', minutesToTime(Math.max(0, cutoffH - 1) * 60))}
                onInc={() => setSetting('cutoff', minutesToTime(Math.min(6, cutoffH + 1) * 60))}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup
          title={t.settings.groupDefer}
          footer={s.lockMode === 'strict' ? t.settings.lockStrictFoot : t.settings.lockFlexibleFoot}
        >
          <SettingsRow
            label={t.settings.lock}
            info={t.settings.info.lock}
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
            info={t.settings.info.warn}
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
            info={t.settings.info.budget}
            value={fmtMinutes(s.dailyBudgetMinutes)}
            last
            right={
              <Stepper
                onDec={() => setSetting('dailyBudgetMinutes', Math.max(15, s.dailyBudgetMinutes - 15))}
                onInc={() => setSetting('dailyBudgetMinutes', Math.min(240, s.dailyBudgetMinutes + 15))}
              />
            }
          />
        </SettingsGroup>

        {/* A legend, not a control: what each heat means. */}
        <SettingsGroup title={t.settings.heatScale} footer={t.settings.heatLegendFoot}>
          {HEAT_NAMES.map((name, i) => (
            <View
              key={name}
              accessible
              accessibilityLabel={`${name}: ${t.intro.heat[i]}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                minHeight: 44,
                marginLeft: 16,
                paddingVertical: 8,
                paddingRight: 16,
                borderBottomWidth: i < HEAT_NAMES.length - 1 ? 0.5 : 0,
                borderBottomColor: c.line,
              }}
            >
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.heat[i] }} />
              <AppText variant="bodyStrong" style={{ width: 72 }}>
                {name}
              </AppText>
              <AppText variant="footnote" tone="ink2" style={{ flex: 1 }}>
                {t.intro.heat[i]}
              </AppText>
            </View>
          ))}
        </SettingsGroup>
      </ScrollView>
    </View>
  );
}
