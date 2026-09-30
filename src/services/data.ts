import { useSyncExternalStore } from 'react';

import { getDb } from '../db/client';
import { loadAll } from '../db/repo';
import type { AppData } from '../domain/types';

/**
 * Read-through snapshot of the database. The DB stays the source of truth:
 * every write goes to SQLite first, then `refresh()` re-reads it.
 */
let snapshot: AppData | null = null;
const listeners = new Set<() => void>();
const afterRefresh = new Set<(data: AppData) => void>();

export function getData(): AppData {
  if (!snapshot) snapshot = loadAll(getDb());
  return snapshot;
}

export function refresh(): AppData {
  snapshot = loadAll(getDb());
  listeners.forEach((l) => l());
  const data = snapshot;
  afterRefresh.forEach((fn) => fn(data));
  return data;
}

/** Hook for side effects that must follow every data change (e.g. notifications). */
export function onRefresh(fn: (data: AppData) => void): () => void {
  afterRefresh.add(fn);
  return () => afterRefresh.delete(fn);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getData, getData);
}
