import * as Calendar from 'expo-calendar/legacy';
import { Linking } from 'react-native';

import { addDays, dateAtTime, isoWeekday, minutesToTime, toLocalDate } from '../domain/dates';
import type { LocalDate } from '../domain/types';

export type CalendarPermission = 'granted' | 'denied' | 'undetermined';

export async function getCalendarPermission(): Promise<CalendarPermission> {
  try {
    const p = await Calendar.getCalendarPermissionsAsync();
    if (p.granted) return 'granted';
    return p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function requestCalendarPermission(): Promise<boolean> {
  try {
    const p = await Calendar.requestCalendarPermissionsAsync();
    return p.granted;
  } catch {
    return false;
  }
}

export function openAppSettings(): void {
  Linking.openSettings().catch(() => undefined);
}

export interface DeviceCalendar {
  id: string;
  title: string;
  color: string;
  source: string;
}

export async function listCalendars(): Promise<DeviceCalendar[]> {
  try {
    const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    return cals.map((c) => ({
      id: c.id,
      title: c.title,
      color: c.color ?? '#A8A399',
      source: c.source?.name ?? '',
    }));
  } catch {
    return [];
  }
}

export interface ClassCandidate {
  key: string;
  title: string;
  weekday: number;
  startTime: string;
  endTime: string;
  eventId: string;
  occurrences: number;
  recurring: boolean;
}

function timeOf(v: string | Date): string {
  const d = typeof v === 'string' ? new Date(v) : v;
  return minutesToTime(d.getHours() * 60 + d.getMinutes());
}

/**
 * Reads events around `today` and groups them by title + weekday + start
 * time. Weekly recurring or repeated slots become course candidates.
 */
export async function findClassCandidates(calendarIds: string[], today: LocalDate): Promise<ClassCandidate[]> {
  let ids = calendarIds;
  if (!ids.length) ids = (await listCalendars()).map((c) => c.id);
  if (!ids.length) return [];
  const from = dateAtTime(addDays(today, -14), '00:00');
  const to = dateAtTime(addDays(today, 21), '23:59');
  let events: Calendar.Event[] = [];
  try {
    events = await Calendar.getEventsAsync(ids, from, to);
  } catch {
    return [];
  }

  const groups = new Map<string, ClassCandidate>();
  for (const e of events) {
    if (e.allDay || !e.title?.trim()) continue;
    const start = new Date(e.startDate);
    const end = new Date(e.endDate);
    if (end.getTime() - start.getTime() > 6 * 3600_000) continue;
    const weekday = isoWeekday(toLocalDate(start));
    const startTime = timeOf(start);
    const title = e.title.trim();
    const key = `${title.toLocaleLowerCase('tr-TR')}|${weekday}|${startTime}`;
    const recurring = e.recurrenceRule?.frequency === Calendar.Frequency.WEEKLY;
    const cur = groups.get(key);
    if (cur) {
      cur.occurrences += 1;
      cur.recurring = cur.recurring || recurring;
    } else {
      groups.set(key, {
        key,
        title,
        weekday,
        startTime,
        endTime: timeOf(end),
        eventId: e.id,
        occurrences: 1,
        recurring,
      });
    }
  }
  return [...groups.values()]
    .filter((g) => g.recurring || g.occurrences >= 2)
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
}
