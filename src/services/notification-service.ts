import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { TaskInput } from '@/types/task';
import { fromDateKey } from './date-service';

const DEFAULT_OFFSET_MINUTES = 10;

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Еске салғыш',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

/**
 * Schedules a one-shot reminder `notificationOffset` minutes before the
 * task's date+time. Returns the scheduled notification id, or null when the
 * task has no time / offset, permission is denied, or the time already passed.
 */
export async function scheduleReminder(task: TaskInput): Promise<string | null> {
  if (task.notificationOffset == null || !task.time) return null;
  await ensureNotificationChannel();
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;

  const trigger = fromDateKey(task.date);
  const [h, m] = task.time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  trigger.setHours(h, m - task.notificationOffset, 0, 0);
  if (trigger <= new Date()) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Тапсырма уақыты келді',
      body: task.title,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
}

export async function cancelReminder(id: string | null): Promise<void> {
  if (!id) return;
  await Notifications.cancelScheduledNotificationAsync(id);
}

export const REMINDER_DEFAULT_OFFSET_MINUTES = DEFAULT_OFFSET_MINUTES;
