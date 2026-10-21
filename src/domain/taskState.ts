import type { Task } from './types';

/** The user set the task aside for a while (e.g. exam week); it comes back when they resume it. */
export const isPaused = (t: Pick<Task, 'pausedAt'>): boolean => t.pausedAt != null;

/**
 * Counts for planning: Bugün, the calendar, notifications and the widget.
 * Archived and paused tasks don't; history and the Görevler tab still show paused ones.
 */
export const isLive = (t: Pick<Task, 'archivedAt' | 'pausedAt'>): boolean => !t.archivedAt && !isPaused(t);
