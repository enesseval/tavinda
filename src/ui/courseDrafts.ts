import type { Course } from '../domain/types';
import { upperTr } from '../i18n/format';
import type { ClassCandidate } from '../services/calendar';
import type { OnboardingCourseDraft } from '../store/ui';
import { COURSE_PALETTE } from '../theme/palette';

const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase('tr-TR') === b.trim().toLocaleLowerCase('tr-TR');

/**
 * Short course code, unique among other courses:
 * 'Fizik II' → 'FİZ', 'Elmak Lab' next to 'Elmak' → 'ELML', then 'ELMA', 'ELM2'…
 * The same course name keeps its existing code.
 */
export function shortNameFor(name: string, existing: { name: string; shortName: string }[] = []): string {
  const same = existing.find((e) => sameName(e.name, name));
  if (same) return same.shortName;
  const taken = new Set(existing.map((e) => upperTr(e.shortName)));
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? name.trim();
  const letters = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, '');
  const base = upperTr(letters(first).slice(0, 3)) || '?';
  const initials = upperTr(
    words
      .slice(1)
      .map((w) => letters(w).charAt(0))
      .join(''),
  );
  const candidates = [
    base,
    `${base}${initials}`.slice(0, 5),
    upperTr(letters(first).slice(0, 4)),
    upperTr(letters(first).slice(0, 5)),
  ];
  for (const cand of candidates) if (cand && !taken.has(cand)) return cand;
  for (let n = 2; ; n++) if (!taken.has(`${base}${n}`)) return `${base}${n}`;
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
  existing: Pick<Course, 'name' | 'color' | 'shortName'>[] = [],
): OnboardingCourseDraft[] {
  const acc: { name: string; color: string; shortName: string }[] = [...existing];
  return cands.map((c) => {
    const color = colorFor(c.title, acc);
    const shortName = shortNameFor(c.title, acc);
    acc.push({ name: c.title, color, shortName });
    return {
      key: c.key,
      name: c.title,
      shortName,
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

export interface CourseGroup<T extends { name: string; shortName: string; color: string }> {
  key: string;
  name: string;
  shortName: string;
  color: string;
  slots: T[];
}

/** One entry per course name; a course that meets on several days has several slots. */
export function groupCourses<T extends { name: string; shortName: string; color: string; weekday: number; startTime: string }>(
  rows: T[],
): CourseGroup<T>[] {
  const groups = new Map<string, CourseGroup<T>>();
  for (const r of rows) {
    const key = r.name.trim().toLocaleLowerCase('tr-TR');
    const g = groups.get(key) ?? { key, name: r.name, shortName: r.shortName, color: r.color, slots: [] };
    g.slots.push(r);
    groups.set(key, g);
  }
  const out = [...groups.values()];
  for (const g of out) g.slots.sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
  return out.sort((a, b) => a.slots[0].weekday - b.slots[0].weekday || a.slots[0].startTime.localeCompare(b.slots[0].startTime));
}

/**
 * Fixes codes shared by different course names (older data used the first 3 letters only).
 * Returns the rows whose code changes; the first course keeps its code.
 */
export function dedupeShortNames<T extends { id: number; name: string; shortName: string }>(
  rows: T[],
): { id: number; shortName: string }[] {
  const changes: { id: number; shortName: string }[] = [];
  const seen: { name: string; shortName: string }[] = [];
  for (const r of [...rows].sort((a, b) => a.id - b.id)) {
    const owner = seen.find((s) => upperTr(s.shortName) === upperTr(r.shortName));
    if (owner && !sameName(owner.name, r.name)) {
      const already = seen.find((s) => sameName(s.name, r.name));
      const next = already ? already.shortName : shortNameFor(r.name, seen);
      changes.push({ id: r.id, shortName: next });
      if (!already) seen.push({ name: r.name, shortName: next });
    } else if (!seen.some((s) => sameName(s.name, r.name))) {
      seen.push({ name: r.name, shortName: r.shortName });
    }
  }
  return changes;
}
