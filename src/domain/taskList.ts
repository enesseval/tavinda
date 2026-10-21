import { byUserOrder, isPaused } from './taskState';
import { makeItem, type TodayItem } from './today';
import type { AppData, Course, HeatLevel, LocalDate, Task } from './types';

export type RiskLevel = 'watch' | 'risky' | 'critical';

/** Dikkat = ılık/sıcak, Riskli = kızgın, Kritik = son gün or late. */
export function riskOf(item: Pick<TodayItem, 'heat' | 'overdue'>): RiskLevel | null {
  if (item.overdue || item.heat === 4) return 'critical';
  if (item.heat === 3) return 'risky';
  if (item.heat >= 1) return 'watch';
  return null;
}

export type ListItem = Omit<TodayItem, 'group'>;

/** One task (not window) for the edit list and the paused section. */
export interface TaskRow {
  task: Task;
  course: Course | null;
  /** Heat of its open window; null if none is open. */
  heat: HeatLevel | null;
  paused: boolean;
}

export interface TaskListModel {
  /** Open work: the user's order if they set one, otherwise hottest first. */
  active: ListItem[];
  /** Weekly tasks, one row each (their current window). */
  recurring: ListItem[];
  /** Finished windows, most recent first. */
  done: ListItem[];
  /** Set aside for now; left out of active and recurring. */
  paused: TaskRow[];
  risk: Record<RiskLevel, number>;
  /** True once the user has ordered anything by hand. */
  customOrder: boolean;
}

/** Everything for the Görevler tab. */
export function taskListModel(data: AppData, today: LocalDate): TaskListModel {
  const all = data.tasks.filter((t) => !t.archivedAt);
  const byId = new Map(all.map((t) => [t.id, t]));
  const tasks = new Map(all.filter((t) => !isPaused(t)).map((t) => [t.id, t]));
  const courses = new Map(data.courses.map((c) => [c.id, c]));
  const doneToday = new Map<number, number>();
  for (const l of data.progressLogs) {
    if (l.logicalDate === today) doneToday.set(l.instanceId, (doneToday.get(l.instanceId) ?? 0) + (l.toPct - l.fromPct));
  }
  const toItem = (instId: number): ListItem | null => {
    const inst = data.instances.find((i) => i.id === instId);
    const task = inst ? byId.get(inst.taskId) : undefined;
    if (!inst || !task) return null;
    const course = task.courseId != null ? (courses.get(task.courseId) ?? null) : null;
    const minutes = Math.max(0, Math.round(((doneToday.get(inst.id) ?? 0) * task.estimatedMinutes) / 100));
    return makeItem(inst, task, course, today, data.settings, minutes);
  };

  const active = data.instances
    .filter((i) => i.status === 'active' && tasks.has(i.taskId))
    .map((i) => toItem(i.id))
    .filter((x): x is ListItem => x != null)
    .sort(
      byUserOrder<ListItem>(
        (a, b) =>
          Number(b.overdue) - Number(a.overdue) ||
          b.heat - a.heat ||
          a.instance.windowEnd.localeCompare(b.instance.windowEnd) ||
          a.task.title.localeCompare(b.task.title, 'tr'),
      ),
    );

  const recurring: ListItem[] = [];
  for (const task of tasks.values()) {
    if (task.kind !== 'weekly') continue;
    const latest = data.instances
      .filter((i) => i.taskId === task.id && i.windowStart <= today)
      .sort((a, b) => b.windowStart.localeCompare(a.windowStart))[0];
    const item = latest ? toItem(latest.id) : null;
    if (item) recurring.push(item);
  }
  recurring.sort(
    byUserOrder<ListItem>(
      (a, b) =>
        (a.course?.name ?? '').localeCompare(b.course?.name ?? '', 'tr') || a.task.title.localeCompare(b.task.title, 'tr'),
    ),
  );

  const finishedOn = new Map<number, LocalDate>();
  for (const l of data.progressLogs) if (l.toPct >= 100) finishedOn.set(l.instanceId, l.logicalDate);
  const done = data.instances
    .filter((i) => i.status === 'done' && byId.has(i.taskId))
    .sort((a, b) => (finishedOn.get(b.id) ?? b.windowEnd).localeCompare(finishedOn.get(a.id) ?? a.windowEnd))
    .slice(0, 60)
    .map((i) => toItem(i.id))
    .filter((x): x is ListItem => x != null);

  const risk: Record<RiskLevel, number> = { watch: 0, risky: 0, critical: 0 };
  for (const i of active) {
    const r = riskOf(i);
    if (r) risk[r]++;
  }
  const paused: TaskRow[] = all
    .filter(isPaused)
    .map((task) => {
      const course = task.courseId != null ? (courses.get(task.courseId) ?? null) : null;
      return { task, course, heat: null, paused: true };
    })
    .sort(byUserOrder<TaskRow>((a, b) => a.task.title.localeCompare(b.task.title, 'tr')));

  return { active, recurring, done, paused, risk, customOrder: all.some((t) => t.sortOrder != null) };
}

/**
 * Rows for edit mode: each task once, in the order the tab shows them, then the
 * paused ones of that kind of list (all of them under Aktif, weekly under Tekrarlayan).
 */
export function editRows(model: TaskListModel, tab: 'active' | 'recurring'): TaskRow[] {
  const seen = new Set<number>();
  const rows: TaskRow[] = [];
  for (const i of tab === 'active' ? model.active : model.recurring) {
    if (seen.has(i.task.id)) continue;
    seen.add(i.task.id);
    rows.push({ task: i.task, course: i.course, heat: i.heat, paused: false });
  }
  for (const r of model.paused) {
    if (tab === 'recurring' && r.task.kind !== 'weekly') continue;
    rows.push(r);
  }
  return rows;
}
