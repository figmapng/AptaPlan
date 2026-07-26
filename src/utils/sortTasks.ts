import type { Task } from '@/types/task';

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // 1. Timed tasks first (ascending order)
    if (a.time && !b.time) return -1;
    if (!a.time && b.time) return 1;
    if (a.time && b.time) {
      const timeDiff = a.time.localeCompare(b.time);
      if (timeDiff !== 0) return timeDiff;
    }

    // 2. Manual order preserved
    const orderA = a.order ?? a.sortOrder ?? 0;
    const orderB = b.order ?? b.sortOrder ?? 0;
    return orderA - orderB;
  });
}
