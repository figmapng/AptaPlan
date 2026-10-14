import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsType from 'expo-notifications';
import type { Task } from '@/types/task';
import type { Language } from '@/types/settings';
import { getTranslations } from '@/i18n/formatters';
import { findNextOccurrence } from '@/database/task-repository';
import { addDays, fromDateKey, toDateKey } from './date-service';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const isAndroidExpoGo = Platform.OS === 'android' && isExpoGo;

let Notifications: typeof NotificationsType | null = null;
if (!isAndroidExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    console.warn('Could not load expo-notifications:', e);
  }
}

const DEFAULT_OFFSET_MINUTES = 0;
const CHANNEL_ID = 'default';

// Without a handler, Expo deliberately suppresses notifications while the app
// is open. Keep the reminder visible and audible in both foreground and background.
if (Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationChannel(lang?: Language): Promise<void> {
  if (Platform.OS === 'android' && Notifications?.setNotificationChannelAsync) {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: getTranslations(lang).notifications.channelName,
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

async function hasPermission(request: boolean): Promise<boolean> {
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!request || !current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Fields of a task that determine when its reminder fires. */
export type ReminderTask = Pick<Task, 'date' | 'time' | 'repeatType' | 'notificationOffset'> &
  Partial<Pick<Task, 'title' | 'repeatInterval' | 'repeatConfig' | 'isCompleted'>>;

const toTask = (task: ReminderTask): Task => ({
  id: '',
  title: task.title ?? '',
  note: null,
  priority: 'normal',
  notificationId: null,
  sortOrder: 0,
  createdAt: '',
  updatedAt: '',
  isCompleted: !!task.isCompleted,
  date: task.date,
  time: task.time,
  repeatType: task.repeatType || 'none',
  repeatInterval: task.repeatInterval ?? 1,
  repeatConfig: task.repeatConfig ?? null,
  notificationOffset: task.notificationOffset,
});

const fireDateFor = (dateKey: string, time: string, offset: number) => {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = fromDateKey(dateKey);
  d.setHours(h, m - offset, 0, 0);
  return d;
};

// First occurrence (not in `skips`) whose reminder time is still ahead of `now`.
// Starts one day back because a positive offset can move a reminder to the previous day.
function nextFire(task: Task, time: string, offset: number, skips: Set<string>, now: Date) {
  let fromKey = toDateKey(addDays(now, -1));
  for (let guard = 0; guard < 400; guard++) {
    const key = findNextOccurrence(task, fromKey, skips);
    if (!key) return null;
    const fire = fireDateFor(key, time, offset);
    if (!fire) return null;
    if (fire > now) return { key, fire };
    fromKey = toDateKey(addDays(fromDateKey(key), 1));
  }
  return null;
}

const NATIVE_REPEATS = new Set(['daily', 'weekly', 'monthly']);

/**
 * Works out the trigger for a task's reminder.
 *
 * - One-off tasks get a single date trigger (none if completed or in the past).
 * - daily / weekly / monthly tasks with interval 1 use a native repeating
 *   trigger, so they keep firing even if the app is not opened — unless the
 *   upcoming occurrence was completed or deleted, in which case the next valid
 *   occurrence is scheduled once (the app re-schedules on the next launch).
 * - Every other cadence schedules its next valid occurrence once; the app
 *   re-schedules after it fires whenever it is opened.
 *
 * `skips` holds occurrence date keys that are completed or deleted.
 */
export function computeReminderTrigger(
  input: ReminderTask,
  skips: Set<string> = new Set(),
  now: Date = new Date()
): NotificationsType.NotificationTriggerInput | null {
  if (input.notificationOffset == null || !input.time) return null;
  const task = toTask(input);
  const offset = task.notificationOffset ?? 0;
  const time = task.time as string;

  if (task.repeatType === 'none') {
    if (task.isCompleted) return null;
    const fire = fireDateFor(task.date, time, offset);
    if (!fire || fire <= now) return null;
    return { type: 'date' as any, date: fire };
  }

  const upcoming = nextFire(task, time, offset, skips, now);
  if (!upcoming) return null;
  const fire = upcoming.fire;
  // Was an earlier occurrence (e.g. today's) completed or deleted?
  const upcomingSkipped = skips.size > 0 && nextFire(task, time, offset, new Set(), now)?.key !== upcoming.key;
  if (
    NATIVE_REPEATS.has(task.repeatType) &&
    (task.repeatInterval ?? 1) === 1 &&
    !task.repeatConfig &&
    !upcomingSkipped &&
    task.date <= toDateKey(now)
  ) {
    const hour = fire.getHours();
    const minute = fire.getMinutes();
    if (task.repeatType === 'daily') return { type: 'daily' as any, hour, minute };
    if (task.repeatType === 'weekly') return { type: 'weekly' as any, weekday: fire.getDay() + 1, hour, minute };
    return { type: 'monthly' as any, day: fire.getDate(), hour, minute };
  }

  return { type: 'date' as any, date: fire };
}

export type ScheduleOptions = {
  skips?: Set<string>;
  lang?: Language;
  /** Ask the user for permission if it has not been decided yet. */
  requestPermission?: boolean;
};

/** Schedules the task's reminder and returns its id, or null when nothing was scheduled. */
export async function scheduleReminder(task: ReminderTask, opts: ScheduleOptions = {}): Promise<string | null> {
  if (!Notifications) return null;
  const trigger = computeReminderTrigger(task, opts.skips);
  if (!trigger) return null;
  if (!(await hasPermission(opts.requestPermission ?? true))) return null;
  await ensureNotificationChannel(opts.lang);

  const t = getTranslations(opts.lang);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: t.notifications.title,
      body: task.title ?? '',
      sound: 'default',
    },
    trigger: Platform.OS === 'android' ? ({ ...trigger, channelId: CHANNEL_ID } as NotificationsType.NotificationTriggerInput) : trigger,
  });
}

export async function cancelReminder(id: string | null | undefined): Promise<void> {
  if (!id || !Notifications?.cancelScheduledNotificationAsync) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {
    console.warn('Failed to cancel reminder', e);
  }
}

/** AptaPlan only schedules task reminders, so this clears orphans as well. */
export async function cancelAllReminders(): Promise<void> {
  if (!Notifications?.cancelAllScheduledNotificationsAsync) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('Failed to cancel reminders', e);
  }
}

export const REMINDER_DEFAULT_OFFSET_MINUTES = DEFAULT_OFFSET_MINUTES;
