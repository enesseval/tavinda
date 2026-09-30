import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/controls';
import { CandidateList } from '../../components/courses';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { t } from '../../i18n/tr';
import { findClassCandidates } from '../../services/calendar';
import { getToday } from '../../services/clock';
import { useOnboarding } from '../../store/ui';
import { useTheme } from '../../theme/theme';
import { draftsFromCandidates } from '../../ui/courseDrafts';

export default function OnboardingMap() {
  const { c } = useTheme();
  const courses = useOnboarding((s) => s.courses);
  const setCourses = useOnboarding((s) => s.setCourses);
  const toggle = useOnboarding((s) => s.toggleCourse);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    findClassCandidates([], getToday()).then((cands) => {
      if (!alive) return;
      const manual = useOnboarding.getState().courses.filter((d) => d.source === 'manual');
      setCourses([...draftsFromCandidates(cands, manual), ...manual]);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [setCourses]);

  const fromCalendar = courses.filter((d) => d.source === 'calendar');
  const enabled = courses.filter((d) => d.enabled).length;

  return (
    <OnboardingFrame
      step={3}
      footer={
        <View style={{ gap: 4 }}>
          <Button
            label={t.onboarding.mapContinue(enabled)}
            onPress={() => router.push(enabled ? '/onboarding/templates' : '/onboarding/manual')}
            disabled={loading}
          />
          {enabled ? (
            <Button label={t.onboarding.mapManual} kind="ghost" onPress={() => router.push('/onboarding/manual')} />
          ) : null}
        </View>
      }
    >
      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: 24 }}>
        <AppText variant="display" accessibilityRole="header">
          {t.onboarding.mapTitle}
        </AppText>
        {loading ? (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 16 }}>
            <ActivityIndicator color={c.ink2} />
            <AppText variant="bodyLarge" tone="ink2">
              {t.onboarding.mapLoading}
            </AppText>
          </View>
        ) : fromCalendar.length ? (
          <>
            <AppText variant="bodyLarge" tone="ink2" style={{ marginTop: 8, lineHeight: 24 }}>
              {t.onboarding.mapBody(fromCalendar.length)}
            </AppText>
            <View style={{ marginTop: 24 }}>
              <CandidateList drafts={courses} onToggle={toggle} />
            </View>
            <AppText variant="footnote" tone="ink2" style={{ paddingTop: 8, paddingHorizontal: 16 }}>
              {t.onboarding.mapFoot}
            </AppText>
          </>
        ) : (
          <AppText variant="bodyLarge" tone="ink2" style={{ marginTop: 8, lineHeight: 24 }}>
            {t.onboarding.mapEmpty}
          </AppText>
        )}
      </ScrollView>
    </OnboardingFrame>
  );
}
