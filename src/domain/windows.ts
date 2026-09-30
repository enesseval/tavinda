import { addDays, isoWeekday } from './dates';
import type { LocalDate } from './types';

/** Most recent date on or before `today` that falls on `weekday` (ISO 1–7). */
export function lastClassDate(today: LocalDate, weekday: number): LocalDate {
  const back = (isoWeekday(today) - weekday + 7) % 7;
  return addDays(today, -back);
}

/** Next date strictly after `from` that falls on `weekday`. */
export function nextClassDate(from: LocalDate, weekday: number): LocalDate {
  const fwd = (weekday - isoWeekday(from) + 7) % 7 || 7;
  return addDays(from, fwd);
}

/**
 * A weekly task opens on the class date and must be done before the next
 * occurrence of that class: window = class date … day before next class.
 */
export function weeklyWindow(classDate: LocalDate): { start: LocalDate; end: LocalDate } {
  return { start: classDate, end: addDays(classDate, 6) };
}

/** The window that contains `today` for a course on `weekday`. */
export function currentWeeklyWindow(today: LocalDate, weekday: number): { start: LocalDate; end: LocalDate } {
  return weeklyWindow(lastClassDate(today, weekday));
}
