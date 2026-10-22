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

/** Days from the class to the last day when the user didn't pick one: the day before the next class. */
export const WEEKLY_DEFAULT_OFFSET = 6;

export function dueOffsetOf(task: { dueOffset: number | null }): number {
  return Math.max(0, Math.min(6, task.dueOffset ?? WEEKLY_DEFAULT_OFFSET));
}

/** A weekly task's window opening on `classDate`, ending `offset` days later. */
export function weeklyWindowFrom(classDate: LocalDate, offset: number): { start: LocalDate; end: LocalDate } {
  return { start: classDate, end: addDays(classDate, Math.max(0, Math.min(6, offset))) };
}

/**
 * The first window still open on `from`: this week's if its last day hasn't passed,
 * otherwise the one opening at the next class. Used for previews and the first week.
 */
export function firstOpenWindow(from: LocalDate, weekday: number, offset: number): { start: LocalDate; end: LocalDate } {
  const win = weeklyWindowFrom(lastClassDate(from, weekday), offset);
  return win.end >= from ? win : weeklyWindowFrom(nextClassDate(from, weekday), offset);
}
