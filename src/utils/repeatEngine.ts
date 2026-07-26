import type { Task, TaskRepeat } from '@/types/task';
import { fromDateKey, toDateKey } from './dateHelpers';
import { addDays, addMonths, addYears } from 'date-fns';

export function shouldGenerateRepeat(task: Task, targetDateKey: string): boolean {
  if (!task.repeat || task.repeat === 'none') return false;
  if (task.date === targetDateKey) return false;

  const originDate = fromDateKey(task.date);
  const targetDate = fromDateKey(targetDateKey);

  if (targetDate <= originDate) return false;

  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 6 = Sat

  switch (task.repeat) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'weekly':
      return originDate.getDay() === dayOfWeek;
    case 'monthly':
      return originDate.getDate() === targetDate.getDate();
    case 'yearly':
      return originDate.getDate() === targetDate.getDate() && originDate.getMonth() === targetDate.getMonth();
    default:
      return false;
  }
}

export function processRepeatEngine(tasks: Task[], targetDateKey: string = toDateKey(new Date())): Task[] {
  const existingKeys = new Set(tasks.map((t) => `${t.title}:${t.date}`));
  const generated: Task[] = [];

  for (const task of tasks) {
    if (shouldGenerateRepeat(task, targetDateKey)) {
      const key = `${task.title}:${targetDateKey}`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        generated.push({
          ...task,
          id: `repeat_${task.id}_${targetDateKey}`,
          date: targetDateKey,
          completed: false,
          isCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          occurrenceDate: targetDateKey,
        });
      }
    }
  }

  return [...tasks, ...generated];
}
