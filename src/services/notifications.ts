import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { planNotifications, type PlannedNotification } from '../domain/notifications';
import type { AppData } from '../domain/types';
import { fmtMinutes } from '../i18n/format';
import { t } from '../i18n/tr';
import { getNow } from './clock';

let configured = false;

export function configureNotifications(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Tavında',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => undefined);
  }
}

export async function getNotificationStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) return 'granted';
    return p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const p = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    return p.granted;
  } catch {
    return false;
  }
}

/** Screen to open when the notification is tapped. */
function urlFor(n: PlannedNotification): string | null {
  if (n.kind === 'classEnd') return '/block/new';
  if (n.kind === 'blockEnd') return `/block/${n.blockId}`;
  return null;
}

const BLOCK_NAMES: Record<string, string> = t.blocks.names;

function content(n: PlannedNotification): { title: string; body: string } {
  switch (n.kind) {
    case 'morning':
      return {
        title: t.notifications.morningTitle,
        body: t.notifications.morningBody(fmtMinutes(n.totalMinutes), n.count, n.hottestTitle),
      };
    case 'lastDayMorning':
      return { title: t.notifications.lastDayTitle, body: t.notifications.lastDayBody(n.titles) };
    case 'lastDayEvening':
      return { title: n.title, body: t.notifications.eveningBody(n.remainingPct, fmtMinutes(n.remainingMinutes)) };
    case 'startNow':
      return { title: t.notifications.startNowTitle, body: t.notifications.startNowBody(n.title, n.daysLeft) };
    case 'lastMinutes':
      return { title: n.title, body: t.notifications.lastMinutesBody(n.minutes) };
    case 'classEnd':
      return { title: t.blocks.notifClassEnd(n.course), body: t.blocks.notifClassEndBody };
    case 'blockEnd':
      return {
        title: t.blocks.notifBlockEnd(BLOCK_NAMES[n.name] ?? n.name),
        body: n.isTask ? t.blocks.notifBlockEndTask : t.blocks.notifBlockEndPassive,
      };
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
let running: Promise<void> = Promise.resolve();

/** Replaces all scheduled notifications with a fresh plan. Debounced; safe to call often. */
export function rescheduleNotifications(data: AppData): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    running = running.then(() => doReschedule(data)).catch(() => undefined);
  }, 400);
}

async function doReschedule(data: AppData): Promise<void> {
  if (!data.settings.onboarded) return;
  const status = await getNotificationStatus();
  if (status !== 'granted') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const appNow = getNow();
  const offset = appNow.getTime() - Date.now();
  const realNow = Date.now();
  for (const n of planNotifications(data, appNow)) {
    const fireAt = n.fireAt.getTime() - offset;
    if (fireAt <= realNow + 5_000) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { ...content(n), sound: 'default', data: { url: urlFor(n) } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt), channelId: 'default' },
    });
  }
}

export async function scheduledCount(): Promise<number> {
  try {
    return (await Notifications.getAllScheduledNotificationsAsync()).length;
  } catch {
    return 0;
  }
}

export async function sendTestNotification(): Promise<boolean> {
  let status = await getNotificationStatus();
  if (status === 'undetermined') status = (await requestNotificationPermission()) ? 'granted' : 'denied';
  if (status !== 'granted') return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: t.notifications.testTitle, body: t.notifications.testBody, sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: 'default' },
  });
  return true;
}

/** Opens the screen a tapped notification points to (time blocks). Returns an unsubscribe function. */
export function listenForNotificationTaps(open: (url: string) => void): () => void {
  const handle = (r: Notifications.NotificationResponse | null) => {
    const url = r?.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) open(url);
  };
  Notifications.getLastNotificationResponseAsync()
    .then(handle)
    .catch(() => undefined);
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
