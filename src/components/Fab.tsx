import { router } from 'expo-router';
import { View } from 'react-native';

import { t } from '../i18n/tr';
import { useTheme } from '../theme/theme';
import { Touchable } from './Touchable';

/** The "+" in the middle of the tab bar: always in the same place, never over content. */
export function TabAddButton() {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start' }}>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={t.common.addTask}
        onPress={() => router.push('/add')}
        hitSlop={6}
        style={({ pressed }) => ({
          width: 48,
          height: 36,
          borderRadius: 12,
          backgroundColor: c.ink,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.94 : 1 }],
        })}
      >
        <View style={{ position: 'absolute', width: 16, height: 2.25, borderRadius: 2, backgroundColor: c.bg }} />
        <View style={{ position: 'absolute', width: 2.25, height: 16, borderRadius: 2, backgroundColor: c.bg }} />
      </Touchable>
    </View>
  );
}
