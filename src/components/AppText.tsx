import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '../theme/theme';
import { MAX_FONT_SCALE, type, type TypeVariant } from '../theme/tokens';

type Tone = 'ink' | 'ink2' | 'ink3' | 'bg';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  tone?: Tone;
  color?: string;
  tabular?: boolean;
  weight?: TextStyle['fontWeight'];
  center?: boolean;
}

export function AppText({ variant = 'body', tone = 'ink', color, tabular, weight, center, style, ...rest }: AppTextProps) {
  const { c } = useTheme();
  const toneColor = { ink: c.ink, ink2: c.ink2, ink3: c.ink3, bg: c.bg }[tone];
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      style={[
        type[variant],
        { color: color ?? toneColor },
        tabular && { fontVariant: ['tabular-nums'] },
        weight != null && { fontWeight: weight },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}
