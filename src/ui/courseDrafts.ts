import type { Course } from '../domain/types';
import { upperTr } from '../i18n/format';
import type { ClassCandidate } from '../services/calendar';
import type { OnboardingCourseDraft } from '../store/ui';
import { COURSE_PALETTE } from '../theme/palette';

/** 'Fizik II' → 'FİZ', 'İstatistik' → 'İST'. */
export function shortNameFor(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return upperTr(first.slice(0, 3));
}

/** Same course name keeps the same color; new names take the next free palette color. */
export function colorFor(name: string, existing: { name: string; color: string }[]): string {
  const key = name.trim().toLocaleLowerCase('tr-TR');
  const same = existing.find((e) => e.name.trim().toLocaleLowerCase('tr-TR') === key);
  if (same) return same.color;
  const used = new Set(existing.map((e) => e.color));
  return COURSE_PALETTE.find((c) => !used.has(c)) ?? COURSE_PALETTE[existing.length % COURSE_PALETTE.length];
}

export function draftsFromCandidates(
  cands: ClassCandidate[],
  existing: Pick<Course, 'name' | 'color'>[] = [],
): OnboardingCourseDraft[] {
  const acc: { name: string; color: string }[] = [...existing];
  return cands.map((c) => {
    const color = colorFor(c.title, acc);
    acc.push({ name: c.title, color });
    return {
      key: c.key,
      name: c.title,
      shortName: shortNameFor(c.title),
      color,
      source: 'calendar',
      calendarEventId: c.eventId,
      weekday: c.weekday,
      startTime: c.startTime,
      endTime: c.endTime,
      enabled: c.recurring || c.occurrences >= 2,
    };
  });
}

export function draftToCourse(d: OnboardingCourseDraft): Omit<Course, 'id'> {
  return {
    name: d.name.trim(),
    shortName: d.shortName,
    color: d.color,
    source: d.source,
    calendarEventId: d.calendarEventId,
    weekday: d.weekday,
    startTime: d.startTime,
    endTime: d.endTime,
  };
}
