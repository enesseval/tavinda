import { BackupError, exportBackup, importBackup, parseBackup, summarizeBackup } from '../src/db/backup';
import { migrate } from '../src/db/migrate';
import { MIGRATIONS } from '../src/db/migrations';
import { loadAll, setSetting } from '../src/db/repo';
import { seedDemo } from '../src/db/seed';
import { openTestDb } from './sqliteTestDb';

function freshDb() {
  const db = openTestDb();
  migrate(db);
  return db;
}

describe('backup', () => {
  test('export → import into another database restores everything', () => {
    const a = freshDb();
    seedDemo(a, '2026-10-05');
    setSetting(a, 'timeOffsetMs', 86_400_000);
    const file = JSON.stringify(exportBackup(a, '2026-10-05T12:00:00'));

    const b = freshDb();
    importBackup(b, parseBackup(file));
    const before = loadAll(a);
    const after = loadAll(b);
    expect(after.courses).toEqual(before.courses);
    expect(after.tasks).toEqual(before.tasks);
    expect(after.instances).toEqual(before.instances);
    expect(after.progressLogs).toEqual(before.progressLogs);
    expect(after.blocks).toEqual(before.blocks);
    // Debug time travel stays on the device it was set on.
    expect(after.settings.timeOffsetMs).toBe(0);
    expect(summarizeBackup(parseBackup(file))).toMatchObject({ courses: 5, tasks: before.tasks.length });
    a.close();
    b.close();
  });

  test('importing replaces existing data; new rows continue after imported ids', () => {
    const a = freshDb();
    seedDemo(a, '2026-10-05');
    const backup = exportBackup(a, 'x');
    const b = freshDb();
    seedDemo(b, '2026-09-01');
    importBackup(b, backup);
    expect(loadAll(b).courses.map((c) => c.id)).toEqual(loadAll(a).courses.map((c) => c.id));
    const maxId = Math.max(...loadAll(b).tasks.map((t) => t.id));
    const id = b.run(
      `INSERT INTO tasks (kind, title, course_id, estimated_minutes, created_at) VALUES ('deadline', 'Yeni', NULL, 60, '2026-10-05T10:00:00')`,
    ).lastInsertRowId;
    expect(id).toBeGreaterThan(maxId);
    a.close();
    b.close();
  });

  test('a file from an older version imports after later migrations', () => {
    const old = openTestDb();
    migrate(old, MIGRATIONS.slice(0, 2));
    old.run(
      `INSERT INTO courses (name, short_name, color, source, weekday, start_time, end_time)
       VALUES ('Fizik', 'FİZ', '#4F8AE8', 'manual', 1, '09:00', '10:00')`,
    );
    old.run(
      `INSERT INTO tasks (kind, title, course_id, estimated_minutes, due_at, created_at)
       VALUES ('deadline', 'Rapor', NULL, 120, '2026-11-01', '2026-10-01T09:00:00')`,
    );
    const v2 = { ...exportBackup(old, 'old'), schema: 2 };
    const b = freshDb();
    importBackup(b, parseBackup(JSON.stringify(v2)));
    const task = loadAll(b).tasks[0];
    expect(task).toMatchObject({ title: 'Rapor', dueTime: null, alarmMinutes: null });
    old.close();
    b.close();
  });

  test('rejects other files, newer versions and malformed rows', () => {
    const reason = (text: string) => {
      try {
        parseBackup(text);
        return 'ok';
      } catch (e) {
        return e instanceof BackupError ? e.reason : 'other';
      }
    };
    expect(reason('not json')).toBe('invalid');
    expect(reason(JSON.stringify({ app: 'other', schema: 1, tables: {} }))).toBe('otherApp');
    expect(reason(JSON.stringify({ app: 'tavinda', schema: 999, tables: {} }))).toBe('newer');
    expect(reason(JSON.stringify({ app: 'tavinda', schema: 1, tables: { courses: [{ name: { x: 1 } }] } }))).toBe('invalid');
    expect(reason(JSON.stringify({ app: 'tavinda', schema: 1, tables: {} }))).toBe('ok');
  });
});
