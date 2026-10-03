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
  /** Deadline hour; null means 23:59. */
  dueTime: LocalTime | null;
  /** Minutes before the deadline for an extra "last minutes" alarm; null = off. */
  alarmMinutes: number | null;
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

export type BlockKind = 'sleep' | 'meal' | 'rest' | 'other' | 'task';

/** A stretch of the day the user said they would spend on something. */
export interface TimeBlock {
  id: number;
  /** Local timestamps 'YYYY-MM-DDTHH:mm:ss'. */
  startAt: string;
  endAt: string;
  kind: BlockKind;
  /** Free text for 'other'. */
  label: string | null;
  instanceId: number | null;
  /** Task title at the time, so history keeps the name. */
  taskTitle: string | null;
  fromPct: number | null;
  toPct: number | null;
  status: 'running' | 'done';
  createdAt: string;
}

export type DayHoursMode = 'all' | 'same' | 'perDay';

/** When the user's day runs; gaps are only asked about inside these hours. */
export interface DayHours {
  mode: DayHoursMode;
  /** Used for 'same'. */
  start: LocalTime;
  end: LocalTime;
  /** ISO weekday order Mon…Sun, used for 'perDay'. */
  perDay: { start: LocalTime; end: LocalTime }[];
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
  dayHours: DayHours;
  /** Debug time travel: milliseconds added to the real clock. */
  timeOffsetMs: number;
}

export interface AppData {
  courses: Course[];
  tasks: Task[];
  instances: TaskInstance[];
  progressLogs: ProgressLog[];
  deferLogs: DeferLog[];
  blocks: TimeBlock[];
  settings: Settings;
}
