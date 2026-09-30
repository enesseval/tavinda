import { router } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/controls';
import { ScreenHeader } from '../../components/ScreenHeader';
import { t, WEEKDAYS_LONG } from '../../i18n/tr';
import { deleteCourse } from '../../services/actions';
import { useAppData } from '../../services/data';
import { useTheme } from '../../theme/theme';
import { radii } from '../../theme/tokens';
import { Touchable } from '../../components/Touchable';

export default function CoursesScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { courses } = useAppData();

  const confirmDelete = (id: number, name: string) =>
    Alert.alert(t.courses.deleteTitle(name), t.courses.deleteBody, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: () => deleteCourse(id) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}>
        <ScreenHeader title={t.courses.title} />
        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>
          {courses.length ? (
            <View style={{ borderRadius: radii.input, backgroundColor: c.surface, overflow: 'hidden' }}>
              {courses.map((k, i) => (
                <View
                  key={k.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 56,
                    marginLeft: 16,
                    paddingRight: 16,
                    paddingVertical: 6,
                    borderBottomWidth: i < courses.length - 1 ? 0.5 : 0,
                    borderBottomColor: c.line,
                  }}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: k.color }} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyLarge">
                      {k.name}{' '}
                      <AppText variant="footnote" tone="ink3">
                        · {k.shortName}
                      </AppText>
                    </AppText>
                    <AppText variant="footnote" tone="ink2" tabular>
                      {WEEKDAYS_LONG[k.weekday - 1]} · {k.startTime}–{k.endTime} ·{' '}
                      {k.source === 'calendar' ? t.courses.sourceCalendar : t.courses.sourceManual}
                    </AppText>
                  </View>
                  <Touchable
                    accessibilityRole="button"
                    accessibilityLabel={`${k.name} ${t.common.delete}`}
                    hitSlop={10}
                    onPress={() => confirmDelete(k.id, k.name)}
                  >
                    <AppText variant="body" color={c.heat[3]}>
                      {t.common.delete}
                    </AppText>
                  </Touchable>
                </View>
              ))}
            </View>
          ) : (
            <AppText variant="body" tone="ink3">
              {t.courses.empty}
            </AppText>
          )}
          <Button label={t.courses.fromCalendar} onPress={() => router.push('/courses/import')} />
          <Button label={t.courses.manual} kind="secondary" onPress={() => router.push('/courses/manual')} />
        </View>
      </ScrollView>
    </View>
  );
}
