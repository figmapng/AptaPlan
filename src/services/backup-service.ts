import { Alert, Share } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { format } from 'date-fns';

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
export async function exportBackup(db: SQLiteDatabase): Promise<boolean> {
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
          dialogTitle: 'AptaPlan Деректерді Экспорттау',
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
    Alert.alert('Экспорт қатесі', error instanceof Error ? error.message : 'Деректерді экспорттау мүмкін болмады');
    return false;
  }
}

/**
 * Lets the user pick a JSON file and restores all tasks, occurrences, and settings.
 */
export async function importBackup(
  db: SQLiteDatabase,
  onSuccess: () => Promise<void>
): Promise<boolean> {
  try {
    const DocumentPicker = getDocumentPicker();
    const FileSystem = getFileSystem();

    if (!DocumentPicker || !FileSystem) {
      Alert.alert('Импорт қатесі', 'Файлдарды танңдау модулі дайын емес');
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
      Alert.alert('Импорт қатесі', 'Таңдалған файл дұрыс JSON форматында емес');
      return false;
    }

    if (!payload.tasks || !Array.isArray(payload.tasks)) {
      Alert.alert('Импорт қатесі', 'Файлда АптаПлан тапсырмалар құрылымы табылмады');
      return false;
    }

    return new Promise((resolve) => {
      Alert.alert(
        'Деректерді қалпына келтіру',
        `Файлда ${payload.tasks.length} тапсырма бар. Барлық тапсырмалар мен баптауларды импорттауды растайсыз ба?`,
        [
          { text: 'Болдырмау', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Импорттау',
            style: 'destructive',
            onPress: async () => {
              try {
                await db.withTransactionAsync(async () => {
                  await db.execAsync('DELETE FROM task_occurrences; DELETE FROM tasks; DELETE FROM settings;');

                  for (const t of payload.tasks) {
                    await db.runAsync(
                      `INSERT OR REPLACE INTO tasks (
                        id, title, note, date, time, isCompleted, priority,
                        repeatType, repeatInterval, notificationOffset, notificationId,
                        sortOrder, createdAt, updatedAt, deletedAt
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                      [
                        t.id,
                        t.title,
                        t.note ?? null,
                        t.date,
                        t.time ?? null,
                        t.isCompleted ?? 0,
                        t.priority ?? 'normal',
                        t.repeatType ?? 'none',
                        t.repeatInterval ?? 1,
                        t.notificationOffset ?? null,
                        t.notificationId ?? null,
                        t.sortOrder ?? 0,
                        t.createdAt ?? new Date().toISOString(),
                        t.updatedAt ?? new Date().toISOString(),
                        t.deletedAt ?? null,
                      ]
                    );
                  }

                  if (payload.occurrences && Array.isArray(payload.occurrences)) {
                    for (const o of payload.occurrences) {
                      await db.runAsync(
                        `INSERT OR REPLACE INTO task_occurrences (
                          id, taskId, occurrenceDate, isCompleted, completedAt
                        ) VALUES (?, ?, ?, ?, ?)`,
                        [o.id, o.taskId, o.occurrenceDate, o.isCompleted ?? 0, o.completedAt ?? null]
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
                Alert.alert('Сәтті орындалды', 'Деректер мен баптаулар сәтті қалпына келтірілді');
                resolve(true);
              } catch (e) {
                Alert.alert('Импорт қатесі', e instanceof Error ? e.message : 'Дерекқорға жазу мүмкін болмады');
                resolve(false);
              }
            },
          },
        ]
      );
    });
  } catch (error) {
    Alert.alert('Импорт қатесі', error instanceof Error ? error.message : 'Файлды оқу мүмкін болмады');
    return false;
  }
}
