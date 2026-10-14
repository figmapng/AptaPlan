import { Alert, Share } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { format } from 'date-fns';
import type { Language } from '@/types/settings';
import { getTranslations } from '@/i18n/formatters';
import { rescheduleAllReminders } from '@/services/reminder-scheduler';
import { sanitizeSettings } from '@/types/settings';

export interface BackupData {
  version: number;
  appName: string;
  exportedAt: string;
  tasks: any[];
  occurrences: any[];
  settings: Record<string, string>;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const str = (v: unknown) => (typeof v === 'string' ? v : null);
const int = (v: unknown, fallback: number) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : fallback);
const flag = (v: unknown) => (v === true || v === 1 || v === '1' ? 1 : 0);

type TaskRowInput = {
  id: string;
  externalId: string | null;
  title: string;
  note: string | null;
  date: string;
  time: string | null;
  isCompleted: number;
  priority: string;
  repeatType: string;
  repeatInterval: number;
  repeatConfig: string | null;
  notificationOffset: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** Validates one task from a backup file; returns null for unusable entries. */
export function normalizeBackupTask(item: any): TaskRowInput | null {
  if (!item || typeof item !== 'object') return null;
  if (item.deletedAt) return null;
  const id = str(item.id);
  const title = str(item.title)?.trim();
  const date = str(item.date);
  if (!id || !title || !date || !DATE_KEY.test(date)) return null;
  const time = str(item.time);
  let repeatConfig: string | null = null;
  if (typeof item.repeatConfig === 'string') {
    try {
      JSON.parse(item.repeatConfig);
      repeatConfig = item.repeatConfig;
    } catch {
      repeatConfig = null;
    }
  } else if (item.repeatConfig && typeof item.repeatConfig === 'object') {
    repeatConfig = JSON.stringify(item.repeatConfig);
  }
  const now = new Date().toISOString();
  return {
    id,
    externalId: str(item.externalId),
    title,
    note: str(item.note),
    date,
    time: time && TIME.test(time) ? time : null,
    isCompleted: flag(item.isCompleted),
    priority: item.priority === 'important' ? 'important' : 'normal',
    repeatType: str(item.repeatType) ?? 'none',
    repeatInterval: Math.max(1, int(item.repeatInterval, 1)),
    repeatConfig,
    notificationOffset: item.notificationOffset == null ? null : int(item.notificationOffset, 0),
    sortOrder: int(item.sortOrder, 0),
    createdAt: str(item.createdAt) ?? now,
    updatedAt: str(item.updatedAt) ?? now,
  };
}

/** Parses the settings section of a backup into rows safe to store. */
export function normalizeBackupSettings(raw: unknown): [string, string][] {
  if (!raw || typeof raw !== 'object') return [];
  const parsed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'string') {
      parsed[key] = value;
      continue;
    }
    try {
      parsed[key] = JSON.parse(value);
    } catch {
      // unreadable value — skipped
    }
  }
  return Object.entries(sanitizeSettings(parsed)).map(([k, v]) => [k, JSON.stringify(v)]);
}

function getFileSystem() {
  try {
    // The root `expo-file-system` export throws for these string-based methods
    // since SDK 54; the legacy entry point keeps them working.
    return require('expo-file-system/legacy');
  } catch {
    return null;
  }
}

function getSharing() {
  try {
    return require('expo-sharing');
  } catch {
    return null;
  }
}

function getDocumentPicker() {
  try {
    return require('expo-document-picker');
  } catch {
    return null;
  }
}

/**
 * Exports all database tables (tasks, task_occurrences, settings) into a formatted JSON backup file
 * and triggers the system share sheet.
 */
export async function exportBackup(db: SQLiteDatabase, lang: Language = 'kk'): Promise<boolean> {
  const t = getTranslations(lang);
  try {
    // notificationId is device-local and meaningless elsewhere, so it is not exported.
    const tasks = await db.getAllAsync(
      `SELECT id, externalId, title, note, date, time, isCompleted, priority, repeatType, repeatInterval,
              repeatConfig, notificationOffset, sortOrder, createdAt, updatedAt
         FROM tasks WHERE deletedAt IS NULL`
    );
    const occurrences = await db.getAllAsync(
      'SELECT * FROM task_occurrences WHERE taskId IN (SELECT id FROM tasks WHERE deletedAt IS NULL)'
    );
    const rawSettings = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings');

    const settingsObj: Record<string, string> = {};
    for (const row of rawSettings) {
      settingsObj[row.key] = row.value;
    }

    const backupPayload: BackupData = {
      version: 1,
      appName: 'AptaPlan',
      exportedAt: new Date().toISOString(),
      tasks,
      occurrences,
      settings: settingsObj,
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const FileSystem = getFileSystem();
    const Sharing = getSharing();

    if (FileSystem && FileSystem.cacheDirectory) {
      const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
      const fileName = `aptaplan_backup_${dateStr}.json`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      const encoding = FileSystem.EncodingType?.UTF8 ?? 'utf8';

      await FileSystem.writeAsStringAsync(filePath, jsonString, { encoding });

      if (Sharing && (await Sharing.isAvailableAsync())) {
        try {
          await Sharing.shareAsync(filePath, {
            mimeType: 'application/json',
            dialogTitle: `${t.settings.exportBackup}`,
            UTI: 'public.json',
          });
        } finally {
          // Don't leave a copy of the user's data lying around in the cache.
          if (FileSystem.deleteAsync) {
            await FileSystem.deleteAsync(filePath, { idempotent: true }).catch(() => {});
          }
        }
        return true;
      }
    }

    // Fallback to React Native system Share
    await Share.share({
      title: 'AptaPlan Backup',
      message: jsonString,
    });
    return true;
  } catch (error) {
    Alert.alert(t.alerts.exportErrorTitle, error instanceof Error ? error.message : t.alerts.exportErrorMessage);
    return false;
  }
}

/**
 * Lets the user pick a JSON file and restores all tasks, occurrences, and settings.
 */
export async function importBackup(
  db: SQLiteDatabase,
  onSuccess: () => Promise<void>,
  lang: Language = 'kk'
): Promise<boolean> {
  const t = getTranslations(lang);
  try {
    const DocumentPicker = getDocumentPicker();
    const FileSystem = getFileSystem();

    if (!DocumentPicker || !FileSystem) {
      Alert.alert(t.alerts.importErrorTitle, t.alerts.importModuleNotReady);
      return false;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/json', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return false;
    }

    const fileUri = result.assets[0].uri;
    const encoding = FileSystem.EncodingType?.UTF8 ?? 'utf8';
    const content = await FileSystem.readAsStringAsync(fileUri, { encoding });

    let payload: BackupData;
    try {
      payload = JSON.parse(content);
    } catch {
      Alert.alert(t.alerts.importErrorTitle, t.alerts.importInvalidJson);
      return false;
    }

    if (!payload || !Array.isArray(payload.tasks)) {
      Alert.alert(t.alerts.importErrorTitle, t.alerts.importInvalidStructure);
      return false;
    }

    const tasks = payload.tasks.map(normalizeBackupTask).filter((x): x is TaskRowInput => x !== null);
    const taskIds = new Set(tasks.map((x) => x.id));
    const occurrences = (Array.isArray(payload.occurrences) ? payload.occurrences : []).filter(
      (o: any) => o && typeof o.id === 'string' && taskIds.has(o.taskId) && DATE_KEY.test(String(o.occurrenceDate))
    );
    const settingsRows = normalizeBackupSettings(payload.settings);

    return new Promise((resolve) => {
      Alert.alert(
        t.alerts.restoreBackupTitle,
        t.alerts.restoreBackupMessage(tasks.length),
        [
          { text: t.common.cancel, style: 'cancel', onPress: () => resolve(false) },
          {
            text: t.settings.importBackup,
            style: 'destructive',
            onPress: async () => {
              try {
                await db.withTransactionAsync(async () => {
                  await db.execAsync('DELETE FROM task_occurrences; DELETE FROM tasks; DELETE FROM settings;');

                  for (const x of tasks) {
                    await db.runAsync(
                      `INSERT OR REPLACE INTO tasks (
                        id, externalId, title, note, date, time, isCompleted, priority,
                        repeatType, repeatInterval, repeatConfig, notificationOffset, notificationId,
                        sortOrder, createdAt, updatedAt, deletedAt
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL)`,
                      [
                        x.id, x.externalId, x.title, x.note, x.date, x.time, x.isCompleted, x.priority,
                        x.repeatType, x.repeatInterval, x.repeatConfig, x.notificationOffset,
                        x.sortOrder, x.createdAt, x.updatedAt,
                      ]
                    );
                  }

                  for (const o of occurrences) {
                    await db.runAsync(
                      `INSERT OR REPLACE INTO task_occurrences (
                        id, taskId, occurrenceDate, isCompleted, completedAt, isDeleted
                      ) VALUES (?, ?, ?, ?, ?, ?)`,
                      [o.id, o.taskId, o.occurrenceDate, flag(o.isCompleted), str(o.completedAt), flag(o.isDeleted)]
                    );
                  }

                  for (const [key, value] of settingsRows) {
                    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
                  }
                });

                // Notification identifiers are local to one device: rebuild them all.
                await rescheduleAllReminders(db, lang);

                await onSuccess();
                Alert.alert(t.alerts.importSuccessTitle, t.alerts.importSuccessMessage);
                resolve(true);
              } catch (e) {
                Alert.alert(t.alerts.importErrorTitle, e instanceof Error ? e.message : t.alerts.importErrorMessage);
                resolve(false);
              }
            },
          },
        ]
      );
    });
  } catch (error) {
    Alert.alert(t.alerts.importErrorTitle, error instanceof Error ? error.message : t.alerts.importErrorMessage);
    return false;
  }
}
