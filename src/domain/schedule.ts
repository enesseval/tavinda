import { addDays, isoWeekday, timeToMinutes, toLocalDate, toLocalTimestamp } from './dates';
import { coursesOn } from './today';
import type { AppData, Course, DayHours, LocalDate, TimeBlock } from './types';

/** Gaps shorter than this are not worth asking about. */
export const MIN_GAP_MINUTES = 15;

const DAY = 1440;

/** 'YYYY-MM-DDTHH:mm:ss' → Date (local), without string Date parsing. */
export function parseTimestamp(ts: string): Date {
  const [d, t] = ts.split('T');
  const [y, mo, da] = d.split('-').map(Number);
  const [h, mi, s] = (t ?? '00:00:00').split(':').map(Number);
  return new Date(y, mo - 1, da, h || 0, mi || 0, s || 0);
}

/** Minutes since midnight of `day` (may be negative or > 1440 for other days). */
export function minutesInto(day: LocalDate, at: Date): number {
  const [y, m, d] = day.split('-').map(Number);
  const midnight = new Date(y, m - 1, d).getTime();
  return Math.round((at.getTime() - midnight) / 60_000);
}

/** The user's active hours on `day`, in minutes from midnight. An end before the start runs to midnight. */
export function activeWindow(day: LocalDate, hours: DayHours): { start: number; end: number } {
  if (hours.mode === 'all') return { start: 0, end: DAY };
  const h = hours.mode === 'perDay' ? hours.perDay[isoWeekday(day) - 1] : hours;
  const start = timeToMinutes(h.start);
  const end = timeToMinutes(h.end);
  return { start, end: end <= start ? DAY : end };
}

export type TimelineSegment =
  | { kind: 'class'; start: number; end: number; course: Course }
  | { kind: 'block'; start: number; end: number; block: TimeBlock }
  | { kind: 'gap'; start: number; end: number };

export interface DayTimeline {
  day: LocalDate;
  /** Visible range in minutes from midnight (active hours, widened to fit classes and blocks). */
  start: number;
  end: number;
  segments: TimelineSegment[];
}

/** Blocks that overlap `day`, clipped to it. */
export function blocksOn(blocks: TimeBlock[], day: LocalDate): { start: number; end: number; block: TimeBlock }[] {
  const out: { start: number; end: number; block: TimeBlock }[] = [];
  for (const b of blocks) {
    const s = minutesInto(day, parseTimestamp(b.startAt));
    const e = minutesInto(day, parseTimestamp(b.endAt));
    if (e <= 0 || s >= DAY) continue;
    out.push({ start: Math.max(0, s), end: Math.min(DAY, e), block: b });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Classes, blocks and the free gaps between them for one calendar day. */
export function dayTimeline(data: Pick<AppData, 'courses' | 'blocks' | 'settings'>, day: LocalDate): DayTimeline {
  const win = activeWindow(day, data.settings.dayHours);
  const classes = coursesOn(data.courses, day).map((course) => ({
    kind: 'class' as const,
    start: timeToMinutes(course.startTime),
    end: timeToMinutes(course.endTime),
    course,
  }));
  const blocks = blocksOn(data.blocks, day).map((b) => ({ kind: 'block' as const, ...b }));
  const busy = [...classes, ...blocks].sort((a, b) => a.start - b.start || a.end - b.end);
  const start = Math.min(win.start, ...busy.map((x) => x.start));
  const end = Math.max(win.end, ...busy.map((x) => x.end));

  const gaps: TimelineSegment[] = [];
  let cur = win.start;
  for (const x of busy) {
    if (x.start - cur >= MIN_GAP_MINUTES && x.start <= win.end)
      gaps.push({ kind: 'gap', start: cur, end: Math.min(x.start, win.end) });
    cur = Math.max(cur, x.end);
  }
  if (win.end - cur >= MIN_GAP_MINUTES) gaps.push({ kind: 'gap', start: cur, end: win.end });

  return { day, start, end, segments: [...busy, ...gaps].sort((a, b) => a.start - b.start) };
}

/** A block whose time is up but which still waits for its result. */
export function endedBlocks(blocks: TimeBlock[], now: Date): TimeBlock[] {
  return blocks.filter((b) => b.status === 'running' && parseTimestamp(b.endAt) <= now);
}

export function runningBlock(blocks: TimeBlock[], now: Date): TimeBlock | null {
  return blocks.find((b) => b.status === 'running' && parseTimestamp(b.startAt) <= now && parseTimestamp(b.endAt) > now) ?? null;
}

/**
 * The free stretch the user is in right now, if any: inside active hours, not
 * in class, not in a block, and at least MIN_GAP_MINUTES long.
 */
export function currentGap(
  data: Pick<AppData, 'courses' | 'blocks' | 'settings'>,
  now: Date,
): { day: LocalDate; start: number; end: number } | null {
  const day = toLocalDate(now);
  const at = minutesInto(day, now);
  const tl = dayTimeline(data, day);
  const gap = tl.segments.find((s) => s.kind === 'gap' && s.start <= at && at < s.end);
  if (!gap || gap.end - at < MIN_GAP_MINUTES) return null;
  return { day, start: gap.start, end: gap.end };
}

/** Where a new block should end by default: the next busy moment, or an hour from now. */
export function suggestedBlockEnd(data: Pick<AppData, 'courses' | 'blocks' | 'settings'>, now: Date): Date {
  const gap = currentGap(data, now);
  const day = toLocalDate(now);
  const at = minutesInto(day, now);
  const target = gap ? Math.min(gap.end, at + 120) : at + 60;
  const rounded = Math.max(at + 15, Math.ceil(target / 5) * 5);
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 0, rounded);
}

/**
 * The end time picked on a clock face: today if still ahead, otherwise
 * tomorrow (sleeping past midnight).
 */
export function endFromClock(now: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  if (at.getTime() <= now.getTime()) return new Date(at.getTime() + DAY * 60_000);
  return at;
}

export interface ClassEnd {
  day: LocalDate;
  at: Date;
  course: Course;
}

/**
 * Class endings in the next `days` days that are followed by free time inside
 * active hours — the moments to ask "what's next?".
 */
export function classEndsWithGap(data: Pick<AppData, 'courses' | 'blocks' | 'settings'>, now: Date, days = 3): ClassEnd[] {
  const out: ClassEnd[] = [];
  const first = toLocalDate(now);
  for (let i = 0; i < days; i++) {
    const day = addDays(first, i);
    const tl = dayTimeline(data, day);
    for (const seg of tl.segments) {
      if (seg.kind !== 'class') continue;
      const next = tl.segments.find((x) => x.start >= seg.end && x !== seg);
      if (!next || next.kind !== 'gap' || next.start !== seg.end) continue;
      const [y, m, d] = day.split('-').map(Number);
      const at = new Date(y, m - 1, d, 0, seg.end);
      if (at > now) out.push({ day, at, course: seg.course });
    }
  }
  return out;
}

/** Local timestamp for storage. */
export const stamp = (d: Date) => toLocalTimestamp(d);
