import { addDays, logicalDate, logicalDateTime } from './dates';
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

  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, MAX_SCHEDULED);
}
