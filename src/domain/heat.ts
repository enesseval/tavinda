import { diffDays } from './dates';
import type { HeatLevel, LocalDate, Settings, Task, TaskInstance } from './types';

export const HEAT_LEVELS: HeatLevel[] = [0, 1, 2, 3, 4];

export function clampHeat(n: number): HeatLevel {
  return Math.max(0, Math.min(4, Math.round(n))) as HeatLevel;
}

export function windowLength(inst: Pick<TaskInstance, 'windowStart' | 'windowEnd'>): number {
  return diffDays(inst.windowEnd, inst.windowStart) + 1;
}

/** Share of the window that stays Serin regardless of progress. */
const WEEKLY_COOL_SHARE = 0.4;

/**
 * Heat purely from position in a weekly window: the first ~40% is Serin, then
 * Ilık, Sıcak, Kızgın, and the last day is Son gün. For a Monday class:
 * Pzt–Çar serin, Per ılık, Cum sıcak, Cmt kızgın, Paz son gün.
 */
export function weeklyBaseHeat(dayIndex: number, length: number): HeatLevel {
  if (dayIndex >= length - 1) return 4;
  const r = length > 1 ? dayIndex / (length - 1) : 1;
  if (r < WEEKLY_COOL_SHARE) return 0;
  if (r < 0.6) return 1;
  if (r < 0.75) return 2;
  return 3;
}

/** Active work whose window has already ended ("Gecikti"). */
export function isOverdue(inst: Pick<TaskInstance, 'status' | 'windowEnd'>, today: LocalDate): boolean {
  return inst.status === 'active' && today > inst.windowEnd;
}

export function weeklyHeat(inst: TaskInstance, today: LocalDate): HeatLevel {
  if (today >= inst.windowEnd) return 4;
  const len = windowLength(inst);
  const dayIndex = Math.max(0, Math.min(len - 1, diffDays(today, inst.windowStart)));
  const base = weeklyBaseHeat(dayIndex, len);
  if (base === 4) return 4;
  // Falling behind only matters once the cool days are over.
  const late = dayIndex / Math.max(1, len - 1) >= WEEKLY_COOL_SHARE;
  return late && 100 - inst.progress > 50 ? clampHeat(Math.min(3, base + 1)) : base;
}

/** Days from today to due date, inclusive of both. */
export function daysLeftInclusive(due: LocalDate, today: LocalDate): number {
  return diffDays(due, today) + 1;
}

export function remainingMinutes(progress: number, estimatedMinutes: number): number {
  return Math.max(0, Math.round((estimatedMinutes * (100 - progress)) / 100));
}

export function paceFor(remainingMin: number, daysLeft: number, dailyBudget: number): number {
  const capacity = Math.max(1, daysLeft) * Math.max(1, dailyBudget);
  return remainingMin / capacity;
}

export function heatFromPace(pace: number): HeatLevel {
  if (pace < 0.3) return 0;
  if (pace < 0.6) return 1;
  if (pace < 0.9) return 2;
  return 3;
}

export function deadlineHeatValues(p: {
  today: LocalDate;
  due: LocalDate;
  progress: number;
  estimatedMinutes: number;
  dailyBudget: number;
  warnDays: number;
}): HeatLevel {
  if (p.today >= p.due) return 4;
  const daysLeft = daysLeftInclusive(p.due, p.today);
  const pace = paceFor(remainingMinutes(p.progress, p.estimatedMinutes), daysLeft, p.dailyBudget);
  const h = heatFromPace(pace);
  return daysLeft <= p.warnDays ? (Math.max(2, h) as HeatLevel) : h;
}

export function budgetFor(task: Task, settings: Pick<Settings, 'dailyBudgetMinutes'>): number {
  return task.dailyBudgetMinutes ?? settings.dailyBudgetMinutes;
}

export function warnDaysFor(task: Task, settings: Pick<Settings, 'warnDays'>): number {
  return task.warnDays ?? settings.warnDays;
}

export function deadlineHeat(
  inst: TaskInstance,
  task: Task,
  today: LocalDate,
  settings: Pick<Settings, 'dailyBudgetMinutes' | 'warnDays'>,
): HeatLevel {
  return deadlineHeatValues({
    today,
    due: inst.windowEnd,
    progress: inst.progress,
    estimatedMinutes: task.estimatedMinutes,
    dailyBudget: budgetFor(task, settings),
    warnDays: warnDaysFor(task, settings),
  });
}

export function heatFor(
  inst: TaskInstance,
  task: Task,
  today: LocalDate,
  settings: Pick<Settings, 'dailyBudgetMinutes' | 'warnDays'>,
): HeatLevel {
  return task.kind === 'weekly' ? weeklyHeat(inst, today) : deadlineHeat(inst, task, today, settings);
}

export function paceForInstance(
  inst: TaskInstance,
  task: Task,
  today: LocalDate,
  settings: Pick<Settings, 'dailyBudgetMinutes'>,
): number {
  const daysLeft = Math.max(1, daysLeftInclusive(inst.windowEnd, today));
  return paceFor(remainingMinutes(inst.progress, task.estimatedMinutes), daysLeft, budgetFor(task, settings));
}

/** Work this small is done in one sitting instead of being spread over days. */
export const ONE_SITTING_MINUTES = 45;
/** Smallest daily share worth sitting down for. */
export const MIN_SHARE_MINUTES = 30;

function ceilTo15(n: number): number {
  return Math.ceil(n / 15) * 15;
}

/**
 * Suggested daily share: aim to finish one day early, but never in crumbs.
 * Up to 45 min is one sitting; bigger work gets at least 30 min a day,
 * rounded up to 15 minutes and capped at what is left.
 */
export function suggestedDailyShare(remainingMin: number, daysLeft: number): number {
  if (remainingMin <= 0) return 0;
  if (remainingMin <= ONE_SITTING_MINUTES) return remainingMin;
  const raw = Math.ceil(remainingMin / Math.max(1, daysLeft - 1));
  return Math.min(remainingMin, Math.max(MIN_SHARE_MINUTES, ceilTo15(raw)));
}

/** Minutes of work logged for an instance on `day` (from progress logs). */
export function minutesDoneOn(
  logs: { instanceId: number; logicalDate: LocalDate; fromPct: number; toPct: number }[],
  instanceId: number,
  day: LocalDate,
  estimatedMinutes: number,
): number {
  let pct = 0;
  for (const l of logs) if (l.instanceId === instanceId && l.logicalDate === day) pct += l.toPct - l.fromPct;
  return Math.max(0, Math.round((pct * estimatedMinutes) / 100));
}

/**
 * Today's share still open. The plan is made from where the day started, so
 * work already logged today counts against it ("Bugünlük tamam" at 0).
 */
export function shareForInstance(inst: TaskInstance, task: Task, today: LocalDate, doneTodayMinutes = 0): number {
  if (inst.status !== 'active') return 0;
  const daysLeft = Math.max(1, daysLeftInclusive(inst.windowEnd, today));
  const remaining = remainingMinutes(inst.progress, task.estimatedMinutes);
  const planned = suggestedDailyShare(remaining + doneTodayMinutes, daysLeft);
  return Math.min(remaining, Math.max(0, planned - doneTodayMinutes));
}

export interface HeatRankable {
  heat: HeatLevel;
  daysLeft: number;
  remainingMinutes: number;
}

/** Hottest first: highest heat, then least time left, then most remaining minutes. */
export function compareHottest(a: HeatRankable, b: HeatRankable): number {
  return b.heat - a.heat || a.daysLeft - b.daysLeft || b.remainingMinutes - a.remainingMinutes;
}

export function pickHottest<T extends HeatRankable>(items: T[]): T | null {
  if (!items.length) return null;
  return [...items].sort(compareHottest)[0] ?? null;
}

/**
 * Preview ramp for the Add form: how a deadline task heats up across its span
 * if it keeps today's pace. `segments` samples evenly from today to due.
 */
export function deadlinePreviewRamp(p: { spanDays: number; base: HeatLevel; warnDays: number; segments: number }): HeatLevel[] {
  const D = Math.max(1, p.spanDays);
  return Array.from({ length: p.segments }, (_, k) => {
    const day = ((k + 0.5) / p.segments) * D;
    const left = D - day;
    if (left <= p.warnDays) return Math.max(2, p.base) as HeatLevel;
    return Math.min(p.base, Math.floor((day / D) * (p.base + 1))) as HeatLevel;
  });
}
