import type { SQLiteDatabase } from 'expo-sqlite';
import { defaultSettings, sanitizeSettings, type PlannerSettings } from '@/types/settings';

type SettingRow = { key: string; value: string };

// A single malformed row (e.g. from a hand-edited backup) must never prevent
// the app from starting, so each value is parsed and validated independently.
function rowsToSettings(rows: SettingRow[]): PlannerSettings {
  const raw: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      raw[r.key] = JSON.parse(r.value);
    } catch {
      // ignore unreadable value, the default is used instead
    }
  }
  return { ...defaultSettings, ...sanitizeSettings(raw) };
}

export function getSettingsSync(db: SQLiteDatabase): PlannerSettings {
  try {
    return rowsToSettings(db.getAllSync<SettingRow>('SELECT key, value FROM settings'));
  } catch {
    return defaultSettings;
  }
}

export async function getSettings(db: SQLiteDatabase): Promise<PlannerSettings> {
  try {
    return rowsToSettings(await db.getAllAsync<SettingRow>('SELECT key, value FROM settings'));
  } catch (e) {
    console.warn('Failed to read settings, using defaults', e);
    return defaultSettings;
  }
}

export async function setSetting<K extends keyof PlannerSettings>(
  db: SQLiteDatabase,
  key: K,
  value: PlannerSettings[K]
) {
  await db.runAsync(
    'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    key,
    JSON.stringify(value)
  );
}
