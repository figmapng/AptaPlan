import { createContext, useCallback, useEffect, useMemo, useRef, useState, use } from 'react';
import type { Task, TaskInput } from '@/types/task';
import type { PlannerSettings } from '@/types/settings';
import { defaultSettings } from '@/types/settings';
import { getDatabase } from '@/database/database';
import * as repo from '@/database/task-repository';
import { getSettings, setSetting } from '@/database/settings-repository';
import { seedDemoData } from '@/database/demo-data';

import { addDays, fromDateKey, toDateKey } from '@/services/date-service';

type Store = {
  ready: boolean;
  error: string | null;
  tasks: Task[];
  settings: PlannerSettings;
  loadRange: (s: string, e: string) => Promise<Task[]>;
  refresh: () => Promise<void>;
  toggle: (t: Task) => Promise<void>;
  create: (i: TaskInput) => Promise<string>;
  update: (id: string, i: TaskInput) => Promise<void>;
  remove: (id: string, date?: string, mode?: 'single' | 'all') => Promise<void>;
  removeOccurrence: (taskId: string, occurrenceDate: string) => Promise<void>;
  get: (id: string) => Promise<Task | null>;
  setPref: <K extends keyof PlannerSettings>(k: K, v: PlannerSettings[K]) => Promise<void>;
  clearAll: () => Promise<void>;
};

const Context = createContext<Store | null>(null);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [range, setRange] = useState<[string, string] | null>(null);

  const rangeRef = useRef<[string, string] | null>(null);
  const tasksRef = useRef<Task[]>([]);
  tasksRef.current = tasks;
  const settingsRef = useRef<PlannerSettings>(defaultSettings);
  settingsRef.current = settings;

  const init = useCallback(async () => {
    try {
      const db = await getDatabase();
      await seedDemoData(db);
      const loadedSettings = await getSettings(db);
      setSettings(loadedSettings);

      const today = new Date();
      const s = toDateKey(addDays(today, -60));
      const e = toDateKey(addDays(today, 60));
      rangeRef.current = [s, e];
      setRange([s, e]);
      const loaded = await repo.getTasksForRange(db, s, e, { sortMode: loadedSettings.sortMode, completedPlacement: loadedSettings.completedPlacement });
      tasksRef.current = loaded;
      setTasks(loaded);

      setReady(true);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Деректер базасы ашылмады');
    }
  }, []);

  useEffect(() => {
    void init();
  }, [init]);

  const loadRange = useCallback(async (s: string, e: string) => {
    // If current loaded range already covers [s, e], use in-memory tasks without re-rendering or DB querying!
    if (rangeRef.current && s >= rangeRef.current[0] && e <= rangeRef.current[1]) {
      return tasksRef.current;
    }
    try {
      const db = await getDatabase();
      const startDate = fromDateKey(s);
      const endDate = fromDateKey(e);
      const bufferStart = toDateKey(addDays(startDate, -60));
      const bufferEnd = toDateKey(addDays(endDate, 60));
      rangeRef.current = [bufferStart, bufferEnd];
      setRange([bufferStart, bufferEnd]);
      const loaded = await repo.getTasksForRange(db, bufferStart, bufferEnd, { sortMode: settingsRef.current.sortMode, completedPlacement: settingsRef.current.completedPlacement });
      tasksRef.current = loaded;
      setTasks(loaded);
      return loaded;
    } catch {
      const db = await getDatabase();
      const loaded = await repo.getTasksForRange(db, s, e, { sortMode: settingsRef.current.sortMode, completedPlacement: settingsRef.current.completedPlacement });
      tasksRef.current = loaded;
      setTasks(loaded);
      return loaded;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (rangeRef.current) {
      const db = await getDatabase();
      const loaded = await repo.getTasksForRange(db, rangeRef.current[0], rangeRef.current[1], { sortMode: settingsRef.current.sortMode, completedPlacement: settingsRef.current.completedPlacement });
      tasksRef.current = loaded;
      setTasks(loaded);
    }
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready,
      error,
      tasks,
      settings,
      loadRange,
      refresh,
      toggle: async (t) => {
        setTasks((x) => x.map((v) => (v.id === t.id && v.date === t.date ? { ...v, isCompleted: !v.isCompleted } : v)));
        try {
          await repo.toggleTaskCompletion(await getDatabase(), t);
        } catch (e) {
          await refresh();
          throw e;
        }
      },
      create: async (i) => {
        const id = await repo.createTask(await getDatabase(), i);
        await refresh();
        return id;
      },
      update: async (id, i) => {
        await repo.updateTask(await getDatabase(), id, i);
        await refresh();
      },
      remove: async (id, date, mode = 'all') => {
        if (mode === 'single' && date) {
          await repo.deleteTaskOccurrence(await getDatabase(), id, date);
        } else {
          await repo.deleteTask(await getDatabase(), id);
        }
        await refresh();
      },
      removeOccurrence: async (taskId, date) => {
        await repo.deleteTaskOccurrence(await getDatabase(), taskId, date);
        await refresh();
      },
      get: async (id) => repo.getTask(await getDatabase(), id),
      setPref: async (k, v) => {
        await setSetting(await getDatabase(), k, v);
        settingsRef.current = { ...settingsRef.current, [k]: v };
        setSettings((x) => ({ ...x, [k]: v }));
        if (k === 'sortMode' || k === 'completedPlacement') {
          await refresh();
        }
      },
      clearAll: async () => {
        const db = await getDatabase();
        await db.execAsync('DELETE FROM task_occurrences; DELETE FROM tasks;');
        await refresh();
      },
    }),
    [ready, error, tasks, settings, loadRange, refresh]
  );

  return <Context value={value}>{children}</Context>;
}

export function usePlanner() {
  const c = use(Context);
  if (!c) throw new Error('PlannerProvider missing');
  return c;
}
