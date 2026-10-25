import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button, CloseButton, CoursePill } from '../../components/controls';
import { Sheet } from '../../components/Sheet';
import { isLocalDate, timeToMinutes } from '../../domain/dates';
import { fmtLongDay, fmtMinutes } from '../../i18n/format';
import { t, WEEKDAYS_LONG } from '../../i18n/tr';
import { useAppData } from '../../services/data';

/** A class tapped in the week grid: what, when (with the date) and its other slots. */
export default function ClassSheet() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const data = useAppData();
  const course = data.courses.find((k) => k.id === Number(id));
  if (!course) return null;
  const minutes = timeToMinutes(course.endTime) - timeToMinutes(course.startTime);
  // The same course on other days of the week.
  const slots = data.courses
    .filter((k) => k.name === course.name)
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));

  return (
    <Sheet scroll>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ gap: 6, flexShrink: 1 }}>
          <CoursePill code={course.shortName} color={course.color} label={t.calendar.infoClass(course.shortName)} />
          <AppText variant="sheetTitle">{course.name}</AppText>
          {date && isLocalDate(date) ? (
            <AppText variant="bodyLarge" tone="ink2">
              {fmtLongDay(date)}
            </AppText>
          ) : null}
          <AppText variant="bodyLarge" tone="ink2" tabular>
            {course.startTime}–{course.endTime} · {fmtMinutes(minutes)}
          </AppText>
        </View>
        <CloseButton onPress={() => router.back()} />
      </View>

      {slots.length > 1 ? (
        <View style={{ gap: 8 }}>
          <AppText variant="label" tone="ink2">
            {t.calendar.classWeek}
          </AppText>
          {slots.map((k) => (
            <View
              key={k.id}
              style={{ flexDirection: 'row', justifyContent: 'space-between', minHeight: 32, alignItems: 'center' }}
            >
              <AppText variant="body" weight={k.id === course.id ? '600' : '400'}>
                {WEEKDAYS_LONG[k.weekday - 1]}
              </AppText>
              <AppText variant="body" tone="ink2" tabular>
                {k.startTime}–{k.endTime}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      <Button
        label={t.calendar.classEdit}
        kind="secondary"
        onPress={() => {
          router.back();
          setTimeout(() => router.push('/courses'), 50);
        }}
      />
    </Sheet>
  );
}
