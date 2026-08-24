import { Alert, Share } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { format } from 'date-fns';
import type { Language } from '@/types/settings';
import { getTranslations } from '@/i18n/formatters';

export interface BackupData {
  version: number;
  appName: string;
  exportedAt: string;
  tasks: any[];
  occurrences: any[];
  settings: Record<string, string>;
}

function getFileSystem() {
  try {
    return require('expo-file-system');
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
    const tasks = await db.getAllAsync('SELECT * FROM tasks');
    const occurrences = await db.getAllAsync('SELECT * FROM task_occurrences');
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
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: `${t.settings.exportBackup}`,
          UTI: 'public.json',
        });
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

    if (!payload.tasks || !Array.isArray(payload.tasks)) {
      Alert.alert(t.alerts.importErrorTitle, t.alerts.importInvalidStructure);
      return false;
    }

    return new Promise((resolve) => {
      Alert.alert(
        t.alerts.restoreBackupTitle,
        t.alerts.restoreBackupMessage(payload.tasks.length),
        [
          { text: t.common.cancel, style: 'cancel', onPress: () => resolve(false) },
          {
            text: t.settings.importBackup,
            style: 'destructive',
            onPress: async () => {
              try {
                await db.withTransactionAsync(async () => {
                  await db.execAsync('DELETE FROM task_occurrences; DELETE FROM tasks; DELETE FROM settings;');

                  for (const taskItem of payload.tasks) {
                    const repeatConfig =
                      typeof taskItem.repeatConfig === 'string'
                        ? taskItem.repeatConfig
                        : taskItem.repeatConfig
                        ? JSON.stringify(taskItem.repeatConfig)
                        : null;
                    await db.runAsync(
                      `INSERT OR REPLACE INTO tasks (
                        id, title, note, date, time, isCompleted, priority,
                        repeatType, repeatInterval, repeatConfig, notificationOffset, notificationId,
                        sortOrder, createdAt, updatedAt, deletedAt
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                      [
                        taskItem.id,
                        taskItem.title,
                        taskItem.note ?? null,
                        taskItem.date,
                        taskItem.time ?? null,
                        taskItem.isCompleted ?? 0,
                        taskItem.priority ?? 'normal',
                        taskItem.repeatType ?? 'none',
                        taskItem.repeatInterval ?? 1,
                        repeatConfig,
                        taskItem.notificationOffset ?? null,
                        taskItem.notificationId ?? null,
                        taskItem.sortOrder ?? 0,
                        taskItem.createdAt ?? new Date().toISOString(),
                        taskItem.updatedAt ?? new Date().toISOString(),
                        taskItem.deletedAt ?? null,
                      ]
                    );
                  }

                  if (payload.occurrences && Array.isArray(payload.occurrences)) {
                    for (const o of payload.occurrences) {
                      await db.runAsync(
                        `INSERT OR REPLACE INTO task_occurrences (
                          id, taskId, occurrenceDate, isCompleted, completedAt, isDeleted
                        ) VALUES (?, ?, ?, ?, ?, ?)`,
                        [o.id, o.taskId, o.occurrenceDate, o.isCompleted ?? 0, o.completedAt ?? null, o.isDeleted ?? 0]
                      );
                    }
                  }

                  if (payload.settings && typeof payload.settings === 'object') {
                    for (const [key, value] of Object.entries(payload.settings)) {
                      await db.runAsync(
                        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                        [key, String(value)]
                      );
                    }
                  }
                });

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

