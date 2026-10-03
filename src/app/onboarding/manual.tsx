import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button, SectionLabel } from '../../components/controls';
import { CourseForm, DraftList, formToDrafts } from '../../components/courses';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { t } from '../../i18n/tr';
import { useOnboarding, useUi } from '../../store/ui';
import { groupCourses } from '../../ui/courseDrafts';

/** Manual weekly grid: used when calendar access is denied or skipped. */
export default function OnboardingManual() {
  const courses = useOnboarding((s) => s.courses);
  const addManual = useOnboarding((s) => s.addManual);
  const remove = useOnboarding((s) => s.removeCourse);
  const showToast = useUi((s) => s.showToast);
  const manual = courses.filter((d) => d.source === 'manual');
  const enabled = groupCourses(courses.filter((d) => d.enabled)).length;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <OnboardingFrame
        step={3}
        footer={<Button label={t.manual.continue(enabled)} onPress={() => router.push('/onboarding/templates')} />}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: 24 }}
        >
          <AppText variant="display" accessibilityRole="header">
            {t.manual.title}
          </AppText>
          <AppText variant="bodyLarge" tone="ink2" style={{ marginTop: 8, lineHeight: 24 }}>
            {t.manual.body}
          </AppText>
          <View style={{ marginTop: 20 }}>
            <CourseForm
              existing={courses}
              submitLabel={t.manual.addRow}
              resetAfterSubmit
              onError={(m) => showToast(m)}
              onSubmit={(v) => formToDrafts(v).forEach(addManual)}
            />
          </View>
          <SectionLabel>{t.manual.added}</SectionLabel>
          <DraftList drafts={manual} onRemove={(keys) => keys.forEach(remove)} />
        </ScrollView>
      </OnboardingFrame>
    </KeyboardAvoidingView>
  );
}
