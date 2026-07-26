import type { SQLiteDatabase } from 'expo-sqlite';
import type { RepeatType, Task, TaskInput } from '@/types/task';
import { addDays, fromDateKey, toDateKey } from '@/services/date-service';
import { createId } from '@/utils/id';

type Row = Omit<Task, 'isCompleted'> & { isCompleted: number };
const map = (r: Row): Task => ({ ...r, isCompleted: !!r.isCompleted, completed: !!r.isCompleted, repeatInterval: r.repeatInterval ?? 1, sortOrder: r.sortOrder ?? 0, order: r.order ?? r.sortOrder ?? 0 });
const occursOn = (task: Task, date: string) => {
  if (task.date > date) return false;
  if (task.repeatType === 'none') return task.date === date;
  const start = fromDateKey(task.date); const target = fromDateKey(date);
  const interval = task.repeatInterval ?? 1;
  if (task.repeatType === 'daily') return Math.round((target.getTime() - start.getTime()) / 86400000) % interval === 0;
  if (task.repeatType === 'weekly') return Math.round((target.getTime() - start.getTime()) / 604800000) % interval === 0;
  return start.getDate() === target.getDate() && ((target.getFullYear()-start.getFullYear())*12+target.getMonth()-start.getMonth()) % interval === 0;
};
export async function getTasksForRange(db: SQLiteDatabase, start: string, end: string) {
  const rows = (await db.getAllAsync<Row>(`SELECT * FROM tasks WHERE deletedAt IS NULL AND date <= ? AND (repeatType != 'none' OR date >= ?)`, end, start)).map(map);
  const overrides = await db.getAllAsync<{taskId:string;occurrenceDate:string;isCompleted:number}>(`SELECT taskId, occurrenceDate, isCompleted FROM task_occurrences WHERE occurrenceDate BETWEEN ? AND ?`, start, end);
  const overrideMap = new Map(overrides.map(o => [`${o.taskId}:${o.occurrenceDate}`, !!o.isCompleted]));
  const result: Task[] = [];
  for (let cursor = start; cursor <= end; cursor = toDateKey(addDays(fromDateKey(cursor), 1))) {
    for (const task of rows) if (occursOn(task, cursor)) result.push({ ...task, date: cursor, occurrenceDate: cursor, isCompleted: overrideMap.get(`${task.id}:${cursor}`) ?? task.isCompleted });
  }
  // The list order is user-controlled. Completion only breaks a tie, so a
  // checked item does not jump away after a drag-and-drop reorder.
  return result.sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || Number(a.isCompleted)-Number(b.isCompleted));
}
export const getTasksForDate = (db: SQLiteDatabase, date: string) => getTasksForRange(db, date, date);
export async function createTask(db: SQLiteDatabase, input: TaskInput) {
  const now = new Date().toISOString(); const id = createId();
  const row = await db.getFirstAsync<{n:number}>('SELECT COALESCE(MAX(sortOrder), -1) + 1 AS n FROM tasks WHERE date=?', input.date);
  await db.runAsync(`INSERT INTO tasks(id,title,note,date,time,priority,repeatType,notificationOffset,sortOrder,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?)`, id,input.title.trim(),input.note||null,input.date,input.time||null,input.priority || 'normal',input.repeatType || 'none',input.notificationOffset || null,row?.n??0,now,now);
  return id;
}
export async function updateTask(db: SQLiteDatabase, id: string, input: TaskInput) {
  await db.runAsync(`UPDATE tasks SET title=?,note=?,date=?,time=?,priority=?,repeatType=?,notificationOffset=?,updatedAt=? WHERE id=?`, input.title.trim(),input.note||null,input.date,input.time||null,input.priority || 'normal',input.repeatType || 'none',input.notificationOffset || null,new Date().toISOString(),id);
}
export async function deleteTask(db: SQLiteDatabase, id: string) { await db.runAsync('UPDATE tasks SET deletedAt=?,updatedAt=? WHERE id=?', new Date().toISOString(),new Date().toISOString(),id); }
export async function toggleTaskCompletion(db: SQLiteDatabase, task: Task) {
  const next = !task.isCompleted;
  if (task.repeatType === 'none') await db.runAsync('UPDATE tasks SET isCompleted=?,updatedAt=? WHERE id=?', Number(next),new Date().toISOString(),task.id);
  else await db.runAsync(`INSERT INTO task_occurrences(id,taskId,occurrenceDate,isCompleted,completedAt) VALUES(?,?,?,?,?) ON CONFLICT(taskId,occurrenceDate) DO UPDATE SET isCompleted=excluded.isCompleted,completedAt=excluded.completedAt`,createId(),task.id,task.occurrenceDate??task.date,Number(next),next?new Date().toISOString():null);
}
export async function getTask(db: SQLiteDatabase, id: string) { const r=await db.getFirstAsync<Row>('SELECT * FROM tasks WHERE id=? AND deletedAt IS NULL',id); return r?map(r):null; }
export async function moveTask(db:SQLiteDatabase,id:string,direction:-1|1){ const t=await db.getFirstAsync<Row>('SELECT * FROM tasks WHERE id=?',id); if(!t)return; const other=await db.getFirstAsync<Row>(`SELECT * FROM tasks WHERE date=? AND deletedAt IS NULL AND sortOrder ${direction<0?'<':'>'} ? ORDER BY sortOrder ${direction<0?'DESC':'ASC'} LIMIT 1`,t.date,t.sortOrder ?? 0); if(!other)return; await db.withTransactionAsync(async()=>{await db.runAsync('UPDATE tasks SET sortOrder=? WHERE id=?',other.sortOrder ?? 0,t.id);await db.runAsync('UPDATE tasks SET sortOrder=? WHERE id=?',t.sortOrder ?? 0,other.id);}); }
