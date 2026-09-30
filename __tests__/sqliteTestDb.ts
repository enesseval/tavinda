import Database from 'better-sqlite3';

import type { Db, SqlValue } from '../src/db/types';

/** In-memory SQLite adapter for tests (same interface as the expo-sqlite adapter). */
export function openTestDb(): Db & { close: () => void } {
  const sqlite = new Database(':memory:');
  return {
    exec: (sql) => {
      sqlite.exec(sql);
    },
    run: (sql, params: SqlValue[] = []) => {
      const r = sqlite.prepare(sql).run(...params);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: r.changes };
    },
    all: <T>(sql: string, params: SqlValue[] = []) => {
      const stmt = sqlite.prepare(sql);
      return (stmt.reader ? stmt.all(...params) : []) as T[];
    },
    get: <T>(sql: string, params: SqlValue[] = []) => {
      const stmt = sqlite.prepare(sql);
      if (!stmt.reader) {
        stmt.run(...params);
        return null;
      }
      return (stmt.get(...params) as T | undefined) ?? null;
    },
    transaction: (fn) => {
      sqlite.transaction(fn)();
    },
    close: () => sqlite.close(),
  };
}
