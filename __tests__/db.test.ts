import { applyDefer, applyProgress, isReconcileNoop, reconcile } from '../src/domain';
import { migrate, getUserVersion } from '../src/db/migrate';
import { LATEST_VERSION, MIGRATIONS } from '../src/db/migrations';
import {
  applyReconcileResult,
  deleteCourse,
  insertCourse,
  insertTask,
  loadAll,
  saveDeferTx,
  saveProgressTx,
  setSetting,
  undoWrite,
  wipeAll,
} from '../src/db/repo';
import { seedDemo } from '../src/db/seed';
import { openTestDb } from './sqliteTestDb';

function freshDb() {
  const db = openTestDb();
  migrate(db);
  return db;
}

describe('migrations', () => {
  test('8. run from zero to latest on an empty DB', () => {
    const db = openTestDb();
    expect(getUserVersion(db)).toBe(0);
    expect(migrate(db)).toBe(LATEST_VERSION);
    expect(getUserVersion(db)).toBe(LATEST_VERSION);
    const tables = db
      .all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .map((t) => t.name);
    expect(tables).toEqual(['courses', 'defer_logs', 'progress_logs', 'settings', 'task_instances', 'tasks', 'time_blocks']);
    // Running again is a no-op.
    expect(migrate(db)).toBe(LATEST_VERSION);
    db.close();
  });

  test('versions are contiguous and each step applies on its own', () => {
    MIGRATIONS.forEach((m, i) => expect(m.version).toBe(i + 1));
    const db = openTestDb();
    for (let v = 1; v <= LATEST_VERSION; v++) {
      expect(migrate(db, MIGRATIONS.slice(0, v))).toBe(v);
    }
    db.close();
  });
});

describe('migration 003', () => {
  test('moves existing course colors to the new palette and adds deadline time + blocks', () => {
    const db = openTestDb();
    migrate(db, MIGRATIONS.slice(0, 2));
    db.run(
      `INSERT INTO courses (name, short_name, color, source, weekday, start_time, end_time)
       VALUES ('Fizik', 'FİZ', '#93A3BC', 'manual', 1, '09:00', '10:00'), ('Kimya', 'KİM', '#123456', 'manual', 2, '09:00', '10:00')`,
    );
    migrate(db);
    expect(db.all<{ color: string }>('SELECT color FROM courses ORDER BY id').map((r) => r.color)).toEqual([
      '#4F8AE8',
      '#123456',
    ]);
    const id = insertTask(db, {
      kind: 'deadline',
      title: 'Rapor',
      courseId: null,
      estimatedMinutes: 60,
      dueAt: '2026-11-01',
      dueTime: '17:00',
      alarmMinutes: 10,
      dailyBudgetMinutes: 45,
      warnDays: 3,
      createdAt: '2026-10-01T10:00:00',
    });
    const task = loadAll(db).tasks.find((t) => t.id === id)!;
    expect(task).toMatchObject({ dueTime: '17:00', alarmMinutes: 10 });
    expect(loadAll(db).blocks).toEqual([]);
    db.close();
  });
});

describe('repository', () => {
  test('progress update and log are written together; undo restores both', () => {
    const db = freshDb();
    const courseId = insertCourse(db, {
      name: 'Algoritmalar',
      shortName: 'ALG',
      color: '#B4A2CC',
      source: 'manual',
      calendarEventId: null,
      weekday: 3,
      startTime: '13:00',
      endTime: '14:50',
    });
    insertTask(db, {
      kind: 'weekly',
      title: 'Ders tekrarı',
      courseId,
      estimatedMinutes: 60,
      dueAt: null,
      dailyBudgetMinutes: null,
      warnDays: null,
      createdAt: '2026-09-30T10:00:00',
    });
    let data = loadAll(db);
    applyReconcileResult(db, reconcile({ today: '2026-09-30', ...data }));
    data = loadAll(db);
    expect(data.instances).toHaveLength(1);

    const inst = data.instances[0];
    const change = applyProgress(inst, 40, '2026-09-30');
    const receipt = saveProgressTx(db, inst, change.instance, change.log!, '2026-09-30T12:10:00');
    data = loadAll(db);
    expect(data.instances[0].progress).toBe(40);
    expect(data.progressLogs).toHaveLength(1);

    const d = applyDefer(data.instances[0], '2026-09-30', data.settings)!;
    const deferReceipt = saveDeferTx(db, data.instances[0], d.instance, '2026-09-30', d.remainingPct, '2026-09-30T12:11:00');
    data = loadAll(db);
    expect(data.instances[0]).toMatchObject({ scheduledDate: '2026-10-01', deferCount: 1 });
    expect(data.deferLogs[0]).toMatchObject({ remainingPct: 60 });

    undoWrite(db, deferReceipt);
    undoWrite(db, receipt);
    data = loadAll(db);
    expect(data.instances[0]).toMatchObject({ progress: 0, deferCount: 0, scheduledDate: '2026-09-30' });
    expect(data.progressLogs).toHaveLength(0);
    expect(data.deferLogs).toHaveLength(0);

    // Reconcile through the DB is idempotent too.
    applyReconcileResult(db, reconcile({ today: '2026-10-07', ...loadAll(db) }));
    expect(isReconcileNoop(reconcile({ today: '2026-10-07', ...loadAll(db) }))).toBe(true);

    deleteCourse(db, courseId);
    data = loadAll(db);
    expect(data.tasks).toHaveLength(0);
    expect(data.instances).toHaveLength(0);
    db.close();
  });

  test('settings round-trip and wipe', () => {
    const db = freshDb();
    setSetting(db, 'lockMode', 'flexible');
    setSetting(db, 'calendarIds', ['a', 'b']);
    setSetting(db, 'showWeekend', true);
    setSetting(db, 'timeOffsetMs', 86_400_000);
    expect(loadAll(db).settings).toMatchObject({
      lockMode: 'flexible',
      calendarIds: ['a', 'b'],
      showWeekend: true,
      timeOffsetMs: 86_400_000,
    });
    wipeAll(db);
    expect(loadAll(db).settings.lockMode).toBe('strict');
    db.close();
  });

  test('demo seed produces a consistent, reconciled semester', () => {
    const db = freshDb();
    seedDemo(db, '2026-09-30');
    const data = loadAll(db);
    expect(data.courses.length).toBe(5);
    expect(data.tasks.length).toBe(9);
    expect(data.progressLogs.length).toBeGreaterThan(5);
    expect(data.instances.some((i) => i.status === 'done')).toBe(true);
    expect(isReconcileNoop(reconcile({ today: '2026-09-30', ...data }))).toBe(true);
    db.close();
  });
});
