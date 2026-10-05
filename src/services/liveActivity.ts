import { requireOptionalNativeModule } from 'expo-modules-core';

import { parseTimestamp } from '../domain/schedule';
import type { AppData, TimeBlock } from '../domain/types';
import { blockName } from '../ui/blockText';

/**
 * Mirrors the running time block as a Live Activity (lock screen + Dynamic Island).
 * Native side: modules/tavinda-live-activity. Missing on iOS < 16.2, Android and in tests.
 */

type Payload = { blockId: number; kind: string; name: string; startMs: number; endMs: number };
type Native = { sync: (p: Payload | null) => void; isSupported: () => boolean };

const native = requireOptionalNativeModule<Native>('TavindaLiveActivity');

/** The block worth showing: the most recently started one that is still open. */
export function liveBlock(blocks: TimeBlock[]): TimeBlock | null {
  const open = blocks.filter((b) => b.status === 'running');
  return open.sort((a, b) => b.startAt.localeCompare(a.startAt))[0] ?? null;
}

/** 'on', 'off' (user disabled Live Activities for the app) or 'unsupported' (iOS < 16.2, Android, tests). */
export function liveActivityStatus(): 'on' | 'off' | 'unsupported' {
  if (!native) return 'unsupported';
  try {
    return native.isSupported() ? 'on' : 'off';
  } catch {
    return 'unsupported';
  }
}

let last = '';

export function syncLiveActivity(data: AppData): void {
  if (!native) return;
  const b = liveBlock(data.blocks);
  const offset = data.settings.timeOffsetMs;
  const payload: Payload | null = b
    ? {
        blockId: b.id,
        kind: b.kind,
        name: blockName(b),
        startMs: parseTimestamp(b.startAt).getTime() - offset,
        endMs: parseTimestamp(b.endAt).getTime() - offset,
      }
    : null;
  const key = JSON.stringify(payload);
  if (key === last) return;
  last = key;
  try {
    native.sync(payload);
  } catch {
    // Live Activities are a bonus; never let them break the app.
  }
}
