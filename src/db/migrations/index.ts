import * as m001 from './001_init';
import * as m002 from './002_defer_logs';
import * as m003 from './003_blocks_due_time';
import * as m004 from './004_task_pause_order';
import * as m005 from './005_weekly_due';

export interface Migration {
  version: number;
  up: string;
}

/** Ordered list. Append only. */
export const MIGRATIONS: Migration[] = [m001, m002, m003, m004, m005];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
