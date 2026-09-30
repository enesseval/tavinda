import { addDays as addDaysFns, differenceInCalendarDays, format, getISODay, subDays } from 'date-fns';

import type { LocalDate, LocalTime } from './types';

const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Formats a Date as a LocalDate using the device timezone. */
export function toLocalDate(d: Date): LocalDate {
  return format(d, 'yyyy-MM-dd');
}

/** Local midnight of the given LocalDate. Uses the numeric constructor (never string parsing). */
export function parseLocalDate(ld: LocalDate): Date {
  const m = LOCAL_DATE_RE.exec(ld);
  if (!m) throw new Error(`Invalid LocalDate: ${ld}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function isLocalDate(v: unknown): v is LocalDate {
  return typeof v === 'string' && LOCAL_DATE_RE.test(v);
}

export function addDays(ld: LocalDate, n: number): LocalDate {
  return toLocalDate(addDaysFns(parseLocalDate(ld), n));
}

/** a − b in calendar days. */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return differenceInCalendarDays(parseLocalDate(a), parseLocalDate(b));
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(ld: LocalDate): number {
  return getISODay(parseLocalDate(ld));
}

/** Monday of the ISO week containing ld. */
export function startOfIsoWeek(ld: LocalDate): LocalDate {
  return addDays(ld, 1 - isoWeekday(ld));
}

export function minDate(a: LocalDate, b: LocalDate): LocalDate {
  return a <= b ? a : b;
}

export function maxDate(a: LocalDate, b: LocalDate): LocalDate {
  return a >= b ? a : b;
}

export function parseTime(t: LocalTime): { h: number; m: number } {
  const [h, m] = t.split(':').map(Number);
  return { h: h || 0, m: m || 0 };
}

export function timeToMinutes(t: LocalTime): number {
  const { h, m } = parseTime(t);
  return h * 60 + m;
}

export function minutesToTime(total: number): LocalTime {
  const t = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** A Date at the given local wall-clock time on a LocalDate. */
export function dateAtTime(ld: LocalDate, t: LocalTime): Date {
  const d = parseLocalDate(ld);
  const { h, m } = parseTime(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
}

/**
 * The day an action at `now` belongs to. Anything before the cut-off
 * (default 04:00) counts for the previous day.
 */
export function logicalDate(now: Date, cutoff: LocalTime = '04:00'): LocalDate {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes < timeToMinutes(cutoff) ? toLocalDate(subDays(now, 1)) : toLocalDate(now);
}

/**
 * Real wall-clock moment for a time-of-day on a logical day. Times before the
 * cut-off belong to the next calendar day.
 */
export function logicalDateTime(ld: LocalDate, t: LocalTime, cutoff: LocalTime): Date {
  return timeToMinutes(t) < timeToMinutes(cutoff) ? dateAtTime(addDays(ld, 1), t) : dateAtTime(ld, t);
}

/** Local timestamp without timezone suffix, e.g. '2026-09-30T14:05:00'. */
export function toLocalTimestamp(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm:ss");
}
