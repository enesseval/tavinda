import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/controls';
import { CandidateList } from '../../components/courses';
import { CalendarPrimingArt } from '../../components/icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { t } from '../../i18n/tr';
import { addCourses } from '../../services/actions';
import { findClassCandidates, getCalendarPermission, openAppSettings, requestCalendarPermission } from '../../services/calendar';
import { getToday } from '../../services/clock';
import { getData } from '../../services/data';
import type { OnboardingCourseDraft } from '../../store/ui';
import { useTheme } from '../../theme/theme';
import { draftsFromCandidates, draftToCourse } from '../../ui/courseDrafts';

/** Re-map classes from the calendar after onboarding. Existing slots are skipped. */
export default function ImportCourses() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<'loading' | 'priming' | 'denied' | 'ready'>('loading');
  const [drafts, setDrafts] = useState<OnboardingCourseDraft[]>([]);

  const load = async () => {
    setState('loading');
    const { courses, settings } = getData();
    const cands = await findClassCandidates(settings.calendarIds, getToday());
    const existingKeys = new Set(courses.map((k) => `${k.name.toLocaleLowerCase('tr-TR')}|${k.weekday}|${k.startTime}`));
    setDrafts(
      draftsFromCandidates(
        cands.filter((x) => !existingKeys.has(x.key)),
        courses,
      ),
    );
    setState('ready');
  };

  useEffect(() => {
    getCalendarPermission().then((perm) => {
      if (perm === 'granted') load();
      else setState(perm === 'undetermined' ? 'priming' : 'denied');
    });
    // Runs once: the list is a one-off snapshot of the calendar.
  }, []);

  const connect = async () => {
    if (await requestCalendarPermission()) load();
    else setState('denied');
  };

  const selected = drafts.filter((d) => d.enabled);
  const save = () => {
    if (selected.length) addCourses(selected.map(draftToCourse));
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}>
        <ScreenHeader title={t.onboarding.mapTitle} />
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 20 }}>
          {state === 'loading' ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <ActivityIndicator color={c.ink2} />
              <AppText variant="body" tone="ink2">
                {t.onboarding.mapLoading}
              </AppText>
            </View>
          ) : state === 'priming' ? (
            <>
              <CalendarPrimingArt color={c.ink2} />
              <AppText variant="title">{t.onboarding.calTitle}</AppText>
              <AppText variant="bodyLarge" tone="ink2">
                {t.onboarding.calBody}
              </AppText>
              <Button label={t.onboarding.calConnect} onPress={connect} />
              <Button label={t.onboarding.mapManual} kind="secondary" onPress={() => router.replace('/courses/manual')} />
            </>
          ) : state === 'denied' ? (
            <>
              <AppText variant="bodyLarge" tone="ink2">
                {t.calendarsScreen.denied}
              </AppText>
              <Button label={t.calendarsScreen.openSettings} onPress={openAppSettings} />
              <Button label={t.onboarding.mapManual} kind="secondary" onPress={() => router.replace('/courses/manual')} />
            </>
          ) : drafts.length ? (
            <>
              <AppText variant="bodyLarge" tone="ink2">
                {t.onboarding.mapBody(drafts.length)}
              </AppText>
              <CandidateList
                drafts={drafts}
                onToggle={(key) => setDrafts((x) => x.map((d) => (d.key === key ? { ...d, enabled: !d.enabled } : d)))}
              />
              <Button label={t.manual.continue(selected.length)} onPress={save} />
            </>
          ) : (
            <>
              <AppText variant="bodyLarge" tone="ink2">
                {t.onboarding.mapEmpty}
              </AppText>
              <Button label={t.onboarding.mapManual} onPress={() => router.replace('/courses/manual')} />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
