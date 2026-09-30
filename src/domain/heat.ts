import { diffDays } from './dates';
import type { HeatLevel, LocalDate, Settings, Task, TaskInstance } from './types';

export const HEAT_LEVELS: HeatLevel[] = [0, 1, 2, 3, 4];

export function clampHeat(n: number): HeatLevel {
  return Math.max(0, Math.min(4, Math.round(n))) as HeatLevel;
}

export function windowLength(inst: Pick<TaskInstance, 'windowStart' | 'windowEnd'>): number {
  return diffDays(inst.windowEnd, inst.windowStart) + 1;
}

/** Heat purely from position in a weekly window (no progress penalty). */
export function weeklyBaseHeat(dayIndex: number, length: number): HeatLevel {
  if (dayIndex >= length - 1) return 4;
  const r = length > 1 ? dayIndex / (length - 1) : 1;
  if (r < 0.45) return 0;
  if (r < 0.7) return 1;
  return 2;
}

export function weeklyHeat(inst: TaskInstance, today: LocalDate): HeatLevel {
  if (today >= inst.windowEnd) return 4;
  const len = windowLength(inst);
  const dayIndex = Math.max(0, Math.min(len - 1, diffDays(today, inst.windowStart)));
  const base = weeklyBaseHeat(dayIndex, len);
  if (base === 4) return 4;
  const remaining = 100 - inst.progress;
  return remaining > 50 ? clampHeat(Math.min(3, base + 1)) : base;
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

function ceilTo5(n: number): number {
  return Math.ceil(n / 5) * 5;
}

/**
 * Suggested daily share: aim to finish one day early, rounded up to 5 minutes.
 * ceil(remaining / max(1, daysLeft − 1)).
 */
export function suggestedDailyShare(remainingMin: number, daysLeft: number): number {
  if (remainingMin <= 0) return 0;
  return ceilTo5(Math.ceil(remainingMin / Math.max(1, daysLeft - 1)));
}

export function shareForInstance(inst: TaskInstance, task: Task, today: LocalDate): number {
  if (inst.status !== 'active') return 0;
  const daysLeft = Math.max(1, daysLeftInclusive(inst.windowEnd, today));
  return suggestedDailyShare(remainingMinutes(inst.progress, task.estimatedMinutes), daysLeft);
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
