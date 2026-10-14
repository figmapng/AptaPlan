import { createTestDb } from './test-db';
import { migrate } from '../migrations';
import * as repo from '../task-repository';
import { getSettings, setSetting } from '../settings-repository';
import { defaultSettings } from '@/types/settings';
import type { SQLiteDatabase } from 'expo-sqlite';

async function freshDb() {
  const db = createTestDb();
  await migrate(db);
  return db;
}

const titles = (tasks: { title: string }[]) => tasks.map((t) => t.title);

describe('migrations', () => {
  it('creates the full schema and can run repeatedly', async () => {
    const db = await freshDb();
    await migrate(db);
    const cols = (await db.getAllAsync<{ name: string }>('PRAGMA table_info(tasks)')).map((c) => c.name);
    expect(cols).toEqual(expect.arrayContaining(['repeatConfig', 'externalId', 'sortOrder']));
    const occ = (await db.getAllAsync<{ name: string }>('PRAGMA table_info(task_occurrences)')).map((c) => c.name);
    expect(occ).toContain('isDeleted');
    const versions = await db.getAllAsync<{ version: number }>('SELECT version FROM migrations ORDER BY version');
    expect(versions.map((v) => v.version)).toEqual([1, 2]);
  });

  it('upgrades a legacy database that already has some of the new columns', async () => {
    const db = createTestDb();
    // Shape written by the old migrate(): version 1 recorded, repeatConfig/isDeleted present, no externalId.
    await db.execAsync(`
      CREATE TABLE migrations (version INTEGER PRIMARY KEY);
      INSERT INTO migrations(version) VALUES (1);
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, note TEXT, date TEXT NOT NULL, time TEXT,
        isCompleted INTEGER NOT NULL DEFAULT 0, priority TEXT NOT NULL DEFAULT 'normal',
        repeatType TEXT NOT NULL DEFAULT 'none', repeatInterval INTEGER NOT NULL DEFAULT 1,
        repeatConfig TEXT, notificationOffset INTEGER, notificationId TEXT, sortOrder INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT);
      CREATE TABLE task_occurrences (
        id TEXT PRIMARY KEY, taskId TEXT NOT NULL, occurrenceDate TEXT NOT NULL,
        isCompleted INTEGER NOT NULL DEFAULT 0, completedAt TEXT, isDeleted INTEGER NOT NULL DEFAULT 0,
        UNIQUE(taskId, occurrenceDate));
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO tasks(id,title,date,createdAt,updatedAt) VALUES ('old','Ескі','2026-01-01','x','x');`);
    await migrate(db);
    const cols = (await db.getAllAsync<{ name: string }>('PRAGMA table_info(tasks)')).map((c) => c.name);
    expect(cols).toContain('externalId');
    expect(await repo.getTask(db, 'old')).toMatchObject({ title: 'Ескі' });
  });
});

describe('task repository', () => {
  let db: SQLiteDatabase;
  beforeEach(async () => {
    db = await freshDb();
  });

  it('creates, reads and orders timed tasks chronologically', async () => {
    await repo.createTask(db, { title: 'Кеш', date: '2026-03-02', time: '18:00' });
    await repo.createTask(db, { title: 'Таң', date: '2026-03-02', time: '08:00' });
    await repo.createTask(db, { title: 'Уақытсыз', date: '2026-03-02' });
    expect(titles(await repo.getTasksForDate(db, '2026-03-02'))).toEqual(['Таң', 'Кеш', 'Уақытсыз']);
  });

  it('expands repeating tasks across a range', async () => {
    await repo.createTask(db, { title: 'Күнде', date: '2026-03-02', repeatType: 'daily' });
    await repo.createTask(db, { title: 'Апта', date: '2026-03-02', repeatType: 'weekly' });
    await repo.createTask(db, { title: 'Жұмыс', date: '2026-03-02', repeatType: 'weekdays' });
    const tasks = await repo.getTasksForRange(db, '2026-03-02', '2026-03-15');
    const count = (title: string) => tasks.filter((t) => t.title === title).length;
    expect(count('Күнде')).toBe(14);
    expect(count('Апта')).toBe(2);
    expect(count('Жұмыс')).toBe(10);
  });

  it('completes a single occurrence of a repeating task without touching the others', async () => {
    const id = await repo.createTask(db, { title: 'Күнде', date: '2026-03-02', repeatType: 'daily' });
    const [first] = await repo.getTasksForDate(db, '2026-03-03');
    await repo.toggleTaskCompletion(db, first);
    expect((await repo.getTasksForDate(db, '2026-03-03'))[0].isCompleted).toBe(true);
    expect((await repo.getTasksForDate(db, '2026-03-04'))[0].isCompleted).toBe(false);
    expect(await repo.getOccurrenceSkips(db, id, '2026-03-01')).toEqual(new Set(['2026-03-03']));
  });

  it('deletes a single occurrence of a repeating task', async () => {
    const id = await repo.createTask(db, { title: 'Күнде', date: '2026-03-02', repeatType: 'daily' });
    await repo.deleteTaskOccurrence(db, id, '2026-03-03');
    expect(await repo.getTasksForDate(db, '2026-03-03')).toHaveLength(0);
    expect(await repo.getTasksForDate(db, '2026-03-04')).toHaveLength(1);
    expect(await repo.getTask(db, id)).not.toBeNull();
  });

  it('hard-deletes a task together with its occurrence overrides', async () => {
    const id = await repo.createTask(db, { title: 'Күнде', date: '2026-03-02', repeatType: 'daily' });
    await repo.deleteTaskOccurrence(db, id, '2026-03-03');
    await repo.deleteTask(db, id);
    expect(await db.getFirstAsync('SELECT * FROM tasks WHERE id=?', id)).toBeNull();
    expect(await db.getAllAsync('SELECT * FROM task_occurrences')).toHaveLength(0);
  });

  it('purges rows left by the old soft-delete', async () => {
    const id = await repo.createTask(db, { title: 'Ескі', date: '2026-03-02' });
    await db.runAsync("UPDATE tasks SET deletedAt='2026-01-01' WHERE id=?", id);
    await repo.purgeSoftDeletedTasks(db);
    expect(await db.getAllAsync('SELECT * FROM tasks')).toHaveLength(0);
  });

  it('updates a task and keeps sortOrder consistent when the date changes', async () => {
    const id = await repo.createTask(db, { title: 'А', date: '2026-03-02', time: '10:00' });
    await repo.updateTask(db, id, { title: 'Б', date: '2026-03-05', time: '09:00' });
    expect(await repo.getTasksForDate(db, '2026-03-02')).toHaveLength(0);
    expect(await repo.getTasksForDate(db, '2026-03-05')).toEqual([expect.objectContaining({ title: 'Б', time: '09:00' })]);
  });

  it('saves a manual order', async () => {
    const a = await repo.createTask(db, { title: 'A', date: '2026-03-02' });
    const b = await repo.createTask(db, { title: 'B', date: '2026-03-02' });
    await repo.saveManualOrder(db, [b, a]);
    expect(titles(await repo.getTasksForRange(db, '2026-03-02', '2026-03-02', { sortMode: 'manual' }))).toEqual(['B', 'A']);
  });

  it('lists tasks that need reminders', async () => {
    await repo.createTask(db, { title: 'Ескерт', date: '2026-03-02', time: '10:00', notificationOffset: 0 });
    await repo.createTask(db, { title: 'Жоқ', date: '2026-03-02', time: '10:00' });
    expect(titles(await repo.getTasksWithReminders(db))).toEqual(['Ескерт']);
  });

  it('finds the next occurrence, honouring skipped dates', async () => {
    const id = await repo.createTask(db, { title: 'Апта', date: '2026-03-02', repeatType: 'weekly' });
    const task = (await repo.getTask(db, id))!;
    expect(repo.findNextOccurrence(task, '2026-03-03')).toBe('2026-03-09');
    expect(repo.findNextOccurrence(task, '2026-03-03', new Set(['2026-03-09']))).toBe('2026-03-16');
  });
});

describe('settings repository', () => {
  it('ignores malformed and invalid values instead of failing', async () => {
    const db = await freshDb();
    await setSetting(db, 'haptics', false);
    await db.runAsync("INSERT INTO settings(key,value) VALUES ('theme','not json')");
    await db.runAsync("INSERT INTO settings(key,value) VALUES ('sortMode','\"sideways\"')");
    await db.runAsync("INSERT INTO settings(key,value) VALUES ('unknownKey','1')");
    const settings = await getSettings(db);
    expect(settings.haptics).toBe(false);
    expect(settings.theme).toBe(defaultSettings.theme);
    expect(settings.sortMode).toBe(defaultSettings.sortMode);
    expect(settings).not.toHaveProperty('unknownKey');
  });
});
