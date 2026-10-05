import type { DayHours, Settings } from './types';

export const DEFAULT_DAY_HOURS: DayHours = {
  mode: 'same',
  start: '08:00',
  end: '23:00',
  perDay: Array.from({ length: 7 }, () => ({ start: '08:00', end: '23:00' })),
};

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
  dayHours: DEFAULT_DAY_HOURS,
  notifyMorning: true,
  notifyLastDay: true,
  notifyStartNow: true,
  notifyClassEnd: true,
  notifyBlockEnd: true,
  freeTimePrompts: true,
  seenIntro: false,
  timeOffsetMs: 0,
};

export type SettingKey = keyof Settings;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function toInt(v: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(v);
  if (v === undefined || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parseDayHours(raw: string | undefined): DayHours {
  const d = DEFAULT_DAY_HOURS;
  if (!raw) return d;
  try {
    const v = JSON.parse(raw) as Partial<DayHours>;
    const time = (x: unknown, f: string) => (typeof x === 'string' && TIME_RE.test(x) ? x : f);
    const perDay = Array.from({ length: 7 }, (_, i) => {
      const p = Array.isArray(v.perDay) ? (v.perDay[i] as Partial<{ start: string; end: string }> | undefined) : undefined;
      return { start: time(p?.start, d.perDay[i].start), end: time(p?.end, d.perDay[i].end) };
    });
    return {
      mode: v.mode === 'all' || v.mode === 'perDay' ? v.mode : 'same',
      start: time(v.start, d.start),
      end: time(v.end, d.end),
      perDay,
    };
  } catch {
    return d;
  }
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
    dayHours: parseDayHours(raw.dayHours),
    notifyMorning: raw.notifyMorning !== '0',
    notifyLastDay: raw.notifyLastDay !== '0',
    notifyStartNow: raw.notifyStartNow !== '0',
    notifyClassEnd: raw.notifyClassEnd !== '0',
    notifyBlockEnd: raw.notifyBlockEnd !== '0',
    freeTimePrompts: raw.freeTimePrompts !== '0',
    seenIntro: raw.seenIntro === '1',
    timeOffsetMs: toInt(raw.timeOffsetMs, 0, -1e13, 1e13),
  };
}

export function serializeSetting<K extends SettingKey>(_key: K, value: Settings[K]): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) return JSON.stringify(value);
  return String(value);
}
