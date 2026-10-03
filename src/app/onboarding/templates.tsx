import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button, Card, Chip } from '../../components/controls';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { t, TEMPLATES } from '../../i18n/tr';
import { slotsLine } from '../../components/courses';
import { groupCourses } from '../../ui/courseDrafts';
import { DEFAULT_PICK, useOnboarding } from '../../store/ui';

export default function OnboardingTemplates() {
  const enabled = useOnboarding((s) => s.courses).filter((d) => d.enabled);
  const picks = useOnboarding((s) => s.picks);
  const togglePick = useOnboarding((s) => s.togglePick);
  // One card per course; its weekly tasks follow the course's first day of the week.
  const courses = groupCourses(enabled).map((g) => ({ ...g.slots[0], slots: g.slots }));
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
                  <AppText variant="caption" tone="ink3" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {slotsLine(d.slots)}
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
