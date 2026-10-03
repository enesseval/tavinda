import { getDb } from '../db/client';
import {
  applyReconcileResult,
  deleteCourse as deleteCourseRow,
  deleteTask as deleteTaskRow,
  getInstance,
  insertCourse,
  insertTask,
  loadAll,
  setCourseShortName,
  updateCourse,
  insertBlock,
  updateBlock,
  deleteBlock as deleteBlockRow,
  saveDeferTx,
  saveProgressTx,
  setSetting as setSettingRow,
  undoWrite,
  updateTaskRow,
  wipeAll,
  writeInstance,
  type NewCourse,
  type WriteReceipt,
} from '../db/repo';
import { seedDemo } from '../db/seed';
import { dedupeShortNames } from '../ui/courseDrafts';
import { applyDefer, applyProgress, isReconcileNoop, reconcile, toLocalTimestamp, type SettingKey } from '../domain';
import type { BlockKind, LocalDate, Settings, Task, TimeBlock } from '../domain/types';
import { endedBlocks, parseTimestamp, runningBlock } from '../domain/schedule';
import { getNow, getToday } from './clock';
import { refresh } from './data';

/** Local timestamp whose date part is the logical day (so 02:30 work lands on yesterday). */
function createdStamp(): string {
  return `${getToday()}T${toLocalTimestamp(getNow()).slice(11)}`;
}

/** Creates missing instances, carries and closes old ones. Safe to call any time. */
export function runReconcile(today: LocalDate = getToday()): void {
  const db = getDb();
  const data = loadAll(db);
  const result = reconcile({ today, courses: data.courses, tasks: data.tasks, instances: data.instances });
  if (!isReconcileNoop(result)) applyReconcileResult(db, result);
  closePassiveBlocks(data.blocks);
  refresh();
}

/** Meal, rest, sleep and "other" blocks close by themselves when their time is up. */
function closePassiveBlocks(blocks: TimeBlock[]): void {
  const db = getDb();
  for (const b of endedBlocks(blocks, getNow())) {
    if (b.kind !== 'task') updateBlock(db, { ...b, status: 'done' });
  }
}

export interface BlockInput {
  kind: BlockKind;
  label: string | null;
  instanceId: number | null;
  end: Date;
}

/** "I'll be busy with this until …" — starts now. */
export function startBlock(input: BlockInput): number {
  const db = getDb();
  const now = getNow();
  const data = loadAll(db);
  closePassiveBlocks(data.blocks);
  // Starting something new ends whatever was running. A task block still asks for its result.
  const running = runningBlock(data.blocks, now);
  if (running) {
    updateBlock(db, { ...running, endAt: toLocalTimestamp(now), status: running.kind === 'task' ? 'running' : 'done' });
  }
  const inst = input.instanceId != null ? data.instances.find((i) => i.id === input.instanceId) : undefined;
  const task = inst ? data.tasks.find((x) => x.id === inst.taskId) : undefined;
  const id = insertBlock(db, {
    startAt: toLocalTimestamp(now),
    endAt: toLocalTimestamp(input.end),
    kind: input.kind,
    label: input.label?.trim() || null,
    instanceId: inst?.id ?? null,
    taskTitle: task?.title ?? null,
    fromPct: inst?.progress ?? null,
    toPct: null,
    status: 'running',
    createdAt: toLocalTimestamp(now),
  });
  refresh();
  return id;
}

/**
 * Closes a block. For a task block `pct` is the task's new progress: it is
 * saved like any progress entry and written on the block ("%40 tamamlandı").
 * Ending early trims the block to now.
 */
export function finishBlock(id: number, pct?: number): void {
  const db = getDb();
  const data = loadAll(db);
  const b = data.blocks.find((x) => x.id === id);
  if (!b) return;
  const now = getNow();
  const endAt = parseTimestamp(b.endAt) > now ? toLocalTimestamp(now) : b.endAt;
  let toPct = b.toPct;
  if (b.kind === 'task' && b.instanceId != null && pct != null) {
    saveProgress(b.instanceId, pct);
    toPct = pct;
  }
  updateBlock(db, { ...b, endAt, toPct, status: 'done' });
  refresh();
}

export function extendBlock(id: number, minutes: number): void {
  const db = getDb();
  const b = loadAll(db).blocks.find((x) => x.id === id);
  if (!b) return;
  const base = Math.max(parseTimestamp(b.endAt).getTime(), getNow().getTime());
  updateBlock(db, { ...b, endAt: toLocalTimestamp(new Date(base + minutes * 60_000)), status: 'running' });
  refresh();
}

export function deleteBlock(id: number): void {
  deleteBlockRow(getDb(), id);
  refresh();
}

export function saveProgress(instanceId: number, pct: number): WriteReceipt | null {
  const db = getDb();
  const inst = getInstance(db, instanceId);
  if (!inst) return null;
  const change = applyProgress(inst, pct, getToday());
  if (!change.log) return null;
  const receipt = saveProgressTx(db, inst, change.instance, change.log, toLocalTimestamp(getNow()));
  refresh();
  return receipt;
}

export type DeferOutcome = { ok: true; receipt: WriteReceipt; remainingPct: number } | { ok: false };

export function deferInstance(instanceId: number): DeferOutcome {
  const db = getDb();
  const inst = getInstance(db, instanceId);
  if (!inst) return { ok: false };
  const today = getToday();
  const settings = loadAll(db).settings;
  const result = applyDefer(inst, today, settings);
  if (!result) return { ok: false };
  const receipt = saveDeferTx(db, inst, result.instance, today, result.remainingPct, toLocalTimestamp(getNow()));
  refresh();
  return { ok: true, receipt, remainingPct: result.remainingPct };
}

export function undo(receipt: WriteReceipt): void {
  undoWrite(getDb(), receipt);
  refresh();
}

export interface WeeklyInput {
  title: string;
  courseId: number;
  estimatedMinutes: number;
}

export interface DeadlineInput {
  title: string;
  courseId: number | null;
  estimatedMinutes: number;
  dueAt: LocalDate;
  dueTime: string;
  alarmMinutes: number | null;
  dailyBudgetMinutes: number;
  warnDays: number;
}

export function createWeeklyTask(input: WeeklyInput): number {
  const id = insertTask(getDb(), {
    kind: 'weekly',
    title: input.title.trim(),
    courseId: input.courseId,
    estimatedMinutes: input.estimatedMinutes,
    dueAt: null,
    dailyBudgetMinutes: null,
    warnDays: null,
    createdAt: createdStamp(),
  });
  runReconcile();
  return id;
}

export function createDeadlineTask(input: DeadlineInput): number {
  const id = insertTask(getDb(), {
    kind: 'deadline',
    title: input.title.trim(),
    courseId: input.courseId,
    estimatedMinutes: input.estimatedMinutes,
    dueAt: input.dueAt,
    dueTime: input.dueTime,
    alarmMinutes: input.alarmMinutes,
    dailyBudgetMinutes: input.dailyBudgetMinutes,
    warnDays: input.warnDays,
    createdAt: createdStamp(),
  });
  runReconcile();
  return id;
}

/**
 * Saves edits. Deadline: the open instance follows the new due date.
 * Weekly: moving to another course drops untouched open windows so the next
 * reconcile opens the right one.
 */
export function updateTask(task: Task, patch: Partial<Omit<Task, 'id' | 'kind' | 'createdAt' | 'archivedAt'>>): void {
  const db = getDb();
  const next: Task = { ...task, ...patch, title: (patch.title ?? task.title).trim() };
  const today = getToday();
  db.transaction(() => {
    updateTaskRow(db, next);
    const instances = loadAll(db).instances.filter((i) => i.taskId === task.id && i.status === 'active');
    if (next.kind === 'deadline' && next.dueAt && next.dueAt !== task.dueAt) {
      for (const i of instances) writeInstance(db, { ...i, windowEnd: next.dueAt, lockUnlockedOn: null });
    }
    if (next.kind === 'weekly' && next.courseId !== task.courseId) {
      for (const i of instances) {
        if (i.progress === 0) db.run('DELETE FROM task_instances WHERE id = ?', [i.id]);
      }
    }
  });
  runReconcile(today);
}

export function deleteTask(id: number): void {
  deleteTaskRow(getDb(), id);
  refresh();
}

export function addCourses(courses: NewCourse[]): number[] {
  const db = getDb();
  const ids: number[] = [];
  db.transaction(() => {
    for (const c of courses) ids.push(insertCourse(db, c));
  });
  runReconcile();
  return ids;
}

export function deleteCourse(id: number): void {
  deleteCourseRow(getDb(), id);
  refresh();
}

export interface CourseSlotInput {
  /** Existing course row; omitted for a new day. */
  id?: number;
  weekday: number;
  startTime: string;
  endTime: string;
}

/**
 * Saves one course with all of its weekly slots. Existing slots keep their id
 * (and their weekly tasks); slots no longer listed are removed with their tasks.
 */
export function saveCourseGroup(input: {
  existingIds: number[];
  name: string;
  shortName: string;
  color: string;
  slots: CourseSlotInput[];
}): void {
  const db = getDb();
  const keep = new Set(input.slots.map((s) => s.id).filter((x): x is number => x != null));
  db.transaction(() => {
    for (const id of input.existingIds) if (!keep.has(id)) deleteCourseRow(db, id);
    const rows = loadAll(db).courses;
    for (const slot of input.slots) {
      const base = {
        name: input.name.trim(),
        shortName: input.shortName.trim(),
        color: input.color,
        weekday: slot.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
      };
      const cur = slot.id != null ? rows.find((r) => r.id === slot.id) : undefined;
      if (cur) updateCourse(db, { ...cur, ...base });
      else insertCourse(db, { ...base, source: 'manual', calendarEventId: null });
    }
  });
  runReconcile();
}

export function deleteCourseGroup(ids: number[]): void {
  const db = getDb();
  db.transaction(() => {
    for (const id of ids) deleteCourseRow(db, id);
  });
  refresh();
}

/** One-off repair: courses with different names must not share a code (older data used 3 letters). */
export function fixCourseCodes(): void {
  const db = getDb();
  const changes = dedupeShortNames(loadAll(db).courses);
  if (!changes.length) return;
  db.transaction(() => {
    for (const ch of changes) setCourseShortName(db, ch.id, ch.shortName);
  });
  refresh();
}

export function setSetting<K extends SettingKey>(key: K, value: Settings[K]): void {
  setSettingRow(getDb(), key, value);
  refresh();
  if (key === 'cutoff' || key === 'timeOffsetMs' || key === 'lockMode') runReconcile();
}

/** Commits onboarding in one go: courses, their weekly tasks, and the onboarded flag. */
export function finishOnboarding(input: {
  courses: NewCourse[];
  /** Per course index: template titles to create as weekly tasks. */
  templates: string[][];
  estimatedMinutes: number;
  calendarIds?: string[];
}): number {
  const db = getDb();
  const createdAt = createdStamp();
  let taskCount = 0;
  db.transaction(() => {
    input.courses.forEach((c, i) => {
      const courseId = insertCourse(db, c);
      for (const title of input.templates[i] ?? []) {
        insertTask(db, {
          kind: 'weekly',
          title,
          courseId,
          estimatedMinutes: input.estimatedMinutes,
          dueAt: null,
          dailyBudgetMinutes: null,
          warnDays: null,
          createdAt,
        });
        taskCount++;
      }
    });
    if (input.calendarIds) setSettingRow(db, 'calendarIds', input.calendarIds);
    setSettingRow(db, 'onboarded', true);
  });
  runReconcile();
  return taskCount;
}

// Debug tools ---------------------------------------------------------------

export function timeTravelBy(ms: number): void {
  setSetting('timeOffsetMs', loadAll(getDb()).settings.timeOffsetMs + ms);
}

export function timeTravelTo(target: Date): void {
  const now = new Date();
  const at = new Date(target.getFullYear(), target.getMonth(), target.getDate(), now.getHours(), now.getMinutes());
  setSetting('timeOffsetMs', at.getTime() - now.getTime());
}

export function resetTime(): void {
  setSetting('timeOffsetMs', 0);
}

export function loadDemo(): void {
  const db = getDb();
  const offset = loadAll(db).settings.timeOffsetMs;
  const today = getToday();
  seedDemo(db, today);
  setSettingRow(db, 'timeOffsetMs', offset);
  runReconcile(today);
}

export function wipeEverything(): void {
  wipeAll(getDb());
  refresh();
}
