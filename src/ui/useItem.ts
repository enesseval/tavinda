import { useMemo } from 'react';

import { makeItem, type TodayItem } from '../domain/today';
import { useNow } from '../services/clock';
import { useAppData } from '../services/data';

/** Live view of one instance (heat, share, defer state) for sheets and detail. */
export function useInstanceItem(instanceId: number): { item: Omit<TodayItem, 'group'> | null; today: string } {
  const data = useAppData();
  const { today } = useNow();
  const item = useMemo(() => {
    const inst = data.instances.find((i) => i.id === instanceId);
    if (!inst) return null;
    const task = data.tasks.find((x) => x.id === inst.taskId);
    if (!task) return null;
    const course = task.courseId != null ? (data.courses.find((k) => k.id === task.courseId) ?? null) : null;
    return makeItem(inst, task, course, today, data.settings);
  }, [data, instanceId, today]);
  return { item, today };
}
