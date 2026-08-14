import { remainingTaskCount, toggleTaskSnapshot } from '../task-service';
import type { Task } from '@/types/task';

const task: Task = {
  id: '1',
  title: 'Test',
  note: null,
  date: '2026-07-01',
  time: null,
  isCompleted: false,
  priority: 'normal',
  repeatType: 'none',
  repeatInterval: 1,
  notificationOffset: null,
  notificationId: null,
  sortOrder: 0,
  createdAt: '',
  updatedAt: '',
};

test('remaining count', () => expect(remainingTaskCount([task, task, task, task, task, task])).toBe(3));
test('completed toggle', () => expect(toggleTaskSnapshot(task).isCompleted).toBe(true));
