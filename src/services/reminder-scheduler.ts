import type { SQLiteDatabase } from 'expo-sqlite';
import type { Language } from '@/types/settings';
import {
  getAllNotificationIds,
  getOccurrenceSkips,
  getTask,
  getTasksWithReminders,
  setNotificationId,
} from '@/database/task-repository';
import { cancelAllReminders, cancelReminder, scheduleReminder } from '@/services/notification-service';
import { addDays, toDateKey } from '@/services/date-service';

const skipWindowStart = () => toDateKey(addDays(new Date(), -1));

/**
 * Cancels the task's current reminder and schedules a fresh one that reflects
 * its latest time, repeat rule and completed/deleted occurrences.
 */
export async function refreshTaskReminder(
  db: SQLiteDatabase,
  taskId: string,
  opts: { lang?: Language; requestPermission?: boolean } = {}
) {
  const task = await getTask(db, taskId);
  if (!task) return;
  await cancelReminder(task.notificationId);
  let reminderId: string | null = null;
  try {
    const skips = task.repeatType === 'none' ? new Set<string>() : await getOccurrenceSkips(db, task.id, skipWindowStart());
    reminderId = await scheduleReminder(task, { skips, lang: opts.lang, requestPermission: opts.requestPermission });
  } catch (e) {
    console.warn('Reminder schedule failed', e);
  }
  await setNotificationId(db, task.id, reminderId);
}

/**
 * Rebuilds every reminder from the database. Run on launch and when the app
 * returns to the foreground so one-shot reminders for repeating tasks roll
 * forward and stale identifiers are dropped. Never prompts for permission.
 */
export async function rescheduleAllReminders(db: SQLiteDatabase, lang?: Language) {
  const known = await getAllNotificationIds(db);
  await Promise.all(known.map((id) => cancelReminder(id)));
  await cancelAllReminders();
  await db.runAsync('UPDATE tasks SET notificationId=NULL WHERE notificationId IS NOT NULL');

  const tasks = await getTasksWithReminders(db);
  const fromKey = skipWindowStart();
  for (const task of tasks) {
    try {
      const skips = task.repeatType === 'none' ? new Set<string>() : await getOccurrenceSkips(db, task.id, fromKey);
      const id = await scheduleReminder(task, { skips, lang, requestPermission: false });
      if (id) await setNotificationId(db, task.id, id);
    } catch (e) {
      console.warn('Reminder reschedule failed', task.id, e);
    }
  }
}
