import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback } from 'react';

import type { TodayItem } from '../domain/today';
import type { LocalDate } from '../domain/types';
import { t } from '../i18n/tr';
import { deferInstance, saveProgress } from '../services/actions';
import { useUi } from '../store/ui';
import { motion } from '../theme/tokens';
import { reliefLine } from './taskText';

type Item = Omit<TodayItem, 'group'>;

/** Complete / defer / open flows shared by Today, Calendar and Detail. */
export function useTaskActions(today: LocalDate) {
  const markLeaving = useUi((s) => s.markLeaving);
  const showToast = useUi((s) => s.showToast);

  const openProgress = useCallback((instanceId: number) => {
    router.push({ pathname: '/progress/[id]', params: { id: String(instanceId) } });
  }, []);

  const openDetail = useCallback((taskId: number) => {
    router.push({ pathname: '/task/[id]', params: { id: String(taskId) } });
  }, []);

  const complete = useCallback(
    (item: Item) => {
      if (item.instance.status !== 'active') return;
      const id = item.instance.id;
      markLeaving(id, true);
      setTimeout(() => {
        const receipt = saveProgress(id, 100);
        markLeaving(id, false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        showToast(t.toast.done(reliefLine(item, today)), receipt);
      }, motion.leaveMs);
    },
    [markLeaving, showToast, today],
  );

  const defer = useCallback(
    (item: Item) => {
      if (item.instance.status !== 'active') return;
      const id = item.instance.id;
      if (!item.canDefer) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        router.push({ pathname: '/lock/[id]', params: { id: String(id) } });
        return;
      }
      markLeaving(id, true);
      setTimeout(() => {
        const outcome = deferInstance(id);
        markLeaving(id, false);
        if (outcome.ok) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
          showToast(t.toast.deferred(outcome.remainingPct), outcome.receipt);
        } else {
          showToast(t.toast.locked);
        }
      }, motion.leaveMs);
    },
    [markLeaving, showToast],
  );

  return { complete, defer, openProgress, openDetail };
}
