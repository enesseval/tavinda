import { LATEST_VERSION } from './migrations';
import type { Db, SqlValue } from './types';

/**
 * Whole-database backup as plain JSON. Rows are stored as they are in SQLite so a
 * file from an older version still imports after later migrations: only columns
 * the current table has are written, and anything else falls back to defaults.
 */

export const BACKUP_APP = 'tavinda';

/** Parents before children, so foreign keys hold while inserting. */
const TABLES = ['courses', 'tasks', 'task_instances', 'progress_logs', 'defer_logs', 'time_blocks', 'settings'] as const;
type Table = (typeof TABLES)[number];
type Row = Record<string, SqlValue>;

/** Settings that describe this device or a debug session, not the user's data. */
const LOCAL_ONLY_SETTINGS = new Set(['timeOffsetMs']);

export interface Backup {
  app: typeof BACKUP_APP;
  /** Migration version the rows were written with. */
  schema: number;
  exportedAt: string;
  tables: Record<Table, Row[]>;
}

export class BackupError extends Error {
  constructor(public reason: 'invalid' | 'otherApp' | 'newer') {
    super(reason);
  }
}

export function exportBackup(db: Db, exportedAt: string): Backup {
  const present = new Set(db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'").map((r) => r.name));
  const tables = {} as Record<Table, Row[]>;
  for (const t of TABLES) tables[t] = present.has(t) ? db.all<Row>(`SELECT * FROM ${t} ORDER BY rowid`) : [];
  tables.settings = tables.settings.filter((r) => !LOCAL_ONLY_SETTINGS.has(String(r.key)));
  return { app: BACKUP_APP, schema: LATEST_VERSION, exportedAt, tables };
}

/** Validates a file's contents. Throws BackupError with a reason the UI can explain. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('invalid');
  }
  if (!raw || typeof raw !== 'object') throw new BackupError('invalid');
  const b = raw as Partial<Backup>;
  if (b.app !== BACKUP_APP) throw new BackupError('otherApp');
  if (typeof b.schema !== 'number') throw new BackupError('invalid');
  if (b.schema > LATEST_VERSION) throw new BackupError('newer');
  if (!b.tables || typeof b.tables !== 'object') throw new BackupError('invalid');
  const tables = {} as Record<Table, Row[]>;
  for (const t of TABLES) {
    const rows = (b.tables as Partial<Record<Table, unknown>>)[t] ?? [];
    const okValue = (v: unknown) => v === null || typeof v === 'string' || typeof v === 'number';
    if (
      !Array.isArray(rows) ||
      rows.some((r) => !r || typeof r !== 'object' || Array.isArray(r) || !Object.values(r).every(okValue))
    ) {
      throw new BackupError('invalid');
    }
    tables[t] = rows as Row[];
  }
  return { app: BACKUP_APP, schema: b.schema, exportedAt: String(b.exportedAt ?? ''), tables };
}

export interface BackupSummary {
  courses: number;
  tasks: number;
  exportedAt: string;
}

export function summarizeBackup(b: Backup): BackupSummary {
  const names = new Set(b.tables.courses.map((r) => String(r.name).trim().toLocaleLowerCase('tr-TR')));
  return { courses: names.size, tasks: b.tables.tasks.length, exportedAt: b.exportedAt };
}

function columnsOf(db: Db, table: Table): Set<string> {
  return new Set(db.all<{ name: string }>(`PRAGMA table_info(${table})`).map((c) => c.name));
}

/** Replaces everything in the database with the backup, in one transaction. */
export function importBackup(db: Db, backup: Backup): void {
  db.transaction(() => {
    for (const t of [...TABLES].reverse()) db.run(`DELETE FROM ${t}`);
    for (const t of TABLES) {
      const cols = columnsOf(db, t);
      for (const row of backup.tables[t]) {
        if (t === 'settings' && LOCAL_ONLY_SETTINGS.has(String(row.key))) continue;
        const keys = Object.keys(row).filter((k) => cols.has(k));
        if (!keys.length) continue;
        const values = keys.map((k) => {
          const v = row[k];
          return v === undefined ? null : v;
        });
        db.run(`INSERT INTO ${t} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, values);
      }
    }
  });
}
