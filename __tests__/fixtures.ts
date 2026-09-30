import { DEFAULT_SETTINGS } from '../src/domain/settings';
import type { AppData, Course, Settings, Task, TaskInstance } from '../src/domain/types';

export const settings: Settings = { ...DEFAULT_SETTINGS, onboarded: true };

export function course(over: Partial<Course> = {}): Course {
  return {
    id: 1,
    name: 'Algoritmalar',
    shortName: 'ALG',
    color: '#B4A2CC',
    source: 'manual',
    calendarEventId: null,
    weekday: 3, // Wednesday
    startTime: '13:00',
    endTime: '14:50',
    ...over,
  };
}

export function weeklyTask(over: Partial<Task> = {}): Task {
  return {
    id: 10,
    kind: 'weekly',
    title: 'Ders tekrarı',
    courseId: 1,
    estimatedMinutes: 60,
    dueAt: null,
    dailyBudgetMinutes: null,
    warnDays: null,
    createdAt: '2026-09-28T10:00:00',
    archivedAt: null,
    ...over,
  };
}

export function deadlineTask(over: Partial<Task> = {}): Task {
  return {
    id: 20,
    kind: 'deadline',
    title: 'Proje raporu',
    courseId: null,
    estimatedMinutes: 600,
    dueAt: '2026-11-29',
    dailyBudgetMinutes: 45,
    warnDays: 5,
    createdAt: '2026-09-30T09:00:00',
    archivedAt: null,
    ...over,
  };
}

export function instance(over: Partial<TaskInstance> = {}): TaskInstance {
  return {
    id: 100,
    taskId: 10,
    windowStart: '2026-09-30',
    windowEnd: '2026-10-06',
    scheduledDate: '2026-09-30',
    progress: 0,
    status: 'active',
    deferCount: 0,
    lockUnlockedOn: null,
    ...over,
  };
}

export function appData(over: Partial<AppData> = {}): AppData {
  return {
    courses: [],
    tasks: [],
    instances: [],
    progressLogs: [],
    deferLogs: [],
    settings,
    ...over,
  };
}
