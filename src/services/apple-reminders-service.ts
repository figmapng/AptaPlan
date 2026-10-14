import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createTask,
  deleteSyncedTasks,
  deleteTask,
  getAllExternalIds,
  getTaskByExternalId,
  updateTask,
} from '@/database/task-repository';
import { cancelReminder } from '@/services/notification-service';
import { toDateKey } from '@/utils/dateHelpers';

export async function removeSyncedAppleReminders(db: SQLiteDatabase): Promise<number> {
  const rows = await deleteSyncedTasks(db);
  for (const r of rows) {
    await cancelReminder(r.notificationId);
  }
  return rows.length;
}

export async function requestRemindersPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const { status } = await Calendar.requestRemindersPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.warn('Error requesting reminders permission:', error);
    return false;
  }
}

export async function checkRemindersPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const { status } = await Calendar.getRemindersPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export type SyncErrorCode = 'iosOnly' | 'permissionDenied' | 'syncFailed';

export type SyncResult = {
  success: boolean;
  importedCount: number;
  updatedCount: number;
  removedCount?: number;
  totalFound: number;
  /** Translate with `t.remindersErrors[errorCode]`. */
  errorCode?: SyncErrorCode;
  /** Raw technical detail, for logging only. */
  error?: string;
};

const failure = (errorCode: SyncErrorCode, error?: string): SyncResult => ({
  success: false,
  importedCount: 0,
  updatedCount: 0,
  totalFound: 0,
  errorCode,
  error,
});

/**
 * ONE-WAY SYNC: Apple Reminders -> AptaPlan
 * Data from AptaPlan is NEVER exported or written to Apple Reminders.
 */
export async function syncAppleRemindersToAptaPlan(db: SQLiteDatabase): Promise<SyncResult> {
  if (Platform.OS !== 'ios') {
    return failure('iosOnly');
  }

  const hasPermission = await requestRemindersPermission();
  if (!hasPermission) {
    return failure('permissionDenied');
  }

  try {
    // 1. Get all Reminder lists
    const reminderCalendars = (await Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER)) ?? [];
    const calendarIds = reminderCalendars.map((c) => c.id);

    // 2. Fetch reminders (within past 30 days and future 2 years)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 2);

    const reminders = calendarIds.length
      ? await Calendar.getRemindersAsync(calendarIds, null as any, startDate, endDate)
      : [];
    const seenExternalIds = new Set<string>();

    let importedCount = 0;
    let updatedCount = 0;

    for (const rem of reminders) {
      if (!rem.title || rem.title.trim() === '') continue;

      const externalId = rem.id;
      if (!externalId) continue;
      seenExternalIds.add(externalId);
      const isCompleted = rem.completed ?? false;
      const note = rem.notes || null;
      const title = rem.title.trim();

      // Find the specific date for the task
      let targetDate: Date | null = null;
      let taskTime: string | null = null;

      if (rem.dueDate) {
        const d = new Date(rem.dueDate);
        if (!isNaN(d.getTime())) {
          targetDate = d;
        }
      } else if (isCompleted && rem.completionDate) {
        const d = new Date(rem.completionDate);
        if (!isNaN(d.getTime())) {
          targetDate = d;
        }
      } else if (rem.startDate) {
        const d = new Date(rem.startDate);
        if (!isNaN(d.getTime())) {
          targetDate = d;
        }
      }

      // If a task is already completed and has NO due date, completion date, or start date,
      // do NOT import it to today. Remove if previously synced to prevent clogging today's list.
      if (isCompleted && !targetDate) {
        const existing = await getTaskByExternalId(db, externalId);
        if (existing) {
          await cancelReminder(existing.notificationId);
          await deleteTask(db, existing.id);
        }
        continue;
      }

      let taskDate = toDateKey(new Date());
      if (targetDate) {
        taskDate = toDateKey(targetDate);
        const hh = String(targetDate.getHours()).padStart(2, '0');
        const mm = String(targetDate.getMinutes()).padStart(2, '0');
        if (hh !== '00' || mm !== '00') {
          taskTime = `${hh}:${mm}`;
        }
      } else {
        // Active (uncompleted) task with no explicit date defaults to today
        taskDate = toDateKey(new Date());
      }

      const existing = await getTaskByExternalId(db, externalId);

      if (existing) {
        const shouldUpdate =
          existing.title !== title ||
          existing.isCompleted !== isCompleted ||
          existing.date !== taskDate ||
          existing.time !== taskTime ||
          existing.note !== note;

        if (shouldUpdate) {
          // Only the fields that come from Reminders change; everything the
          // user configured in AptaPlan (repeat rule, reminder offset…) is kept.
          await updateTask(db, existing.id, {
            title,
            date: taskDate,
            time: taskTime,
            note,
            isCompleted,
            priority: existing.priority,
            repeatType: existing.repeatType,
            repeatInterval: existing.repeatInterval,
            repeatConfig: existing.repeatConfig ?? null,
            notificationOffset: taskTime ? existing.notificationOffset : null,
          });
          updatedCount++;
        }
      } else {
        await createTask(db, {
          externalId,
          title,
          date: taskDate,
          time: taskTime,
          note,
          isCompleted,
          priority: 'normal',
          repeatType: 'none',
        });
        importedCount++;
      }
    }

    // Reminders deleted in the Reminders app disappear here too. Only tasks
    // inside the fetched window are considered, so nothing outside it is lost.
    const windowStart = toDateKey(startDate);
    const windowEnd = toDateKey(endDate);
    let removedCount = 0;
    for (const local of await getAllExternalIds(db)) {
      if (seenExternalIds.has(local.externalId)) continue;
      const task = await getTaskByExternalId(db, local.externalId);
      if (!task || task.date < windowStart || task.date > windowEnd) continue;
      await cancelReminder(local.notificationId);
      await deleteTask(db, local.id);
      removedCount++;
    }

    return {
      success: true,
      importedCount,
      updatedCount,
      removedCount,
      totalFound: reminders.length,
    };
  } catch (error: any) {
    console.error('Error syncing reminders:', error);
    return failure('syncFailed', error?.message);
  }
}
