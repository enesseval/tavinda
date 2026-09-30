import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { migrate } from './migrate';
import type { Db, SqlValue } from './types';

const DB_NAME = 'tavinda.db';

function adapt(sqlite: SQLiteDatabase): Db {
  return {
    exec: (sql) => sqlite.execSync(sql),
    run: (sql, params = []) => {
      const r = sqlite.runSync(sql, params as SqlValue[]);
      return { lastInsertRowId: r.lastInsertRowId, changes: r.changes };
    },
    all: <T>(sql: string, params: SqlValue[] = []) => sqlite.getAllSync<T>(sql, params),
    get: <T>(sql: string, params: SqlValue[] = []) => sqlite.getFirstSync<T>(sql, params) ?? null,
    transaction: (fn) => sqlite.withTransactionSync(fn),
  };
}

let instance: Db | null = null;

/** Opens the app database and runs pending migrations once per process. */
export function getDb(): Db {
  if (!instance) {
    const db = adapt(openDatabaseSync(DB_NAME));
    migrate(db);
    instance = db;
  }
  return instance;
}
