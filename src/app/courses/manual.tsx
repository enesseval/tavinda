import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { DraftList, ManualCourseForm } from '../../components/courses';
import { Button, SectionLabel } from '../../components/controls';
import { ScreenHeader } from '../../components/ScreenHeader';
import { t } from '../../i18n/tr';
import { addCourses } from '../../services/actions';
import { useAppData } from '../../services/data';
import type { OnboardingCourseDraft } from '../../store/ui';
import { useUi } from '../../store/ui';
import { useTheme } from '../../theme/theme';
import { draftToCourse } from '../../ui/courseDrafts';

/** Manual weekly grid outside onboarding: adds rows straight to the DB on "Bitti". */
export default function ManualCourses() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { courses } = useAppData();
  const showToast = useUi((s) => s.showToast);
  const [drafts, setDrafts] = useState<OnboardingCourseDraft[]>([]);

  const save = () => {
    if (drafts.length) addCourses(drafts.map(draftToCourse));
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}
      >
        <ScreenHeader
          title={t.manual.title}
          backLabel={t.common.cancel}
          right={
            <AppText variant="headline" onPress={save} accessibilityRole="button" suppressHighlighting>
              {t.manual.done}
            </AppText>
          }
        />
        <View style={{ paddingHorizontal: 20 }}>
          <AppText variant="body" tone="ink2" style={{ marginTop: 8 }}>
            {t.manual.body}
          </AppText>
          <View style={{ marginTop: 20 }}>
            <ManualCourseForm
              existing={[...courses, ...drafts]}
              onAdd={(d) => setDrafts((x) => [...x, d])}
              onError={(m) => showToast(m)}
            />
          </View>
          <SectionLabel>{t.manual.added}</SectionLabel>
          <DraftList drafts={drafts} onRemove={(key) => setDrafts((x) => x.filter((d) => d.key !== key))} />
          <View style={{ marginTop: 24 }}>
            <Button label={t.manual.continue(drafts.length)} onPress={save} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
