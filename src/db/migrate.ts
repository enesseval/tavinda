import { MIGRATIONS, type Migration } from './migrations';
import type { Db } from './types';

export function getUserVersion(db: Db): number {
  const row = db.get<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * Runs every migration newer than PRAGMA user_version, each in its own
 * transaction together with the version bump.
 */
export function migrate(db: Db, migrations: Migration[] = MIGRATIONS): number {
  db.exec('PRAGMA foreign_keys = ON');
  let current = getUserVersion(db);
  for (const m of migrations) {
    if (m.version <= current) continue;
    if (m.version !== current + 1) {
      throw new Error(`Migration gap: at ${current}, next is ${m.version}`);
    }
    db.transaction(() => {
      db.exec(m.up);
      db.exec(`PRAGMA user_version = ${m.version}`);
    });
    current = m.version;
  }
  return current;
}
