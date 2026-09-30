import { addDays, diffDays, startOfIsoWeek } from './dates';
import { heatFor } from './heat';
import type { AppData, HeatLevel, LocalDate } from './types';

export interface SemesterStats {
  completed: number;
  lastDayCount: number;
  lastDayPct: number;
  avgDefer: number;
  missed: number;
  weeks: number;
  /** 7 rows (Mon…Sun) × `weeks` columns, oldest first. null = no work, 'future' = not yet. */
  heatmap: (HeatLevel | null | 'future')[][];
  heatmapWeeks: number;
}

export function semesterStats(data: AppData, today: LocalDate, heatmapWeeks = 7): SemesterStats {
  const done = data.instances.filter((i) => i.status === 'done');
  const missed = data.instances.filter((i) => i.status === 'missed');

  const finishDay = new Map<number, LocalDate>();
  for (const l of data.progressLogs) {
    if (l.toPct >= 100) finishDay.set(l.instanceId, l.logicalDate);
  }
  const lastDayCount = done.filter((i) => finishDay.get(i.id) != null && finishDay.get(i.id)! >= i.windowEnd).length;

  const closed = [...done, ...missed];
  const avgDefer = closed.length ? closed.reduce((a, i) => a + i.deferCount, 0) / closed.length : 0;

  const firstDay = data.instances.reduce<LocalDate | null>(
    (min, i) => (min == null || i.windowStart < min ? i.windowStart : min),
    null,
  );
  const weeks = firstDay ? Math.max(1, Math.floor(diffDays(today, startOfIsoWeek(firstDay)) / 7) + 1) : 0;

  const tasks = new Map(data.tasks.map((t) => [t.id, t]));
  const instances = new Map(data.instances.map((i) => [i.id, i]));
  const dayHeat = new Map<LocalDate, HeatLevel>();
  for (const l of data.progressLogs) {
    if (l.toPct <= l.fromPct) continue;
    const inst = instances.get(l.instanceId);
    const task = inst ? tasks.get(inst.taskId) : undefined;
    if (!inst || !task) continue;
    const h = heatFor({ ...inst, progress: l.fromPct, status: 'active' }, task, l.logicalDate, data.settings);
    dayHeat.set(l.logicalDate, Math.max(dayHeat.get(l.logicalDate) ?? 0, h) as HeatLevel);
  }

  const firstMonday = addDays(startOfIsoWeek(today), -7 * (heatmapWeeks - 1));
  const heatmap: (HeatLevel | null | 'future')[][] = [];
  for (let row = 0; row < 7; row++) {
    const cells: (HeatLevel | null | 'future')[] = [];
    for (let w = 0; w < heatmapWeeks; w++) {
      const d = addDays(firstMonday, w * 7 + row);
      cells.push(d > today ? 'future' : dayHeat.has(d) ? dayHeat.get(d)! : null);
    }
    heatmap.push(cells);
  }

  return {
    completed: done.length,
    lastDayCount,
    lastDayPct: done.length ? Math.round((lastDayCount / done.length) * 100) : 0,
    avgDefer: Math.round(avgDefer * 10) / 10,
    missed: missed.length,
    weeks,
    heatmap,
    heatmapWeeks,
  };
}
