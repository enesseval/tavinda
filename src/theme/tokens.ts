import type { TextStyle } from 'react-native';

import type { HeatLevel } from '../domain/types';

export { COURSE_PALETTE } from './palette';

export interface ColorTokens {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  ink: string;
  ink2: string;
  ink3: string;
  heat: [string, string, string, string, string];
  scrim: string;
  /** Solid fallback for the translucent tab bar. */
  bar: string;
}

export const colors: { light: ColorTokens; dark: ColorTokens } = {
  light: {
    bg: '#F7F5F0',
    surface: '#FFFFFF',
    surface2: '#EFECE5',
    line: '#E3DFD6',
    ink: '#1C1B19',
    ink2: '#6B675F',
    ink3: '#A8A399',
    heat: ['#4C9A8A', '#C9A227', '#E8833A', '#D9482B', '#A3122A'],
    scrim: 'rgba(20,18,16,0.28)',
    bar: 'rgba(247,245,240,0.94)',
  },
  dark: {
    bg: '#141312',
    surface: '#1E1C1A',
    surface2: '#282522',
    line: '#33302B',
    ink: '#F2EFE9',
    ink2: '#A39E94',
    ink3: '#6E6961',
    heat: ['#5FB3A1', '#D9B545', '#F0955A', '#EE6448', '#E23A4E'],
    scrim: 'rgba(0,0,0,0.55)',
    bar: 'rgba(20,19,18,0.94)',
  },
};

export const heatColor = (c: ColorTokens, h: HeatLevel): string => c.heat[h];

/** Mixes a hex color over another hex color. amount = share of `top`. */
export function mix(top: string, bottom: string, amount: number): string {
  const p = (hex: string) => {
    const h = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  };
  const a = p(top);
  const b = p(bottom);
  const out = a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount)));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Card border by heat: Sıcak/Kızgın get a 30% tinted edge, Son gün the full color. */
export function heatBorder(c: ColorTokens, h: HeatLevel, off = false): string {
  if (off) return c.line;
  if (h === 4) return c.heat[4];
  if (h === 2 || h === 3) return mix(c.heat[h], c.line, 0.3);
  return c.line;
}

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
};

type TypeToken = Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight' | 'letterSpacing' | 'fontFamily'>;

/** Type scale from the design. Display faces use Bricolage Grotesque, text uses the system font. */
export const type = {
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  hero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, letterSpacing: -1 },
  onboarding: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  title: { fontFamily: fonts.displaySemi, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  bodyLarge: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  body: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '500' },
  tab: { fontSize: 10, lineHeight: 12, fontWeight: '500' },
} satisfies Record<string, TypeToken>;

export type TypeVariant = keyof typeof type;

export const radii = {
  card: 16,
  hero: 20,
  sheet: 24,
  button: 14,
  input: 12,
  seg: 9,
  chip: 999,
};

/** 4 pt grid. Screen edge 20, gap between cards 12. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  edge: 20,
  xl: 24,
  xxl: 32,
};

export const sizes = {
  button: 52,
  buttonSmall: 44,
  touch: 44,
  chip: 36,
  fab: 56,
  tabBar: 83,
};

export const motion = {
  heatMs: 600,
  leaveMs: 250,
  pulseMs: 2400,
  pulseMin: 0.08,
  pulseMax: 0.14,
  sheetMs: 340,
};

/** Upper bound for Dynamic Type so dense rows stay usable at the largest standard size. */
export const MAX_FONT_SCALE = 1.35;
