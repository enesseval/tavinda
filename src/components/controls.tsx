import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/theme';
import { heatBorder, radii, sizes } from '../theme/tokens';
import type { HeatLevel } from '../domain/types';
import { HEAT_NAMES, t } from '../i18n/tr';
import { AppText } from './AppText';
import { HeatGlyph, LockIcon } from './icons';

type ButtonKind = 'primary' | 'secondary' | 'lastChance' | 'locked' | 'ghost' | 'destructive';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  kind?: ButtonKind;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
  accessibilityHint?: string;
}

export function Button({ label, onPress, kind = 'primary', small, disabled, style, icon, accessibilityHint }: ButtonProps) {
  const { c } = useTheme();
  const base: ViewStyle = {
    height: small ? sizes.buttonSmall : sizes.button,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
  };
  const variants: Record<ButtonKind, { box: ViewStyle; fg: string; variant: 'headline' | 'bodyStrong' | 'bodyLarge' }> = {
    primary: { box: { backgroundColor: c.ink }, fg: c.bg, variant: 'headline' },
    secondary: { box: { borderWidth: 1, borderColor: c.line }, fg: c.ink, variant: 'headline' },
    lastChance: { box: { borderWidth: 1, borderColor: c.heat[2] }, fg: c.ink, variant: 'bodyStrong' },
    locked: { box: { backgroundColor: c.surface2 }, fg: c.ink3, variant: 'bodyStrong' },
    ghost: { box: {}, fg: c.ink, variant: 'bodyLarge' },
    destructive: { box: {}, fg: c.heat[3], variant: 'bodyLarge' },
  };
  const v = variants[kind];
  const isDisabled = disabled || kind === 'locked';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        base,
        v.box,
        pressed && !isDisabled && (kind === 'primary' ? { opacity: 0.8 } : { backgroundColor: c.surface2 }),
        disabled && kind !== 'locked' && { opacity: 0.4 },
        style,
      ]}
    >
      {kind === 'locked' ? <LockIcon color={c.ink3} size={14} /> : icon}
      <AppText variant={v.variant} color={v.fg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  dot,
  small,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  dot?: string;
  small?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={{
        minHeight: sizes.chip,
        paddingHorizontal: small ? 10 : dot ? 12 : 14,
        borderRadius: radii.chip,
        borderWidth: 1,
        borderColor: selected ? c.ink : c.line,
        backgroundColor: selected ? c.ink : c.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      {dot ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dot }} /> : null}
      <AppText variant={small ? 'footnote' : 'body'} weight="500" color={selected ? c.bg : c.ink}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Stepper({
  onDec,
  onInc,
  labelDec = t.a11y.decrease,
  labelInc = t.a11y.increase,
}: {
  onDec: () => void;
  onInc: () => void;
  labelDec?: string;
  labelInc?: string;
}) {
  const { c } = useTheme();
  const btn = (label: string, glyph: string, fn: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        fn();
      }}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <AppText variant="bodyLarge" style={{ fontSize: 20, lineHeight: 24 }} weight="500">
        {glyph}
      </AppText>
    </Pressable>
  );
  return (
    <View
      style={{ flexDirection: 'row', borderRadius: 8, backgroundColor: c.surface2, overflow: 'hidden', alignItems: 'center' }}
    >
      {btn(labelDec, '−', onDec)}
      <View style={{ width: 1, height: 16, backgroundColor: c.line }} />
      {btn(labelInc, '+', onInc)}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  compact,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  compact?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', padding: 2, borderRadius: compact ? 8 : radii.seg, backgroundColor: c.surface2 }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) Haptics.selectionAsync().catch(() => undefined);
              onChange(o.value);
            }}
            style={{
              flex: compact ? undefined : 1,
              minHeight: compact ? 28 : 30,
              paddingHorizontal: 12,
              borderRadius: compact ? 6 : 7,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? c.surface : 'transparent',
              shadowColor: '#000',
              shadowOpacity: on ? 0.1 : 0,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
            }}
          >
            <AppText variant="footnote" weight={on ? '600' : '500'}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onChange(!value);
      }}
      hitSlop={8}
      style={{ width: 51, height: 31, borderRadius: 16, backgroundColor: value ? c.ink : c.line, justifyContent: 'center' }}
    >
      <View
        style={{
          position: 'absolute',
          left: value ? 22 : 2,
          width: 27,
          height: 27,
          borderRadius: 14,
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
        }}
      />
    </Pressable>
  );
}

/** Course code pill: colored dot + short name on surface-2. */
export function CoursePill({ code, color, label }: { code: string; color: string; label?: string }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radii.chip,
        backgroundColor: c.surface2,
        flexShrink: 0,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <AppText variant="caption" tone="ink2" numberOfLines={1}>
        {label ?? code}
      </AppText>
    </View>
  );
}

/** Heat label with dot and thermometer: heat is never color-only. */
export function HeatPill({ heat, bordered = true }: { heat: HeatLevel; bordered?: boolean }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityLabel={t.a11y.heat(HEAT_NAMES[heat])}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: radii.chip,
        borderWidth: bordered ? 1 : 0,
        borderColor: heatBorder(c, heat),
        backgroundColor: bordered ? c.surface : c.surface2,
      }}
    >
      {heat === 4 ? <LockIcon color={c.heat[4]} size={11} /> : <HeatGlyph color={c.heat[heat]} level={heat} size={12} />}
      <AppText variant="caption" tone="ink">
        {HEAT_NAMES[heat]}
      </AppText>
    </View>
  );
}

export function Card({ children, style, border }: { children: ReactNode; style?: StyleProp<ViewStyle>; border?: string }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: border ?? c.line,
          borderRadius: radii.card,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionLabel({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View className="flex-row items-baseline justify-between px-1 pb-2 pt-[22px]">
      <AppText variant="label" tone="ink2">
        {children}
      </AppText>
      {right}
    </View>
  );
}

export function Grabber() {
  const { c } = useTheme();
  return <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: c.line, alignSelf: 'center' }} />;
}

export function CloseButton({ onPress }: { onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.a11y.close}
      onPress={onPress}
      hitSlop={10}
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: c.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText variant="bodyStrong" tone="ink2" style={{ lineHeight: 18 }}>
        ✕
      </AppText>
    </Pressable>
  );
}
