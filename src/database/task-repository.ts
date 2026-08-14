import type { SQLiteDatabase } from 'expo-sqlite';
import type { RepeatConfig, RepeatType, Task, TaskInput, TaskRepeat } from '@/types/task';
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

const occursOn = (task: Task, date: string) => {
  if (task.date > date) return false;
  if (task.repeatType === 'none') return task.date === date;
  const start = fromDateKey(task.date);
  const target = fromDateKey(date);
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

export type TaskSortOptions = { sortMode?: 'time' | 'manual'; completedPlacement?: 'keep' | 'bottom' };
const sortTasksForRange = (tasks: Task[], opts?: TaskSortOptions) => {
  const sortMode = opts?.sortMode ?? 'manual';
  const placement = opts?.completedPlacement ?? 'bottom';
  return [...tasks].sort((a, b) => {
    if (placement === 'bottom') {
      const aDone = Number(a.isCompleted);
      const bDone = Number(b.isCompleted);
      if (aDone !== bDone) return aDone - bDone;
    }
    if (sortMode === 'time') {
      const aHas = !!a.time;
      const bHas = !!b.time;
      if (aHas !== bHas) return aHas ? -1 : 1;
      if (aHas && a.time !== b.time) return a.time!.localeCompare(b.time!);
    }
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
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
  const result: Task[] = [];
  for (let cursor = start; cursor <= end; cursor = toDateKey(addDays(fromDateKey(cursor), 1))) {
    for (const task of rows) {
      if (occursOn(task, cursor)) {
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

export async function createTask(db: SQLiteDatabase, input: TaskInput) {
  const now = new Date().toISOString();
  const id = createId();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COALESCE(MAX(sortOrder), -1) + 1 AS n FROM tasks WHERE date=?', input.date);
  await db.runAsync(
    `INSERT INTO tasks(id,title,note,date,time,priority,repeatType,repeatInterval,repeatConfig,notificationOffset,sortOrder,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id,
    input.title.trim(),
    input.note || null,
    input.date,
    input.time || null,
    input.priority || 'normal',
    input.repeatType || 'none',
    input.repeatInterval || 1,
    input.repeatConfig ? JSON.stringify(input.repeatConfig) : null,
    input.notificationOffset || null,
    row?.n ?? 0,
    now,
    now
  );
  return id;
}

export async function updateTask(db: SQLiteDatabase, id: string, input: TaskInput) {
  await db.runAsync(
    `UPDATE tasks SET title=?,note=?,date=?,time=?,priority=?,repeatType=?,repeatInterval=?,repeatConfig=?,notificationOffset=?,updatedAt=? WHERE id=?`,
    input.title.trim(),
    input.note || null,
    input.date,
    input.time || null,
    input.priority || 'normal',
    input.repeatType || 'none',
    input.repeatInterval || 1,
    input.repeatConfig ? JSON.stringify(input.repeatConfig) : null,
    input.notificationOffset || null,
    new Date().toISOString(),
    id
  );
}

export async function setNotificationId(db: SQLiteDatabase, id: string, notificationId: string | null) {
  await db.runAsync('UPDATE tasks SET notificationId=?,updatedAt=? WHERE id=?', notificationId, new Date().toISOString(), id);
}

export async function deleteTask(db: SQLiteDatabase, id: string) {
  await db.runAsync('UPDATE tasks SET deletedAt=?,updatedAt=? WHERE id=?', new Date().toISOString(), new Date().toISOString(), id);
}

export async function deleteAllTasks(db: SQLiteDatabase) {
  await db.runAsync(
    'UPDATE tasks SET deletedAt=?,updatedAt=? WHERE deletedAt IS NULL',
    new Date().toISOString(),
    new Date().toISOString()
  );
  await db.runAsync('DELETE FROM task_occurrences');
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
