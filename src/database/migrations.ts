import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, note TEXT, date TEXT NOT NULL, time TEXT,
      isCompleted INTEGER NOT NULL DEFAULT 0, priority TEXT NOT NULL DEFAULT 'normal',
      repeatType TEXT NOT NULL DEFAULT 'none', repeatInterval INTEGER NOT NULL DEFAULT 1,
      repeatConfig TEXT, notificationOffset INTEGER, notificationId TEXT, sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS task_occurrences (
      id TEXT PRIMARY KEY, taskId TEXT NOT NULL, occurrenceDate TEXT NOT NULL,
      isCompleted INTEGER NOT NULL DEFAULT 0, completedAt TEXT,
      isDeleted INTEGER NOT NULL DEFAULT 0,
      UNIQUE(taskId, occurrenceDate), FOREIGN KEY(taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);`);

  try {
    await db.execAsync(`ALTER TABLE task_occurrences ADD COLUMN isDeleted INTEGER NOT NULL DEFAULT 0;`);
  } catch {
    // Column may already exist
  }

  try {
    await db.execAsync(`ALTER TABLE tasks ADD COLUMN repeatConfig TEXT;`);
  } catch {
    // Column may already exist
  }

  await db.runAsync('INSERT OR IGNORE INTO migrations(version) VALUES (1)');
}
