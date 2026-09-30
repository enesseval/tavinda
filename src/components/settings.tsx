import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme/theme';
import { radii } from '../theme/tokens';
import { AppText } from './AppText';

export function SettingsGroup({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View>
      {title ? (
        <AppText variant="footnote" tone="ink2" className="px-9 pb-[7px] pt-5">
          {title}
        </AppText>
      ) : (
        <View className="h-5" />
      )}
      <View style={{ marginHorizontal: 20, borderRadius: radii.input, backgroundColor: c.surface, overflow: 'hidden' }}>
        {children}
      </View>
      {footer ? (
        <AppText variant="footnote" tone="ink2" className="px-9 pt-[7px]">
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

export function SettingsRow({
  label,
  value,
  right,
  onPress,
  last,
  chevron,
  color,
  below,
}: {
  label: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  chevron?: boolean;
  color?: string;
  below?: ReactNode;
}) {
  const { c } = useTheme();
  const content = (
    <View className="pl-4">
      <View
        style={{
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingVertical: 6,
          paddingRight: 16,
          borderBottomWidth: last && !below ? 0 : 0.5,
          borderBottomColor: c.line,
        }}
      >
        <AppText variant="bodyLarge" color={color} className="shrink">
          {label}
        </AppText>
        <View className="shrink-0 flex-row items-center gap-2">
          {value != null ? (
            <AppText variant="bodyLarge" tone="ink2" tabular numberOfLines={1}>
              {value}
            </AppText>
          ) : null}
          {right}
          {chevron ? (
            <AppText variant="bodyLarge" tone="ink3" style={{ fontSize: 20 }}>
              ›
            </AppText>
          ) : null}
        </View>
      </View>
      {below}
    </View>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? c.surface2 : 'transparent' })}
    >
      {content}
    </Pressable>
  ) : (
    content
  );
}
