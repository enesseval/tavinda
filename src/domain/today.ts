import { addDays, diffDays, isoWeekday } from './dates';
import { canDefer, deferState, type DeferState } from './defer';
import {
  compareHottest,
  daysLeftInclusive,
  heatFor,
  isOverdue,
  paceForInstance,
  remainingMinutes,
  shareForInstance,
} from './heat';
import { OVERDUE_DAYS } from './reconcile';
import type { AppData, Course, HeatLevel, LocalDate, Task, TaskInstance } from './types';

/** Deadline tasks further out than this live only in the long-term strip. */
export const LONG_TERM_DAYS = 14;

export type TodayGroupKey = 'overdue' | 'last' | 'today' | 'carried' | 'upcoming' | 'ended';

export interface TodayItem {
  instance: TaskInstance;
  task: Task;
  course: Course | null;
  heat: HeatLevel;
  pace: number;
  daysLeft: number;
  remainingPct: number;
  remainingMinutes: number;
  shareMinutes: number;
  /** Minutes logged on this instance today. */
  doneTodayMinutes: number;
  carried: boolean;
  /** Window ended but the work is still open ("Gecikti"). */
  overdue: boolean;
  /** Days past the window end, 0 when not overdue. */
  overdueDays: number;
  canDefer: boolean;
  deferState: DeferState;
  group: TodayGroupKey;
}

export interface LoadSegment {
  instanceId: number;
  minutes: number;
  heat: HeatLevel;
  live: boolean;
}

export interface TodayModel {
  today: LocalDate;
  hero: TodayItem | null;
  groups: { key: TodayGroupKey; items: TodayItem[] }[];
  /** Planned minutes still open today. */
  loadMinutes: number;
  liveCount: number;
  segments: LoadSegment[];
  maxHeat: HeatLevel | null;
  classes: Course[];
  longTerm: TodayItem[];
  doneTodayCount: number;
  upcomingCount: number;
  hasCourses: boolean;
}

export function makeItem(
  instance: TaskInstance,
  task: Task,
  course: Course | null,
  today: LocalDate,
  settings: AppData['settings'],
  doneTodayMinutes = 0,
): Omit<TodayItem, 'group'> {
  const heat = instance.status === 'active' ? heatFor(instance, task, today, settings) : (0 as HeatLevel);
  return {
    instance,
    task,
    course,
    heat,
    pace: paceForInstance(instance, task, today, settings),
    daysLeft: Math.max(0, daysLeftInclusive(instance.windowEnd, today)),
    remainingPct: 100 - instance.progress,
    remainingMinutes: remainingMinutes(instance.progress, task.estimatedMinutes),
    shareMinutes: shareForInstance(instance, task, today, doneTodayMinutes),
    doneTodayMinutes,
    carried: instance.windowStart < today && (instance.progress > 0 || instance.deferCount > 0),
    overdue: isOverdue(instance, today),
    overdueDays: isOverdue(instance, today) ? diffDays(today, instance.windowEnd) : 0,
    canDefer: canDefer(instance, today, settings),
    deferState: deferState(instance, today, settings),
  };
}

/** Far-off, still-cool deadline work shows in the long-term strip instead of today's list. */
export function isLongTerm(task: Task, instance: TaskInstance, today: LocalDate, heat: HeatLevel): boolean {
  return task.kind === 'deadline' && heat === 0 && diffDays(instance.windowEnd, today) > LONG_TERM_DAYS;
}

export function coursesOn(courses: Course[], day: LocalDate): Course[] {
  const wd = isoWeekday(day);
  return courses.filter((c) => c.weekday === wd).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function buildTodayModel(data: AppData, today: LocalDate): TodayModel {
  const taskById = new Map(data.tasks.filter((t) => !t.archivedAt).map((t) => [t.id, t]));
  const courseById = new Map(data.courses.map((c) => [c.id, c]));
  const yesterday = addDays(today, -1);

  const finishedToday = new Set(
    data.progressLogs.filter((l) => l.logicalDate === today && l.toPct >= 100).map((l) => l.instanceId),
  );
  const minutesToday = new Map<number, number>();
  for (const l of data.progressLogs) {
    if (l.logicalDate !== today) continue;
    minutesToday.set(l.instanceId, (minutesToday.get(l.instanceId) ?? 0) + (l.toPct - l.fromPct));
  }

  const items: TodayItem[] = [];
  const longTerm: TodayItem[] = [];
  for (const inst of data.instances) {
    const task = taskById.get(inst.taskId);
    if (!task) continue;
    const course = task.courseId != null ? (courseById.get(task.courseId) ?? null) : null;
    const doneToday = Math.round(((minutesToday.get(inst.id) ?? 0) * task.estimatedMinutes) / 100);
    const base = makeItem(inst, task, course, today, data.settings, Math.max(0, doneToday));

    if (inst.status === 'active') {
      if (isLongTerm(task, inst, today, base.heat) && inst.scheduledDate <= today) {
        longTerm.push({ ...base, group: 'today' });
        continue;
      }
      let group: TodayGroupKey;
      if (base.overdue) group = 'overdue';
      else if (inst.scheduledDate > today) group = 'upcoming';
      else if (base.heat === 4) group = 'last';
      else if (base.carried) group = 'carried';
      else group = 'today';
      items.push({ ...base, group });
    } else if (inst.status === 'done' && finishedToday.has(inst.id)) {
      items.push({ ...base, group: 'ended' });
    } else if (inst.status === 'missed' && inst.windowEnd === addDays(yesterday, -OVERDUE_DAYS)) {
      items.push({ ...base, group: 'ended' });
    }
  }

  const todayish = items.filter(
    (i) => i.group === 'overdue' || i.group === 'last' || i.group === 'today' || i.group === 'carried',
  );
  // Work that can still be done on time comes first; overdue work leads only when nothing else is open.
  const onTime = todayish.filter((i) => !i.overdue);
  const hero = [...(onTime.length ? onTime : todayish)].sort(compareHottest)[0] ?? null;

  const order: TodayGroupKey[] = ['overdue', 'last', 'today', 'carried', 'upcoming', 'ended'];
  const groups = order
    .map((key) => ({
      key,
      items: items
        .filter((i) => i.group === key && i !== hero)
        .sort(key === 'upcoming' ? (a, b) => a.instance.scheduledDate.localeCompare(b.instance.scheduledDate) : compareHottest),
    }))
    .filter((g) => g.items.length > 0);

  const segments: LoadSegment[] = [];
  for (const i of todayish) {
    if (i.shareMinutes > 0) segments.push({ instanceId: i.instance.id, minutes: i.shareMinutes, heat: i.heat, live: true });
  }
  for (const i of items.filter((x) => x.group === 'ended' && x.instance.status === 'done')) {
    const pct = minutesToday.get(i.instance.id) ?? 0;
    const minutes = Math.round((pct * i.task.estimatedMinutes) / 100);
    if (minutes > 0) segments.push({ instanceId: i.instance.id, minutes, heat: i.heat, live: false });
  }

  const loadMinutes = todayish.reduce((a, i) => a + i.shareMinutes, 0);
  const maxHeat = todayish.length ? (Math.max(...todayish.map((i) => i.heat)) as HeatLevel) : null;

  return {
    today,
    hero,
    groups,
    loadMinutes,
    liveCount: todayish.length,
    segments,
    maxHeat,
    classes: coursesOn(data.courses, today),
    longTerm: longTerm.sort((a, b) => a.instance.windowEnd.localeCompare(b.instance.windowEnd)),
    doneTodayCount: finishedToday.size,
    upcomingCount: items.filter((i) => i.group === 'upcoming').length,
    hasCourses: data.courses.length > 0,
  };
}
