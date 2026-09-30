import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { logicalDate } from '../domain/dates';
import type { LocalDate } from '../domain/types';
import { getData, useAppData } from './data';

/** App clock: real time plus the debug time-travel offset. */
export function getNow(): Date {
  return new Date(Date.now() + getData().settings.timeOffsetMs);
}

export function getToday(): LocalDate {
  const { cutoff } = getData().settings;
  return logicalDate(getNow(), cutoff);
}

/** Re-renders every 30 s and when the app returns to the foreground. */
export function useNow(): { now: Date; today: LocalDate } {
  const { settings } = useAppData();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 30_000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setTick((t) => t + 1);
    });
    return () => {
      clearInterval(iv);
      sub.remove();
    };
  }, []);
  void tick;
  const now = new Date(Date.now() + settings.timeOffsetMs);
  return { now, today: logicalDate(now, settings.cutoff) };
}
