import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button, Card, Chip } from '../../components/controls';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { t, TEMPLATES, WEEKDAYS_LONG } from '../../i18n/tr';
import { DEFAULT_PICK, useOnboarding } from '../../store/ui';

export default function OnboardingTemplates() {
  const courses = useOnboarding((s) => s.courses).filter((d) => d.enabled);
  const picks = useOnboarding((s) => s.picks);
  const togglePick = useOnboarding((s) => s.togglePick);
  const count = courses.reduce((a, d) => a + (picks[d.key] ?? DEFAULT_PICK).length, 0);

  return (
    <OnboardingFrame
      step={4}
      footer={<Button label={t.onboarding.tplContinue(count)} onPress={() => router.push('/onboarding/notifications')} />}
    >
      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: 24 }}>
        <AppText variant="display" accessibilityRole="header">
          {t.onboarding.tplTitle}
        </AppText>
        <AppText variant="bodyLarge" tone="ink2" style={{ marginTop: 8, lineHeight: 24 }}>
          {courses.length ? t.onboarding.tplBody : t.onboarding.tplNoCourses}
        </AppText>
        <View style={{ marginTop: 20, gap: 12 }}>
          {courses.map((d) => {
            const sel = picks[d.key] ?? DEFAULT_PICK;
            return (
              <Card key={d.key} style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.color }} />
                    <AppText variant="headline" numberOfLines={1}>
                      {d.name}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="ink3">
                    {WEEKDAYS_LONG[d.weekday - 1]} {d.startTime}
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {TEMPLATES.map((tpl) => (
                    <Chip key={tpl} label={tpl} selected={sel.includes(tpl)} onPress={() => togglePick(d.key, tpl)} />
                  ))}
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </OnboardingFrame>
  );
}
