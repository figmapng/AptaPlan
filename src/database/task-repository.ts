import type { SQLiteDatabase } from 'expo-sqlite';
import type { RepeatConfig, Task, TaskInput, TaskRepeat } from '@/types/task';
import { addDays, fromDateKey, toDateKey } from '@/services/date-service';
import { createId } from '@/utils/id';

type Row = Omit<Task, 'isCompleted' | 'repeatConfig'> & {
  isCompleted: number;
  repeatConfig?: string | null;
};

const parseRepeatConfig = (raw: string | null | undefined): RepeatConfig | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RepeatConfig;
  } catch {
    return null;
  }
};

const map = (r: Row): Task => ({
  ...r,
  isCompleted: !!r.isCompleted,
  repeat: (r.repeatType as TaskRepeat) || 'none',
  repeatInterval: r.repeatInterval ?? 1,
  repeatConfig: parseRepeatConfig(r.repeatConfig),
  sortOrder: r.sortOrder ?? 0,
});

const daysBetween = (start: Date, target: Date) => Math.round((target.getTime() - start.getTime()) / 86400000);

// Is `target` the `posIdx`-th weekday `dayIdx` of its month?
// posIdx: 0=1st, 1=2nd, 2=3rd, 3=4th, 4=last
const isNthWeekday = (target: Date, dayIdx: number, posIdx: number) => {
  if (target.getDay() !== dayIdx) return false;
  const ordinal = Math.floor((target.getDate() - 1) / 7);
  if (posIdx === 4) {
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    return target.getDate() + 7 > lastDay;
  }
  return ordinal === posIdx;
};

const occursCustom = (task: Task, start: Date, target: Date, interval: number): boolean => {
  const diffDays = daysBetween(start, target);
  if (diffDays < 0) return false;

  const cfg = task.repeatConfig;
  if (!cfg) return diffDays % interval === 0;

  const unit = cfg.unit;
  if (unit === 'hourly' || unit === 'daily') return diffDays % interval === 0;

  if (unit === 'weekly') {
    if (!cfg.selectedWeekdays || cfg.selectedWeekdays.length === 0) {
      return start.getDay() === target.getDay() && Math.floor(diffDays / 7) % interval === 0;
    }
    if (!cfg.selectedWeekdays.includes(target.getDay())) return false;
    return Math.floor(diffDays / 7) % interval === 0;
  }

  if (unit === 'monthly') {
    const monthsDiff = (target.getFullYear() - start.getFullYear()) * 12 + target.getMonth() - start.getMonth();
    if (monthsDiff % interval !== 0) return false;
    if (cfg.monthlyMode === 'dayOfWeek') {
      const posIdx = cfg.selectedPosIdx ?? 0;
      const dayIdx = cfg.selectedDayIdx ?? start.getDay();
      return isNthWeekday(target, dayIdx, posIdx);
    }
    const day = cfg.selectedMonthDate ?? start.getDate();
    return target.getDate() === day;
  }

  // yearly
  const yearsDiff = target.getFullYear() - start.getFullYear();
  if (yearsDiff < 0 || yearsDiff % interval !== 0) return false;
  const month = cfg.selectedYearlyMonth ?? start.getMonth();
  if (target.getMonth() !== month) return false;
  if (cfg.yearlyEnableWeekdays) {
    return isNthWeekday(target, cfg.selectedDayIdx ?? start.getDay(), cfg.selectedPosIdx ?? 0);
  }
  return target.getDate() === start.getDate();
};

const occursOnDate = (task: Task, start: Date, target: Date, targetKey: string) => {
  if (task.date > targetKey) return false;
  if (task.repeatType === 'none') return task.date === targetKey;
  const interval = Math.max(1, task.repeatInterval ?? 1);
  const dayOfWeek = target.getDay();

  if (task.repeatType === 'custom') {
    return occursCustom(task, start, target, interval);
  }
  if (task.repeatType === 'hourly' || task.repeatType === 'daily') {
    const diffDays = daysBetween(start, target);
    return diffDays >= 0 && diffDays % interval === 0;
  }
  if (task.repeatType === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
  if (task.repeatType === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6;
  if (task.repeatType === 'weekly') {
    const diffWeeks = Math.floor(daysBetween(start, target) / 7);
    return start.getDay() === dayOfWeek && diffWeeks % interval === 0;
  }
  if (task.repeatType === 'yearly') {
    const yearsDiff = target.getFullYear() - start.getFullYear();
    return (
      yearsDiff >= 0 &&
      yearsDiff % interval === 0 &&
      start.getMonth() === target.getMonth() &&
      start.getDate() === target.getDate()
    );
  }
  // monthly
  return (
    start.getDate() === target.getDate() &&
    ((target.getFullYear() - start.getFullYear()) * 12 + target.getMonth() - start.getMonth()) % interval === 0
  );
};

export const occursOn = (task: Task, date: string) =>
  occursOnDate(task, fromDateKey(task.date), fromDateKey(date), date);

/**
 * Returns the first date key >= `fromKey` on which the task occurs and which is
 * not listed in `skip` (deleted/completed occurrences). Searches up to
 * `maxDays` ahead; returns null when nothing is found.
 */
export function findNextOccurrence(task: Task, fromKey: string, skip: Set<string> = new Set(), maxDays = 400) {
  const start = fromDateKey(task.date);
  let cursor = fromDateKey(fromKey > task.date ? fromKey : task.date);
  for (let i = 0; i <= maxDays; i++) {
    const key = toDateKey(cursor);
    if (!skip.has(key) && occursOnDate(task, start, cursor, key)) return key;
    if (task.repeatType === 'none') return null;
    cursor = addDays(cursor, 1);
  }
  return null;
}

export type TaskSortOptions = { sortMode?: 'time' | 'manual'; completedPlacement?: 'keep' | 'bottom' };
const sortTasksForRange = (tasks: Task[], opts?: TaskSortOptions) => {
  const placement = opts?.completedPlacement ?? 'bottom';
  return [...tasks].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);

    if (placement === 'bottom') {
      const aDone = Number(a.isCompleted);
      const bDone = Number(b.isCompleted);
      if (aDone !== bDone) return aDone - bDone;
    }

    if (opts?.sortMode !== 'manual') {
      // Always sort timed tasks chronologically (e.g. 08:00 < 11:31 < 12:52)
      const aHas = !!a.time;
      const bHas = !!b.time;
      if (aHas && bHas && a.time !== b.time) {
        return a.time!.localeCompare(b.time!);
      }
      if (aHas !== bHas) {
        return aHas ? -1 : 1;
      }
    }

    const sortDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (sortDiff !== 0) return sortDiff;

    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });
};

export async function getTasksForRange(db: SQLiteDatabase, start: string, end: string, sortOptions?: TaskSortOptions) {
  const rows = (
    await db.getAllAsync<Row>(
      `SELECT * FROM tasks WHERE deletedAt IS NULL AND date <= ? AND (repeatType != 'none' OR date >= ?)`,
      end,
      start
    )
  ).map(map);
  const overrides = await db.getAllAsync<{ taskId: string; occurrenceDate: string; isCompleted: number; isDeleted: number }>(
    `SELECT taskId, occurrenceDate, isCompleted, COALESCE(isDeleted, 0) AS isDeleted FROM task_occurrences WHERE occurrenceDate BETWEEN ? AND ?`,
    start,
    end
  );
  const overrideMap = new Map(overrides.map((o) => [`${o.taskId}:${o.occurrenceDate}`, !!o.isCompleted]));
  const deletedSet = new Set(overrides.filter((o) => o.isDeleted === 1).map((o) => `${o.taskId}:${o.occurrenceDate}`));
  const compiled = rows.map((task) => ({ task, start: fromDateKey(task.date) }));
  const result: Task[] = [];
  for (let cursor = start; cursor <= end; cursor = toDateKey(addDays(fromDateKey(cursor), 1))) {
    const target = fromDateKey(cursor);
    for (const { task, start: taskStart } of compiled) {
      if (occursOnDate(task, taskStart, target, cursor)) {
        if (deletedSet.has(`${task.id}:${cursor}`)) continue;
        result.push({
          ...task,
          date: cursor,
          occurrenceDate: cursor,
          isCompleted: overrideMap.get(`${task.id}:${cursor}`) ?? task.isCompleted,
        });
      }
    }
  }
  return sortTasksForRange(result, sortOptions);
}
export const getTasksForDate = (db: SQLiteDatabase, date: string) => getTasksForRange(db, date, date);

/**
 * Orders tasks on a given date chronologically by time:
 * 1. Tasks with time: sorted ascending by time ("08:00", "09:30", "14:00"...)
 * 2. Tasks without time: placed after timed tasks, preserving their relative sortOrder / creation order.
 */
export async function reorderTasksByTimeForDate(db: SQLiteDatabase, date: string) {
  const tasks = await db.getAllAsync<{ id: string; time: string | null; sortOrder: number; createdAt: string }>(
    `SELECT id, time, sortOrder, createdAt FROM tasks WHERE date=? AND deletedAt IS NULL`,
    date
  );
  if (tasks.length <= 1) return;

  const sorted = [...tasks].sort((a, b) => {
    const aHas = !!a.time;
    const bHas = !!b.time;
    if (aHas && bHas) {
      const timeCmp = a.time!.localeCompare(b.time!);
      if (timeCmp !== 0) return timeCmp;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    }
    if (aHas !== bHas) return aHas ? -1 : 1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].sortOrder !== i) {
        await db.runAsync('UPDATE tasks SET sortOrder=?, updatedAt=? WHERE id=?', i, now, sorted[i].id);
      }
    }
  });
}

/** Persists a manual order: the task at index i gets sortOrder i. */
export async function saveManualOrder(db: SQLiteDatabase, taskIds: string[]) {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < taskIds.length; i++) {
      await db.runAsync('UPDATE tasks SET sortOrder=?, updatedAt=? WHERE id=?', i, now, taskIds[i]);
    }
  });
}

export async function createTask(db: SQLiteDatabase, input: TaskInput) {
  const now = new Date().toISOString();
  const id = input.id || createId();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COALESCE(MAX(sortOrder), -1) + 1 AS n FROM tasks WHERE date=?', input.date);
  await db.runAsync(
    `INSERT INTO tasks(id,externalId,title,note,date,time,priority,repeatType,repeatInterval,repeatConfig,notificationOffset,isCompleted,sortOrder,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id,
    input.externalId || null,
    input.title.trim(),
    input.note || null,
    input.date,
    input.time || null,
    input.priority || 'normal',
    input.repeatType || 'none',
    input.repeatInterval || 1,
    input.repeatConfig ? JSON.stringify(input.repeatConfig) : null,
    input.notificationOffset ?? null,
    input.isCompleted ? 1 : 0,
    row?.n ?? 0,
    now,
    now
  );
  if (input.time) {
    await reorderTasksByTimeForDate(db, input.date);
  }
  return id;
}

export async function updateTask(db: SQLiteDatabase, id: string, input: TaskInput) {
  const prev = await db.getFirstAsync<{ date: string; time: string | null }>('SELECT date, time FROM tasks WHERE id=?', id);
  await db.runAsync(
    `UPDATE tasks SET title=?,note=?,date=?,time=?,priority=?,repeatType=?,repeatInterval=?,repeatConfig=?,notificationOffset=?,isCompleted=CASE WHEN ? IS NOT NULL THEN ? ELSE isCompleted END,updatedAt=? WHERE id=?`,
    input.title.trim(),
    input.note || null,
    input.date,
    input.time || null,
    input.priority || 'normal',
    input.repeatType || 'none',
    input.repeatInterval || 1,
    input.repeatConfig ? JSON.stringify(input.repeatConfig) : null,
    input.notificationOffset ?? null,
    input.isCompleted !== undefined ? (input.isCompleted ? 1 : 0) : null,
    input.isCompleted !== undefined ? (input.isCompleted ? 1 : 0) : null,
    new Date().toISOString(),
    id
  );
  if (input.time !== (prev?.time || null) || input.date !== prev?.date) {
    if (prev?.date && prev.date !== input.date) {
      await reorderTasksByTimeForDate(db, prev.date);
    }
    if (input.time) {
      await reorderTasksByTimeForDate(db, input.date);
    }
  }
}

export async function getTaskByExternalId(db: SQLiteDatabase, externalId: string) {
  const r = await db.getFirstAsync<Row>('SELECT * FROM tasks WHERE externalId=? AND deletedAt IS NULL', externalId);
  return r ? map(r) : null;
}

export async function setNotificationId(db: SQLiteDatabase, id: string, notificationId: string | null) {
  // Device-local metadata: deliberately leaves updatedAt untouched.
  await db.runAsync('UPDATE tasks SET notificationId=? WHERE id=?', notificationId, id);
}

// These helpers deliberately avoid withTransactionAsync: expo-sqlite cannot
// nest transactions, and deletes are often fired concurrently from the UI.
export async function deleteTask(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM task_occurrences WHERE taskId=?', id);
  await db.runAsync('DELETE FROM tasks WHERE id=?', id);
}

export async function deleteSyncedTasks(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ id: string; notificationId: string | null }>(
    'SELECT id, notificationId FROM tasks WHERE externalId IS NOT NULL'
  );
  await db.execAsync(`
    DELETE FROM task_occurrences WHERE taskId IN (SELECT id FROM tasks WHERE externalId IS NOT NULL);
    DELETE FROM tasks WHERE externalId IS NOT NULL;`);
  return rows;
}

export async function deleteAllTasks(db: SQLiteDatabase) {
  await db.execAsync('DELETE FROM task_occurrences; DELETE FROM tasks;');
}

/** Removes rows left behind by the old soft-delete implementation. */
export async function purgeSoftDeletedTasks(db: SQLiteDatabase) {
  await db.execAsync(`
    DELETE FROM task_occurrences WHERE taskId IN (SELECT id FROM tasks WHERE deletedAt IS NOT NULL);
    DELETE FROM tasks WHERE deletedAt IS NOT NULL;
    DELETE FROM task_occurrences WHERE taskId NOT IN (SELECT id FROM tasks);`);
}

export async function getTasksWithReminders(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM tasks WHERE deletedAt IS NULL AND time IS NOT NULL AND notificationOffset IS NOT NULL'
  );
  return rows.map(map);
}

export async function getOccurrenceSkips(db: SQLiteDatabase, taskId: string, fromKey: string) {
  const rows = await db.getAllAsync<{ occurrenceDate: string }>(
    'SELECT occurrenceDate FROM task_occurrences WHERE taskId=? AND occurrenceDate>=? AND (isDeleted=1 OR isCompleted=1)',
    taskId,
    fromKey
  );
  return new Set(rows.map((r) => r.occurrenceDate));
}

export async function getAllNotificationIds(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ notificationId: string }>(
    'SELECT notificationId FROM tasks WHERE notificationId IS NOT NULL'
  );
  return rows.map((r) => r.notificationId);
}

export async function getAllExternalIds(db: SQLiteDatabase) {
  return db.getAllAsync<{ id: string; externalId: string; notificationId: string | null }>(
    'SELECT id, externalId, notificationId FROM tasks WHERE externalId IS NOT NULL'
  );
}

export async function deleteTaskOccurrence(db: SQLiteDatabase, taskId: string, occurrenceDate: string) {
  const id = createId();
  await db.runAsync(
    `INSERT INTO task_occurrences(id, taskId, occurrenceDate, isCompleted, isDeleted) VALUES(?,?,?,0,1) ON CONFLICT(taskId, occurrenceDate) DO UPDATE SET isDeleted=1`,
    id,
    taskId,
    occurrenceDate
  );
}

export async function toggleTaskCompletion(db: SQLiteDatabase, task: Task) {
  const next = !task.isCompleted;
  if (task.repeatType === 'none')
    await db.runAsync('UPDATE tasks SET isCompleted=?,updatedAt=? WHERE id=?', Number(next), new Date().toISOString(), task.id);
  else
    await db.runAsync(
      `INSERT INTO task_occurrences(id,taskId,occurrenceDate,isCompleted,completedAt) VALUES(?,?,?,?,?) ON CONFLICT(taskId,occurrenceDate) DO UPDATE SET isCompleted=excluded.isCompleted,completedAt=excluded.completedAt`,
      createId(),
      task.id,
      task.occurrenceDate ?? task.date,
      Number(next),
      next ? new Date().toISOString() : null
    );
}

export async function getTask(db: SQLiteDatabase, id: string) {
  const r = await db.getFirstAsync<Row>('SELECT * FROM tasks WHERE id=? AND deletedAt IS NULL', id);
  return r ? map(r) : null;
}
