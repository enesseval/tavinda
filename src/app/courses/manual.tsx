import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Button, SectionLabel } from '../../components/controls';
import { CourseForm, DraftList, formToDrafts, type CourseFormValue } from '../../components/courses';
import { ScreenHeader } from '../../components/ScreenHeader';
import { t } from '../../i18n/tr';
import { addCourses, deleteCourseGroup, saveCourseGroup } from '../../services/actions';
import { useAppData } from '../../services/data';
import type { OnboardingCourseDraft } from '../../store/ui';
import { useUi } from '../../store/ui';
import { useTheme } from '../../theme/theme';
import { draftToCourse, groupCourses } from '../../ui/courseDrafts';

/**
 * Adds courses outside onboarding, or edits one (`?edit=<course name>`):
 * one course, every day it meets, each with its own hours.
 */
export default function ManualCourses() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ edit?: string }>();
  const { courses } = useAppData();
  const showToast = useUi((s) => s.showToast);
  const [drafts, setDrafts] = useState<OnboardingCourseDraft[]>([]);

  const editing = useMemo(
    () => (params.edit ? groupCourses(courses).find((g) => g.key === params.edit) : undefined),
    [courses, params.edit],
  );
  const initial: CourseFormValue | undefined = editing
    ? {
        name: editing.name,
        shortName: editing.shortName,
        color: editing.color,
        slots: editing.slots.map((k) => ({
          key: `existing-${k.id}`,
          id: k.id,
          weekday: k.weekday,
          startTime: k.startTime,
          endTime: k.endTime,
        })),
      }
    : undefined;

  const save = () => {
    if (drafts.length) addCourses(drafts.map(draftToCourse));
    router.back();
  };

  const confirmDelete = () => {
    if (!editing) return;
    Alert.alert(t.courses.deleteTitle(editing.name), t.courses.deleteBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          deleteCourseGroup(editing.slots.map((k) => k.id));
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}
      >
        <ScreenHeader
          title={editing ? t.manual.editTitle : t.manual.title}
          backLabel={t.common.cancel}
          right={
            editing ? undefined : (
              <AppText variant="headline" onPress={save} accessibilityRole="button" suppressHighlighting>
                {t.manual.done}
              </AppText>
            )
          }
        />
        <View style={{ paddingHorizontal: 20 }}>
          <AppText variant="body" tone="ink2" style={{ marginTop: 8 }}>
            {t.manual.body}
          </AppText>
          <View style={{ marginTop: 20 }}>
            {editing && initial ? (
              <CourseForm
                key={editing.key}
                existing={courses}
                initial={initial}
                submitLabel={t.manual.save}
                onError={(m) => showToast(m)}
                onSubmit={(v) => {
                  saveCourseGroup({
                    existingIds: editing.slots.map((k) => k.id),
                    name: v.name,
                    shortName: v.shortName,
                    color: v.color,
                    slots: v.slots.map((x) => ({ id: x.id, weekday: x.weekday, startTime: x.startTime, endTime: x.endTime })),
                  });
                  router.back();
                }}
              />
            ) : (
              <CourseForm
                existing={[...courses, ...drafts]}
                submitLabel={t.manual.addRow}
                resetAfterSubmit
                onError={(m) => showToast(m)}
                onSubmit={(v) => setDrafts((x) => [...x, ...formToDrafts(v)])}
              />
            )}
          </View>
          {editing ? (
            <View style={{ marginTop: 24 }}>
              <Button label={t.courses.delete} kind="destructive" onPress={confirmDelete} />
            </View>
          ) : (
            <>
              <SectionLabel>{t.manual.added}</SectionLabel>
              <DraftList drafts={drafts} onRemove={(keys) => setDrafts((x) => x.filter((d) => !keys.includes(d.key)))} />
              <View style={{ marginTop: 24 }}>
                <Button label={t.manual.continue(groupCourses(drafts).length)} onPress={save} />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
