import * as m001 from './001_init';
import * as m002 from './002_defer_logs';
import * as m003 from './003_blocks_due_time';

export interface Migration {
  version: number;
  up: string;
}

/** Ordered list. Append only. */
export const MIGRATIONS: Migration[] = [m001, m002, m003];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
