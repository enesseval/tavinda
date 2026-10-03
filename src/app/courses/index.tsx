import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/controls';
import { ScreenHeader } from '../../components/ScreenHeader';
import { t } from '../../i18n/tr';
import { useAppData } from '../../services/data';
import { useTheme } from '../../theme/theme';
import { radii } from '../../theme/tokens';
import { Touchable } from '../../components/Touchable';
import { slotsLine } from '../../components/courses';
import { ChevronRight } from '../../components/icons';
import { groupCourses } from '../../ui/courseDrafts';

export default function CoursesScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { courses } = useAppData();
  const groups = groupCourses(courses);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}>
        <ScreenHeader title={t.courses.title} />
        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>
          {groups.length ? (
            <View style={{ borderRadius: radii.input, backgroundColor: c.surface, overflow: 'hidden' }}>
              {groups.map((g, i) => (
                <Touchable
                  key={g.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${g.name}, ${slotsLine(g.slots)}`}
                  accessibilityHint={t.courses.editHint}
                  onPress={() => router.push({ pathname: '/courses/manual', params: { edit: g.key } })}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 56,
                    paddingLeft: 16,
                    paddingRight: 16,
                    paddingVertical: 8,
                    backgroundColor: pressed ? c.surface2 : 'transparent',
                    borderBottomWidth: i < groups.length - 1 ? 0.5 : 0,
                    borderBottomColor: c.line,
                  })}
                >
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: g.color }} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyLarge">
                      {g.name}{' '}
                      <AppText variant="footnote" tone="ink3">
                        · {g.shortName}
                      </AppText>
                    </AppText>
                    <AppText variant="footnote" tone="ink2" tabular>
                      {slotsLine(g.slots)}
                    </AppText>
                  </View>
                  <ChevronRight color={c.ink3} />
                </Touchable>
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
