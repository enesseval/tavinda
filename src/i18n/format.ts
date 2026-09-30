import { format } from 'date-fns';
import { tr } from 'date-fns/locale/tr';

import { diffDays, parseLocalDate } from '../domain/dates';
import type { LocalDate } from '../domain/types';

/** '1 sa 25 dk', '40 dk'. Rounded to 5 minutes, at least 5. */
export function fmtMinutes(m: number): string {
  const v = Math.max(5, Math.round(m / 5) * 5);
  if (v < 60) return `${v} dk`;
  const h = Math.floor(v / 60);
  const r = v % 60;
  return r ? `${h} sa ${r} dk` : `${h} sa`;
}

/** '1:25' for the task detail stat. */
export function fmtHoursClock(m: number): string {
  const v = Math.max(0, Math.round(m / 5) * 5);
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
}

const d = (ld: LocalDate) => parseLocalDate(ld);
const cap = (s: string) => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);

/** 'Çarşamba, 30 Eylül' */
export const fmtLongDay = (ld: LocalDate) => cap(format(d(ld), 'EEEE, d MMMM', { locale: tr }));
/** 'Çarşamba' */
export const fmtWeekday = (ld: LocalDate) => cap(format(d(ld), 'EEEE', { locale: tr }));
/** 'Çar' */
export const fmtWeekdayShort = (ld: LocalDate) => cap(format(d(ld), 'EEE', { locale: tr }));
/** '2 Eki' */
export const fmtShortDate = (ld: LocalDate) => format(d(ld), 'd MMM', { locale: tr });
/** 'Cuma 2 Eki' */
export const fmtDayShortDate = (ld: LocalDate) => cap(format(d(ld), 'EEEE d MMM', { locale: tr }));
/** 'Eylül 2026' */
export const fmtMonthYear = (ld: LocalDate) => cap(format(d(ld), 'LLLL yyyy', { locale: tr }));
/** '30' */
export const fmtDayNum = (ld: LocalDate) => format(d(ld), 'd');
/** '28 Eylül – 2 Ekim' */
export function fmtRange(a: LocalDate, b: LocalDate): string {
  const sameMonth = a.slice(0, 7) === b.slice(0, 7);
  return sameMonth
    ? `${format(d(a), 'd', { locale: tr })} – ${format(d(b), 'd MMMM', { locale: tr })}`
    : `${format(d(a), 'd MMMM', { locale: tr })} – ${format(d(b), 'd MMMM', { locale: tr })}`;
}
/** ISO week number. */
export const fmtIsoWeek = (ld: LocalDate) => format(d(ld), 'I');

/** 'Bugün', 'Yarın', 'Cuma', '12 Eki' relative to today. */
export function fmtRelativeDay(ld: LocalDate, today: LocalDate): string {
  const n = diffDays(ld, today);
  if (n === 0) return 'Bugün';
  if (n === 1) return 'Yarın';
  if (n === -1) return 'Dün';
  if (n > 1 && n < 7) return fmtWeekday(ld);
  return fmtShortDate(ld);
}

/** Turkish-aware upper case for course codes. */
export const upperTr = (s: string) => s.toLocaleUpperCase('tr-TR');
