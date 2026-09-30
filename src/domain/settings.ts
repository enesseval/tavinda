import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  cutoff: '04:00',
  lockMode: 'strict',
  warnDays: 5,
  dailyBudgetMinutes: 45,
  morningTime: '08:30',
  theme: 'system',
  calendarIds: [],
  showWeekend: false,
  onboarded: false,
  timeOffsetMs: 0,
};

export type SettingKey = keyof Settings;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function toInt(v: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(v);
  if (v === undefined || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Parses raw key/value rows into typed settings; unknown or invalid values fall back to defaults. */
export function parseSettings(rows: { key: string; value: string }[]): Settings {
  const raw: Record<string, string> = {};
  for (const r of rows) raw[r.key] = r.value;
  const d = DEFAULT_SETTINGS;
  let calendarIds: string[] = d.calendarIds;
  try {
    const parsed: unknown = raw.calendarIds ? JSON.parse(raw.calendarIds) : d.calendarIds;
    if (Array.isArray(parsed)) calendarIds = parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    calendarIds = d.calendarIds;
  }
  return {
    cutoff: raw.cutoff && TIME_RE.test(raw.cutoff) ? raw.cutoff : d.cutoff,
    lockMode: raw.lockMode === 'flexible' ? 'flexible' : 'strict',
    warnDays: toInt(raw.warnDays, d.warnDays, 1, 14),
    dailyBudgetMinutes: toInt(raw.dailyBudgetMinutes, d.dailyBudgetMinutes, 15, 240),
    morningTime: raw.morningTime && TIME_RE.test(raw.morningTime) ? raw.morningTime : d.morningTime,
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : 'system',
    calendarIds,
    showWeekend: raw.showWeekend === '1',
    onboarded: raw.onboarded === '1',
    timeOffsetMs: toInt(raw.timeOffsetMs, 0, -1e13, 1e13),
  };
}

export function serializeSetting<K extends SettingKey>(_key: K, value: Settings[K]): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (Array.isArray(value)) return JSON.stringify(value);
  return String(value);
}
