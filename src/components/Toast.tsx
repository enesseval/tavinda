import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { undo } from '../services/actions';
import { useUi } from '../store/ui';
import { useTheme } from '../theme/theme';
import { radii } from '../theme/tokens';
import { t } from '../i18n/tr';
import { AppText } from './AppText';

/** Global toast above the tab bar. Undoable toasts stay a little longer. */
export function ToastHost({ bottom }: { bottom: number }) {
  const { c, reduceMotion } = useTheme();
  const toast = useUi((s) => s.toast);
  const hide = useUi((s) => s.hideToast);

  useEffect(() => {
    if (!toast) return;
    const tm = setTimeout(hide, toast.undo ? 3800 : 2600);
    return () => clearTimeout(tm);
  }, [toast, hide]);

  if (!toast) return null;
  return (
    <Animated.View
      key={toast.id}
      entering={reduceMotion ? undefined : FadeInDown.duration(250)}
      exiting={reduceMotion ? undefined : FadeOut.duration(150)}
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 16, right: 16, bottom, zIndex: 50 }}
    >
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingVertical: 13,
          paddingHorizontal: 16,
          borderRadius: radii.button,
          backgroundColor: c.ink,
          shadowColor: '#000',
          shadowOpacity: 0.14,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        <AppText variant="body" weight="500" color={c.bg} style={{ flex: 1 }}>
          {toast.text}
        </AppText>
        {toast.undo ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              if (toast.undo) undo(toast.undo);
              hide();
            }}
          >
            <AppText variant="bodyStrong" color={c.bg} style={{ opacity: 0.75 }}>
              {t.common.undo}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
