export type SqlValue = string | number | null;

/** Minimal synchronous SQL surface shared by expo-sqlite (app) and better-sqlite3 (tests). */
export interface Db {
  exec(sql: string): void;
  run(sql: string, params?: SqlValue[]): { lastInsertRowId: number; changes: number };
  all<T>(sql: string, params?: SqlValue[]): T[];
  get<T>(sql: string, params?: SqlValue[]): T | null;
  /** Runs `fn` in a single transaction; rolls back if it throws. */
  transaction(fn: () => void): void;
}
