// Node's built-in SQLite (no native build step, works on Windows/macOS/Linux).
import { DatabaseSync } from 'node:sqlite';

import type { Db, SqlValue } from '../src/db/types';

/** In-memory SQLite adapter for tests (same interface as the expo-sqlite adapter). */
export function openTestDb(): Db & { close: () => void } {
  const sqlite = new DatabaseSync(':memory:');
  let depth = 0;
  return {
    exec: (sql) => {
      sqlite.exec(sql);
    },
    run: (sql, params: SqlValue[] = []) => {
      const r = sqlite.prepare(sql).run(...params);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    all: <T>(sql: string, params: SqlValue[] = []) => sqlite.prepare(sql).all(...params) as T[],
    get: <T>(sql: string, params: SqlValue[] = []) => (sqlite.prepare(sql).get(...params) as T | undefined) ?? null,
    transaction: (fn) => {
      if (depth > 0) {
        fn();
        return;
      }
      depth++;
      sqlite.exec('BEGIN');
      try {
        fn();
        sqlite.exec('COMMIT');
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      } finally {
        depth--;
      }
    },
    close: () => sqlite.close(),
  };
}
