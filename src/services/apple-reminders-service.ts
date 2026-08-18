import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import type { SQLiteDatabase } from 'expo-sqlite';
import { createTask, getTaskByExternalId, updateTask } from '@/database/task-repository';
import { toDateKey } from '@/utils/dateHelpers';

export async function requestRemindersPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const { status } = await Calendar.requestRemindersPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting reminders permission:', error);
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

export type SyncResult = {
  success: boolean;
  importedCount: number;
  updatedCount: number;
  totalFound: number;
  error?: string;
};

/**
 * ONE-WAY SYNC: Apple Reminders -> AptaPlan
 * Data from AptaPlan is NEVER exported or written to Apple Reminders.
 */
export async function syncAppleRemindersToAptaPlan(db: SQLiteDatabase): Promise<SyncResult> {
  if (Platform.OS !== 'ios') {
    return {
      success: false,
      importedCount: 0,
      updatedCount: 0,
      totalFound: 0,
      error: 'Apple Reminders синхрондау тек iOS құрылғыларында қолжетімді.',
    };
  }

  const hasPermission = await requestRemindersPermission();
  if (!hasPermission) {
    return {
      success: false,
      importedCount: 0,
      updatedCount: 0,
      totalFound: 0,
      error: 'Еске салғыштарға кіру рұқсаты берілмеді. iPhone баптауларынан рұқсат беріңіз.',
    };
  }

  try {
    // 1. Get all Reminder lists
    const reminderCalendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER);
    if (!reminderCalendars || reminderCalendars.length === 0) {
      return { success: true, importedCount: 0, updatedCount: 0, totalFound: 0 };
    }

    const calendarIds = reminderCalendars.map((c) => c.id);

    // 2. Fetch reminders (within past 30 days and future 2 years)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 2);

    const reminders = await Calendar.getRemindersAsync(calendarIds, null, startDate, endDate);

    let importedCount = 0;
    let updatedCount = 0;

    for (const rem of reminders) {
      if (!rem.title || rem.title.trim() === '') continue;

      let taskDate = toDateKey(new Date());
      let taskTime: string | null = null;

      if (rem.dueDate) {
        const d = new Date(rem.dueDate);
        if (!isNaN(d.getTime())) {
          taskDate = toDateKey(d);
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          if (hh !== '00' || mm !== '00') {
            taskTime = `${hh}:${mm}`;
          }
        }
      } else if (rem.startDate) {
        const d = new Date(rem.startDate);
        if (!isNaN(d.getTime())) {
          taskDate = toDateKey(d);
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          if (hh !== '00' || mm !== '00') {
            taskTime = `${hh}:${mm}`;
          }
        }
      }

      const externalId = rem.id;
      if (!externalId) continue;
      const isCompleted = rem.completed ?? false;
      const note = rem.notes || null;
      const title = rem.title.trim();

      const existing = await getTaskByExternalId(db, externalId);

      if (existing) {
        const shouldUpdate =
          existing.title !== title ||
          existing.isCompleted !== isCompleted ||
          existing.date !== taskDate ||
          existing.time !== taskTime ||
          existing.note !== note;

        if (shouldUpdate) {
          await updateTask(db, existing.id, {
            title,
            date: taskDate,
            time: taskTime,
            note,
            isCompleted,
            priority: existing.priority,
            repeatType: existing.repeatType,
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

    return {
      success: true,
      importedCount,
      updatedCount,
      totalFound: reminders.length,
    };
  } catch (error: any) {
    console.error('Error syncing reminders:', error);
    return {
      success: false,
      importedCount: 0,
      updatedCount: 0,
      totalFound: 0,
      error: error?.message || 'Синхрондау кезінде қате орын алды.',
    };
  }
}
