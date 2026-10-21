/**
 * Pausing a task (exam week) and ordering the Görevler tab by hand.
 */
import { getDb } from '../src/db/client';
import { migrate } from '../src/db/migrate';
import { MIGRATIONS } from '../src/db/migrations';
import {
  applyReconcileResult,
  clearTaskOrder,
  insertCourse,
  insertTask,
  loadAll,
  setTaskOrder,
  setTaskPausedAt,
} from '../src/db/repo';
import { buildTodayModel, editRows, planNotifications, reconcile, taskListModel } from '../src/domain';
import { reorderTasks, resetTaskOrder, setTaskPaused } from '../src/services/actions';
import { refresh } from '../src/services/data';
import { appData, course, deadlineTask, instance, weeklyTask } from './fixtures';
import { openTestDb } from './sqliteTestDb';

jest.mock('../src/db/client', () => {
  const { openTestDb } = require('./sqliteTestDb');
  const { migrate } = require('../src/db/migrate');
  let db: ReturnType<typeof openTestDb> | null = null;
  return {
    getDb: () => {
      if (!db) {
        db = openTestDb();
        migrate(db);
      }
      return db;
    },
  };
});

const PAUSED = '2026-10-01T09:00:00';

describe('paused tasks (domain)', () => {
  test('get no new weekly window while paused; open ones still age', () => {
    const tasks = [weeklyTask({ pausedAt: PAUSED })];
    const courses = [course()];
    const last = instance(); // 30 Sep – 6 Oct

    // Next window would start Wednesday 7 Oct.
    const r1 = reconcile({ today: '2026-10-07', courses, tasks, instances: [last] });
    expect(r1.create).toEqual([]);
    expect(r1.update).toEqual([{ id: last.id, changes: { scheduledDate: '2026-10-07' } }]);

    const r2 = reconcile({ today: '2026-10-14', courses, tasks, instances: [last] });
    expect(r2.update).toEqual([{ id: last.id, changes: { status: 'missed' } }]);

    const resumed = reconcile({ today: '2026-10-07', courses, tasks: [weeklyTask()], instances: [last] });
    expect(resumed.create.map((c) => c.windowStart)).toEqual(['2026-10-07']);
  });

  test('are left out of Bugün', () => {
    const data = appData({
      courses: [course()],
      tasks: [weeklyTask({ pausedAt: PAUSED })],
      instances: [instance({ scheduledDate: '2026-10-02' })],
    });
    const model = buildTodayModel(data, '2026-10-02');
    expect(model.hero).toBeNull();
    expect(model.groups.flatMap((g) => g.items)).toEqual([]);
    expect(model.liveCount).toBe(0);

    const live = buildTodayModel({ ...data, tasks: [weeklyTask()] }, '2026-10-02');
    expect(live.liveCount).toBe(1);
  });

  test('get no notifications', () => {
    const task = deadlineTask();
    const data = appData({
      tasks: [task],
      instances: [instance({ id: 200, taskId: task.id, windowStart: '2026-09-30', windowEnd: '2026-11-29' })],
    });
    const now = new Date('2026-11-20T08:00:00');
    expect(planNotifications(data, now).some((n) => n.kind === 'startNow')).toBe(true);
    const paused = { ...data, tasks: [{ ...task, pausedAt: PAUSED }] };
    expect(planNotifications(paused, now).filter((n) => JSON.stringify(n).includes(task.title))).toEqual([]);
  });
});

describe('Görevler order and paused list', () => {
  const t = (id: number, over = {}) => deadlineTask({ id, title: `Görev ${id}`, dueAt: '2026-11-29', ...over });
  const i = (id: number, taskId: number) =>
    instance({ id, taskId, windowStart: '2026-09-30', windowEnd: '2026-11-29', scheduledDate: '2026-10-02' });

  test('own order wins, unordered (new) tasks come first, paused ones move to their own list', () => {
    const data = appData({
      courses: [course()],
      tasks: [
        t(1, { sortOrder: 1 }),
        t(2, { sortOrder: 0 }),
        t(3),
        t(4, { pausedAt: PAUSED, sortOrder: 2 }),
        weeklyTask({ id: 5, pausedAt: PAUSED }),
      ],
      instances: [i(101, 1), i(102, 2), i(103, 3), i(104, 4)],
    });
    const model = taskListModel(data, '2026-10-02');
    expect(model.active.map((x) => x.task.id)).toEqual([3, 2, 1]);
    expect(model.paused.map((r) => r.task.id).sort()).toEqual([4, 5]);
    expect(model.customOrder).toBe(true);
    expect(model.risk.watch + model.risk.risky + model.risk.critical).toBeLessThanOrEqual(3);

    expect(editRows(model, 'active').map((r) => [r.task.id, r.paused])).toEqual([
      [3, false],
      [2, false],
      [1, false],
      [5, true],
      [4, true],
    ]);
    // Tekrarlayan only lists weekly tasks, paused ones included.
    expect(editRows(model, 'recurring').map((r) => r.task.id)).toEqual([5]);
  });

  test('without an order the list stays hottest first', () => {
    const data = appData({
      tasks: [t(1, { dueAt: '2026-12-20' }), t(2, { dueAt: '2026-10-04' })],
      instances: [
        { ...i(101, 1), windowEnd: '2026-12-20' },
        { ...i(102, 2), windowEnd: '2026-10-04' },
      ],
    });
    const model = taskListModel(data, '2026-10-02');
    expect(model.customOrder).toBe(false);
    expect(model.active.map((x) => x.task.id)).toEqual([2, 1]);
  });
});

describe('repository', () => {
  const newTask = (title: string) => ({
    kind: 'deadline' as const,
    title,
    courseId: null,
    estimatedMinutes: 60,
    dueAt: '2026-11-01',
    dailyBudgetMinutes: null,
    warnDays: null,
    createdAt: '2026-10-01T10:00:00',
  });

  test('migration 004 adds pause and order columns, empty for existing tasks', () => {
    const db = openTestDb();
    migrate(db, MIGRATIONS.slice(0, 3));
    const id = insertTask(db, newTask('Eski'));
    migrate(db);
    expect(loadAll(db).tasks.find((x) => x.id === id)).toMatchObject({ pausedAt: null, sortOrder: null });
    setTaskPausedAt(db, id, PAUSED);
    expect(loadAll(db).tasks[0].pausedAt).toBe(PAUSED);
    db.close();
  });

  test('setTaskOrder puts the listed tasks first and keeps the rest in their old order', () => {
    const db = openTestDb();
    migrate(db);
    const [a, b, c, d] = ['A', 'B', 'C', 'D'].map((n) => insertTask(db, newTask(n)));
    setTaskOrder(db, [c, a, b]);
    setTaskOrder(db, [b, c]);
    const order = () => Object.fromEntries(loadAll(db).tasks.map((x) => [x.id, x.sortOrder]));
    expect(order()).toEqual({ [b]: 0, [c]: 1, [a]: 2, [d]: null });
    clearTaskOrder(db);
    expect(Object.values(order())).toEqual([null, null, null, null]);
    db.close();
  });
});

describe('actions', () => {
  afterEach(() => jest.restoreAllMocks());
  const at = (iso: string) => jest.spyOn(Date, 'now').mockReturnValue(new Date(iso).getTime());

  test('resuming a weekly task drops the untouched weeks it was paused for and opens the current one', () => {
    const db = getDb();
    const courseId = insertCourse(db, {
      name: 'Fizik',
      shortName: 'FİZ',
      color: '#4F8AE8',
      source: 'manual',
      calendarEventId: null,
      weekday: 3,
      startTime: '09:00',
      endTime: '10:00',
    });
    const taskId = insertTask(db, {
      kind: 'weekly',
      title: 'Fizik okuma',
      courseId,
      estimatedMinutes: 60,
      dueAt: null,
      dailyBudgetMinutes: null,
      warnDays: null,
      createdAt: '2026-09-30T10:00:00',
    });
    applyReconcileResult(db, reconcile({ today: '2026-09-30', ...loadAll(db) }));
    refresh();

    at('2026-10-01T12:00:00');
    setTaskPaused(
      loadAll(db).tasks.find((x) => x.id === taskId)!,
      true,
    );
    expect(loadAll(db).tasks.find((x) => x.id === taskId)!.pausedAt).toBe('2026-10-01T12:00:00');

    // Exam week passes; the task stays out of new windows.
    at('2026-10-09T12:00:00');
    applyReconcileResult(db, reconcile({ today: '2026-10-09', ...loadAll(db) }));
    expect(
      loadAll(db)
        .instances.filter((x) => x.taskId === taskId)
        .map((x) => x.windowStart),
    ).toEqual(['2026-09-30']);

    setTaskPaused(
      loadAll(db).tasks.find((x) => x.id === taskId)!,
      false,
    );
    const after = loadAll(db);
    expect(after.tasks.find((x) => x.id === taskId)!.pausedAt).toBeNull();
    expect(after.instances.filter((x) => x.taskId === taskId).map((x) => [x.windowStart, x.status])).toEqual([
      ['2026-10-07', 'active'],
    ]);
  });

  test('reorder and reset write through', () => {
    const db = getDb();
    const ids = loadAll(db).tasks.map((x) => x.id);
    reorderTasks([...ids].reverse());
    expect(loadAll(db).tasks.map((x) => x.sortOrder)).toEqual(ids.map((_, i) => ids.length - 1 - i));
    resetTaskOrder();
    expect(loadAll(db).tasks.every((x) => x.sortOrder == null)).toBe(true);
  });
});
