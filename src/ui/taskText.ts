import type { TaskCardModel } from '../components/TaskCard';
import { dueInstant } from '../domain/dates';
import type { TodayItem } from '../domain/today';
import type { LocalDate } from '../domain/types';
import { fmtCountdown, fmtMinutes, fmtRelativeDay, fmtShortDate, fmtWeekday } from '../i18n/format';
import { t } from '../i18n/tr';

/** '2 gün 15 sa 50 dk kaldı' until the work is due, or 'Süre doldu'. */
export function timeLeftLine(i: Pick<TodayItem, 'instance' | 'task'>, now: Date): string {
  const left = fmtCountdown(now, dueInstant(i.instance, i.task));
  return left ? t.card.timeLeft(left) : t.card.timeUp;
}

/** Secondary line on a task card, following the design's states. */
export function cardSub(i: Omit<TodayItem, 'group'>, today: LocalDate, now: Date): string {
  const inst = i.instance;
  if (inst.status === 'done') return t.card.done;
  if (inst.status === 'missed') {
    return fmtShortDate(inst.windowEnd);
  }
  if (i.overdue) return t.card.overdue(i.overdueDays);
  if (inst.scheduledDate > today) return t.card.deferredTo(fmtRelativeDay(inst.scheduledDate, today));
  if (i.heat === 4) return i.deferState === 'lastChance' ? t.card.lastChance : t.card.lastDay;
  const left = timeLeftLine(i, now);
  if (i.shareMinutes === 0 && i.doneTodayMinutes > 0) return `${t.card.doneForToday} · ${left}`;
  if (inst.progress > 0) return `${t.card.remainingShort(fmtMinutes(i.remainingMinutes))} · ${left}`;
  return left;
}

export function toCardModel(i: Omit<TodayItem, 'group'>, today: LocalDate, now: Date, leaving = false): TaskCardModel {
  return {
    id: i.instance.id,
    title: i.task.title,
    courseCode: i.course?.shortName ?? null,
    courseColor: i.course?.color ?? null,
    heat: i.heat,
    progress: i.instance.progress,
    sub: cardSub(i, today, now),
    carried: i.carried,
    done: i.instance.status === 'done',
    missed: i.instance.status === 'missed',
    locked: i.heat === 4 && i.deferState === 'locked' && !i.overdue,
    leaving,
  };
}

/** "Cuma rahat geçecek." — the day after work that no longer needs doing. */
export function reliefLine(i: Omit<TodayItem, 'group'>, today: LocalDate): string {
  if (i.instance.windowEnd > today) return t.toast.relief(fmtWeekday(i.instance.windowEnd));
  return t.toast.reliefDefault;
}
