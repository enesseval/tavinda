import { parseSettings, serializeSetting, type SettingKey } from '../domain/settings';
import type { ReconcileResult } from '../domain/reconcile';
import type {
  AppData,
  Course,
  DeferLog,
  LocalDate,
  NewInstance,
  ProgressLog,
  Settings,
  Task,
  TaskInstance,
  TimeBlock,
} from '../domain/types';
import type { Db, SqlValue } from './types';

interface CourseRow {
  id: number;
  name: string;
  short_name: string;
  color: string;
  source: 'calendar' | 'manual';
  calendar_event_id: string | null;
  weekday: number;
  start_time: string;
  end_time: string;
}

interface TaskRow {
  id: number;
  kind: 'weekly' | 'deadline';
  title: string;
  course_id: number | null;
  estimated_minutes: number;
  due_at: string | null;
  daily_budget_minutes: number | null;
  warn_days: number | null;
  created_at: string;
  archived_at: string | null;
  due_time: string | null;
  alarm_minutes: number | null;
}

interface BlockRow {
  id: number;
  start_at: string;
  end_at: string;
  kind: TimeBlock['kind'];
  label: string | null;
  instance_id: number | null;
  task_title: string | null;
  from_pct: number | null;
  to_pct: number | null;
  status: 'running' | 'done';
  created_at: string;
}

interface InstanceRow {
  id: number;
  task_id: number;
  window_start: string;
  window_end: string;
  scheduled_date: string;
  progress: number;
  status: 'active' | 'done' | 'missed';
  defer_count: number;
  lock_unlocked_on: string | null;
}

interface ProgressLogRow {
  id: number;
  instance_id: number;
  logical_date: string;
  from_pct: number;
  to_pct: number;
  created_at: string;
}

interface DeferLogRow {
  id: number;
  instance_id: number;
  logical_date: string;
  remaining_pct: number;
  created_at: string;
}

const toCourse = (r: CourseRow): Course => ({
  id: r.id,
  name: r.name,
  shortName: r.short_name,
  color: r.color,
  source: r.source,
  calendarEventId: r.calendar_event_id,
  weekday: r.weekday,
  startTime: r.start_time,
  endTime: r.end_time,
});

const toTask = (r: TaskRow): Task => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  courseId: r.course_id,
  estimatedMinutes: r.estimated_minutes,
  dueAt: r.due_at,
  dailyBudgetMinutes: r.daily_budget_minutes,
  warnDays: r.warn_days,
  createdAt: r.created_at,
  archivedAt: r.archived_at,
  dueTime: r.due_time,
  alarmMinutes: r.alarm_minutes,
});

const toBlock = (r: BlockRow): TimeBlock => ({
  id: r.id,
  startAt: r.start_at,
  endAt: r.end_at,
  kind: r.kind,
  label: r.label,
  instanceId: r.instance_id,
  taskTitle: r.task_title,
  fromPct: r.from_pct,
  toPct: r.to_pct,
  status: r.status,
  createdAt: r.created_at,
});

const toInstance = (r: InstanceRow): TaskInstance => ({
  id: r.id,
  taskId: r.task_id,
  windowStart: r.window_start,
  windowEnd: r.window_end,
  scheduledDate: r.scheduled_date,
  progress: r.progress,
  status: r.status,
  deferCount: r.defer_count,
  lockUnlockedOn: r.lock_unlocked_on,
});

const toProgressLog = (r: ProgressLogRow): ProgressLog => ({
  id: r.id,
  instanceId: r.instance_id,
  logicalDate: r.logical_date,
  fromPct: r.from_pct,
  toPct: r.to_pct,
  createdAt: r.created_at,
});

const toDeferLog = (r: DeferLogRow): DeferLog => ({
  id: r.id,
  instanceId: r.instance_id,
  logicalDate: r.logical_date,
  remainingPct: r.remaining_pct,
  createdAt: r.created_at,
});

export function loadSettings(db: Db): Settings {
  return parseSettings(db.all<{ key: string; value: string }>('SELECT key, value FROM settings'));
}

export function loadAll(db: Db): AppData {
  return {
    courses: db.all<CourseRow>('SELECT * FROM courses ORDER BY weekday, start_time, id').map(toCourse),
    tasks: db.all<TaskRow>('SELECT * FROM tasks WHERE archived_at IS NULL ORDER BY id').map(toTask),
    instances: db.all<InstanceRow>('SELECT * FROM task_instances ORDER BY id').map(toInstance),
    progressLogs: db.all<ProgressLogRow>('SELECT * FROM progress_logs ORDER BY id').map(toProgressLog),
    deferLogs: db.all<DeferLogRow>('SELECT * FROM defer_logs ORDER BY id').map(toDeferLog),
    blocks: db.all<BlockRow>('SELECT * FROM time_blocks ORDER BY start_at, id').map(toBlock),
    settings: loadSettings(db),
  };
}

export function setSetting<K extends SettingKey>(db: Db, key: K, value: Settings[K]): void {
  db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    key,
    serializeSetting(key, value),
  ]);
}

export type NewCourse = Omit<Course, 'id'>;

export function insertCourse(db: Db, c: NewCourse): number {
  return db.run(
    `INSERT INTO courses (name, short_name, color, source, calendar_event_id, weekday, start_time, end_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [c.name, c.shortName, c.color, c.source, c.calendarEventId, c.weekday, c.startTime, c.endTime],
  ).lastInsertRowId;
}

/** Deletes a course together with the weekly tasks bound to it. */
export function deleteCourse(db: Db, id: number): void {
  db.transaction(() => {
    db.run(`DELETE FROM tasks WHERE kind = 'weekly' AND course_id = ?`, [id]);
    db.run('DELETE FROM courses WHERE id = ?', [id]);
  });
}

export type NewTask = Omit<Task, 'id' | 'archivedAt' | 'dueTime' | 'alarmMinutes'> &
  Partial<Pick<Task, 'dueTime' | 'alarmMinutes'>>;

export function insertTask(db: Db, t: NewTask): number {
  return db.run(
    `INSERT INTO tasks (kind, title, course_id, estimated_minutes, due_at, daily_budget_minutes, warn_days, created_at,
       due_time, alarm_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      t.kind,
      t.title,
      t.courseId,
      t.estimatedMinutes,
      t.dueAt,
      t.dailyBudgetMinutes,
      t.warnDays,
      t.createdAt,
      t.dueTime ?? null,
      t.alarmMinutes ?? null,
    ],
  ).lastInsertRowId;
}

export function updateTaskRow(db: Db, t: Task): void {
  db.run(
    `UPDATE tasks SET title = ?, course_id = ?, estimated_minutes = ?, due_at = ?, daily_budget_minutes = ?, warn_days = ?,
       due_time = ?, alarm_minutes = ?
     WHERE id = ?`,
    [t.title, t.courseId, t.estimatedMinutes, t.dueAt, t.dailyBudgetMinutes, t.warnDays, t.dueTime, t.alarmMinutes, t.id],
  );
}

export type NewBlock = Omit<TimeBlock, 'id'>;

export function insertBlock(db: Db, b: NewBlock): number {
  return db.run(
    `INSERT INTO time_blocks (start_at, end_at, kind, label, instance_id, task_title, from_pct, to_pct, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [b.startAt, b.endAt, b.kind, b.label, b.instanceId, b.taskTitle, b.fromPct, b.toPct, b.status, b.createdAt],
  ).lastInsertRowId;
}

export function updateBlock(db: Db, b: TimeBlock): void {
  db.run(
    `UPDATE time_blocks SET start_at = ?, end_at = ?, kind = ?, label = ?, instance_id = ?, task_title = ?, from_pct = ?,
       to_pct = ?, status = ? WHERE id = ?`,
    [b.startAt, b.endAt, b.kind, b.label, b.instanceId, b.taskTitle, b.fromPct, b.toPct, b.status, b.id],
  );
}

export function deleteBlock(db: Db, id: number): void {
  db.run('DELETE FROM time_blocks WHERE id = ?', [id]);
}

export function deleteTask(db: Db, id: number): void {
  db.run('DELETE FROM tasks WHERE id = ?', [id]);
}

export function insertInstance(db: Db, i: NewInstance): number {
  return db.run(
    `INSERT INTO task_instances (task_id, window_start, window_end, scheduled_date, progress, status, defer_count, lock_unlocked_on)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [i.taskId, i.windowStart, i.windowEnd, i.scheduledDate, i.progress, i.status, i.deferCount, i.lockUnlockedOn],
  ).lastInsertRowId;
}

export function writeInstance(db: Db, i: TaskInstance): void {
  db.run(
    `UPDATE task_instances SET window_start = ?, window_end = ?, scheduled_date = ?, progress = ?, status = ?,
       defer_count = ?, lock_unlocked_on = ? WHERE id = ?`,
    [i.windowStart, i.windowEnd, i.scheduledDate, i.progress, i.status, i.deferCount, i.lockUnlockedOn, i.id],
  );
}

export function getInstance(db: Db, id: number): TaskInstance | null {
  const r = db.get<InstanceRow>('SELECT * FROM task_instances WHERE id = ?', [id]);
  return r ? toInstance(r) : null;
}

export function applyReconcileResult(db: Db, result: ReconcileResult): void {
  if (!result.create.length && !result.update.length) return;
  db.transaction(() => {
    for (const u of result.update) {
      const sets: string[] = [];
      const params: SqlValue[] = [];
      if (u.changes.status) {
        sets.push('status = ?');
        params.push(u.changes.status);
      }
      if (u.changes.scheduledDate) {
        sets.push('scheduled_date = ?');
        params.push(u.changes.scheduledDate);
      }
      if (sets.length) db.run(`UPDATE task_instances SET ${sets.join(', ')} WHERE id = ?`, [...params, u.id]);
    }
    for (const c of result.create) {
      db.run(
        `INSERT OR IGNORE INTO task_instances (task_id, window_start, window_end, scheduled_date, progress, status, defer_count, lock_unlocked_on)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.taskId, c.windowStart, c.windowEnd, c.scheduledDate, c.progress, c.status, c.deferCount, c.lockUnlockedOn],
      );
    }
  });
}

export interface WriteReceipt {
  before: TaskInstance;
  progressLogIds: number[];
  deferLogIds: number[];
}

/** Progress change = instance update + log insert in one transaction. */
export function saveProgressTx(
  db: Db,
  before: TaskInstance,
  after: TaskInstance,
  log: { logicalDate: LocalDate; fromPct: number; toPct: number },
  createdAt: string,
): WriteReceipt {
  const receipt: WriteReceipt = { before, progressLogIds: [], deferLogIds: [] };
  db.transaction(() => {
    writeInstance(db, after);
    receipt.progressLogIds.push(
      db.run('INSERT INTO progress_logs (instance_id, logical_date, from_pct, to_pct, created_at) VALUES (?, ?, ?, ?, ?)', [
        after.id,
        log.logicalDate,
        log.fromPct,
        log.toPct,
        createdAt,
      ]).lastInsertRowId,
    );
  });
  return receipt;
}

export function saveDeferTx(
  db: Db,
  before: TaskInstance,
  after: TaskInstance,
  logicalDate: LocalDate,
  remainingPct: number,
  createdAt: string,
): WriteReceipt {
  const receipt: WriteReceipt = { before, progressLogIds: [], deferLogIds: [] };
  db.transaction(() => {
    writeInstance(db, after);
    receipt.deferLogIds.push(
      db.run('INSERT INTO defer_logs (instance_id, logical_date, remaining_pct, created_at) VALUES (?, ?, ?, ?)', [
        after.id,
        logicalDate,
        remainingPct,
        createdAt,
      ]).lastInsertRowId,
    );
  });
  return receipt;
}

/** Reverts a progress or defer write. */
export function undoWrite(db: Db, receipt: WriteReceipt): void {
  db.transaction(() => {
    writeInstance(db, receipt.before);
    for (const id of receipt.progressLogIds) db.run('DELETE FROM progress_logs WHERE id = ?', [id]);
    for (const id of receipt.deferLogIds) db.run('DELETE FROM defer_logs WHERE id = ?', [id]);
  });
}

/** Deletes all user data but keeps the schema. */
export function wipeAll(db: Db): void {
  db.transaction(() => {
    db.run('DELETE FROM time_blocks');
    db.run('DELETE FROM defer_logs');
    db.run('DELETE FROM progress_logs');
    db.run('DELETE FROM task_instances');
    db.run('DELETE FROM tasks');
    db.run('DELETE FROM courses');
    db.run('DELETE FROM settings');
  });
}
