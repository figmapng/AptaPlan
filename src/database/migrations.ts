import type { SQLiteDatabase } from 'expo-sqlite';

type Migration = { version: number; up: (db: SQLiteDatabase) => Promise<void> };

async function hasColumn(db: SQLiteDatabase, table: string, column: string) {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

async function addColumnIfMissing(db: SQLiteDatabase, table: string, column: string, definition: string) {
  if (!(await hasColumn(db, table, column))) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  }
}

// Each migration runs once, in order, inside its own transaction. Never edit a
// migration that has shipped — append a new one instead.
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, note TEXT, date TEXT NOT NULL, time TEXT,
          isCompleted INTEGER NOT NULL DEFAULT 0, priority TEXT NOT NULL DEFAULT 'normal',
          repeatType TEXT NOT NULL DEFAULT 'none', repeatInterval INTEGER NOT NULL DEFAULT 1,
          notificationOffset INTEGER, notificationId TEXT, sortOrder INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT
        );
        CREATE TABLE IF NOT EXISTS task_occurrences (
          id TEXT PRIMARY KEY, taskId TEXT NOT NULL, occurrenceDate TEXT NOT NULL,
          isCompleted INTEGER NOT NULL DEFAULT 0, completedAt TEXT,
          UNIQUE(taskId, occurrenceDate), FOREIGN KEY(taskId) REFERENCES tasks(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);`);
    },
  },
  {
    version: 2,
    up: async (db) => {
      await addColumnIfMissing(db, 'task_occurrences', 'isDeleted', 'INTEGER NOT NULL DEFAULT 0');
      await addColumnIfMissing(db, 'tasks', 'repeatConfig', 'TEXT');
      await addColumnIfMissing(db, 'tasks', 'externalId', 'TEXT');
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_tasks_external_id ON tasks(externalId);
        CREATE INDEX IF NOT EXISTS idx_occurrences_date ON task_occurrences(occurrenceDate);`);
    },
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY);`);

  const row = await db.getFirstAsync<{ v: number | null }>('SELECT MAX(version) AS v FROM migrations');
  const current = row?.v ?? 0;

  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await m.up(db);
      await db.runAsync('INSERT OR IGNORE INTO migrations(version) VALUES (?)', m.version);
    });
  }
}
