import { addDays, diffDays, maxDate, minDate } from './dates';
import { heatFor, minutesDoneOn, remainingMinutes, shareForInstance, weeklyBaseHeat } from './heat';
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

/** Like projectInstances, but every future day in `days` gets its windows (for multi-week views). */
export function projectRange(data: AppData, today: LocalDate, days: LocalDate[]): TaskInstance[] {
  let instances = data.instances;
  let next = -1;
  for (const day of days) {
    if (day <= today) continue;
    const result = reconcile({ today: day, courses: data.courses, tasks: data.tasks, instances });
    // Projection only adds windows; it never closes the real ones.
    instances = applyReconcile(instances, { create: result.create, update: [] }, () => next--);
  }
  return instances;
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
      const done = day === today ? minutesDoneOn(data.progressLogs, inst.id, day, task.estimatedMinutes) : 0;
      const minutes = shareForInstance(inst, task, day, done);
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

export interface WindowSegment {
  instance: TaskInstance;
  /** Column indexes inside the visible range. */
  fromCol: number;
  toCol: number;
  clippedLeft: boolean;
  clippedRight: boolean;
  /** Heat for each visible day of the segment, left to right. */
  heats: HeatLevel[];
  dueInRange: boolean;
  projected: boolean;
}

/** One task per row; consecutive weekly windows sit side by side so each cycle restarts cool. */
export interface WindowRow {
  task: Task;
  course: Course | null;
  segments: WindowSegment[];
}

/** Heat a window shows on `day`: weekly windows follow the time ramp, deadlines their pace. */
export function windowDayHeat(
  inst: TaskInstance,
  task: Task,
  day: LocalDate,
  today: LocalDate,
  settings: AppData['settings'],
): HeatLevel {
  if (task.kind === 'weekly') {
    const len = diffDays(inst.windowEnd, inst.windowStart) + 1;
    return weeklyBaseHeat(Math.max(0, Math.min(len - 1, diffDays(day, inst.windowStart))), len);
  }
  return heatFor({ ...inst, status: 'active' }, task, maxDate(day, today), settings);
}

/** Task windows overlapping the visible days (consecutive LocalDates), grouped per task. */
export function windowRows(data: AppData, today: LocalDate, days: LocalDate[]): WindowRow[] {
  if (!days.length) return [];
  const first = days[0];
  const last = days[days.length - 1];
  const tasks = new Map(data.tasks.filter((t) => !t.archivedAt).map((t) => [t.id, t]));
  const courses = new Map(data.courses.map((c) => [c.id, c]));
  const pool = projectRange(data, today, days);
  const rows = new Map<number, WindowRow>();
  const colOf = (d: LocalDate) => days.indexOf(d);

  for (const inst of pool) {
    const task = tasks.get(inst.taskId);
    if (!task) continue;
    if (inst.windowEnd < first || inst.windowStart > last) continue;
    const s = maxDate(inst.windowStart, first);
    const e = minDate(inst.windowEnd, last);
    const fromCol = colOf(s);
    const toCol = colOf(e);
    if (fromCol < 0 || toCol < 0) continue;
    const heats: HeatLevel[] = [];
    for (let d = s; d <= e; d = addDays(d, 1)) heats.push(windowDayHeat(inst, task, d, today, data.settings));
    const row = rows.get(task.id) ?? {
      task,
      course: task.courseId != null ? (courses.get(task.courseId) ?? null) : null,
      segments: [],
    };
    row.segments.push({
      instance: inst,
      fromCol,
      toCol,
      clippedLeft: inst.windowStart < first,
      clippedRight: inst.windowEnd > last,
      heats,
      dueInRange: task.kind === 'deadline' && inst.windowEnd <= last && inst.windowEnd >= first,
      projected: inst.id < 0,
    });
    rows.set(task.id, row);
  }
  const out = [...rows.values()];
  for (const r of out) r.segments.sort((a, b) => a.fromCol - b.fromCol);
  return out.sort(
    (a, b) =>
      a.segments[0].fromCol - b.segments[0].fromCol ||
      a.segments[a.segments.length - 1].toCol - b.segments[b.segments.length - 1].toCol ||
      a.task.id - b.task.id,
  );
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
