/** 'YYYY-MM-DD' in the device timezone. Never derived from UTC. */
export type LocalDate = string;

/** 'HH:mm', 24h. */
export type LocalTime = string;

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export type TaskKind = 'weekly' | 'deadline';
export type InstanceStatus = 'active' | 'done' | 'missed';
export type LockMode = 'strict' | 'flexible';
export type ThemePref = 'system' | 'light' | 'dark';

export interface Course {
  id: number;
  name: string;
  shortName: string;
  color: string;
  source: 'calendar' | 'manual';
  calendarEventId: string | null;
  /** ISO weekday, 1 = Monday … 7 = Sunday. */
  weekday: number;
  startTime: LocalTime;
  endTime: LocalTime;
}

export interface Task {
  id: number;
  kind: TaskKind;
  title: string;
  courseId: number | null;
  /** Weekly: minutes per window. Deadline: total minutes. */
  estimatedMinutes: number;
  /** Deadline tasks only. */
  dueAt: LocalDate | null;
  dailyBudgetMinutes: number | null;
  warnDays: number | null;
  /** Local timestamp 'YYYY-MM-DDTHH:mm:ss'. */
  createdAt: string;
  archivedAt: string | null;
}

export interface TaskInstance {
  id: number;
  taskId: number;
  windowStart: LocalDate;
  windowEnd: LocalDate;
  scheduledDate: LocalDate;
  /** 0–100. */
  progress: number;
  status: InstanceStatus;
  deferCount: number;
  lockUnlockedOn: LocalDate | null;
}

export type NewInstance = Omit<TaskInstance, 'id'>;

export interface ProgressLog {
  id: number;
  instanceId: number;
  logicalDate: LocalDate;
  fromPct: number;
  toPct: number;
  createdAt: string;
}

export interface DeferLog {
  id: number;
  instanceId: number;
  logicalDate: LocalDate;
  remainingPct: number;
  createdAt: string;
}

export interface Settings {
  cutoff: LocalTime;
  lockMode: LockMode;
  warnDays: number;
  dailyBudgetMinutes: number;
  morningTime: LocalTime;
  theme: ThemePref;
  calendarIds: string[];
  showWeekend: boolean;
  onboarded: boolean;
  /** Debug time travel: milliseconds added to the real clock. */
  timeOffsetMs: number;
}

export interface AppData {
  courses: Course[];
  tasks: Task[];
  instances: TaskInstance[];
  progressLogs: ProgressLog[];
  deferLogs: DeferLog[];
  settings: Settings;
}
