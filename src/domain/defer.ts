import { addDays } from './dates';
import type { LocalDate, Settings, TaskInstance } from './types';

/**
 * - `open`: deferring is allowed.
 * - `lastChance`: last day, flexible mode, today's single unlock still available.
 * - `locked`: last day and deferring is not allowed.
 * - `inactive`: the instance is done or missed.
 */
export type DeferState = 'open' | 'lastChance' | 'locked' | 'inactive';

export function deferState(inst: TaskInstance, today: LocalDate, settings: Pick<Settings, 'lockMode'>): DeferState {
  if (inst.status !== 'active') return 'inactive';
  if (today < inst.windowEnd) return 'open';
  // Overdue work can't be pushed further; it waits until it is done.
  if (today > inst.windowEnd) return 'locked';
  if (settings.lockMode === 'flexible' && inst.lockUnlockedOn !== today) return 'lastChance';
  return 'locked';
}

export function canDefer(inst: TaskInstance, today: LocalDate, settings: Pick<Settings, 'lockMode'>): boolean {
  const s = deferState(inst, today, settings);
  return s === 'open' || s === 'lastChance';
}

export interface DeferResult {
  instance: TaskInstance;
  remainingPct: number;
}

/**
 * Moves the instance to tomorrow. On the last day (flexible mode only) this
 * uses today's unlock and stretches the window by one day.
 * Returns null when deferring is not allowed.
 */
export function applyDefer(inst: TaskInstance, today: LocalDate, settings: Pick<Settings, 'lockMode'>): DeferResult | null {
  const state = deferState(inst, today, settings);
  if (state !== 'open' && state !== 'lastChance') return null;
  const tomorrow = addDays(today, 1);
  const next: TaskInstance = {
    ...inst,
    scheduledDate: tomorrow,
    deferCount: inst.deferCount + 1,
  };
  if (state === 'lastChance') {
    next.windowEnd = tomorrow;
    next.lockUnlockedOn = today;
  }
  return { instance: next, remainingPct: 100 - inst.progress };
}
