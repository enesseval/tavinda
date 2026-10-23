import type { ReactNode } from 'react';
import { Alert, View } from 'react-native';

import { useTheme } from '../theme/theme';
import { radii } from '../theme/tokens';
import { t } from '../i18n/tr';
import { AppText } from './AppText';
import { InfoIcon } from './icons';
import { Touchable } from './Touchable';

export interface SettingInfo {
  title: string;
  body: string;
}

/** Small ⓘ next to a setting's name; tapping it explains what the setting does. */
export function InfoButton({ info }: { info: SettingInfo }) {
  const { c } = useTheme();
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={t.settings.infoA11y(info.title)}
      hitSlop={10}
      onPress={() => Alert.alert(info.title, info.body, [{ text: t.common.ok }])}
      style={{ padding: 2 }}
    >
      <InfoIcon color={c.ink3} size={18} />
    </Touchable>
  );
}

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
  info,
}: {
  label: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  chevron?: boolean;
  color?: string;
  below?: ReactNode;
  /** Adds an ⓘ next to the label. */
  info?: SettingInfo;
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
        <View className="shrink flex-row items-center gap-1.5">
          <AppText variant="bodyLarge" color={color} className="shrink">
            {label}
          </AppText>
          {info ? <InfoButton info={info} /> : null}
        </View>
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
    <Touchable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? c.surface2 : 'transparent' })}
    >
      {content}
    </Touchable>
  ) : (
    content
  );
}
