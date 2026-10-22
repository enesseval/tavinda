/**
 * Weekly tasks with a picked last day, hour and first week.
 */
import { getDb } from '../src/db/client';
import { migrate } from '../src/db/migrate';
import { MIGRATIONS } from '../src/db/migrations';
import { insertCourse, loadAll } from '../src/db/repo';
import { dueInstant, planNotifications, reconcile } from '../src/domain';
import { firstOpenWindow } from '../src/domain/windows';
import { createWeeklyTask, setTaskPaused, updateTask } from '../src/services/actions';
import { refresh } from '../src/services/data';
import { appData, course, instance, weeklyTask } from './fixtures';
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

// The course meets on Wednesdays; 30 Sep 2026 is a Wednesday.
const courses = [course()];
const windows = (today: string, over = {}, instances = [] as ReturnType<typeof instance>[]) =>
  reconcile({ today, courses, tasks: [weeklyTask(over)], instances }).create.map((c) => [c.windowStart, c.windowEnd]);

describe('weekly last day', () => {
  test('a picked last day shortens every window', () => {
    expect(windows('2026-10-01', { dueOffset: 2 })).toEqual([['2026-09-30', '2026-10-02']]);
    expect(windows('2026-10-01')).toEqual([['2026-09-30', '2026-10-06']]);
  });

  test('a week that closed before the task existed never opens; the next one does', () => {
    const over = { dueOffset: 2, createdAt: '2026-10-03T10:00:00' };
    expect(windows('2026-10-03', over)).toEqual([]);
    expect(windows('2026-10-07', over)).toEqual([['2026-10-07', '2026-10-09']]);
  });

  test('a week that closed while the app was not opened still opens, as overdue', () => {
    expect(windows('2026-10-05', { dueOffset: 2, createdAt: '2026-09-29T10:00:00' })).toEqual([['2026-09-30', '2026-10-02']]);
  });

  test('a later first week waits', () => {
    const over = { startOn: '2026-10-14' };
    expect(windows('2026-10-07', over)).toEqual([]);
    expect(windows('2026-10-14', over)).toEqual([['2026-10-14', '2026-10-20']]);
  });

  test('the preview window moves to next week once this week’s last day has passed', () => {
    expect(firstOpenWindow('2026-10-01', 3, 2)).toEqual({ start: '2026-09-30', end: '2026-10-02' });
    expect(firstOpenWindow('2026-10-03', 3, 2)).toEqual({ start: '2026-10-07', end: '2026-10-09' });
    expect(firstOpenWindow('2026-10-03', 3, 6)).toEqual({ start: '2026-09-30', end: '2026-10-06' });
  });

  test('the hour and the last-minutes alarm apply to weekly tasks', () => {
    const task = weeklyTask({ dueOffset: 2, dueTime: '17:00', alarmMinutes: 30 });
    const inst = instance({ windowStart: '2026-09-30', windowEnd: '2026-10-02' });
    expect(dueInstant(inst, task).getHours()).toBe(17);
    const plan = planNotifications(appData({ courses, tasks: [task], instances: [inst] }), new Date('2026-10-01T09:00:00'));
    const alarm = plan.find((n) => n.kind === 'lastMinutes');
    expect(alarm?.fireAt).toEqual(new Date('2026-10-02T16:30:00'));
  });
});

describe('repository and actions', () => {
  afterEach(() => jest.restoreAllMocks());
  const at = (iso: string) => jest.spyOn(Date, 'now').mockReturnValue(new Date(iso).getTime());

  test('migration 005 keeps existing weekly tasks on the old window', () => {
    const db = openTestDb();
    migrate(db, MIGRATIONS.slice(0, 4));
    db.run(
      `INSERT INTO tasks (kind, title, course_id, estimated_minutes, created_at) VALUES ('weekly', 'Okuma', NULL, 60, '2026-10-01T10:00:00')`,
    );
    migrate(db);
    expect(loadAll(db).tasks[0]).toMatchObject({ dueOffset: null, startOn: null });
    db.close();
  });

  test('editing the last day moves the open window; resuming after it closed does not reopen it', () => {
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
    refresh();
    at('2026-09-30T12:00:00');
    const id = createWeeklyTask({ title: 'Fizik okuma', courseId, estimatedMinutes: 60, dueTime: '18:00' });
    const task = () => loadAll(db).tasks.find((x) => x.id === id)!;
    const open = () =>
      loadAll(db)
        .instances.filter((i) => i.taskId === id)
        .map((i) => [i.windowStart, i.windowEnd, i.status]);
    expect(task()).toMatchObject({ dueTime: '18:00', dueOffset: null });
    expect(open()).toEqual([['2026-09-30', '2026-10-06', 'active']]);

    updateTask(task(), { dueOffset: 2 });
    expect(open()).toEqual([['2026-09-30', '2026-10-02', 'active']]);

    setTaskPaused(task(), true);
    at('2026-10-05T12:00:00');
    setTaskPaused(task(), false);
    // The untouched week that closed while paused is gone and not reopened as overdue.
    expect(open()).toEqual([]);
    expect(task().startOn).toBe('2026-10-05');
    at('2026-10-07T12:00:00');
    applyReconcileNow(db);
    expect(open()).toEqual([['2026-10-07', '2026-10-09', 'active']]);
  });
});

function applyReconcileNow(db: ReturnType<typeof getDb>) {
  const { applyReconcileResult } = require('../src/db/repo');
  applyReconcileResult(db, reconcile({ today: '2026-10-07', ...loadAll(db) }));
}
