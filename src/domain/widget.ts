import { dueInstant, logicalDate, toLocalTimestamp } from './dates';
import { compareHottest } from './heat';
import { buildTodayModel, type TodayItem } from './today';
import type { AppData, HeatLevel, LocalDate } from './types';

export interface WidgetTask {
  instanceId: number;
  title: string;
  course: string | null;
  courseColor: string | null;
  heat: HeatLevel;
  percent: number;
  remainingMinutes: number;
  shareMinutes: number;
  windowEnd: LocalDate;
  /** When the work is due, local timestamp. */
  dueAt: string;
  overdue: boolean;
  locked: boolean;
}

export interface WidgetSnapshot {
  version: 1;
  generatedAt: string;
  logicalDate: LocalDate;
  todayMinutes: number;
  /** Open work today (incl. overdue). */
  openCount: number;
  hottest: WidgetTask | null;
  top: WidgetTask[];
}

function toWidgetTask(i: TodayItem): WidgetTask {
  return {
    instanceId: i.instance.id,
    title: i.task.title,
    course: i.course?.shortName ?? null,
    courseColor: i.course?.color ?? null,
    heat: i.heat,
    percent: i.instance.progress,
    remainingMinutes: i.remainingMinutes,
    shareMinutes: i.shareMinutes,
    windowEnd: i.instance.windowEnd,
    dueAt: toLocalTimestamp(dueInstant(i.instance, i.task)),
    overdue: i.overdue,
    locked: !i.canDefer,
  };
}

/**
 * Plain JSON for a future widget target: hottest task and today's top 3.
 * Pure: `now` and the data are passed in.
 */
export function getWidgetSnapshot(now: Date, data: AppData): WidgetSnapshot {
  const today = logicalDate(now, data.settings.cutoff);
  const model = buildTodayModel(data, today);
  const live = model.groups
    .filter((g) => g.key === 'overdue' || g.key === 'last' || g.key === 'today' || g.key === 'carried')
    .flatMap((g) => g.items);
  const all = (model.hero ? [model.hero, ...live] : live).sort(compareHottest);
  return {
    version: 1,
    generatedAt: toLocalTimestamp(now),
    logicalDate: today,
    todayMinutes: model.loadMinutes,
    openCount: all.length,
    // Same pick as the Today hero: on-time work first, overdue only when nothing else is open.
    hottest: model.hero ? toWidgetTask(model.hero) : all[0] ? toWidgetTask(all[0]) : null,
    top: all.slice(0, 3).map(toWidgetTask),
  };
}
