import type { Course, LocalDate, NewInstance, Task, TaskInstance } from './types';
import { currentWeeklyWindow } from './windows';

export interface ReconcileInput {
  today: LocalDate;
  courses: Course[];
  tasks: Task[];
  instances: TaskInstance[];
}

export interface InstanceUpdate {
  id: number;
  changes: Partial<Pick<TaskInstance, 'status' | 'scheduledDate'>>;
}

export interface ReconcileResult {
  create: NewInstance[];
  update: InstanceUpdate[];
}

export function isReconcileNoop(r: ReconcileResult): boolean {
  return r.create.length === 0 && r.update.length === 0;
}

/**
 * Brings stored instances in line with `today`:
 * 1. active instances whose window ended before today → missed
 * 2. active instances scheduled before today → carried to today (not a user defer)
 * 3. weekly tasks get an instance for the window containing today
 * 4. deadline tasks get their single instance
 * Pure and idempotent: applying the result and running again yields no changes.
 */
export function reconcile({ today, courses, tasks, instances }: ReconcileInput): ReconcileResult {
  const update: InstanceUpdate[] = [];
  const create: NewInstance[] = [];

  for (const inst of instances) {
    if (inst.status !== 'active') continue;
    if (inst.windowEnd < today) {
      update.push({ id: inst.id, changes: { status: 'missed' } });
    } else if (inst.scheduledDate < today) {
      update.push({ id: inst.id, changes: { scheduledDate: today } });
    }
  }

  const byTask = new Map<number, TaskInstance[]>();
  for (const inst of instances) {
    const list = byTask.get(inst.taskId);
    if (list) list.push(inst);
    else byTask.set(inst.taskId, [inst]);
  }
  const courseById = new Map(courses.map((c) => [c.id, c]));

  for (const task of tasks) {
    if (task.archivedAt) continue;
    const existing = byTask.get(task.id) ?? [];

    if (task.kind === 'weekly') {
      const course = task.courseId != null ? courseById.get(task.courseId) : undefined;
      if (!course) continue;
      const win = currentWeeklyWindow(today, course.weekday);
      if (existing.some((i) => i.windowStart === win.start)) continue;
      create.push({
        taskId: task.id,
        windowStart: win.start,
        windowEnd: win.end,
        scheduledDate: today,
        progress: 0,
        status: 'active',
        deferCount: 0,
        lockUnlockedOn: null,
      });
    } else {
      if (existing.length > 0 || !task.dueAt) continue;
      const created = task.createdAt.slice(0, 10);
      const start = created < task.dueAt ? created : task.dueAt;
      create.push({
        taskId: task.id,
        windowStart: start,
        windowEnd: task.dueAt,
        scheduledDate: today,
        progress: 0,
        status: task.dueAt < today ? 'missed' : 'active',
        deferCount: 0,
        lockUnlockedOn: null,
      });
    }
  }

  return { create, update };
}

/** Applies a reconcile result in memory (used by projections and tests). */
export function applyReconcile(instances: TaskInstance[], result: ReconcileResult, nextId: () => number): TaskInstance[] {
  const changes = new Map(result.update.map((u) => [u.id, u.changes]));
  const updated = instances.map((i) => (changes.has(i.id) ? { ...i, ...changes.get(i.id) } : i));
  return [...updated, ...result.create.map((c) => ({ ...c, id: nextId() }))];
}
