import type { SQLiteDatabase } from 'expo-sqlite';
import type { RepeatType, Task, TaskInput, TaskRepeat } from '@/types/task';
import { addDays, fromDateKey, toDateKey } from '@/services/date-service';
import { createId } from '@/utils/id';

type Row = Omit<Task, 'isCompleted'> & { isCompleted: number };
const map = (r: Row): Task => ({
  ...r,
  isCompleted: !!r.isCompleted,
  completed: !!r.isCompleted,
  repeat: (r.repeatType as TaskRepeat) || 'none',
  repeatInterval: r.repeatInterval ?? 1,
  sortOrder: r.sortOrder ?? 0,
  order: r.order ?? r.sortOrder ?? 0,
});

const occursOn = (task: Task, date: string) => {
  if (task.date > date) return false;
  if (task.repeatType === 'none') return task.date === date;
  const start = fromDateKey(task.date);
  const target = fromDateKey(date);
  const interval = Math.max(1, task.repeatInterval ?? 1);
  const dayOfWeek = target.getDay();

  if (task.repeatType === 'hourly' || task.repeatType === 'daily' || task.repeatType === 'custom') {
    const diffDays = Math.round((target.getTime() - start.getTime()) / 86400000);
    return diffDays >= 0 && diffDays % interval === 0;
  }
  if (task.repeatType === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
  if (task.repeatType === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6;
  if (task.repeatType === 'weekly') {
    const diffWeeks = Math.round((target.getTime() - start.getTime()) / 604800000);
    return start.getDay() === dayOfWeek && diffWeeks % interval === 0;
  }
  if (task.repeatType === 'yearly') {
    return start.getMonth() === target.getMonth() && start.getDate() === target.getDate();
  }
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
    `INSERT INTO tasks(id,title,note,date,time,priority,repeatType,repeatInterval,notificationOffset,sortOrder,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
    id,
    input.title.trim(),
    input.note || null,
    input.date,
    input.time || null,
    input.priority || 'normal',
    input.repeatType || 'none',
    input.repeatInterval || 1,
    input.notificationOffset || null,
    row?.n ?? 0,
    now,
    now
  );
  return id;
}

export async function updateTask(db: SQLiteDatabase, id: string, input: TaskInput) {
  await db.runAsync(
    `UPDATE tasks SET title=?,note=?,date=?,time=?,priority=?,repeatType=?,repeatInterval=?,notificationOffset=?,updatedAt=? WHERE id=?`,
    input.title.trim(),
    input.note || null,
    input.date,
    input.time || null,
    input.priority || 'normal',
    input.repeatType || 'none',
    input.repeatInterval || 1,
    input.notificationOffset || null,
    new Date().toISOString(),
    id
  );
}

export async function deleteTask(db: SQLiteDatabase, id: string) {
  await db.runAsync('UPDATE tasks SET deletedAt=?,updatedAt=? WHERE id=?', new Date().toISOString(), new Date().toISOString(), id);
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
