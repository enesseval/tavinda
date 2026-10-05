import Constants from 'expo-constants';

import { getWidgetSnapshot, type WidgetTask } from '../domain/widget';
import { parseTimestamp } from '../domain/schedule';
import type { AppData } from '../domain/types';
import { blockName } from '../ui/blockText';
import { getNow } from './clock';

/**
 * Pushes what the home/lock screen widget shows into the shared App Group
 * (read by targets/widget/Shared.swift) and asks iOS to redraw it.
 * Does nothing where the native module is missing (tests, Android, Expo Go).
 */

const WIDGET_KIND = 'TavindaToday';

type Storage = { set: (key: string, value: unknown) => void };
type StorageClass = { new (group: string): Storage; reloadWidget: (kind?: string) => void };

let storageClass: StorageClass | null | undefined;
function storage(): StorageClass | null {
  if (storageClass !== undefined) return storageClass;
  try {
    // Lazy: the module reads a native global at import time.
    storageClass = (require('@bacons/apple-targets') as { ExtensionStorage: StorageClass }).ExtensionStorage;
  } catch {
    storageClass = null;
  }
  return storageClass;
}

const appGroup = (): string | null => {
  const g = (Constants.expoConfig?.extra as { appGroup?: unknown } | undefined)?.appGroup;
  return typeof g === 'string' ? g : null;
};

/** True when the widget bridge exists and the App Group is configured (debug screen). */
export function widgetAvailable(): boolean {
  return (
    !!storage() &&
    !!appGroup() &&
    !!(globalThis as { expo?: { modules?: Record<string, unknown> } }).expo?.modules?.ExtensionStorage
  );
}

/** Widget payload with times on the real clock (the app clock can be time-travelled in debug). */
export function widgetPayload(data: AppData, now: Date) {
  const offset = data.settings.timeOffsetMs;
  const snap = getWidgetSnapshot(now, data);
  const real = (ts: string) => Math.round(parseTimestamp(ts).getTime() - offset);
  const task = (w: WidgetTask) => ({
    instanceId: w.instanceId,
    title: w.title,
    course: w.course,
    courseColor: w.courseColor,
    heat: w.heat,
    percent: Math.round(w.percent),
    remainingMinutes: Math.round(w.remainingMinutes),
    shareMinutes: Math.round(w.shareMinutes),
    dueAtMs: real(w.dueAt),
    overdue: w.overdue,
  });
  const running = data.blocks.find((b) => b.status === 'running');
  return {
    version: 2,
    todayMinutes: Math.round(snap.todayMinutes),
    openCount: snap.openCount,
    hottest: snap.hottest ? task(snap.hottest) : null,
    top: snap.top.map(task),
    block: running
      ? { name: blockName(running), kind: running.kind, startMs: real(running.startAt), endMs: real(running.endAt) }
      : null,
  };
}

let timer: ReturnType<typeof setTimeout> | null = null;
let last = '';

/** Debounced; skips the native call when nothing the widget shows has changed. */
export function syncWidget(data: AppData): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const Storage = storage();
    const group = appGroup();
    if (!Storage || !group || !data.settings.onboarded) return;
    try {
      const payload = widgetPayload(data, getNow());
      const key = JSON.stringify(payload);
      if (key === last) return;
      new Storage(group).set('snapshot', payload);
      Storage.reloadWidget(WIDGET_KIND);
      last = key;
    } catch {
      // A widget problem must never break the app.
    }
  }, 500);
}
