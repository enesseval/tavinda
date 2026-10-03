import { addDays, dueInstant, logicalDate, logicalDateTime } from './dates';
import { warnDaysFor } from './heat';
import { classEndsWithGap, parseTimestamp } from './schedule';
import { applyReconcile, reconcile } from './reconcile';
import { buildTodayModel } from './today';
import type { AppData, LocalDate } from './types';

export const LAST_DAY_EVENING = '20:00';
/** iOS keeps at most 64 pending local notifications. */
export const MAX_SCHEDULED = 60;

export type PlannedNotification =
  | {
      kind: 'morning';
      id: string;
      fireAt: Date;
      day: LocalDate;
      totalMinutes: number;
      count: number;
      hottestTitle: string | null;
    }
  | { kind: 'lastDayMorning'; id: string; fireAt: Date; day: LocalDate; titles: string[] }
  | { kind: 'startNow'; id: string; fireAt: Date; day: LocalDate; title: string; daysLeft: number }
  | { kind: 'lastMinutes'; id: string; fireAt: Date; day: LocalDate; title: string; minutes: number }
  | { kind: 'classEnd'; id: string; fireAt: Date; day: LocalDate; course: string }
  | { kind: 'blockEnd'; id: string; fireAt: Date; day: LocalDate; blockId: number; name: string; isTask: boolean }
  | {
      kind: 'lastDayEvening';
      id: string;
      fireAt: Date;
      day: LocalDate;
      instanceId: number;
      title: string;
      remainingPct: number;
      remainingMinutes: number;
    };

/**
 * Notifications for the next `horizonDays` logical days, projected from the
 * current data. `now` is the app clock (may be time-travelled); returned
 * fireAt values are in that same clock.
 */
export function planNotifications(data: AppData, now: Date, horizonDays = 7): PlannedNotification[] {
  const { cutoff, morningTime } = data.settings;
  const today = logicalDate(now, cutoff);
  const out: PlannedNotification[] = [];
  let synthetic = -1;

  for (let d = 0; d < horizonDays; d++) {
    const day = addDays(today, d);
    const r = reconcile({ today: day, courses: data.courses, tasks: data.tasks, instances: data.instances });
    const instances = applyReconcile(data.instances, r, () => synthetic--);
    const model = buildTodayModel({ ...data, instances }, day);

    const morningAt = logicalDateTime(day, morningTime, cutoff);
    const live = model.groups
      .filter((g) => g.key === 'overdue' || g.key === 'last' || g.key === 'today' || g.key === 'carried')
      .flatMap((g) => g.items);
    const all = model.hero ? [model.hero, ...live] : live;

    if (morningAt > now && all.length > 0) {
      out.push({
        kind: 'morning',
        id: `morning-${day}`,
        fireAt: morningAt,
        day,
        totalMinutes: model.loadMinutes,
        count: all.length,
        hottestTitle: model.hero?.task.title ?? null,
      });
    }

    const lastDay = all.filter((i) => i.instance.windowEnd === day && i.instance.status === 'active');
    if (lastDay.length && morningAt > now) {
      out.push({
        kind: 'lastDayMorning',
        id: `last-am-${day}`,
        fireAt: new Date(morningAt.getTime() + 60_000),
        day,
        titles: lastDay.map((i) => i.task.title),
      });
    }
    const eveningAt = logicalDateTime(day, LAST_DAY_EVENING, cutoff);
    if (eveningAt > now) {
      for (const i of lastDay) {
        out.push({
          kind: 'lastDayEvening',
          id: `last-pm-${day}-${i.instance.id}`,
          fireAt: eveningAt,
          day,
          instanceId: i.instance.id,
          title: i.task.title,
          remainingPct: i.remainingPct,
          remainingMinutes: i.remainingMinutes,
        });
      }
    }
  }

  // Deadline tasks: "start now" on the warn day, and the optional last-minutes alarm.
  for (const task of data.tasks) {
    if (task.kind !== 'deadline' || task.archivedAt) continue;
    const inst = data.instances.find((i) => i.taskId === task.id && i.status === 'active');
    if (!inst) continue;
    const warn = warnDaysFor(task, data.settings);
    const warnDay = addDays(inst.windowEnd, -warn);
    const warnAt = logicalDateTime(warnDay, morningTime, cutoff);
    if (warnDay > inst.windowStart && warnAt > now && inst.progress < 100) {
      out.push({ kind: 'startNow', id: `start-${inst.id}`, fireAt: warnAt, day: warnDay, title: task.title, daysLeft: warn });
    }
    if (task.alarmMinutes != null) {
      const at = new Date(dueInstant(inst, task).getTime() - task.alarmMinutes * 60_000);
      if (at > now) {
        out.push({
          kind: 'lastMinutes',
          id: `alarm-${inst.id}`,
          fireAt: at,
          day: inst.windowEnd,
          title: task.title,
          minutes: task.alarmMinutes,
        });
      }
    }
  }

  // Time blocks: ask for the result when one ends, and "what's next?" when a class ends into free time.
  for (const b of data.blocks ?? []) {
    if (b.status !== 'running') continue;
    const at = parseTimestamp(b.endAt);
    if (at <= now) continue;
    const name = b.kind === 'task' ? (b.taskTitle ?? '') : b.kind === 'other' ? (b.label ?? '') : b.kind;
    out.push({ kind: 'blockEnd', id: `block-${b.id}`, fireAt: at, day: today, blockId: b.id, name, isTask: b.kind === 'task' });
  }
  if (data.settings.onboarded) {
    for (const e of classEndsWithGap(data, now, 3)) {
      out.push({ kind: 'classEnd', id: `class-end-${e.day}-${e.course.id}`, fireAt: e.at, day: e.day, course: e.course.name });
    }
  }

  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, MAX_SCHEDULED);
}
