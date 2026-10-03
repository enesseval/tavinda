import type { TimeBlock } from '../domain/types';
import { t } from '../i18n/tr';

/** What a block was: 'Yemek', 'Kütüphane', 'Labı hazırla · %40 tamam'. */
export function blockName(b: Pick<TimeBlock, 'kind' | 'label' | 'taskTitle' | 'toPct' | 'status'>): string {
  if (b.kind === 'task') {
    const title = b.taskTitle ?? t.blocks.names.task;
    return b.status === 'done' && b.toPct != null ? t.blocks.doneTask(title, b.toPct) : t.blocks.runningTask(title);
  }
  if (b.kind === 'other') return b.label ?? t.blocks.names.other;
  return t.blocks.names[b.kind];
}

/** 'HH:mm' from a stored local timestamp. */
export const clockOf = (ts: string) => ts.slice(11, 16);
