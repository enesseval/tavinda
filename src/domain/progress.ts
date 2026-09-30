import type { LocalDate, TaskInstance } from './types';

export const PROGRESS_STEP = 10;

export function clampProgress(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** Snaps a slider value to 10% steps. */
export function snapProgress(v: number, step: number = PROGRESS_STEP): number {
  return clampProgress(Math.round(v / step) * step);
}

export interface ProgressChange {
  instance: TaskInstance;
  log: { instanceId: number; logicalDate: LocalDate; fromPct: number; toPct: number } | null;
}

/**
 * New progress for an instance plus the log row to insert with it.
 * Reaching 100 marks it done; dropping below 100 re-opens a done instance.
 */
export function applyProgress(inst: TaskInstance, toPct: number, logical: LocalDate): ProgressChange {
  const to = clampProgress(toPct);
  if (inst.status === 'missed') return { instance: inst, log: null };
  if (to === inst.progress) return { instance: inst, log: null };
  const instance: TaskInstance = {
    ...inst,
    progress: to,
    status: to >= 100 ? 'done' : 'active',
  };
  return {
    instance,
    log: { instanceId: inst.id, logicalDate: logical, fromPct: inst.progress, toPct: to },
  };
}
