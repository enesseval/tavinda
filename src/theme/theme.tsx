import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Appearance, useColorScheme } from 'react-native';

import type { ThemePref } from '../domain/types';
import { colors, type ColorTokens } from './tokens';

export interface Theme {
  c: ColorTokens;
  scheme: 'light' | 'dark';
  reduceMotion: boolean;
}

const ThemeContext = createContext<Theme>({ c: colors.light, scheme: 'light', reduceMotion: false });

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduce(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

export function ThemeProvider({ pref, children }: { pref: ThemePref; children: ReactNode }) {
  useEffect(() => {
    // Keeps native pickers and alerts in the same appearance as the app.
    Appearance.setColorScheme(pref === 'system' ? null : pref);
  }, [pref]);
  const system = useColorScheme();
  const reduceMotion = useReduceMotion();
  const scheme: 'light' | 'dark' = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  const value = useMemo(() => ({ c: colors[scheme], scheme, reduceMotion }), [scheme, reduceMotion]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
