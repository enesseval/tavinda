import { router } from 'expo-router';
import { View } from 'react-native';

import { t } from '../i18n/tr';
import { useTheme } from '../theme/theme';
import { sizes } from '../theme/tokens';
import { Touchable } from './Touchable';

export function Fab({ bottom }: { bottom: number }) {
  const { c } = useTheme();
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={t.common.addTask}
      onPress={() => router.push('/add')}
      style={({ pressed }) => ({
        position: 'absolute',
        right: 20,
        bottom,
        width: sizes.fab,
        height: sizes.fab,
        borderRadius: sizes.fab / 2,
        backgroundColor: c.ink,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.94 : 1 }],
        shadowColor: '#000',
        shadowOpacity: 0.16,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 6 },
        zIndex: 25,
      })}
    >
      <View style={{ position: 'absolute', width: 20, height: 2.5, borderRadius: 2, backgroundColor: c.bg }} />
      <View style={{ position: 'absolute', width: 2.5, height: 20, borderRadius: 2, backgroundColor: c.bg }} />
    </Touchable>
  );
}
