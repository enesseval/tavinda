import { addDays, diffDays, maxDate, minDate } from './dates';
import { heatFor, remainingMinutes, shareForInstance } from './heat';
import { applyReconcile, reconcile } from './reconcile';
import { coursesOn, isLongTerm } from './today';
import type { AppData, Course, HeatLevel, LocalDate, Task, TaskInstance } from './types';
import { currentWeeklyWindow } from './windows';

/**
 * Instances as they would look on `day`: for future days, reconcile is run in
 * memory so weekly tasks get their next windows. Synthetic ids are negative.
 */
export function projectInstances(data: AppData, today: LocalDate, day: LocalDate): TaskInstance[] {
  if (day <= today) return data.instances;
  let next = -1;
  const result = reconcile({ today: day, courses: data.courses, tasks: data.tasks, instances: data.instances });
  return applyReconcile(data.instances, result, () => next--);
}

export interface DayShare {
  instance: TaskInstance;
  task: Task;
  course: Course | null;
  heat: HeatLevel;
  minutes: number;
  lastDay: boolean;
}

export interface DayPlan {
  day: LocalDate;
  isPast: boolean;
  isToday: boolean;
  classes: Course[];
  shares: DayShare[];
  totalMinutes: number;
  maxHeat: HeatLevel | null;
  dues: { task: Task; course: Course | null }[];
}

function logMinutesByInstance(data: AppData, day: LocalDate): Map<number, { pct: number; to: number }> {
  const m = new Map<number, { pct: number; to: number }>();
  for (const l of data.progressLogs) {
    if (l.logicalDate !== day) continue;
    const cur = m.get(l.instanceId) ?? { pct: 0, to: 0 };
    m.set(l.instanceId, { pct: cur.pct + (l.toPct - l.fromPct), to: Math.max(cur.to, l.toPct) });
  }
  return m;
}

export function dayPlan(data: AppData, today: LocalDate, day: LocalDate): DayPlan {
  const tasks = new Map(data.tasks.filter((t) => !t.archivedAt).map((t) => [t.id, t]));
  const courses = new Map(data.courses.map((c) => [c.id, c]));
  const shares: DayShare[] = [];

  if (day < today) {
    const logs = logMinutesByInstance(data, day);
    for (const inst of data.instances) {
      const entry = logs.get(inst.id);
      const task = tasks.get(inst.taskId);
      if (!entry || !task || entry.pct <= 0) continue;
      const heat = heatFor({ ...inst, progress: Math.min(99, entry.to), status: 'active' }, task, day, data.settings);
      shares.push({
        instance: inst,
        task,
        course: task.courseId != null ? (courses.get(task.courseId) ?? null) : null,
        heat,
        minutes: Math.round((entry.pct * task.estimatedMinutes) / 100),
        lastDay: inst.windowEnd === day,
      });
    }
  } else {
    for (const inst of projectInstances(data, today, day)) {
      if (inst.status !== 'active' || inst.windowStart > day || inst.windowEnd < day || inst.scheduledDate > day) continue;
      const task = tasks.get(inst.taskId);
      if (!task) continue;
      const heat = heatFor(inst, task, day, data.settings);
      if (isLongTerm(task, inst, day, heat)) continue;
      const minutes = shareForInstance(inst, task, day);
      if (minutes <= 0) continue;
      shares.push({
        instance: inst,
        task,
        course: task.courseId != null ? (courses.get(task.courseId) ?? null) : null,
        heat,
        minutes,
        lastDay: inst.windowEnd === day,
      });
    }
  }

  shares.sort((a, b) => b.heat - a.heat || b.minutes - a.minutes);
  const dues = data.tasks
    .filter((t) => !t.archivedAt && t.kind === 'deadline' && t.dueAt === day)
    .map((t) => ({ task: t, course: t.courseId != null ? (courses.get(t.courseId) ?? null) : null }));

  return {
    day,
    isPast: day < today,
    isToday: day === today,
    classes: coursesOn(data.courses, day),
    shares,
    totalMinutes: shares.reduce((a, s) => a + s.minutes, 0),
    maxHeat: shares.length ? (Math.max(...shares.map((s) => s.heat)) as HeatLevel) : null,
    dues,
  };
}

export interface WindowBar {
  instance: TaskInstance;
  task: Task;
  course: Course | null;
  /** Column indexes inside the visible range. */
  fromCol: number;
  toCol: number;
  clippedLeft: boolean;
  clippedRight: boolean;
  heatFrom: HeatLevel;
  heatTo: HeatLevel;
  lockInRange: boolean;
  dueInRange: boolean;
  projected: boolean;
}

/** Task windows overlapping the visible days (consecutive LocalDates). */
export function windowBars(data: AppData, today: LocalDate, days: LocalDate[]): WindowBar[] {
  if (!days.length) return [];
  const first = days[0];
  const last = days[days.length - 1];
  const tasks = new Map(data.tasks.filter((t) => !t.archivedAt).map((t) => [t.id, t]));
  const courses = new Map(data.courses.map((c) => [c.id, c]));
  const pool = projectInstances(data, today, maxDate(today, last));
  const bars: WindowBar[] = [];
  const colOf = (d: LocalDate) => days.indexOf(d);

  for (const inst of pool) {
    const task = tasks.get(inst.taskId);
    if (!task) continue;
    if (inst.windowEnd < first || inst.windowStart > last) continue;
    const s = maxDate(inst.windowStart, first);
    const e = minDate(inst.windowEnd, last);
    let fromCol = colOf(s);
    let toCol = colOf(e);
    // Hidden weekend columns: snap to nearest visible day.
    for (let d = s; fromCol < 0 && d <= e; d = addDays(d, 1)) fromCol = colOf(d);
    for (let d = e; toCol < 0 && d >= s; d = addDays(d, -1)) toCol = colOf(d);
    if (fromCol < 0 || toCol < 0) continue;
    const at = (d: LocalDate): HeatLevel =>
      inst.status === 'active' ? heatFor(inst, task, maxDate(d, today), data.settings) : (0 as HeatLevel);
    bars.push({
      instance: inst,
      task,
      course: task.courseId != null ? (courses.get(task.courseId) ?? null) : null,
      fromCol,
      toCol,
      clippedLeft: inst.windowStart < first || colOf(inst.windowStart) < 0,
      clippedRight: inst.windowEnd > last || colOf(inst.windowEnd) < 0,
      heatFrom: at(s),
      heatTo: at(e),
      lockInRange: task.kind === 'weekly' && inst.windowEnd <= last && inst.windowEnd >= first,
      dueInRange: task.kind === 'deadline' && inst.windowEnd <= last && inst.windowEnd >= first,
      projected: inst.id < 0,
    });
  }
  return bars.sort((a, b) => a.fromCol - b.fromCol || a.toCol - b.toCol);
}

export type HistoryDayKind = 'past' | 'today' | 'future' | 'deferred';

export interface HistoryDay {
  day: LocalDate;
  minutes: number;
  heat: HeatLevel;
  kind: HistoryDayKind;
}

/**
 * Per-day bars for one instance: logged minutes for past days, planned share
 * for today onwards. Up to `maxDays` days around today within the window.
 */
export function instanceHistory(data: AppData, inst: TaskInstance, task: Task, today: LocalDate, maxDays = 7): HistoryDay[] {
  const len = diffDays(inst.windowEnd, inst.windowStart) + 1;
  let start = inst.windowStart;
  if (len > maxDays) {
    // Show a few past days before today, clamped to the window.
    const latestStart = addDays(inst.windowEnd, -(maxDays - 1));
    start = minDate(maxDate(addDays(today, -4), inst.windowStart), latestStart);
  }
  const end = minDate(inst.windowEnd, addDays(start, maxDays - 1));
  const out: HistoryDay[] = [];
  const deferDays = new Set(data.deferLogs.filter((d) => d.instanceId === inst.id).map((d) => d.logicalDate));

  let progressAt = 0;
  for (const l of data.progressLogs) {
    if (l.instanceId === inst.id && l.logicalDate < start) progressAt = l.toPct;
  }

  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (d <= today) {
      const dayLogs = data.progressLogs.filter((l) => l.instanceId === inst.id && l.logicalDate === d);
      const pct = dayLogs.reduce((a, l) => a + (l.toPct - l.fromPct), 0);
      if (dayLogs.length) progressAt = dayLogs[dayLogs.length - 1].toPct;
      const minutes = Math.max(0, Math.round((pct * task.estimatedMinutes) / 100));
      const heat = heatFor({ ...inst, progress: Math.min(99, progressAt), status: 'active' }, task, d, data.settings);
      const kind: HistoryDayKind = d === today ? 'today' : minutes === 0 && deferDays.has(d) ? 'deferred' : 'past';
      out.push({ day: d, minutes, heat, kind });
    } else {
      const minutes = inst.status === 'active' && inst.scheduledDate <= d ? shareForInstance(inst, task, d) : 0;
      out.push({ day: d, minutes, heat: inst.status === 'active' ? heatFor(inst, task, d, data.settings) : 0, kind: 'future' });
    }
  }
  return out;
}

/** Sum of remaining minutes the instance still needs. */
export function remainingFor(inst: TaskInstance, task: Task): number {
  return remainingMinutes(inst.progress, task.estimatedMinutes);
}

/** Current weekly window for a course, used by the Add form preview. */
export function previewWeeklyWindow(today: LocalDate, weekday: number) {
  return currentWeeklyWindow(today, weekday);
}
