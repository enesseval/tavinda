import type { Task } from './types';

/** The user set the task aside for a while (e.g. exam week); it comes back when they resume it. */
export const isPaused = (t: Pick<Task, 'pausedAt'>): boolean => t.pausedAt != null;

/**
 * Counts for planning: Bugün, the calendar, notifications and the widget.
 * Archived and paused tasks don't; history and the Görevler tab still show paused ones.
 */
export const isLive = (t: Pick<Task, 'archivedAt' | 'pausedAt'>): boolean => !t.archivedAt && !isPaused(t);

/**
 * Tasks without a position come first (new ones stay visible), then the user's
 * order; `fallback` decides among unordered ones and within one task.
 */
export function byUserOrder<T extends { task: Task }>(fallback: (a: T, b: T) => number) {
  return (a: T, b: T): number => {
    const x = a.task.sortOrder;
    const y = b.task.sortOrder;
    if (x == null && y == null) return fallback(a, b);
    if (x == null) return -1;
    if (y == null) return 1;
    return x - y || a.task.id - b.task.id || fallback(a, b);
  };
}
