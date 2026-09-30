import type { TaskCardModel } from '../components/TaskCard';
import { addDays } from '../domain/dates';
import type { TodayItem } from '../domain/today';
import type { LocalDate } from '../domain/types';
import { fmtMinutes, fmtRelativeDay, fmtShortDate, fmtWeekday } from '../i18n/format';
import { t } from '../i18n/tr';

/** Secondary line on a task card, following the design's states. */
export function cardSub(i: Omit<TodayItem, 'group'>, today: LocalDate): string {
  const inst = i.instance;
  if (inst.status === 'done') return t.card.done;
  if (inst.status === 'missed') {
    return inst.windowEnd === addDays(today, -1) ? t.card.missedAt : fmtShortDate(inst.windowEnd);
  }
  if (inst.scheduledDate > today) return t.card.deferredTo(fmtRelativeDay(inst.scheduledDate, today));
  if (i.heat === 4) return i.deferState === 'lastChance' ? t.card.lastChance : t.card.lastDay;
  if (i.heat === 3) return t.card.tooMuch(fmtMinutes(i.remainingMinutes));
  if (inst.progress > 0) return t.card.remaining(i.remainingPct, fmtMinutes(i.remainingMinutes));
  if (i.task.kind === 'weekly') return t.card.endsOn(fmtWeekday(inst.windowEnd));
  return t.card.daysLeft(Math.max(0, i.daysLeft - 1) || 1);
}

export function toCardModel(i: Omit<TodayItem, 'group'>, today: LocalDate, leaving = false): TaskCardModel {
  return {
    id: i.instance.id,
    title: i.task.title,
    courseCode: i.course?.shortName ?? null,
    courseColor: i.course?.color ?? null,
    heat: i.heat,
    progress: i.instance.progress,
    sub: cardSub(i, today),
    carried: i.carried,
    done: i.instance.status === 'done',
    missed: i.instance.status === 'missed',
    locked: i.heat === 4 && i.deferState === 'locked',
    leaving,
  };
}

/** "Cuma rahat geçecek." — the day after work that no longer needs doing. */
export function reliefLine(i: Omit<TodayItem, 'group'>, today: LocalDate): string {
  if (i.instance.windowEnd > today) return t.toast.relief(fmtWeekday(i.instance.windowEnd));
  return t.toast.reliefDefault;
}
