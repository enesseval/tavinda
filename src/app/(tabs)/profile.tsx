import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Button, Card } from '../../components/controls';
import { GearIcon } from '../../components/icons';
import { Touchable } from '../../components/Touchable';
import { semesterStats } from '../../domain/stats';
import { t, WEEKDAYS_SHORT } from '../../i18n/tr';
import { useNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import { useTheme } from '../../theme/theme';

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

/** Semester summary. Settings live on their own screen behind the gear. */
export default function ProfileScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const { today } = useNow();
  const stats = useMemo(() => semesterStats(data, today), [data, today]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 49 + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 10,
            paddingLeft: 20,
            paddingRight: 12,
          }}
        >
          <AppText variant="display" accessibilityRole="header">
            {t.profile.title}
          </AppText>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={t.settings.title}
            onPress={() => router.push('/settings')}
            hitSlop={8}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <GearIcon color={c.ink} size={24} />
          </Touchable>
        </View>

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

        <View style={{ marginTop: 24, marginHorizontal: 20 }}>
          <Button
            label={t.settings.title}
            kind="secondary"
            icon={<GearIcon color={c.ink} />}
            onPress={() => router.push('/settings')}
          />
        </View>
      </ScrollView>
    </View>
  );
}
