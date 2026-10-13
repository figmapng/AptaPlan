import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsType from 'expo-notifications';
import type { TaskInput } from '@/types/task';
import { fromDateKey } from './date-service';

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

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android' && Notifications?.setNotificationChannelAsync) {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Еске салғыш',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

/**
 * Schedules a reminder at the task's date+time, or earlier when an explicit
 * `notificationOffset` is provided.
 * Standard daily, weekly, and monthly tasks use native repeating triggers once
 * their start date has arrived. Returns the scheduled notification id, or null when the
 * task has no time / offset, permission is denied, or the time already passed.
 */
export async function scheduleReminder(task: TaskInput): Promise<string | null> {
  if (!Notifications || task.isCompleted || task.notificationOffset == null || !task.time) return null;
  await ensureNotificationChannel();
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;

  const triggerDate = fromDateKey(task.date);
  const [h, m] = task.time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  triggerDate.setHours(h, m - task.notificationOffset, 0, 0);

  const trigger = getNotificationTrigger(task, triggerDate);
  if (!trigger) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Тапсырма уақыты келді',
      body: task.title,
      sound: 'default',
    },
    trigger,
  });
}

export function getNotificationTrigger(task: TaskInput, triggerDate: Date): NotificationsType.NotificationTriggerInput | null {
  const hour = triggerDate.getHours();
  const minute = triggerDate.getMinutes();

  // Native repeating triggers are available for the standard repeat options.
  // Advanced/custom intervals use a one-shot reminder because their cadence cannot
  // be represented accurately by a single native trigger.
  if ((task.repeatInterval ?? 1) === 1 && task.date <= new Date().toISOString().slice(0, 10)) {
    if (task.repeatType === 'daily') {
      return { type: 'daily' as any, hour, minute };
    }
    if (task.repeatType === 'weekly') {
      return {
        type: 'weekly' as any,
        weekday: triggerDate.getDay() + 1,
        hour,
        minute,
      };
    }
    if (task.repeatType === 'monthly') {
      return {
        type: 'monthly' as any,
        day: triggerDate.getDate(),
        hour,
        minute,
      };
    }
  }

  if (triggerDate <= new Date()) return null;
  return { type: 'date' as any, date: triggerDate };
}

export async function cancelReminder(id: string | null): Promise<void> {
  if (!id || !Notifications?.cancelScheduledNotificationAsync) return;
  await Notifications.cancelScheduledNotificationAsync(id);
}

export const REMINDER_DEFAULT_OFFSET_MINUTES = DEFAULT_OFFSET_MINUTES;
