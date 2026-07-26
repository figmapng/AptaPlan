import { create } from 'zustand';
import type { Task, TaskInput, TaskRepeat } from '@/types/task';
import { getTodayKey, toDateKey } from '@/utils/dateHelpers';
import { sortTasks } from '@/utils/sortTasks';
import { processRepeatEngine } from '@/utils/repeatEngine';

interface TaskStoreState {
  tasks: Task[];
  activeDate: string;
  setActiveDate: (date: string) => void;
  createTask: (input: TaskInput) => Task;
  updateTask: (id: string, updates: Partial<TaskInput> & { completed?: boolean }) => void;
  deleteTask: (id: string) => void;
  toggleComplete: (id: string) => void;
  changeDate: (id: string, date: string) => void;
  changeTime: (id: string, time: string | null) => void;
  changeRepeat: (id: string, repeat: TaskRepeat | null) => void;
  reorderTasks: (dateKey: string, fromIndex: number, toIndex: number) => void;
  getTasksForDate: (dateKey: string) => Task[];
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [],
  activeDate: getTodayKey(),

  setActiveDate: (date) => set({ activeDate: date }),

  createTask: (input) => {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      throw new Error('Title cannot be empty');
    }

    const now = new Date().toISOString();
    const existing = get().tasks.filter((t) => t.date === input.date);

    const newTask: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: trimmedTitle,
      completed: false,
      isCompleted: false,
      date: input.date || get().activeDate || getTodayKey(),
      time: input.time || null,
      repeat: input.repeat || 'none',
      repeatType: input.repeat || 'none',
      repeatInterval: 1,
      note: input.note || null,
      priority: input.priority || 'normal',
      notificationOffset: input.notificationOffset || null,
      notificationId: null,
      order: existing.length,
      sortOrder: existing.length,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const updatedList = sortTasks([...state.tasks, newTask]);
      return { tasks: processRepeatEngine(updatedList) };
    });

    return newTask;
  },

  updateTask: (id, updates) => {
    const now = new Date().toISOString();
    set((state) => {
      const updatedTasks: Task[] = state.tasks.map((t) => {
        if (t.id !== id) return t;
        const title = updates.title !== undefined ? updates.title.trim() : t.title;
        const completed = updates.completed !== undefined ? updates.completed : (t.completed ?? t.isCompleted);
        return {
          ...t,
          ...updates,
          title,
          completed,
          isCompleted: completed,
          updatedAt: now,
        };
      });
      return { tasks: sortTasks(updatedTasks) };
    });
  },

  deleteTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  toggleComplete: (id) => {
    const now = new Date().toISOString();
    set((state) => {
      const updatedTasks = state.tasks.map((t) => {
        if (t.id !== id) return t;
        const nextCompleted = !t.completed;
        return {
          ...t,
          completed: nextCompleted,
          isCompleted: nextCompleted,
          updatedAt: now,
        };
      });
      return { tasks: updatedTasks };
    });
  },

  changeDate: (id, date) => {
    get().updateTask(id, { date });
  },

  changeTime: (id, time) => {
    get().updateTask(id, { time });
  },

  changeRepeat: (id, repeat) => {
    get().updateTask(id, { repeat });
  },

  reorderTasks: (dateKey, fromIndex, toIndex) => {
    set((state) => {
      const dayTasks = state.tasks.filter((t) => t.date === dateKey);
      if (fromIndex < 0 || fromIndex >= dayTasks.length || toIndex < 0 || toIndex >= dayTasks.length) {
        return state;
      }
      const item = dayTasks[fromIndex];
      const newDayTasks = [...dayTasks];
      newDayTasks.splice(fromIndex, 1);
      newDayTasks.splice(toIndex, 0, item);

      const reorderedMap = new Map(newDayTasks.map((t, idx) => [t.id, idx]));
      const updatedTasks = state.tasks.map((t) => {
        if (t.date === dateKey && reorderedMap.has(t.id)) {
          const newOrder = reorderedMap.get(t.id)!;
          return { ...t, order: newOrder, sortOrder: newOrder };
        }
        return t;
      });

      return { tasks: updatedTasks };
    });
  },

  getTasksForDate: (dateKey) => {
    const all = get().tasks.filter((t) => t.date === dateKey);
    return sortTasks(all);
  },
}));
