import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayHoursEditor } from '../../components/DayHoursEditor';
import { ScreenHeader } from '../../components/ScreenHeader';
import { t } from '../../i18n/tr';
import { useTheme } from '../../theme/theme';

/** When the user's day runs: 24 hours, the same hours every day, or per weekday. */
export default function HoursScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}>
        <ScreenHeader title={t.hours.title} />
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <DayHoursEditor />
        </View>
      </ScrollView>
    </View>
  );
}
